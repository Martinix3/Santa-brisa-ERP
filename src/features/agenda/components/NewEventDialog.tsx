// src/features/agenda/components/NewEventDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Plus, User as UserIcon, Search } from 'lucide-react';
import type { Department, User, Interaction, InteractionKind, Account } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot'; // usa el canónico
import { useData } from '@/lib/dataprovider';
import { Avatar } from '@/components/ui/Avatar';

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
        if (query.length > 1 && santaData?.accounts && santaData.parties) {
            const lowerQuery = query.toLowerCase();
            const filteredAccounts = santaData.accounts.filter(a => {
                const party = santaData.parties.find(p => p.id === a.partyId);
                return a.name.toLowerCase().includes(lowerQuery) || party?.billingAddress?.city?.toLowerCase().includes(lowerQuery);
            });
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
    }, [query, santaData, onSelectionChange]);

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
                                const party = santaData?.parties.find(p => p.id === account.partyId);
                                onSelectionChange({ accountId: account.id, location: party?.billingAddress?.city || account.name });
                                setResults([]);
                            }}
                        >
                            <p className="font-medium text-sm">{account.name}</p>
                            <p className="text-xs text-zinc-500">{santaData?.parties.find(p => p.id === account.partyId)?.billingAddress?.city}</p>
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
  onSave: (event: Omit<Interaction, 'id' | 'createdAt' | 'status'> & { id?: string }) => void;
  accentColor: string;
  initialEventData?: Partial<Interaction> | null;
}) {
    const { data: santaData, currentUser } = useData();
    const [type, setType] = useState<Department>('VENTAS');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [selection, setSelection] = useState<{ accountId?: string, location?: string }>({});
    const [notes, setNotes] = useState('');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            if (initialEventData) {
                const planned = initialEventData.plannedFor ? new Date(initialEventData.plannedFor) : null;
                setType(initialEventData.dept || 'VENTAS');
                setDate(planned ? planned.toISOString().split('T')[0] : '');
                setTime(planned && planned.toISOString().includes('T') ? planned.toTimeString().slice(0,5) : '');
                setSelection({ accountId: initialEventData.accountId, location: initialEventData.location });
                setNotes(initialEventData.note || '');
                setInvolvedUserIds(initialEventData.involvedUserIds || (initialEventData.userId ? [initialEventData.userId] : []));
            } else {
                // Reset form for new event and pre-select current user
                setType('VENTAS');
                setDate('');
                setTime('');
                setSelection({});
                setNotes('');
                setInvolvedUserIds(currentUser ? [currentUser.id] : []);
            }
        }
    }, [initialEventData, open, currentUser]);


    const handleUserToggle = (userId: string) => {
        setInvolvedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!notes || !type || !date) {
            alert('La descripción, departamento y fecha son obligatorios.');
            return;
        }
        
        const plannedFor = time ? `${date}T${time}:00` : date;

        const saveData: Omit<Interaction, 'id' | 'createdAt' | 'status'> & { id?: string } = {
            id: initialEventData?.id,
            userId: initialEventData?.userId || currentUser!.id,
            dept: type, 
            kind: 'OTRO',
            plannedFor: plannedFor,
            note: notes,
            location: selection.location,
            accountId: selection.accountId,
            involvedUserIds: involvedUserIds.length > 0 ? involvedUserIds : (currentUser ? [currentUser.id] : []),
        };

        if (!saveData.id) {
            delete saveData.id;
        }

        onSave(saveData);

        onOpenChange(false);
    };
    
    const dialogTitle = initialEventData?.id ? "Editar Tarea" : "Crear Nueva Tarea o Evento";
    const deptStyle = DEPT_META[type];

    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl" style={{ borderTop: `4px solid ${deptStyle.color}` }}>
                <SBDialogContent
                    title={dialogTitle}
                    description="Añade o edita una entrada en tu calendario y asigna responsables."
                    onSubmit={handleSubmit}
                    primaryAction={{ label: initialEventData?.id ? 'Guardar Cambios' : 'Crear Tarea', type: 'submit' }}
                    secondaryAction={{ label: 'Cancelar', onClick: () => onOpenChange(false) }}
                >
                    <div className="space-y-4 pt-2">
                        <div className="grid gap-1.5">
                            <label htmlFor="account-location-search" className="text-sm font-medium text-zinc-700">Cuenta o Ubicación</label>
                            <AccountSearch 
                                initialAccountId={initialEventData?.accountId}
                                initialLocation={initialEventData?.location}
                                onSelectionChange={setSelection}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <label htmlFor="event-notes" className="text-sm font-medium text-zinc-700">Descripción / Notas</label>
                            <textarea
                                id="event-notes"
                                name="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Añade un resumen, objetivos o cualquier detalle relevante."
                                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                rows={3}
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
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1.5">
                                    <label htmlFor="event-date" className="text-sm font-medium text-zinc-700">Fecha</label>
                                    <input
                                        id="event-date"
                                        name="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <label htmlFor="event-time" className="text-sm font-medium text-zinc-700">Hora (opcional)</label>
                                    <input
                                        id="event-time"
                                        name="time"
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid gap-1.5">
                            <span className="text-sm font-medium text-zinc-700">Usuarios Implicados</span>
                            <div className="p-2 border rounded-md flex flex-wrap gap-2">
                                {(santaData?.users || []).map((user: User) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleUserToggle(user.id)}
                                        className={`rounded-full transition-all duration-150 ${
                                            involvedUserIds.includes(user.id)
                                                ? 'ring-2 ring-offset-1'
                                                : 'opacity-50 hover:opacity-100'
                                        }`}
                                        style={{ ringColor: `hsl(var(--sb-sun-strong))` }}
                                        title={user.name}
                                    >
                                        <Avatar name={user.name} size="lg" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SBDialogContent>
            </div>
        </SBDialog>
    );
}
