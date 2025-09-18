
// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useState } from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import type { Interaction } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { ShoppingCart, MessageSquare, Plus, X } from 'lucide-react';

export function TaskCompletionDialog({ task, open, onClose, onComplete }: {
    task: Interaction;
    open: boolean;
    onClose: () => void;
    onComplete: (taskId: string, payload: { type: 'venta', items: { sku: string, qty: number }[] } | { type: 'interaccion', note: string, nextActionDate?: string }) => void;
}) {
    const { data } = useData();
    const [mode, setMode] = useState<'venta' | 'interaccion'>('interaccion');
    
    // State for "interaccion"
    const [note, setNote] = useState('');
    const [nextActionDate, setNextActionDate] = useState('');

    // State for "venta"
    const [items, setItems] = useState<{ sku: string, qty: number }[]>([{ sku: 'SB-750', qty: 1 }]);

    const addLine = () => setItems(prev => [...prev, { sku: '', qty: 1 }]);
    const updateLine = (index: number, field: 'sku' | 'qty', value: string | number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };
    const removeLine = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = () => {
        if (mode === 'interaccion') {
            if (!note) {
                alert('La nota de resultado es obligatoria.');
                return;
            }
            onComplete(task.id, { type: 'interaccion', note, nextActionDate: nextActionDate || undefined });
        } else { // venta
            if (items.some(it => !it.sku || it.qty <= 0)) {
                alert('Revisa las líneas del pedido. Todas deben tener SKU y cantidad mayor a cero.');
                return;
            }
            onComplete(task.id, { type: 'venta', items });
        }
    };
    
    const productOptions = (data?.products || []).filter(p => p.kind === 'FG');

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={`Resultado de: ${task.note}`}
                description="Registra qué ha pasado. Esto completará la tarea."
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                primaryAction={{ label: 'Guardar y Completar', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: onClose }}
            >
                <div className="space-y-4 pt-2">
                    <div className="flex gap-2 border-b pb-4">
                        <button 
                            type="button"
                            onClick={() => setMode('interaccion')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'interaccion' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                            <MessageSquare size={16} /> Interacción
                        </button>
                         <button 
                            type="button"
                            onClick={() => setMode('venta')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'venta' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                            <ShoppingCart size={16} /> Venta
                        </button>
                    </div>

                    {mode === 'interaccion' ? (
                        <div className="space-y-3 animate-in fade-in">
                             <label className="grid gap-1.5">
                                <span className="text-sm font-medium text-zinc-700">Nota / Resultado</span>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Ej: El cliente está contento, pero de momento no necesita más producto."
                                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                    rows={4}
                                    required
                                />
                            </label>
                             <label className="grid gap-1.5">
                                <span className="text-sm font-medium text-zinc-700">Próxima acción (opcional)</span>
                                <input
                                    type="datetime-local"
                                    value={nextActionDate}
                                    onChange={(e) => setNextActionDate(e.target.value)}
                                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                />
                            </label>
                        </div>
                    ) : (
                         <div className="space-y-3 animate-in fade-in">
                            <span className="text-sm font-medium text-zinc-700">Líneas del Pedido</span>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                                        <select 
                                            value={item.sku}
                                            onChange={e => updateLine(index, 'sku', e.target.value)}
                                            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                        >
                                            <option value="" disabled>Selecciona producto</option>
                                            {productOptions.map(p => <option key={p.sku} value={p.sku}>{p.name}</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={e => updateLine(index, 'qty', parseInt(e.target.value, 10))}
                                            className="h-10 w-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                        />
                                        <button type="button" onClick={() => removeLine(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md"><X size={16}/></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addLine} className="text-sm flex items-center gap-1 text-blue-600 hover:underline">
                                <Plus size={14}/> Añadir línea
                            </button>
                        </div>
                    )}
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
