// src/features/dashboard-ventas/components/TaskCompletionDialog.tsx
"use client";
import React, { useState } from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import type { Interaction } from '@/domain/ssot';
import { Save, Bot } from 'lucide-react';

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
                description="Escribe lo que ha pasado. Santa Brain leerá tu nota para crear pedidos, próximas visitas, etc."
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
                            placeholder="Ej: 'El cliente quiere un pedido de 5 cajas para la semana que viene. Quiere que le visitemos de nuevo el viernes 25 para revisar el material PLV.'"
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            rows={5}
                            required
                        />
                    </label>
                    <div className="flex items-center justify-end gap-2 text-xs text-zinc-500 pt-2">
                        <Bot size={14}/>
                        <span>Santa Brain procesará esta nota para automatizar las acciones.</span>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
