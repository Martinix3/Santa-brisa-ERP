// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useState } from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import type { Interaction } from '@/domain/ssot';
import { ShoppingCart, Calendar } from 'lucide-react';

export function TaskCompletionDialog({ task, open, onClose, onComplete }: {
    task: Interaction;
    open: boolean;
    onClose: () => void;
    onComplete: (taskId: string, resultNote: string) => void;
}) {
    const [resultNote, setResultNote] = useState('');

    const handleSubmit = () => {
        if (!resultNote) {
            alert('Por favor, añade un resumen del resultado.');
            return;
        }
        onComplete(task.id, resultNote);
    };

    return (
        <SBDialog open={open} onOpenChange={onClose}>
            <SBDialogContent
                title={`Completar: ${task.note}`}
                description="Registra el resultado de la interacción."
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                primaryAction={{ label: 'Guardar y Completar', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: onClose }}
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">Resumen de la interacción</span>
                        <textarea
                            value={resultNote}
                            onChange={(e) => setResultNote(e.target.value)}
                            placeholder="¿Qué ha pasado? ¿De qué se ha hablado? Sé lo más detallado posible, la IA usará esto para sugerir próximos pasos."
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            rows={5}
                            required
                        />
                    </label>
                    
                    <div className="pt-2 border-t">
                         <span className="text-sm font-medium text-zinc-700">Acciones rápidas (Próximamente)</span>
                         <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border bg-white hover:bg-zinc-50 border-zinc-300 disabled:opacity-50"
                                disabled={true}
                            >
                                <ShoppingCart size={16} /> Crear Pedido
                            </button>
                             <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border bg-white hover:bg-zinc-50 border-zinc-300 disabled:opacity-50"
                                disabled={true}
                            >
                                <Calendar size={16} /> Agendar Seguimiento
                            </button>
                         </div>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
