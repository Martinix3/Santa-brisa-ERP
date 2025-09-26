// src/app/(app)/production/bom/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Droplets, Package2, Coins, Info, Trash2 } from "lucide-react";
import { SBCard } from '@/components/ui/ui-primitives';
import { SB_COLORS } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import { listMaterials, listFinishedSkus } from "@/features/production/ssot-bridge";
import type { Material, BillOfMaterial as RecipeBom, Uom } from "@/domain/ssot";

// Nuevos imports para el formulario mejorado
import { useToaster } from "@/components/ui/Toaster";
import { Banner } from "@/components/ui/Banner";
import { SpinnerButton } from "@/components/ui/SpinnerButton";
import { Field, focusFirstError } from "@/components/forms/Field";
import { useBomForm } from "@/features/bom/useBomForm";
import { upsertBOM } from "./actions";

// Tipos y helpers que ya estaban
type BomLine = RecipeBom['items'][0];
type FinishedSku = { sku: string; name: string; packSizeMl: number; };

function RecipeForm({
  initialValues,
  onSave,
  onCancel,
  materials,
  finishedSkus,
}: {
  initialValues: RecipeBom;
  onSave: (values: RecipeBom) => Promise<any>;
  onCancel: () => void;
  materials: Material[];
  finishedSkus: FinishedSku[];
}) {
  const fm = useBomForm(initialValues);
  const { push } = useToaster();
  
  const addLine = (role: 'FORMULA' | 'PACKAGING') => {
    const newItems = [...(fm.values.items || []), { materialId: "", quantity: 0, unit: "uds", role }];
    fm.set("items", newItems);
  };
  const removeLine = (i: number) => {
    const newItems = (fm.values.items || []).filter((_: any, idx: number) => idx !== i);
    fm.set("items", newItems);
  };

  async function handleSave() {
    fm.setSaving(true);
    fm.setLastError(undefined);
    fm.setFieldErrors(undefined);
    const res = await onSave(fm.values);
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

  return (
    <SBCard title={fm.values.id ? `Editando: ${fm.values.name}` : "Nueva Receta"} accent={SB_COLORS.primary.teal}>
      <div className="p-4 space-y-4">
        {fm.lastError && <Banner kind="err" text={fm.lastError} />}
        <Field label="ID" name="id" required error={fm.fieldErrors?.id}>
          <input className="w-full h-10 px-3 rounded-lg border" value={fm.values.id} onChange={e => fm.set("id", e.target.value)} />
        </Field>
        <Field label="SKU Producto Terminado" name="sku" required error={fm.fieldErrors?.sku}>
          <select className="w-full h-10 px-3 rounded-lg border" value={fm.values.sku} onChange={e => fm.set("sku", e.target.value)}>
            <option value="">Selecciona SKU</option>
            {finishedSkus.map(s => <option key={s.sku} value={s.sku}>{s.name}</option>)}
          </select>
        </Field>
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
             <div key={i} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-end p-2 border rounded-md">
                <Field label="Material" name={`items[${i}].materialId`} required error={fm.fieldErrors?.[`items.${i}.materialId`]}>
                     <input className="w-full h-10 px-3 rounded-lg border" value={line.materialId} onChange={e => fm.set(`items[${i}].materialId`, e.target.value)} />
                </Field>
                 <Field label="Cantidad" name={`items[${i}].quantity`} required error={fm.fieldErrors?.[`items.${i}.quantity`]}>
                    <input type="number" className="w-full h-10 px-3 rounded-lg border" value={line.quantity} onChange={e => fm.set(`items[${i}].quantity`, Number(e.target.value))} />
                 </Field>
                 <button onClick={() => removeLine(i)} className="h-10 px-2 border bg-white hover:bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
             </div>
          ))}
          <button onClick={() => addLine("FORMULA")} className="px-3 py-1.5 text-sm border bg-white rounded-lg">
            <Plus size={14} className="inline mr-1" /> Añadir línea
          </button>
        </div>
      </div>
      <div className="p-4 bg-zinc-50 border-t flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white">Cancelar</button>
        <SpinnerButton loading={fm.saving} onClick={handleSave} className="bg-zinc-900 text-white">Guardar</SpinnerButton>
      </div>
    </SBCard>
  );
}

export default function BomPage() {
    const { data: santaData, saveAllCollections } = useData();
    const [openRecipe, setOpenRecipe] = useState<RecipeBom | null>(null);

    const recipes = useMemo(() => santaData?.billOfMaterials || [], [santaData]);
    const materials = useMemo(() => santaData?.materials || [], [santaData]);
    const finishedSkus = useMemo(() => listFinishedSkus(santaData?.products || []), [santaData]);
    
    const select = (id: string) => {
        const recipe = recipes.find((r) => r.id === id);
        if(recipe) setOpenRecipe(recipe);
    };

    const createNew = () => {
        setOpenRecipe({ id: `bom_${Date.now()}`, sku: "", name: "", batchSize: 100, items: [] } as RecipeBom);
    };

    const handleSave = async (values: RecipeBom) => {
        const result = await upsertBOM(values);
        if (result.ok) {
            // Actualizar el estado local directamente
            if (santaData) {
                const updatedBoms = [...(santaData.billOfMaterials || [])];
                const index = updatedBoms.findIndex(b => b.id === values.id);
                if (index > -1) {
                    updatedBoms[index] = values;
                } else {
                    updatedBoms.unshift(values);
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
                            materials={materials}
                            finishedSkus={finishedSkus}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
