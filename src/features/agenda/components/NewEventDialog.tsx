
// src/features/agenda/components/NewEventDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import { Plus, User as UserIcon, Search } from 'lucide-react';
import type { Department, User, Interaction, InteractionKind, Account } from '@/domain/ssot';
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

function AccountSearch({ initialAccountId, initialLocation, onSelectionChange }: { 
    initialAccountId?: string;
    initialLocation?: string;
    onSelectionChange: (selection: { accountId?: string, location?: string }) => void 
}) {
    const { data: santaData } = useData();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Account[]>([]);
    
    useEffect(() => {
        if(initialAccountId && santaData?.accounts) {
            const acc = santaData.accounts.find(a => a.id === initialAccountId);
            if(acc) setQuery(acc.name);
        } else if (initialLocation) {
            setQuery(initialLocation);
        }
    }, [initialAccountId, initialLocation, santaData?.accounts]);

    useEffect(() => {
        if (query.length > 1 && santaData?.accounts) {
            const lowerQuery = query.toLowerCase();
            const filteredAccounts = santaData.accounts.filter(a => a.name.toLowerCase().includes(lowerQuery));
            setResults(filteredAccounts);
            
            // If there's no exact match, treat it as a location string
            const exactMatch = filteredAccounts.find(a => a.name.toLowerCase() === lowerQuery);
            if (!exactMatch) {
                onSelectionChange({ location: query });
            }

        } else {
            setResults([]);
            if (query.length > 1) {
                 onSelectionChange({ location: query });
            } else {
                 onSelectionChange({});
            }
        }
    }, [query, santaData?.accounts, onSelectionChange]);

    return (
        <div className="relative">
            <div className="relative">
                <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input
                    id="account-location-search"
                    name="account-location-search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar cuenta o escribir ubicación..."
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-9 py-2 text-sm"
                />
            </div>
            {results.length > 0 && query.length > 1 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                    {results.map(account => (
                        <li key={account.id} 
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100"
                            onMouseDown={() => {
                                setQuery(account.name);
                                onSelectionChange({ accountId: account.id, location: account.name });
                                setResults([]);
                            }}
                        >
                            <p className="font-medium text-sm">{account.name}</p>
                            <p className="text-xs text-zinc-500">{account.city}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function NewEventDialog({
  open, onOpenChange, onSave, accentColor, initialEventData
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Omit<Interaction, 'createdAt' | 'status' | 'id'> & { id?: string }) => void;
  accentColor: string;
  initialEventData?: Partial<Interaction> | null;
}) {
    const { data: santaData, currentUser } = useData();
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Department>('VENTAS');
    const [interactionKind, setInteractionKind] = useState<InteractionKind>('VISITA');
    const [date, setDate] = useState('');
    const [selection, setSelection] = useState<{ accountId?: string, location?: string }>({});
    const [notes, setNotes] = useState('');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);

    useEffect(() => {
        if (initialEventData) {
            setTitle(initialEventData.note || '');
            setType(initialEventData.dept || 'VENTAS');
            setInteractionKind(initialEventData.kind || 'VISITA');
            setDate(initialEventData.plannedFor ? new Date(initialEventData.plannedFor).toISOString().slice(0, 16) : '');
            setSelection({ accountId: initialEventData.accountId, location: initialEventData.location });
            setInvolvedUserIds(initialEventData.involvedUserIds || (initialEventData.userId ? [initialEventData.userId] : []));
        } else {
            // Reset form for new event and pre-select current user
            setTitle('');
            setType('VENTAS');
            setInteractionKind('VISITA');
            setDate('');
            setSelection({});
            setNotes('');
            setInvolvedUserIds(currentUser ? [currentUser.id] : []);
        }
    }, [initialEventData, open, currentUser]);


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
        
        onSave({ 
            ...(initialEventData?.id ? { id: initialEventData.id } : {}),
            userId: initialEventData?.userId || currentUser!.id,
            dept: type, 
            kind: type === 'VENTAS' ? interactionKind : 'OTRO',
            plannedFor: date,
            note: finalNote,
            location: selection.location,
            accountId: selection.accountId,
            involvedUserIds: involvedUserIds.length > 0 ? involvedUserIds : (currentUser ? [currentUser.id] : []),
        });

        onOpenChange(false);
    };
    
    const dialogTitle = initialEventData?.id ? "Editar Tarea" : "Crear Nueva Tarea o Evento";

    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
            <SBDialogContent
                title={dialogTitle}
                description="Añade o edita una entrada en tu calendario y asigna responsables."
                onSubmit={handleSubmit}
                primaryAction={{ label: initialEventData?.id ? 'Guardar Cambios' : 'Crear Evento', type: 'submit' }}
                secondaryAction={{ label: 'Cancelar', onClick: () => onOpenChange(false) }}
            >
                <div className="space-y-4 pt-2">
                    <div className="grid gap-1.5">
                        <label htmlFor="event-title" className="text-sm font-medium text-zinc-700">Título del Evento</label>
                        <input
                            id="event-title"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Llamada de seguimiento a Cliente X"
                            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <label htmlFor="event-dept" className="text-sm font-medium text-zinc-700">Departamento</label>
                            <select
                                id="event-dept"
                                name="dept"
                                value={type}
                                onChange={(e) => setType(e.target.value as Department)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            >
                                {Object.entries(DEPT_META).map(([key, meta]) => (
                                    <option key={key} value={key}>{meta.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-1.5">
                            <label htmlFor="event-date" className="text-sm font-medium text-zinc-700">Fecha y Hora</label>
                            <input
                                id="event-date"
                                name="date"
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                required
                            />
                        </div>
                    </div>

                    {type === 'VENTAS' && (
                         <div className="grid gap-1.5">
                            <label htmlFor="event-kind" className="text-sm font-medium text-zinc-700">Tipo de Interacción</label>
                             <select
                                id="event-kind"
                                name="kind"
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
                        </div>
                    )}
                    
                    <div className="grid gap-1.5">
                        <label htmlFor="account-location-search" className="text-sm font-medium text-zinc-700">Cuenta o Ubicación</label>
                        <AccountSearch 
                            initialAccountId={initialEventData?.accountId}
                            initialLocation={initialEventData?.location}
                            onSelectionChange={setSelection}
                        />
                    </div>

                     <div className="grid gap-1.5">
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
                    </div>
                    
                    <div className="grid gap-1.5">
                        <label htmlFor="event-notes" className="text-sm font-medium text-zinc-700">Notas Adicionales</label>
                        <textarea
                            id="event-notes"
                            name="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Añade un resumen, objetivos o cualquier detalle relevante."
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                            rows={3}
                        />
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}
