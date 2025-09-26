// src/features/bom/RecipeForm.tsx
"use client";
import React, { useMemo } from 'react';
import type { BillOfMaterial as RecipeBom, Item } from '@/domain/ssot';
import { useBomForm } from './useBomForm';
import { FormStatusBar } from '@/components/ui/FormStatusBar';
import { Plus, Trash2 } from 'lucide-react';

type BomStage = 'PRODUCCION' | 'ENVASADO';
type BomWithStage = RecipeBom & { stage?: BomStage };

interface RecipeFormProps {
    initialValues: BomWithStage;
    onSave: (values: BomWithStage) => Promise<any>;
    onCancel: () => void;
    allItems: Item[];
    lastError?: string | null;
    onCreateProduct: (data: { sku: string; name: string; packSizeMl?: number }) => Promise<{ itemId: string }>;
    onCreateMaterial: (data: { sku: string; name: string; }) => Promise<{ itemId: string }>;
}

export function RecipeForm({ initialValues, onSave, onCancel, allItems, lastError, onCreateProduct, onCreateMaterial }: RecipeFormProps) {
    const fm = useBomForm(initialValues);

    const itemsRM = useMemo(() => allItems.filter(it => (it as any).category === "raw"), [allItems]);
    const itemsPKG = useMemo(() => allItems.filter(it => (it as any).category === "pack"), [allItems]);
    const itemsPI = useMemo(() => allItems.filter(it => (it as any).category === "intermediate"), [allItems]);
    const itemsFG = useMemo(() => allItems.filter(it => (it as any).category === "fg"), [allItems]);

    const isProd = (fm.values as BomWithStage).stage === "PRODUCCION";

    const handleSubmit = async () => {
        fm.setSaving(true);
        try {
            const normalized = {
                ...fm.values,
                items: fm.values.items.filter(i => i.itemId && i.qty > 0)
            };
            await onSave(normalized as BomWithStage);
        } catch (e: any) {
            if (e.fieldErrors) fm.setFieldErrors(e.fieldErrors);
        } finally {
            fm.setSaving(false);
        }
    };

    const addLine = () => {
        const newLine = { itemId: "", qty: 0, role: "FORMULA" as const, uom: "kg" as const };
        fm.set("items", [...fm.values.items, newLine]);
    };

    const removeLine = (index: number) => {
        fm.set("items", fm.values.items.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-white border rounded-lg p-4 space-y-4 h-full flex flex-col">
            <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{fm.values.name || "Nueva Receta"}</h3>
                    <div className="flex items-center gap-2">
                         <div className="inline-flex rounded-md border p-0.5">
                            <button onClick={() => fm.set("stage", "PRODUCCION" as BomStage)} className={`px-2 py-1 text-xs rounded ${isProd ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Producción</button>
                            <button onClick={() => fm.set("stage", "ENVASADO" as BomStage)} className={`px-2 py-1 text-xs rounded ${!isProd ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Envasado</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Nombre de la receta" value={fm.values.name} onChange={e => fm.set("name", e.target.value)} className="w-full border-b pb-1 outline-none" />
                    <select value={fm.values.outputItemId} onChange={e => fm.set("outputItemId", e.target.value)} className="w-full border-b pb-1">
                        <option value="">-- Producto de Salida --</option>
                        {(isProd ? itemsPI : itemsFG).map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                </div>

                {/* Lines */}
                <div className="space-y-2">
                    {fm.values.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                            <select value={item.itemId} onChange={e => fm.set(`items[${index}].itemId`, e.target.value)} className="w-full border-b pb-1 text-sm">
                                <option value="">-- Material --</option>
                                <optgroup label="Materias Primas">
                                    {itemsRM.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                </optgroup>
                                <optgroup label="Packaging">
                                    {itemsPKG.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                </optgroup>
                            </select>
                            <input type="number" placeholder="Cantidad" value={item.qty} onChange={e => fm.set(`items[${index}].qty`, Number(e.target.value))} className="w-full border-b pb-1 text-sm text-right" />
                            <select value={item.uom} onChange={e => fm.set(`items[${index}].uom`, e.target.value)} className="w-full border-b pb-1 text-sm">
                                <option value="kg">kg</option><option value="L">L</option><option value="unit">unit</option>
                            </select>
                            <button onClick={() => removeLine(index)} className="p-1 text-red-500 hover:bg-red-50 rounded-md">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button onClick={addLine} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <Plus size={14} /> Añadir línea
                    </button>
                </div>
            </div>

            <div className="flex-shrink-0 pt-4 border-t space-y-3">
                {lastError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{lastError}</div>}
                <FormStatusBar dirty={fm.dirty} saving={fm.saving} />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border">Cancelar</button>
                    <button onClick={handleSubmit} disabled={fm.saving || !fm.dirty} className="px-4 py-2 text-sm rounded-md bg-zinc-900 text-white disabled:opacity-50">
                        {fm.saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
