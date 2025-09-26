// src/app/(app)/production/bom/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Droplets, Package2, Coins, Info, Trash2 } from "lucide-react";
import { SBCard } from '@/components/ui/ui-primitives';
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import type { BillOfMaterial as RecipeBom, Uom, Item } from "@/domain/ssot";
import { canonicalUomForMaterial } from '@/domain/uom';

// Nuevos imports para el formulario mejorado
import { useToaster } from "@/components/ui/Toaster";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field, focusFirstError } from "@/components/forms/Field";
import { useBomForm } from "@/features/bom/useBomForm";
import { upsertBOM, upsertMinimalProduct } from "./actions";

// Tipos y helpers que ya estaban
type BomLine = RecipeBom['items'][0];

function remapArrayFieldErrors(
  errs: Record<string,string>|undefined,
  base: string,
  removedIndex: number
) {
  if (!errs) return errs;
  const out: Record<string,string> = {};
  const prefix = base + ".";
  for (const [k, v] of Object.entries(errs)) {
    if (!k.startsWith(prefix)) { out[k] = v; continue; }
    const rest = k.slice(prefix.length); // "3.quantity"
    const [idxStr, ...tail] = rest.split(".");
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) { out[k] = v; continue; }
    if (idx === removedIndex) continue;             // elimina errores de la fila borrada
    if (idx > removedIndex) {
      const nk = `${base}.${idx - 1}.${tail.join(".")}`; // reindexa
      out[nk] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function RecipeForm({
  initialValues,
  onSave,
  onCancel,
  allItems,
}: {
  initialValues: RecipeBom;
  onSave: (values: RecipeBom) => Promise<any>;
  onCancel: () => void;
  allItems: Item[];
}) {
  const fm = useBomForm(initialValues);
  const { data: santaData } = useData();
  const { push } = useToaster();
  const [isNewSku, setIsNewSku] = useState(false);
  
  const finishedGoods = useMemo(() => allItems.filter(it => it.category === 'fg'), [allItems]);

  const addLine = (role: 'FORMULA' | 'PACKAGING' = 'FORMULA') => {
    const newItems = [...(fm.values.items || []), { itemId: "", qty: 0, uom: "uds" as Uom, role }];
    fm.set("items", newItems);
  };

  const removeLine = (i: number) => {
    const newItems = (fm.values.items || []).filter((_: any, idx: number) => idx !== i);
    fm.set("items", newItems);
    fm.setFieldErrors(e => remapArrayFieldErrors(e, "items", i)); // ✅ reindexa errores
  };

  function validateClient(values: RecipeBom) {
    const errs: Record<string,string> = {};
    if (!values.items?.length) errs["items"] = "Añade al menos una línea";
    values.items?.forEach((it, idx) => {
      if (!it.itemId) errs[`items.${idx}.itemId`] = "Material requerido";
      if (!(it.qty > 0)) errs[`items.${idx}.qty`] = "Cantidad > 0";
    });
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
    
    // Al guardar, normalizamos la UoM para asegurar consistencia
    const inventory = santaData?.inventory || [];
    const items = santaData?.items || [];
    const normalized = {
      ...fm.values,
      items: (fm.values.items || []).map(it => ({
        ...it,
        uom: canonicalUomForMaterial(it.itemId, inventory, items), // fuerza canónica
      })),
    };

    const res = await onSave(normalized as RecipeBom);
    fm.setSaving(false);

    if (res.ok) {
      push({ kind: "ok", text: "Receta guardada con éxito" });
    } else {
      fm.setLastError(res.message);
      fm.setFieldErrors(res.fieldErrors);
      push({ kind: "err", text: res.message });
      setTimeout(() => focusFirstError(res.fieldErrors), 0);
    }
  }

  // ⚠️ Confirmación al salir con cambios
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!fm.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [fm.dirty]);

  // ⌘/Ctrl+S para guardar
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

  return (
    <SBCard title={fm.values.id ? `Editando: ${fm.values.name}` : "Nueva Receta"} accent={SB_COLORS.primary.teal}>
      <div className="p-4 space-y-4">
        {fm.lastError && <Banner kind="err" text={fm.lastError} />}
        <Field label="ID" name="id" required error={fm.fieldErrors?.id}>
          <input className="w-full h-10 px-3 rounded-lg border" value={fm.values.id} onChange={e => fm.set("id", e.target.value)} />
        </Field>
        
        <Field label="Producto Terminado (Output)" name="outputItemId" required error={fm.fieldErrors?.outputItemId}>
          <select className="w-full h-10 px-3 rounded-lg border" value={fm.values.outputItemId} onChange={e => fm.set("outputItemId", e.target.value)}>
            <option value="">Selecciona Producto</option>
            {finishedGoods.map(s => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
          </select>
        </Field>

        <Field label="Nombre Receta" name="name" required error={fm.fieldErrors?.name}>
          <input className="w-full h-10 px-3 rounded-lg border" value={fm.values.name} onChange={e => fm.set("name", e.target.value)} />
        </Field>
        
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tamaño de Lote" name="batchSize" required error={fm.fieldErrors?.batchSize}>
            <input type="number" className="w-full h-10 px-3 rounded-lg border" value={fm.values.batchSize} onChange={e => fm.set("batchSize", Number(e.target.value))} />
          </Field>
          <Field label="Unidad Base" name="baseUnit" required error={fm.fieldErrors?.baseUnit}>
             <select className="w-full h-10 px-3 rounded-lg border" value={fm.values.baseUnit} onChange={e => fm.set("baseUnit", e.target.value as Uom)}>
                <option value="L">Litros (L)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="uds">Unidades (uds)</option>
              </select>
          </Field>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-zinc-700">Líneas de la receta</h4>
          {fm.fieldErrors?.items && <Banner kind="warn" text={fm.fieldErrors.items} />}
          {(fm.values.items || []).map((line: BomLine, i: number) => (
             <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md">
                <Field label="Material" name={`items[${i}].itemId`} required error={fm.fieldErrors?.[`items.${i}.itemId`]}>
                     <select className="w-full h-10 px-3 rounded-lg border" value={line.itemId} onChange={e => fm.set(`items[${i}].itemId`, e.target.value)}>
                        <option value="">Selecciona material</option>
                        {allItems.filter(it => it.category !== 'fg').map(m => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
                     </select>
                </Field>
                 <Field label="Cantidad" name={`items[${i}].qty`} required error={fm.fieldErrors?.[`items.${i}.qty`]}>
                    <input type="number" className="w-full h-10 px-3 rounded-lg border" value={line.qty} onChange={e => fm.set(`items[${i}].qty`, Number(e.target.value))} />
                 </Field>
                 <div className="text-xs text-zinc-600">
                  UoM: <span className="px-2 py-0.5 rounded-full border bg-zinc-50">
                    {line.itemId ? canonicalUomForMaterial(line.itemId, santaData?.inventory || [], allItems) : '-'}
                  </span>
                 </div>
                 <button onClick={() => removeLine(i)} className="h-10 px-2 border bg-white hover:bg-red-50 text-red-600 rounded-lg" aria-label={`Eliminar línea ${i+1}`}><Trash2 size={16}/></button>
              </div>
          ))}
          <button onClick={() => addLine()} className="px-3 py-1.5 text-sm border bg-white rounded-lg">
            <Plus size={14} className="inline mr-1" /> Añadir línea
          </button>
        </div>
      </div>
      <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
        <button type="button" onClick={onSafeCancel} className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white">Cancelar</button>
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

export default function BomPage() {
    const { data: santaData, saveAllCollections } = useData();
    const [openRecipe, setOpenRecipe] = useState<RecipeBom | null>(null);

    const recipes = useMemo(() => santaData?.billOfMaterials || [], [santaData]);
    const allItems = useMemo(() => santaData?.items || [], [santaData]);
    
    const select = (id: string) => {
        const recipe = recipes.find((r) => r.id === id);
        if(recipe) setOpenRecipe(recipe);
    };

    const createNew = () => {
        setOpenRecipe({ id: `bom_${Date.now()}`, outputItemId: "", name: "", batchSize: 100, baseUnit: "L", items: [] } as RecipeBom);
    };

    const handleSave = async (values: RecipeBom) => {
        const result = await upsertBOM(values);
        if (result.ok) {
            if (santaData) {
                const updatedBoms = [...(santaData.billOfMaterials || [])];
                const index = updatedBoms.findIndex(b => b.id === values.id);
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
                    <p className="text-sm text-zinc-500">Fórmula, packaging, costes y versionado</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={createNew} className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 flex items-center gap-2">
                        <Plus size={16} /> Nueva receta
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <SBCard title="Recetas" accent={SB_COLORS.primary.teal}>
                        <div className="p-2 space-y-1">
                            {recipes.map((r) => {
                                const outputItem = allItems.find(it => it.id === r.outputItemId);
                                return (
                                <div key={r.id} className={`rounded-lg p-3 border transition-colors ${openRecipe?.id === r.id ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-zinc-50"}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-zinc-800">{r.name || "—"}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{outputItem?.name || r.outputItemId || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end gap-2">
                                        <button onClick={() => select(r.id)} className="px-3 py-1 text-xs rounded-lg border border-zinc-300 hover:bg-zinc-100">
                                            Abrir
                                        </button>
                                    </div>
                                </div>
                            )})}
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
