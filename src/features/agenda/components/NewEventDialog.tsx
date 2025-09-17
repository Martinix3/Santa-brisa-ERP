
// src/features/agenda/components/NewEventDialog.tsx
"use client";
import React, { useState } from 'react';
import { SBDialog, SBDialogTrigger, SBDialogContent } from '@/features/agenda/ui';
import { Plus } from 'lucide-react';
import type { Department } from '@/domain/ssot';

const DEPT_META: Record<
  Department,
  { label: string; color: string; textColor: string }
> = {
  VENTAS: { label: 'Ventas', color: '#D7713E', textColor: '#40210f' },
  PRODUCCION: { label: 'Producción', color: '#618E8F', textColor: '#153235' },
  ALMACEN:    { label: 'Almacén',    color: '#A7D8D9', textColor: '#17383a' },
  MARKETING:  { label: 'Marketing',  color: '#F7D15F', textColor: '#3f3414' },
  FINANZAS:   { label: 'Finanzas',   color: '#CCCCCC', textColor: '#333333' },
};

export function NewEventDialog({ onAddEvent, accentColor }: { onAddEvent: (event: { title: string, type: Department, date: string }) => void, accentColor: string }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Department>('VENTAS');
    const [date, setDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !type || !date) return;
        onAddEvent({ title, type, date });
        setOpen(false);
        setTitle('');
        setType('VENTAS');
        setDate('');
    };

    return (
        <SBDialog open={open} onOpenChange={setOpen}>
            <SBDialogTrigger asChild>
                <button 
                    className="flex items-center gap-2 text-sm text-white rounded-lg px-4 py-2 font-semibold hover:brightness-110 transition-colors"
                    style={{backgroundColor: accentColor}}
                >
                    <Plus size={16} /> Nuevo Evento
                </button>
            </SBDialogTrigger>
            <SBDialogContent
                title="Crear Nuevo Evento"
                description="Añade una nueva tarea o evento a tu calendario."
                onSubmit={handleSubmit}
                primaryAction={{ label: 'Crear Evento', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: () => setOpen(false) }}
            >
                <div className="space-y-4 pt-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">Título del Evento</span>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Llamada de seguimiento a Cliente X"
                            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            required
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium text-zinc-700">Departamento</span>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as Department)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            >
                                {Object.entries(DEPT_META).map(([key, meta]) => (
                                    <option key={key} value={key}>{meta.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium text-zinc-700">Fecha y Hora</span>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                required
                            />
                        </label>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
