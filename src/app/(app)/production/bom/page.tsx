// src/app/(app)/production/bom/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Droplets, Package2, Coins, Info, Trash2 } from "lucide-react";
import { SBCard } from '@/components/ui/ui-primitives';
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import { listFinishedSkus } from "@/features/production/ssot-bridge";
import type { BillOfMaterial as RecipeBom, Uom, InventoryItem } from "@/domain/ssot";
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
type FinishedSku = { sku: string; name: string; packSizeMl: number; };

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
  inventoryItems,
  finishedSkus,
}: {
  initialValues: RecipeBom;
  onSave: (values: RecipeBom) => Promise<any>;
  onCancel: () => void;
  inventoryItems: InventoryItem[];
  finishedSkus: FinishedSku[];
}) {
  const fm = useBomForm(initialValues);
  const { data: santaData } = useData();
  const { push } = useToaster();
  const [isNewSku, setIsNewSku] = useState(false);
  
  const addLine = (role: 'FORMULA' | 'PACKAGING' = 'FORMULA') => {
    const newItems = [...(fm.values.items || []), { materialId: "", quantity: 0, unit: "uds", role }];
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
      if (!it.materialId) errs[`items.${idx}.materialId`] = "Material requerido";
      if (!(it.quantity > 0)) errs[`items.${idx}.quantity`] = "Cantidad > 0";
    });
    return errs;
  }

  async function handleSave() {
    fm.setSaving(true);
    fm.setLastError(undefined);
    fm.setFieldErrors(undefined);
    // ✅ validación ligera cliente
    const clientErrs = validateClient(fm.values as RecipeBom);
    if (Object.keys(clientErrs).length) {
      fm.setSaving(false);
      fm.setFieldErrors(clientErrs);
      push({ kind: "err", text: "Revisa los campos marcados" });
      setTimeout(() => focusFirstError(clientErrs), 0);
      return;
    }

    // 1) si el producto es nuevo, créalo antes
    if (isNewSku) {
      const errs: Record<string,string> = {};
      if (!fm.values.sku) errs["sku"] = "SKU requerido";
      if (!fm.values.name) errs["name"] = "Nombre requerido";
      if (Object.keys(errs).length) {
        fm.setSaving(false);
        fm.setFieldErrors(errs);
        push({ kind: "err", text: "Revisa los campos del nuevo producto" });
        setTimeout(() => focusFirstError(errs), 0);
        return;
      }
      const pRes = await upsertMinimalProduct({
        sku: fm.values.sku,
        name: fm.values.name,
        packSizeMl: (fm.values as any).packSizeMl ?? undefined,
      });
      if (!pRes.ok) {
        fm.setSaving(false);
        fm.setLastError(pRes.message);
        fm.setFieldErrors(pRes.fieldErrors);
        push({ kind: "err", text: pRes.message });
        setTimeout(() => focusFirstError(pRes.fieldErrors), 0);
        return;
      }
    }

    const inv = santaData?.inventory || [];
    const normalized = {
      ...fm.values,
      items: (fm.values.items || []).map(it => ({
        ...it,
        unit: canonicalUomForMaterial(it.materialId, inv, inventoryItems), // fuerza canónica
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

  const uomOptions: Uom[] = ['uds', 'kg', 'g', 'L', 'mL', 'bottle', 'case', 'pallet'];

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
        {/* Toggle nuevo producto */}
        <div className="flex items-center gap-2">
          <input id="new-sku" type="checkbox" className="h-4 w-4"
                 checked={isNewSku} onChange={e => setIsNewSku(e.target.checked)} />
          <label htmlFor="new-sku" className="text-sm text-zinc-700">Producto nuevo</label>
        </div>
        {!isNewSku ? (
          <Field label="SKU Producto Terminado" name="sku" required error={fm.fieldErrors?.sku}>
            <select className="w-full h-10 px-3 rounded-lg border" value={fm.values.sku} onChange={e => fm.set("sku", e.target.value)}>
              <option value="">Selecciona SKU</option>
              {finishedSkus.map(s => <option key={s.sku} value={s.sku}>{s.name}</option>)}
            </select>
          </Field>
        ) : (
          <>
            <Field label="SKU nuevo" name="sku" required error={fm.fieldErrors?.sku}>
              <input className="w-full h-10 px-3 rounded-lg border" placeholder="p.ej. SB-MARG-700"
                     value={fm.values.sku} onChange={e => fm.set("sku", e.target.value)} />
            </Field>
            <Field label="Nombre del producto" name="name" required error={fm.fieldErrors?.name}>
              <input className="w-full h-10 px-3 rounded-lg border" placeholder="p.ej. Santa Brisa Margarita 700ml"
                     value={fm.values.name} onChange={e => fm.set("name", e.target.value)} />
            </Field>
            <Field label="Contenido (mL)" name="packSizeMl" error={fm.fieldErrors?.packSizeMl}>
              <input type="number" className="w-full h-10 px-3 rounded-lg border"
                     value={(fm.values as any).packSizeMl ?? ""} onChange={e => fm.set("packSizeMl" as any, Number(e.target.value))} />
            </Field>
          </>
        )}
        <Field label="Nombre Receta" name="name" required error={fm.fieldErrors?.name}>
          <input className="w-full h-10 px-3 rounded-lg border" value={fm.values.name} onChange={e => fm.set("name", e.target.value)} />
        </Field>
        <Field label="Tamaño de Lote" name="batchSize" required error={fm.fieldErrors?.batchSize}>
          <input type="number" className="w-full h-10 px-3 rounded-lg border" value={fm.values.batchSize} onChange={e => fm.set("batchSize", Number(e.target.value))} />
        </Field>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-zinc-700">Líneas de la receta</h4>
          {fm.fieldErrors?.items && <Banner kind="warn" text={fm.fieldErrors.items} />}
          {(fm.values.items || []).map((line: BomLine, i: number) => (
             <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md">
                <Field label="Material" name={`items[${i}].materialId`} required error={fm.fieldErrors?.[`items.${i}.materialId`]}>
                     <select className="w-full h-10 px-3 rounded-lg border" value={line.materialId} onChange={e => fm.set(`items[${i}].materialId`, e.target.value)}>
                        <option value="">Selecciona material</option>
                        {inventoryItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                     </select>
                </Field>
                 <Field label="Cantidad" name={`items[${i}].quantity`} required error={fm.fieldErrors?.[`items.${i}.quantity`]}>
                    <input type="number" className="w-full h-10 px-3 rounded-lg border" value={line.quantity} onChange={e => fm.set(`items[${i}].quantity`, Number(e.target.value))} />
                 </Field>
                 <div className="text-xs text-zinc-600">
                  UoM: <span className="px-2 py-0.5 rounded-full border bg-zinc-50">
                    {line.materialId ? canonicalUomForMaterial(line.materialId, santaData?.inventory || [], inventoryItems) : '-'}
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
    const inventoryItems = useMemo(() => santaData?.inventory || [], [santaData]);
    const finishedSkus = useMemo(() => listFinishedSkus(santaData?.inventory || []), [santaData]);
    
    const select = (id: string) => {
        const recipe = recipes.find((r) => r.id === id);
        if(recipe) setOpenRecipe(recipe);
    };

    const createNew = () => {
        setOpenRecipe({ id: `bom_${Date.now()}`, sku: "", name: "", batchSize: 100, items: [] } as RecipeBom);
    };

    const handleSave = async (values: RecipeBom) => {
        const inv = santaData?.inventory || [];
        const normalized = {
            ...values,
            items: (values.items || []).map(it => ({
                ...it,
                unit: canonicalUomForMaterial(it.materialId, inv, inventoryItems), // fuerza canónica
            })),
        };
        const result = await upsertBOM(normalized);
        if (result.ok) {
            // Actualizar el estado local directamente
            if (santaData) {
                const updatedBoms = [...(santaData.billOfMaterials || [])];
                const index = updatedBoms.findIndex(b => b.id === values.id);
                if (index > -1) {
                    updatedBoms[index] = normalized as RecipeBom;
                } else {
                    updatedBoms.unshift(normalized as RecipeBom);
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
                            {recipes.map((r) => (
                                <div key={r.id} className={`rounded-lg p-3 border transition-colors ${openRecipe?.id === r.id ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-zinc-50"}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-zinc-800">{r.name || "—"}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{r.sku || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end gap-2">
                                        <button onClick={() => select(r.id)} className="px-3 py-1 text-xs rounded-lg border border-zinc-300 hover:bg-zinc-100">
                                            Abrir
                                        </button>
                                    </div>
                                </div>
                            ))}
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
                            inventoryItems={inventoryItems}
                            finishedSkus={finishedSkus}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
