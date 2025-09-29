

"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Trash2, Building2 as FactoryIcon } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial as RecipeBom, Uom, Item } from "@/domain/ssot";
import { canonicalUomForItem } from "@/domain/uom";
import { toast } from "sonner";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field, focusFirstError } from "@/components/forms/Field";
import { useBomForm } from "@/features/bom/useBomForm";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { upsertBOM, archiveBOM, upsertMinimalProduct } from "./actions";
import { FormStatusBar } from "@/components/ui/FormStatusBar";

/** Tipos */
type BomStage = "PRODUCCION" | "ENVASADO";
type BomWithStage = RecipeBom & { stage?: BomStage };
type QuickCreatePayload = { name: string; sku?: string; category: "intermediate" | "fg" };

/** Helpers */
function remapArrayFieldErrors(
  errs: Record<string, string> | undefined,
  base: string,
  removedIndex: number
) {
  if (!errs) return errs;
  const out: Record<string, string> = {};
  const prefix = base + ".";
  for (const [k, v] of Object.entries(errs)) {
    if (!k.startsWith(prefix)) { out[k] = v; continue; }
    const rest = k.slice(prefix.length);
    const [idxStr, ...tail] = rest.split(".");
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) { out[k] = v; continue; }
    if (idx === removedIndex) continue;
    if (idx > removedIndex) out[`${base}.${idx - 1}.${tail.join(".")}`] = v;
    else out[k] = v;
  }
  return out;
}

function SectionCard({
  title, hint, badge, children,
}: { title: string; hint?: string; badge?: string; children: React.ReactNode; }) {
  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          {hint && <p className="text-xs text-zinc-600">{hint}</p>}
        </div>
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function FooterTotals({ isProd }: { isProd: boolean }) {
  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="flex flex-wrap gap-4 text-sm">
        <div><b>Unidad base:</b> {isProd ? "1 L PI" : "1 botella FG"}</div>
      </div>
    </div>
  );
}

/** ===== Formulario ===== */
function RecipeForm({
  initialValues, onSave, onCancel, allItems, isNew, onQuickCreateItem,
}: {
  initialValues: BomWithStage;
  onSave: (values: BomWithStage) => Promise<any>;
  onCancel: () => void;
  allItems: Item[];
  isNew: boolean;
  onQuickCreateItem: (p: QuickCreatePayload) => Promise<{ itemId: string }>;
}) {
  const fm = useBomForm(initialValues);
  const { data: santaData } = useData();

  const isProd = (fm.values as BomWithStage).stage === "PRODUCCION";

  // Quick create
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");

  // Normaliza baseUnit/batchSize según etapa
  useEffect(() => {
    if ((fm.values as BomWithStage).stage === "PRODUCCION") {
      if (fm.values.baseUnit !== "L") fm.set("baseUnit", "L" as Uom);
      if (fm.values.batchSize !== 1) fm.set("batchSize", 1);
    } else if ((fm.values as BomWithStage).stage === "ENVASADO") {
      if ((fm.values.baseUnit as any) !== "uds") fm.set("baseUnit", "uds" as Uom);
      if (fm.values.batchSize !== 1) fm.set("batchSize", 1);
    }
  }, [(fm.values as BomWithStage).stage]); // eslint-disable-line

  // Catálogos (inventario) — categorías correctas
  const itemsRaw          = useMemo(() => allItems.filter((it) => (it as any).category === "raw"),          [allItems]);
  const itemsPack         = useMemo(() => allItems.filter((it) => (it as any).category === "pack"),         [allItems]);
  const itemsIntermediate = useMemo(() => allItems.filter((it) => (it as any).category === "intermediate" || (it as any).category === "raw"), [allItems]);
  const itemsFG           = useMemo(() => allItems.filter((it) => (it as any).category === "fg"),           [allItems]);

  // Mutaciones de líneas
  const addLine = (role: "FORMULA" | "PACKAGING") => {
    const newItems = [ ...(fm.values.items || []), { itemId: "", qty: 0, uom: "uds" as Uom, role } ];
    fm.set("items", newItems);
  };
  const removeLine = (idxOrig: number) => {
    const newItems = (fm.values.items || []).filter((_, idx) => idx !== idxOrig);
    fm.set("items", newItems);
    fm.setFieldErrors((e) => remapArrayFieldErrors(e, "items", idxOrig));
  };

  // Validación rápida
  function validateClient(values: BomWithStage) {
    const errs: Record<string, string> = {};
    if (!values.items?.length) errs["items"] = "Añade al menos una línea de componentes.";
    values.items?.forEach((it, idx) => {
      if (!it.itemId) errs[`items.${idx}.itemId`] = "Material requerido";
      if (!(it.qty > 0)) errs[`items.${idx}.qty`] = "Cantidad > 0";
    });
    if (!values.outputItemId) errs["outputItemId"] = "Producto de salida requerido";
    if (!values.name) errs["name"] = "Nombre requerido";
    return errs;
  }

  // Guardado
  async function handleSave() {
    fm.setSaving(true);
    fm.setLastError(undefined);
    fm.setFieldErrors(undefined);

    const clientErrs = validateClient(fm.values as BomWithStage);
    if (Object.keys(clientErrs).length) {
      fm.setSaving(false);
      fm.setFieldErrors(clientErrs);
      setTimeout(() => focusFirstError(clientErrs), 0);
      return;
    }

    const onHand = santaData?.onHand || [];
    const items = santaData?.items || [];
    const normalized = {
      ...(fm.values as BomWithStage),
      items: (fm.values.items || []).map((it) => ({
        ...it,
        uom: canonicalUomForItem(it.itemId, onHand, items),
      })),
    };

    const res = await onSave(normalized as BomWithStage);
    fm.setSaving(false);

    if (res.ok) {
      toast.success("Receta guardada con éxito");
      onCancel();
    } else {
      fm.setLastError(res.message);
      fm.setFieldErrors(res.fieldErrors);
      toast.error(res.message);
      setTimeout(() => focusFirstError(res.fieldErrors), 0);
    }
  }

  // Cancelación segura
  const onSafeCancel = () => {
    if (isNew) return onCancel();
    if (!fm.dirty || confirm("Hay cambios sin guardar. ¿Descartar?")) onCancel();
  };

  // Atajos ⌘/Ctrl+S y ⌘/Ctrl+Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!fm.saving && fm.dirty) handleSave();
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        if (!fm.saving && fm.dirty) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fm.saving, fm.dirty, fm.values]); // eslint-disable-line

  // Índices originales para evitar desalineos
  const formulaLines = useMemo(
    () => (fm.values.items || []).map((l, idx) => ({ l, idx })).filter(({ l }) => (l.role ?? "FORMULA") === "FORMULA"),
    [fm.values.items]
  );
  const packagingLines = useMemo(
    () => (fm.values.items || []).map((l, idx) => ({ l, idx })).filter(({ l }) => (l.role ?? "PACKAGING") === "PACKAGING"),
    [fm.values.items]
  );

  // Output + quick create
  const handleOutputChange = (val: string) => {
    if (val === "__new__") {
      setNewName(""); setNewSku(""); setCreateOpen(true); return;
    }
    fm.set("outputItemId", val);
  };
  const createOutputNow = async () => {
    if (!newName.trim()) return;
    const category: "intermediate" | "fg" =
      (fm.values as BomWithStage).stage === "PRODUCCION" ? "intermediate" : "fg";
    const { itemId } = await onQuickCreateItem({ name: newName.trim(), sku: newSku.trim() || undefined, category });
    fm.set("outputItemId", itemId);
    setCreateOpen(false);
  };

  const accent = "[--sb-accent-produc:182_25%_47%]";

  return (
    <>
      <SBCard
        title={fm.values.id ? `Editando: ${fm.values.name}` : "Nueva Receta"}
        accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}
      >
        {/* Cabecera del formulario */}
        <div className={`p-4 border-b rounded-t-2xl bg-white ${accent}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-lg grid place-items-center ring-1 ring-black/5
                           bg-[hsl(var(--sb-accent-produc)/0.12)]
                           text-[hsl(var(--sb-accent-produc))] ${accent}`}
                aria-hidden="true"
                title="Producción"
              >
                <FactoryIcon size={16} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Flujo de elaboración</h2>
                <p className="text-sm text-zinc-600">
                  {(fm.values as BomWithStage).stage === "PRODUCCION"
                    ? "Producción: materias primas + producto intermedio → PI (por 1 L)"
                    : "Envasado: PI + packaging → FG (por 1 botella)"}
                </p>
              </div>
            </div>

            {/* Toggle etapa — visible cuando activo */}
            <div className="inline-flex rounded-xl p-1 bg-white border shadow-sm">
              {(["PRODUCCION","ENVASADO"] as BomStage[]).map(st => {
                const active = (fm.values as BomWithStage).stage === st;
                return (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={active}
                    onClick={() => fm.set("stage", st)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors border
                                ${accent}
                                ${active
                                  ? "text-[hsl(var(--sb-accent-produc))] bg-[hsl(var(--sb-accent-produc)/0.18)] border-[hsl(var(--sb-accent-produc))] font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]"
                                  : "text-[hsl(var(--sb-accent-produc))] bg-[hsl(var(--sb-accent-produc)/0.06)] border-transparent hover:bg-[hsl(var(--sb-accent-produc)/0.10)]"}`}
                    title={st === "PRODUCCION" ? "Producción" : "Envasado"}
                  >
                    {st === "PRODUCCION" ? "Producción" : "Envasado"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Output + nombre + unidad base */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label={(fm.values as BomWithStage).stage === "PRODUCCION" ? "Producto Intermedio (Output)" : "Producto Final (Output)"}
              name="outputItemId" required error={fm.fieldErrors?.outputItemId}>
              <select
                className="w-full h-10 px-3 rounded-lg border"
                value={fm.values.outputItemId}
                onChange={(e) => handleOutputChange(e.target.value)}
              >
                <option value="">Selecciona producto</option>
                {(fm.values as BomWithStage).stage === "PRODUCCION"
                  ? itemsIntermediate.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)
                  : itemsFG.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                <option value="__new__">➕ Crear nuevo…</option>
              </select>
            </Field>

            <Field label="Nombre Receta" name="name" required error={fm.fieldErrors?.name}>
              <input className="w-full h-10 px-3 rounded-lg border"
                     value={fm.values.name} onChange={(e) => fm.set("name", e.target.value)} />
            </Field>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Unidad base</label>
              <div className="h-10 px-3 flex items-center rounded-lg border bg-zinc-50 text-zinc-700">
                {(fm.values as BomWithStage).stage === "PRODUCCION" ? "Litro (L)" : "Unidad (botella)"}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Cantidades por {(fm.values as BomWithStage).stage === "PRODUCCION" ? "1 litro de PI" : "1 botella de FG"}.
              </p>
            </div>
          </div>
        </div>

        {/* Secciones */}
        <div className="p-4 space-y-6">
          {fm.lastError && <Banner kind="err" text={fm.lastError} />}
          {fm.fieldErrors?.items && <Banner kind="warn" text={fm.fieldErrors.items} />}

          {(fm.values as BomWithStage).stage === "PRODUCCION" ? (
            <>
              {/* PRODUCCIÓN: cada línea puede ser raw o intermediate */}
              <SectionCard title="Componentes (raw o intermediate)" hint="Cantidades para 1 L de PI" badge="RAW/INT">
                {formulaLines.map(({ l, idx }) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md bg-white">
                    <Field label="Material" name={`items[${idx}].itemId`} required error={fm.fieldErrors?.[`items.${idx}.itemId`]}>
                      <select
                        className="w-full h-10 px-3 rounded-lg border"
                        value={l.itemId}
                        onChange={(e) => fm.set(`items.${idx}.itemId`, e.target.value)}
                      >
                        <option value="">Selecciona material</option>
                        {itemsIntermediate.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Cantidad" name={`items[${idx}].qty`} required error={fm.fieldErrors?.[`items.${idx}.qty`]}>
                      <input
                        type="number" step="0.0001"
                        className="w-full h-10 px-3 rounded-lg border"
                        value={l.qty}
                        onChange={(e) => fm.set(`items.${idx}.qty`, Number(e.target.value))}
                      />
                    </Field>

                    <div className="text-xs text-zinc-600">
                      UoM: <span className="px-2 py-0.5 rounded-full border bg-zinc-50">
                        {l.itemId ? canonicalUomForItem(l.itemId, santaData?.onHand || [], allItems) : <span className="text-zinc-400">—</span>}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="h-10 px-2 border rounded-lg
                                 bg-[hsl(var(--sb-accent-produc)/0.08)]
                                 text-[hsl(var(--sb-accent-produc))]
                                 hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                                 [--sb-accent-produc:182_25%_47%]"
                      aria-label={`Eliminar línea ${idx + 1}`}
                      title="Eliminar línea"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addLine("FORMULA")}
                  className="mt-2 px-3 py-1.5 text-sm rounded-lg border
                             text-[hsl(var(--sb-accent-produc))]
                             bg-[hsl(var(--sb-accent-produc)/0.08)]
                             hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                             [--sb-accent-produc:182_25%_47%]">
                  <Plus size={14} className="inline mr-1" /> Añadir material
                </button>
              </SectionCard>

              <SectionCard title="Resultado" hint="Salida por unidad base" badge="PI">
                <div className="text-sm text-zinc-700">Esta receta produce <b>1 L</b> de Producto Intermedio.</div>
              </SectionCard>
            </>
          ) : (
            <>
              {/* ENVASADO: cada línea puede ser intermediate o pack */}
              <SectionCard title="Componentes (intermediate o pack)" hint="Cantidades por 1 botella de FG" badge="INT/PKG">
                {packagingLines.map(({ l, idx }) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md bg-white">
                    <Field label="Material" name={`items[${idx}].itemId`} required error={fm.fieldErrors?.[`items.${idx}.itemId`]}>
                      <select
                        className="w-full h-10 px-3 rounded-lg border"
                        value={l.itemId}
                        onChange={(e) => fm.set(`items.${idx}.itemId`, e.target.value)}
                      >
                        <option value="">Selecciona material</option>
                        {[...itemsIntermediate, ...itemsPack].map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Cantidad" name={`items[${idx}].qty`} required error={fm.fieldErrors?.[`items.${idx}.qty`]}>
                      <input
                        type="number" step="0.0001"
                        className="w-full h-10 px-3 rounded-lg border"
                        value={l.qty}
                        onChange={(e) => fm.set(`items.${idx}.qty`, Number(e.target.value))}
                      />
                    </Field>

                    <div className="text-xs text-zinc-600">
                      UoM: <span className="px-2 py-0.5 rounded-full border bg-zinc-50">
                        {l.itemId ? canonicalUomForItem(l.itemId, santaData?.onHand || [], allItems) : <span className="text-zinc-400">—</span>}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="h-10 px-2 border rounded-lg
                                 bg-[hsl(var(--sb-accent-produc)/0.08)]
                                 text-[hsl(var(--sb-accent-produc))]
                                 hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                                 [--sb-accent-produc:182_25%_47%]"
                      aria-label={`Eliminar línea ${idx + 1}`}
                      title="Eliminar línea"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addLine("PACKAGING")}
                  className="mt-2 px-3 py-1.5 text-sm rounded-lg border
                             text-[hsl(var(--sb-accent-produc))]
                             bg-[hsl(var(--sb-accent-produc)/0.08)]
                             hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                             [--sb-accent-produc:182_25%_47%]">
                  <Plus size={14} className="inline mr-1" /> Añadir material
                </button>
              </SectionCard>

              <SectionCard title="Resultado" hint="Salida por unidad base" badge="FG">
                <div className="text-sm text-zinc-700">Esta receta produce <b>1 botella</b> de Producto Final.</div>
              </SectionCard>
            </>
          )}

          <FooterTotals isProd={isProd} />
        </div>

        {/* Footer acciones */}
        <div className="p-4 bg-zinc-50 border-t space-y-3">
          <FormStatusBar dirty={fm.dirty} saving={fm.saving} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onSafeCancel} className="px-3 py-1.5 rounded-lg border bg-white">
              Cancelar
            </button>
            <SpinnerButton
              loading={fm.saving}
              onClick={handleSave}
              className={`border text-[hsl(var(--sb-accent-produc))]
                          bg-[hsl(var(--sb-accent-produc)/0.08)]
                          hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                          ${accent}`}
              disabled={!fm.dirty || fm.saving}
            >
              Guardar
            </SpinnerButton>
          </div>
        </div>
      </SBCard>

      {/* Diálogo: crear producto on-the-fly */}
      <SBDialog open={createOpen} onOpenChange={setCreateOpen}>
        <SBDialogContent title="Crear producto" description="Crea un producto rápido para usarlo como Output.">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input className="w-full h-10 px-3 rounded-lg border" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SKU (opcional)</label>
              <input className="w-full h-10 px-3 rounded-lg border" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
            </div>
            <div className="text-xs text-zinc-600">
              Se registrará como <b>{(fm.values as BomWithStage).stage === "PRODUCCION" ? "intermediate" : "fg"}</b>.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1.5 rounded-lg border bg-white" onClick={() => setCreateOpen(false)}>Cancelar</button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg border
                            text-[hsl(var(--sb-accent-produc))]
                            bg-[hsl(var(--sb-accent-produc)/0.08)]
                            hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                            ${accent}`}
                onClick={createOutputNow}
                disabled={!newName.trim()}>
                Crear
              </button>
            </div>
          </div>
        </SBDialogContent>
      </SBDialog>
    </>
  );
}

/** ===== Página ===== */
export default function BomPage() {
  const { data: santaData, saveAllCollections } = useData();
  const [openRecipe, setOpenRecipe] = useState<BomWithStage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const recipesAll = useMemo(() => santaData?.billOfMaterials || [], [santaData]);
  const recipes = useMemo(() => recipesAll.filter((r: any) => r.isActive !== false), [recipesAll]);
  const allItems = useMemo(() => santaData?.items || [], [santaData]);

  const select = useCallback((id: string) => {
    const recipe = recipesAll.find((r) => r.id === id);
    if (recipe) { setOpenRecipe(recipe as BomWithStage); setIsNew(false); }
  }, [recipesAll]);

  const createNew = useCallback(() => {
    setOpenRecipe({
      id: `bom_${Date.now()}`,
      outputItemId: "",
      name: "",
      batchSize: 1,
      baseUnit: "L",
      stage: "PRODUCCION",
      items: [],
    } as BomWithStage);
    setIsNew(true);
  }, []);

  const handleSave = useCallback(async (values: BomWithStage) => {
    const result = await upsertBOM(values);
    if (result.ok) {
      if (santaData) {
        const updated = [...(santaData.billOfMaterials || [])];
        const idx = updated.findIndex((b) => b.id === values.id);
        if (idx > -1) updated[idx] = values as RecipeBom;
        else updated.unshift(values as RecipeBom);
        saveAllCollections({ billOfMaterials: updated });
      }
      setOpenRecipe(null);
      setIsNew(false);
    }
    return result;
  }, [santaData, saveAllCollections]);

  const onArchive = useCallback(async (id: string) => {
    if (!confirm("¿Seguro que quieres archivar esta receta?")) return;
    setArchivingId(id);
    const res = await archiveBOM(id);
    setArchivingId(null);
    if (res.ok) {
      if (santaData) {
        const updated = (santaData.billOfMaterials || []).map((b: any) =>
          b.id === id ? { ...b, isActive: false } : b
        );
        saveAllCollections({ billOfMaterials: updated });
      }
      setOpenRecipe((cur) => (cur?.id === id ? null : cur));
      setIsNew(false);
    } else {
      alert(res.message || "No se pudo archivar.");
    }
  }, [santaData, saveAllCollections]);

  const onQuickCreateItem = useCallback(async ({ name, sku, category }: QuickCreatePayload): Promise<{ itemId: string }> => {
    const result = await upsertMinimalProduct({ sku, name, packSizeMl: 700 });
    if (!result.ok) {
        throw new Error(result.message);
    }
    const { itemId } = result.data;
    const newItem: Item = { id: itemId, name, sku: sku ?? "" } as Item;
    // @ts-ignore: campo de categoría en tu Item
    newItem.category = category;
    const nextItems = [...(santaData?.items || []), newItem];
    await saveAllCollections({ items: nextItems });
    return { itemId };
  }, [santaData, saveAllCollections]);

  const accent = "[--sb-accent-produc:182_25%_47%]";

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-xl font-semibold text-zinc-900">Recetas (BOM)</h2>
                <p className="text-sm text-zinc-500">Producción (1 L → PI) y Envasado (1 botella → FG)</p>
            </div>
            <button
                type="button"
                onClick={createNew}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
                            text-[hsl(var(--sb-accent-produc))]
                            bg-[hsl(var(--sb-accent-produc)/0.08)]
                            hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                            ${accent}`}
                aria-label="Crear nueva receta"
                title="Nueva receta"
            >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva receta</span>
            </button>
        </div>
      <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SBCard title="Recetas" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
              <div className="px-2 pt-2 pb-1">
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-600">{recipes.length}</span>
              </div>

              <div className="p-2 space-y-1">
                {recipes.map((r: any) => {
                  const outputItem = allItems.find((it) => it.id === r.outputItemId);
                  const isActive = openRecipe?.id === r.id;
                  const isArchiving = archivingId === r.id;
                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => select(r.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(r.id)}
                      className={`rounded-lg p-3 border transition-colors outline-none cursor-pointer
                        ${isActive
                          ? "bg-yellow-50 border-yellow-200"
                          : `border-transparent hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-accent-produc))] focus-visible:ring-offset-2 ${accent}`}`}
                      aria-label={`Abrir receta ${r.name || r.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-zinc-800">{r.name || "—"}</p>
                          <p className="text-xs text-zinc-500 font-mono">{outputItem?.name || r.outputItemId || "—"}</p>
                          {r.stage && (
                            <span className="mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">
                              {r.stage === "PRODUCCION" ? "PRODUCCIÓN" : "ENVASADO"}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (!isArchiving) onArchive(r.id); }}
                            disabled={isArchiving}
                            className={`px-3 py-1 text-xs rounded-lg border
                                       text-[hsl(var(--sb-accent-produc))]
                                       bg-[hsl(var(--sb-accent-produc)/0.08)]
                                       hover:bg-[hsl(var(--sb-accent-produc)/0.12)]
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       ${accent}`}
                            title="Archivar receta"
                          >
                            {isArchiving ? "Archivando…" : "Archivar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SBCard>
          </div>

          <div className="lg:col-span-2">
            {!openRecipe ? (
              <div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border">
                Selecciona una receta o crea una nueva.
              </div>
            ) : (
              <RecipeForm
                initialValues={openRecipe}
                onSave={(v) => handleSave(v)}
                onCancel={() => { setOpenRecipe(null); setIsNew(false); }}
                allItems={allItems}
                isNew={isNew}
                onQuickCreateItem={onQuickCreateItem}
              />
            )}
          </div>
        </div>
    </div>
  );
}
