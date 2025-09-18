// src/features/agenda/components/NewEventDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogTrigger, SBDialogContent } from '@/features/agenda/ui';
import { Plus, User as UserIcon } from 'lucide-react';
import type { Department, User, InteractionKind } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';


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

type MarketingSubtype = 'Evento/Activación' | 'Campaña Ads' | 'Collab Influencer';

export function NewEventDialog({ onAddEvent, accentColor }: { onAddEvent: (event: any) => void, accentColor: string }) {
    const { data: santaData } = useData();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Department>('VENTAS');
    const [interactionKind, setInteractionKind] = useState<InteractionKind>('VISITA');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);
    const [marketingSubtype, setMarketingSubtype] = useState<MarketingSubtype | ''>('');


    const handleUserToggle = (userId: string) => {
        setInvolvedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !type || !date) {
            alert('El título, departamento y fecha son obligatorios.');
            return;
        }

        let finalNote = notes ? `${title} - ${notes}` : title;
        if(type === 'MARKETING' && marketingSubtype) {
            finalNote = `[${marketingSubtype}] ${finalNote}`;
        }
        
        onAddEvent({ 
            dept: type, 
            kind: type === 'VENTAS' ? interactionKind : 'OTRO',
            plannedFor: date,
            note: finalNote,
            location,
            involvedUserIds: involvedUserIds.length > 0 ? involvedUserIds : undefined,
        });

        // Reset form
        setOpen(false);
        setTitle('');
        setType('VENTAS');
        setInteractionKind('VISITA');
        setDate('');
        setLocation('');
        setNotes('');
        setInvolvedUserIds([]);
        setMarketingSubtype('');
    };

    return (
        <SBDialog open={open} onOpenChange={setOpen}>
            <SBDialogTrigger asChild>
                <button 
                    className="flex items-center gap-2 text-sm text-white rounded-lg px-4 py-2 font-semibold hover:brightness-110 transition-colors"
                    style={{backgroundColor: accentColor}}
                >
                    <Plus size={16} /> Nueva Tarea
                </button>
            </SBDialogTrigger>
            <SBDialogContent
                title="Crear Nueva Tarea o Evento"
                description="Añade una nueva entrada a tu calendario y asigna responsables."
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

                    {type === 'VENTAS' && (
                         <label className="grid gap-1.5">
                            <span className="text-sm font-medium text-zinc-700">Tipo de Interacción</span>
                             <select
                                value={interactionKind}
                                onChange={(e) => setInteractionKind(e.target.value as InteractionKind)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            >
                                <option value="VISITA">Visita</option>
                                <option value="LLAMADA">Llamada</option>
                                <option value="EMAIL">Email</option>
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </label>
                    )}

                    {type === 'MARKETING' && (
                        <label className="grid gap-1.5">
                            <span className="text-sm font-medium text-zinc-700">Tipo de Actividad de Marketing</span>
                             <select
                                value={marketingSubtype}
                                onChange={(e) => setMarketingSubtype(e.target.value as MarketingSubtype)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            >
                                <option value="">General</option>
                                <option value="Evento/Activación">Evento/Activación</option>
                                <option value="Campaña Ads">Campaña Ads</option>
                                <option value="Collab Influencer">Collab Influencer</option>
                            </select>
                        </label>
                    )}

                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">Ubicación (Opcional)</span>
                        <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej. Oficinas de Cliente, Videollamada..."
                            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                        />
                    </label>

                     <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">Usuarios Implicados</span>
                        <div className="p-2 border rounded-md flex flex-wrap gap-2">
                            {(santaData?.users || []).map((user: User) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleUserToggle(user.id)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
                                        involvedUserIds.includes(user.id)
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200'
                                    }`}
                                >
                                    <UserIcon size={14} />
                                    {user.name}
                                </button>
                            ))}
                        </div>
                    </label>
                    
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">Notas Adicionales</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Añade un resumen, objetivos o cualquier detalle relevante."
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            rows={3}
                        />
                    </label>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
