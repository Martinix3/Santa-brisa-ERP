"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SBCard } from "@/components/ui/ui-primitives";
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial as RecipeBom, Uom, Item } from "@/domain/ssot";
import { canonicalUomForItem } from "@/domain/uom";

// Nuevos imports UX
import { useToaster } from "@/components/ui/Toaster";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field, focusFirstError } from "@/components/forms/Field";

// Hook de formulario (asumimos ya existe)
import { useBomForm } from "@/features/bom/useBomForm";

// Server actions
import { upsertBOM } from "./actions";

// ------------------ Helpers locales ------------------
type BomStage = 'PRODUCCION' | 'ENVASADO';
type BomWithStage = RecipeBom & { stage?: BomStage };
type BomLine = RecipeBom["items"][0];

function remapArrayFieldErrors(
  errs: Record<string, string> | undefined,
  base: string,
  removedIndex: number
) {
  if (!errs) return errs;
  const out: Record<string, string> = {};
  const prefix = base + ".";
  for (const [k, v] of Object.entries(errs)) {
    if (!k.startsWith(prefix)) {
      out[k] = v;
      continue;
    }
    const rest = k.slice(prefix.length); // "3.quantity"
    const [idxStr, ...tail] = rest.split(".");
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) {
      out[k] = v;
      continue;
    }
    if (idx === removedIndex) continue; // elimina errores de la fila borrada
    if (idx > removedIndex) {
      const nk = `${base}.${idx - 1}.${tail.join(".")}`; // reindexa
      out[nk] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function SectionCard({
  title,
  hint,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          {hint && <p className="text-xs text-zinc-500">{hint}</p>}
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
        <div>
          <b>Unidad base:</b> {isProd ? "1 L PI" : "1 botella FG"}
        </div>
        {/* Aquí puedes inyectar sub-totales y coste si los calculas */}
      </div>
    </div>
  );
}

// ------------------ Formulario principal ------------------
function RecipeForm({
  initialValues,
  onSave,
  onCancel,
  allItems,
}: {
  initialValues: BomWithStage;
  onSave: (values: BomWithStage) => Promise<any>;
  onCancel: () => void;
  allItems: Item[];
}) {
  const fm = useBomForm(initialValues);
  const { data: santaData } = useData();
  const { push } = useToaster();

  // Defaults por etapa
  useEffect(() => {
    if (!fm.values.stage) fm.set("stage", "PRODUCCION");
  }, []);

  const isProd = (fm.values as BomWithStage).stage === "PRODUCCION";

  // Fijar base unit y batchSize por etapa (per-unit BOM)
  useEffect(() => {
    if (fm.values.stage === "PRODUCCION") {
      if (fm.values.baseUnit !== "L") fm.set("baseUnit", "L" as Uom);
      if (fm.values.batchSize !== 1) fm.set("batchSize", 1);
    } else if (fm.values.stage === "ENVASADO") {
      if (fm.values.baseUnit !== "unit") fm.set("baseUnit", "unit" as Uom);
      if (fm.values.batchSize !== 1) fm.set("batchSize", 1);
    }
  }, [fm.values.stage]);

  // 🔵 Listas de items por categorías
  const itemsRM = useMemo(
    () => allItems.filter((it) => (it as any).category === "rm"),
    [allItems]
  );
  const itemsPKG = useMemo(
    () => allItems.filter((it) => (it as any).category === "pack"),
    [allItems]
  );
  const itemsPI = useMemo(
    () => allItems.filter((it) => (it as any).category === "sf"),
    [allItems]
  ); // Producto Intermedio
  const itemsFG = useMemo(
    () => allItems.filter((it) => (it as any).category === "fg"),
    [allItems]
  );

  // Añadir / eliminar líneas
  const addLine = (role: "FORMULA" | "PACKAGING") => {
    const newItems = [
      ...(fm.values.items || []),
      { itemId: "", qty: 0, uom: "unit" as Uom, role },
    ];
    fm.set("items", newItems);
  };

  const removeLine = (i: number) => {
    const newItems = (fm.values.items || []).filter((_, idx) => idx !== i);
    fm.set("items", newItems);
    fm.setFieldErrors((e) => remapArrayFieldErrors(e, "items", i));
  };

  // Validación cliente rápida
  function validateClient(values: RecipeBom) {
    const errs: Record<string, string> = {};
    if (!values.items?.length) errs["items"] = "Añade al menos una línea";
    values.items?.forEach((it, idx) => {
      if (!it.itemId) errs[`items.${idx}.itemId`] = "Material requerido";
      if (!(it.qty > 0)) errs[`items.${idx}.qty`] = "Cantidad > 0";
    });
    if (!values.outputItemId)
      errs["outputItemId"] = "Producto de salida requerido";
    if (!values.name) errs["name"] = "Nombre requerido";
    return errs;
  }

  async function handleSave() {
    fm.setSaving(true);
    fm.setLastError(undefined);
    fm.setFieldErrors(undefined);

    const clientErrs = validateClient(fm.values as RecipeBom);
    if (Object.keys(clientErrs).length) {
      fm.setSaving(false);
      fm.setFieldErrors(clientErrs);
      push({ kind: "err", text: "Revisa los campos marcados" });
      setTimeout(() => focusFirstError(clientErrs), 0);
      return;
    }

    // Normalización UoM canónica (se revalida en server igualmente)
    const onHand = santaData?.onHand || [];
    const items = santaData?.items || [];
    const normalized = {
      ...fm.values,
      items: (fm.values.items || []).map((it) => ({
        ...it,
        uom: canonicalUomForItem(it.itemId, onHand, items),
      })),
    };

    const res = await onSave(normalized as BomWithStage);
    fm.setSaving(false);

    if (res.ok) {
      push({ kind: "ok", text: "Receta guardada con éxito" });
      onCancel();
    } else {
      fm.setLastError(res.message);
      fm.setFieldErrors(res.fieldErrors);
      push({ kind: "err", text: res.message });
      setTimeout(() => focusFirstError(res.fieldErrors), 0);
    }
  }

  // Aviso al cerrar con cambios
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!fm.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [fm.dirty]);

  // ⌘/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!fm.saving && fm.dirty) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fm.saving, fm.dirty, fm.values]);

  const onSafeCancel = () => {
    if (!fm.dirty || confirm("Hay cambios sin guardar. ¿Descartar?")) onCancel();
  };

  // Filtrado de líneas por rol
  const formulaLines = (fm.values.items || []).map((l, i) => ({ l, i })).filter(({ l }) => (l.role ?? "FORMULA") === "FORMULA");
  const packagingLines = (fm.values.items || []).map((l, i) => ({ l, i })).filter(({ l }) => l.role === "PACKAGING");

  return (
    <SBCard
      title={fm.values.id ? `Editando: ${fm.values.name}` : "Nueva Receta"}
      accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}
    >
      {/* Cabecera jerárquica */}
      <div className="p-4 border-b bg-[hsl(var(--sb-accent-produccion)/0.06)] rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Flujo de elaboración</h2>
            <p className="text-sm text-zinc-600">
              {isProd
                ? "Producción: materias primas → Producto intermedio (por 1 L)"
                : "Envasado: packaging + producto intermedio → Producto final (por 1 botella)"}
            </p>
          </div>
          <div className="inline-flex rounded-xl p-1 bg-white border shadow-sm">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-sm ${
                isProd ? "bg-[hsl(var(--sb-accent-produccion)/0.15)] font-medium" : ""
              }`}
              onClick={() => fm.set("stage", "PRODUCCION" as BomStage)}
            >
              Producción
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-sm ${
                !isProd ? "bg-[hsl(var(--sb-accent-produccion)/0.15)] font-medium" : ""
              }`}
              onClick={() => fm.set("stage", "ENVASADO" as BomStage)}
            >
              Envasado
            </button>
          </div>
        </div>

        {/* Output según etapa + nombre + unidad base fija */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label={isProd ? "Producto Intermedio (Output)" : "Producto Final (Output)"}
            name="outputItemId"
            required
            error={fm.fieldErrors?.outputItemId}
          >
            <select
              className="w-full h-10 px-3 rounded-lg border"
              value={fm.values.outputItemId}
              onChange={(e) => fm.set("outputItemId", e.target.value)}
            >
              <option value="">Selecciona producto</option>
              {isProd
                ? itemsPI.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.sku})
                    </option>
                  ))
                : itemsFG.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.sku})
                    </option>
                  ))}
            </select>
          </Field>

          <Field
            label="Nombre Receta"
            name="name"
            required
            error={fm.fieldErrors?.name}
          >
            <input
              className="w-full h-10 px-3 rounded-lg border"
              value={fm.values.name}
              onChange={(e) => fm.set("name", e.target.value)}
            />
          </Field>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Unidad base
            </label>
            <div className="h-10 px-3 flex items-center rounded-lg border bg-zinc-50 text-zinc-700">
              {isProd ? "Litro (L)" : "Unidad (botella)"}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Cantidades expresadas por {isProd ? "1 litro de PI" : "1 botella de FG"}.
            </p>
          </div>
        </div>
      </div>

      {/* Secciones por etapa */}
      <div className="p-4 space-y-6">
        {fm.lastError && <Banner kind="err" text={fm.lastError} />}
        {fm.fieldErrors?.items && <Banner kind="warn" text={fm.fieldErrors.items} />}

        {isProd ? (
          <>
            {/* Materias primas */}
            <SectionCard
              title="Materias primas"
              hint="Componentes para elaborar 1 L de PI"
              badge="MP"
            >
              {(formulaLines.length ? formulaLines : []).map(({ l, i }) => (
                <div
                  key={i}
                  className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md"
                >
                  <Field
                    label="Material (RM)"
                    name={`items[${i}].itemId`}
                    required
                    error={fm.fieldErrors?.[`items.${i}.itemId`]}
                  >
                    <select
                      className="w-full h-10 px-3 rounded-lg border"
                      value={l.itemId}
                      onChange={(e) => fm.set(`items[${i}].itemId`, e.target.value)}
                    >
                      <option value="">Selecciona material</option>
                      {itemsRM.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.sku})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Cantidad"
                    name={`items[${i}].qty`}
                    required
                    error={fm.fieldErrors?.[`items.${i}.qty`]}
                  >
                    <input
                      type="number"
                      step="0.0001"
                      className="w-full h-10 px-3 rounded-lg border"
                      value={l.qty}
                      onChange={(e) =>
                        fm.set(`items[${i}].qty`, Number(e.target.value))
                      }
                    />
                  </Field>

                  <div className="text-xs text-zinc-600">
                    UoM:{" "}
                    <span className="px-2 py-0.5 rounded-full border bg-zinc-50">
                      {l.itemId
                        ? canonicalUomForItem(
                            l.itemId,
                            santaData?.onHand || [],
                            allItems
                          )
                        : "-"}
                    </span>
                  </div>

                  <button
                    onClick={() => removeLine(i)}
                    className="h-10 px-2 border bg-white hover:bg-red-50 text-red-600 rounded-lg"
                    aria-label={`Eliminar línea ${i + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addLine("FORMULA")}
                className="mt-2 px-3 py-1.5 text-sm border bg-white rounded-lg"
              >
                <Plus size={14} className="inline mr-1" /> Añadir materia prima
              </button>
            </SectionCard>

            {/* Resultado PI */}
            <SectionCard title="Resultado" hint="Salida por unidad base" badge="PI">
              <div className="text-sm text-zinc-700">
                Esta receta produce <b>1 L</b> de Producto Intermedio.
              </div>
            </SectionCard>
          </>
        ) : (
          <>
            {/* Packaging */}
            <SectionCard
              title="Packaging"
              hint="Materiales por 1 botella (caja/separadores en fracciones)"
              badge="PKG"
            >
              {(packagingLines.length ? packagingLines : []).map(({ l, i }) => (
                <div
                  key={i}
                  className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md"
                >
                  <Field
                    label="Material (PKG)"
                    name={`items[${i}].itemId`}
                    required
                    error={fm.fieldErrors?.[`items.${i}.itemId`]}
                  >
                    <select
                      className="w-full h-10 px-3 rounded-lg border"
                      value={l.itemId}
                      onChange={(e) => fm.set(`items[${i}].itemId`, e.target.value)}
                    >
                      <option value="">Selecciona material</option>
                      {itemsPKG.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.sku})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Cantidad"
                    name={`items[${i}].qty`}
                    required
                    error={fm.fieldErrors?.[`items.${i}.qty`]}
                  >
                    <input
                      type="number"
                      step="0.0001"
                      className="w-full h-10 px-3 rounded-lg border"
                      value={l.qty}
                      onChange={(e) =>
                        fm.set(`items[${i}].qty`, Number(e.target.value))
                      }
                    />
                  </Field>

                  <div className="text-xs text-zinc-600">
                    UoM:{" "}
                    <span className="px-2 py-0.5 rounded-full border bg-zinc-50">
                      {l.itemId
                        ? canonicalUomForItem(
                            l.itemId,
                            santaData?.onHand || [],
                            allItems
                          )
                        : "-"}
                    </span>
                  </div>

                  <button
                    onClick={() => removeLine(i)}
                    className="h-10 px-2 border bg-white hover:bg-red-50 text-red-600 rounded-lg"
                    aria-label={`Eliminar línea ${i + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addLine("PACKAGING")}
                className="mt-2 px-3 py-1.5 text-sm border bg-white rounded-lg"
              >
                <Plus size={14} className="inline mr-1" /> Añadir material de
                packaging
              </button>
            </SectionCard>

            {/* Producto intermedio (input informativo) */}
            <SectionCard
              title="Producto intermedio (input)"
              hint="Consumo por botella (gestionado como FORMULA en operación previa o definido aparte)"
              badge="PI"
            >
              <div className="text-sm text-zinc-700">
                Recuerda que esta receta está expresada por <b>1 botella</b> de
                FG. Si requieres consumir PI aquí, añade una línea FORMULA en tu
                proceso de mezclado o establece una operación precedente.
              </div>
            </SectionCard>

            {/* Resultado FG */}
            <SectionCard title="Resultado" hint="Salida por unidad base" badge="FG">
              <div className="text-sm text-zinc-700">
                Esta receta produce <b>1 botella</b> de Producto Final.
              </div>
            </SectionCard>
          </>
        )}

        <FooterTotals isProd={isProd} />
      </div>

      {/* Footer acciones */}
      <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
        <button
          type="button"
          onClick={onSafeCancel}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white"
        >
          Cancelar
        </button>
        <SpinnerButton
          loading={fm.saving}
          onClick={handleSave}
          className="bg-zinc-900 text-white"
          disabled={!fm.dirty || fm.saving}
        >
          Guardar
        </SpinnerButton>
      </div>
    </SBCard>
  );
}

// ------------------ Página ------------------
export default function BomPage() {
  const { data: santaData, saveAllCollections } = useData();
  const [openRecipe, setOpenRecipe] = useState<BomWithStage | null>(null);

  const recipes = useMemo(() => santaData?.billOfMaterials || [], [santaData]);
  const allItems = useMemo(() => santaData?.items || [], [santaData]);

  const select = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    if (recipe) setOpenRecipe(recipe as BomWithStage);
  };

  const createNew = () => {
    setOpenRecipe({
      id: `bom_${Date.now()}`,
      outputItemId: "",
      name: "",
      batchSize: 1,
      baseUnit: "L",
      stage: "PRODUCCION",
      items: [],
    } as unknown as BomWithStage);
  };

  const handleSave = async (values: BomWithStage) => {
    const result = await upsertBOM(values);
    if (result.ok) {
      if (santaData) {
        const updatedBoms = [...(santaData.billOfMaterials || [])];
        const index = updatedBoms.findIndex((b) => b.id === values.id);
        if (index > -1) {
          updatedBoms[index] = values as RecipeBom;
        } else {
          updatedBoms.unshift(values as RecipeBom);
        }
        saveAllCollections({ billOfMaterials: updatedBoms });
      }
      setOpenRecipe(null);
    }
    return result;
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Recetas (BOM)</h1>
          <p className="text-sm text-zinc-500">
            Producción (1 L → PI) y Envasado (1 botella → FG)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createNew}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2"
          >
            <Plus size={16} /> Nueva receta
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SBCard title="Recetas" accent={(SB_COLORS as any).module?.produccion ?? SB_COLORS.primary.teal}>
            <div className="p-2 space-y-1">
              {recipes.map((r) => {
                const outputItem = allItems.find((it) => it.id === r.outputItemId);
                return (
                  <div
                    key={r.id}
                    className={`rounded-lg p-3 border transition-colors ${
                      openRecipe?.id === r.id
                        ? "bg-yellow-50 border-yellow-200"
                        : "border-transparent hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-zinc-800">
                          {r.name || "—"}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">
                          {outputItem?.name || r.outputItemId || "—"}
                        </p>
                        {(r as BomWithStage).stage && (
                          <span className="mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full border bg-white text-zinc-700">
                            {(r as BomWithStage).stage === "PRODUCCION" ? "PRODUCCIÓN" : "ENVASADO"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => select(r.id)}
                        className="px-3 py-1 text-xs rounded-lg border border-zinc-300 hover:bg-zinc-100"
                      >
                        Abrir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SBCard>
        </div>

        <div className="lg:col-span-2">
          {!openRecipe ? (
            <div className="h-full flex items-center justify-center text-zinc-500 bg-zinc-50 rounded-2xl border-2 border-dashed">
              Selecciona una receta o crea una nueva.
            </div>
          ) : (
            <RecipeForm
              initialValues={openRecipe}
              onSave={handleSave}
              onCancel={() => setOpenRecipe(null)}
              allItems={allItems}
            />
          )}
        </div>
      </div>
    </div>
  );
}
