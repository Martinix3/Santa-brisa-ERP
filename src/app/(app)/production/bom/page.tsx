
// src/app/(app)/production/bom/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Trash2, Factory } from "lucide-react";
import { SBCard, SBButton, Input, Select, EmptyState, Badge } from "@/components/ui/ui-primitives";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial as RecipeBom, Uom, Item } from "@/domain/ssot";
import { canonicalUomForItem } from "@/domain/uom";
import { toast } from "sonner";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field, focusFirstError } from "@/components/forms/Field";
import { useBomForm } from "@/features/bom/useBomForm";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { upsertBOM, archiveBOM, upsertMinimalProduct } from "@/server/actions/bom.actions";
import { FormStatusBar } from "@/components/ui/FormStatusBar";
import { cn } from "@/lib/utils";

/** Tipos */
type BomStage = "PRODUCCION" | "ENVASADO";
type BomWithStage = RecipeBom & { stage?: BomStage };
type QuickCreatePayload = { name: string; sku?: string; category: "intermediate" | "fg" };

/** Helpers */
function remapArrayFieldErrors(errs: Record<string, string> | undefined, base: string, removedIndex: number) {
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

function SectionCard({ title, hint, badge, children }: { title: string; hint?: string; badge?: string; children: React.ReactNode; }) {
  return (
    <SBCard>
      <div className="sb-card__header justify-between">
        <div>
          <h3 className="sb-card__title">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {badge && <span className="text-[11px] px-2 py-0.5 rounded-full border bg-background">{badge}</span>}
      </div>
      <div className="sb-card__content space-y-2">{children}</div>
    </SBCard>
  );
}

/** ===== Formulario ===== */
interface RecipeFormProps {
  initialValues: BomWithStage;
  onSave: (values: BomWithStage) => Promise<any>;
  onCancel: () => void;
  allItems: Item[];
  isNew: boolean;
  onQuickCreateItem: (p: QuickCreatePayload) => Promise<{ sku: string }>;
}

function RecipeForm({ initialValues, onSave, onCancel, allItems, isNew, onQuickCreateItem }: RecipeFormProps) {
  const fm = useBomForm(initialValues);
  const { data: santaData } = useData();
  const isProd = fm.values.stage === "PRODUCCION";

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");

  useEffect(() => {
    // Solo establecer valores por defecto si está vacío
    if (fm.values.stage === "PRODUCCION" && !fm.values.baseUnit) {
      fm.set("baseUnit", "L" as Uom);
    } else if (fm.values.stage === "ENVASADO" && !fm.values.baseUnit) {
      fm.set("baseUnit", "unit" as Uom);
    }
    if (fm.values.batchSize !== 1) fm.set("batchSize", 1);
  }, [fm.values.stage, fm.values.baseUnit, fm.values.batchSize, fm.set]);

  const itemsRaw = useMemo(() => allItems.filter(it => it.category === "raw"), [allItems]);
  const itemsPack = useMemo(() => allItems.filter(it => it.category === "pack"), [allItems]);
  const itemsIntermediate = useMemo(() => allItems.filter(it => it.category === "intermediate" || it.category === "raw"), [allItems]);
  const itemsFG = useMemo(() => allItems.filter(it => it.category === "fg"), [allItems]);

  const addLine = (role: "FORMULA" | "PACKAGING") => {
    const newItems = [...(fm.values.items || []), { sku: "", qty: 0, uom: "uds" as Uom, role }];
    fm.set("items", newItems);
  };

  const removeLine = (idxOrig: number) => {
    const newItems = (fm.values.items || []).filter((_, idx) => idx !== idxOrig);
    fm.set("items", newItems);
    fm.setFieldErrors(e => remapArrayFieldErrors(e, "items", idxOrig));
  };

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

  const handleSave = useCallback(async () => {
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

    const normalized = {
      ...fm.values,
      items: (fm.values.items || []).map(it => ({
        ...it,
        uom: canonicalUomForItem(it.itemId, santaData?.onHand || [], allItems),
      })),
    };

    const res = await onSave(normalized as BomWithStage);
    fm.setSaving(false);

    if (res.ok) {
      toast.success("Receta guardada con éxito");
      // onCancel es llamado por el componente padre tras el guardado exitoso.
    } else {
      fm.setLastError(res.message);
      fm.setFieldErrors(res.fieldErrors);
      toast.error(res.message);
      setTimeout(() => focusFirstError(res.fieldErrors), 0);
    }
  }, [fm, onSave, santaData?.onHand, allItems]);

  const onSafeCancel = () => {
    if (isNew || !fm.dirty) return onCancel();
    if (window.confirm("Hay cambios sin guardar. ¿Descartar?")) onCancel();
  };
  
  const handleOutputChange = (val: string) => {
    if (val === "__new__") {
      setNewName(""); setNewSku(""); setCreateOpen(true); return;
    }
    fm.set("outputItemId", val);
  };

  const createOutputNow = async () => {
    if (!newName.trim()) return;
    const category: "intermediate" | "fg" = fm.values.stage === "PRODUCCION" ? "intermediate" : "fg";
    const { itemId } = await onQuickCreateItem({ name: newName.trim(), sku: newSku.trim() || undefined, category });
    fm.set("outputItemId", itemId);
    setCreateOpen(false);
  };
  
  const formulaLines = useMemo(() => (fm.values.items || []).map((l, idx) => ({ l, idx })).filter(({ l }) => (l.role ?? "FORMULA") === "FORMULA"), [fm.values.items]);
  const packagingLines = useMemo(() => (fm.values.items || []).map((l, idx) => ({ l, idx })).filter(({ l }) => l.role === "PACKAGING"), [fm.values.items]);

  // ✅ Validación de balance de unidades
  const balanceWarning = useMemo(() => {
    if (!isProd) return null; // Solo para producción (L)
    
    const totalL = formulaLines.reduce((sum, { l }) => {
      if (!l.itemId || !l.qty) return sum;
      const uom = canonicalUomForItem(l.itemId, santaData?.onHand || [], allItems);
      // Solo sumar si la UoM es L (litros)
      if (uom === 'L') return sum + l.qty;
      return sum;
    }, 0);
    
    const baseUnit = fm.values.batchSize || 1;
    const diff = Math.abs(totalL - baseUnit);
    const tolerance = baseUnit * 0.05; // 5% de tolerancia
    
    if (diff > tolerance && totalL > 0) {
      const percentage = ((diff / baseUnit) * 100).toFixed(1);
      return {
        message: `⚠️ La suma de componentes líquidos (${totalL.toFixed(3)}L) difiere de la unidad base (${baseUnit}L) en un ${percentage}%`,
        severity: diff > baseUnit * 0.15 ? 'error' : 'warning'
      };
    }
    return null;
  }, [formulaLines, fm.values.batchSize, isProd, santaData?.onHand, allItems]);

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <SBCard noPadding>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-secondary text-muted-foreground" aria-hidden="true">
                <Factory size={16} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{isNew ? "Nueva Receta" : `Editando: ${initialValues.name}`}</h2>
                <p className="text-sm text-muted-foreground">{isProd ? "Producción: materias primas → PI (por 1 L)" : "Envasado: PI + packaging → FG (por 1 botella)"}</p>
              </div>
            </div>

            <div className="inline-flex rounded-lg p-1 bg-secondary border">
              {(["PRODUCCION","ENVASADO"] as BomStage[]).map(st => (
                <SBButton
                  key={st}
                  type="button"
                  variant="ghost"
                  data-active={fm.values.stage === st}
                  onClick={() => fm.set("stage", st)}
                  className="data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm data-[active=true]:font-semibold"
                  title={st === "PRODUCCION" ? "Producción" : "Envasado"}
                >
                  {st === "PRODUCCION" ? "Producción" : "Envasado"}
                </SBButton>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={isProd ? "Producto Intermedio (Output)" : "Producto Final (Output)"} name="outputItemId" required error={fm.fieldErrors?.outputItemId}>
              <Select value={fm.values.outputItemId} onChange={(e) => handleOutputChange(e.target.value)}>
                <option value="">Selecciona producto</option>
                {isProd ? itemsIntermediate.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)
                       : itemsFG.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                <option value="__new__">➕ Crear nuevo…</option>
              </Select>
            </Field>
            <Field label="Nombre Receta" name="name" required error={fm.fieldErrors?.name}>
              <Input value={fm.values.name} onChange={(e) => fm.set("name", e.target.value)} />
            </Field>
            <Field label="Unidad base" name="baseUnit" required error={fm.fieldErrors?.baseUnit}>
              <Select value={fm.values.baseUnit} onChange={(e) => fm.set("baseUnit", e.target.value as Uom)}>
                <optgroup label="Volumen">
                  <option value="L">Litros (L)</option>
                  <option value="mL">Mililitros (mL)</option>
                </optgroup>
                <optgroup label="Masa">
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="g">Gramos (g)</option>
                </optgroup>
                <optgroup label="Unidades">
                  <option value="unit">Unidades (unit)</option>
                  <option value="bottle">Botellas</option>
                  <option value="case">Cajas</option>
                </optgroup>
              </Select>
            </Field>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {fm.lastError && <Banner kind="err" text={fm.lastError} />}
          {fm.fieldErrors?.items && <Banner kind="warn" text={fm.fieldErrors.items} />}
          {balanceWarning && <Banner kind={balanceWarning.severity === 'error' ? 'err' : 'warn'} text={balanceWarning.message} />}

          <SectionCard title={isProd ? "Componentes (raw o intermediate)" : "Componentes (intermediate o pack)"} hint={isProd ? "Cantidades para 1 L de PI" : "Cantidades por 1 botella de FG"}>
            {(isProd ? formulaLines : packagingLines).map(({ l, idx }) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_100px_auto] gap-2 items-end">
                <Field label="Material" name={`items[${idx}].itemId`} required error={fm.fieldErrors?.[`items.${idx}.itemId`]}>
                  <Select value={l.itemId} onChange={(e) => fm.set(`items.${idx}.itemId`, e.target.value)}>
                    <option value="">Selecciona material</option>
                    {(isProd ? itemsIntermediate : [...itemsIntermediate, ...itemsPack]).map(m => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
                  </Select>
                </Field>
                <Field label="Cantidad" name={`items[${idx}].qty`} required error={fm.fieldErrors?.[`items.${idx}.qty`]}>
                  <Input type="number" step="0.0001" value={l.qty} onChange={(e) => fm.set(`items.${idx}.qty`, Number(e.target.value))} />
                </Field>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">UoM</label>
                  <div className="h-10 px-3 flex items-center justify-center rounded-lg border bg-secondary font-semibold text-sm">
                    {l.itemId ? canonicalUomForItem(l.itemId, santaData?.onHand || [], allItems) : "—"}
                  </div>
                </div>
                <div className="pb-2">
                  <SBButton type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeLine(idx)} aria-label={`Eliminar línea ${idx + 1}`} title="Eliminar línea">
                    <Trash2 size={16} />
                  </SBButton>
                </div>
              </div>
            ))}
            <SBButton type="button" variant="outline" size="sm" onClick={() => addLine(isProd ? "FORMULA" : "PACKAGING")} className="mt-2">
              <Plus size={14} className="inline mr-1" /> Añadir material
            </SBButton>
          </SectionCard>
        </div>

        <div className="sb-card__footer justify-between">
          <FormStatusBar dirty={fm.dirty} saving={fm.saving} />
          <div className="flex gap-2">
            <SBButton type="button" variant="ghost" onClick={onSafeCancel}>Cancelar</SBButton>
            <SpinnerButton type="submit" loading={fm.saving} disabled={!fm.dirty || fm.saving}>Guardar</SpinnerButton>
          </div>
        </div>
      </SBCard>
      </form>

      <SBDialog open={createOpen} onOpenChange={setCreateOpen}>
        <SBDialogContent title="Crear producto" description="Crea un producto rápido para usarlo como Output.">
          <div className="sb-dialog__body space-y-3">
            <Field label="Nombre" name="new_product_name">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </Field>
            <Field label="SKU (opcional)" name="new_product_sku">
              <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} />
            </Field>
          </div>
          <div className="sb-dialog__footer">
            <SBButton type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</SBButton>
            <SBButton type="button" variant="primary" onClick={createOutputNow} disabled={!newName.trim()}>Crear</SBButton>
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
  const [archiving, setArchiving] = useState<{ id: string; name: string } | null>(null);

  const recipesAll = useMemo(() => santaData?.billOfMaterials || [], [santaData]);
  const recipes = useMemo(() => recipesAll.filter((r: any) => r.isActive !== false), [recipesAll]);
  const allItems = useMemo(() => santaData?.items || [], [santaData]);

  const select = useCallback((id: string) => {
    const recipe = recipesAll.find(r => r.id === id);
    if (recipe) { setOpenRecipe(recipe as BomWithStage); setIsNew(false); }
  }, [recipesAll]);

  const createNew = useCallback(() => {
    setOpenRecipe({ id: `bom_${Date.now()}`, outputItemId: "", name: "", batchSize: 1, baseUnit: "L", stage: "PRODUCCION", items: [] } as BomWithStage);
    setIsNew(true);
  }, []);

  // ✅ Leer query params de la URL al cargar (después de definir createNew)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const name = params.get('new_product_name');
      const sku = params.get('new_product_sku');
      
      // Si hay parámetros, crear nueva receta automáticamente
      if (name || sku) {
        createNew();
        // Limpiar la URL sin recargar
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [createNew]); // Incluir createNew en dependencias

  const handleSave = useCallback(async (values: BomWithStage) => {
    const result = await upsertBOM(values);
    if (result.ok && santaData) {
      const updated = [...santaData.billOfMaterials];
      const idx = updated.findIndex(b => b.id === values.id);
      if (idx > -1) updated[idx] = values as RecipeBom;
      else updated.unshift(values as RecipeBom);
      saveAllCollections({ billOfMaterials: updated });
      setOpenRecipe(null);
      setIsNew(false);
    }
    return result;
  }, [santaData, saveAllCollections]);

  const onArchive = useCallback(async () => {
    if (!archiving) return;
    const { id } = archiving;
    setArchiving(null);
    const res = await archiveBOM({ bomId: id });
    if (res.ok && santaData) {
      const updated = santaData.billOfMaterials.map((b: any) => b.id === id ? { ...b, isActive: false } : b);
      saveAllCollections({ billOfMaterials: updated });
      setOpenRecipe(cur => (cur?.id === id ? null : cur));
      setIsNew(false);
      toast.success("Receta archivada.");
    } else {
        const message = (res as { message?: string }).message || "No se pudo archivar.";
        toast.error(message);
    }
  }, [archiving, santaData, saveAllCollections]);

  const onQuickCreateItem = useCallback(async (payload: QuickCreatePayload): Promise<{ sku: string }> => {
    const result = await upsertMinimalProduct({ sku: payload.sku, name: payload.name, packSizeMl: 700 });
    if (!result.ok) {
        // Corregido para manejar el tipo de error de forma segura
        const errorMessage = (result as { message?: string }).message || "Error al crear el producto.";
        throw new Error(errorMessage);
    }
    const { itemId } = result.data;
    const newItem: Item = { id: itemId, name: payload.name, sku: payload.sku ?? "", category: payload.category } as Item;
    const nextItems = [...(santaData?.items || []), newItem];
    await saveAllCollections({ items: nextItems });
    return { itemId };
  }, [santaData, saveAllCollections]);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-xl font-semibold text-foreground">Recetas (BOM)</h2>
                <p className="text-sm text-muted-foreground">Producción (PI) y Envasado (FG)</p>
            </div>
            <SBButton type="button" variant="primary" onClick={createNew} aria-label="Crear nueva receta">
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva receta</span>
            </SBButton>
        </div>
      <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SBCard title="Recetas">
              <div className="p-2 space-y-1">
                {recipes.map((r: any) => {
                  const outputItem = allItems.find(it => it.id === r.outputItemId);
                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => select(r.id)}
                      onKeyDown={e => (e.key === "Enter" || e.key === " ") && select(r.id)}
                      className={cn(
                        "rounded-lg p-3 border transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                        openRecipe?.id === r.id ? "bg-primary/10 border-primary/50" : "border-transparent hover:bg-secondary"
                      )}
                      aria-label={`Abrir receta ${r.name || r.id}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-base font-bold text-foreground">{outputItem?.name || r.outputItemId || "Sin producto"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.name || "Sin nombre de receta"}</p>
                          {r.stage && <Badge variant="secondary" className="mt-1 text-[10px]">{r.stage}</Badge>}
                        </div>
                        <SBButton type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setArchiving({ id: r.id, name: r.name }); }}>
                            Archivar
                        </SBButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SBCard>
          </div>

          <div className="lg:col-span-2">
            {!openRecipe ? (
              <EmptyState icon={Factory} title="Selecciona una receta" description="Selecciona una receta de la lista para ver sus detalles o crea una nueva para empezar." />
            ) : (
              <RecipeForm
                initialValues={openRecipe}
                onSave={handleSave}
                onCancel={() => { setOpenRecipe(null); setIsNew(false); }}
                allItems={allItems}
                isNew={isNew}
                onQuickCreateItem={onQuickCreateItem}
              />
            )}
          </div>
        </div>

      <SBDialog open={!!archiving} onOpenChange={(isOpen) => !isOpen && setArchiving(null)}>
        <SBDialogContent title="Confirmar archivado">
          <div className="sb-dialog__body">
            <p className="text-muted-foreground">¿Estás seguro de que quieres archivar la receta <strong>{archiving?.name}</strong>? Esta acción no se puede deshacer.</p>
          </div>
          <div className="sb-dialog__footer">
            <SBButton type="button" variant="ghost" onClick={() => setArchiving(null)}>Cancelar</SBButton>
            <SBButton type="button" variant="destructive" onClick={onArchive} disabled={!archiving}>Archivar</SBButton>
          </div>
        </SBDialogContent>
      </SBDialog>
    </div>
  );
}
