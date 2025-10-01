
// src/features/agenda/components/NewEventDialog.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import { Plus, User as UserIcon, Search, Building2, PlusCircle } from 'lucide-react';
import type { Department, User, Interaction, Account } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { Avatar } from '@/components/ui/Avatar';
import { createInteraction } from '@/app/(app)/agenda/actions';
import { createAccount } from '@/app/(app)/accounts/actions'; // <-- Importa la nueva acción
import { toast } from 'sonner';

// --- Componente de Búsqueda Mejorado ---
function AccountSearch({ initialAccountId, initialLocation, onSelectionChange }: { 
    initialAccountId?: string;
    initialLocation?: string;
    onSelectionChange: (selection: { accountId?: string, location?: string, newAccountName?: string }) => void 
}) {
    const { data: santaData } = useData();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if(initialAccountId && santaData?.accounts) {
            const acc = santaData.accounts.find(a => a.id === initialAccountId);
            if(acc) setQuery(acc.name);
        } else if (initialLocation) {
            setQuery(initialLocation);
        }
    }, [initialAccountId, initialLocation, santaData?.accounts]);
    
    const searchResults = useMemo(() => {
        if (query.length < 2 || !santaData?.accounts) {
            return [];
        }
        const lowerQuery = query.toLowerCase();
        const filteredAccounts = santaData.accounts.filter(a => 
            a.name.toLowerCase().includes(lowerQuery)
        );

        const exactMatch = filteredAccounts.some(a => a.name.toLowerCase() === lowerQuery);

        // Si no hay un match exacto, ofrece crear una nueva cuenta
        if (!exactMatch) {
            return [
                ...filteredAccounts,
                // Objeto especial para la opción de crear
                { id: 'CREATE_NEW', name: query, isCreator: true }
            ];
        }
        return filteredAccounts;

    }, [query, santaData?.accounts]);

    const handleSelect = (item: Account | { id: string, name: string, isCreator: boolean }) => {
        setQuery(item.name);
        setIsFocused(false);
        if ('isCreator' in item && item.isCreator) {
            onSelectionChange({ newAccountName: item.name, location: item.name });
        } else {
            const account = item as Account;
            const party = santaData?.parties.find(p => p.id === account.partyId);
            onSelectionChange({ accountId: account.id, location: party?.billingAddress?.city || account.name });
        }
    };

    // Actualiza la selección a medida que el usuario escribe, si no hay cuenta seleccionada
    useEffect(() => {
         const isAccountSelected = santaData?.accounts.some(a => a.name === query);
         if (!isAccountSelected && query) {
             onSelectionChange({ location: query });
         } else if (!query) {
             onSelectionChange({});
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
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 150)} // Delay para permitir el click
                    placeholder="Buscar cuenta o escribir ubicación..."
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-9 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                />
            </div>
            {isFocused && query.length > 1 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(item => (
                        <li key={item.id} 
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-100 flex items-center gap-3"
                            onMouseDown={() => handleSelect(item)}
                        >
                            {'isCreator' in item ? <PlusCircle className="h-4 w-4 text-blue-500" /> : <Building2 className="h-4 w-4 text-zinc-400" />}
                            <div>
                                <p className={`font-medium text-sm ${'isCreator' in item ? 'text-blue-600' : ''}`}>
                                  {'isCreator' in item ? `Crear cuenta: "${item.name}"` : item.name}
                                </p>
                                {!('isCreator' in item) && <p className="text-xs text-zinc-500">{santaData?.parties.find(p => p.id === (item as Account).partyId)?.billingAddress?.city}</p>}
                            </div>
                        </li>
                    ))}
                    {searchResults.length === 0 && query.length > 1 && (
                         <li className="px-3 py-2 text-sm text-zinc-500 italic">No se encontraron cuentas. Puedes crear una nueva.</li>
                    )}
                </ul>
            )}
        </div>
    );
}

// --- Componente de Diálogo Principal Actualizado ---
export function NewEventDialog({ open, onOpenChange, onSuccess, accentColor, initialEventData }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: any) => void;
  onError?: (message: string) => void; // obsoleto, usamos toast
  accentColor: string;
  initialEventData?: Partial<Interaction> | null;
}) {
    const { currentUser } = useData();
    const [type, setType] = useState<Department>('PERSONAL');
    const [dateTime, setDateTime] = useState('');
    const [selection, setSelection] = useState<{ accountId?: string, location?: string, newAccountName?: string }>({});
    const [notes, setNotes] = useState('');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Resetear el estado cuando se abre el diálogo
    useEffect(() => {
        if (open) {
            setIsSaving(false);
            if (initialEventData) {
                const planned = initialEventData.plannedFor ? new Date(initialEventData.plannedFor) : null;
                setType(initialEventData.dept || 'PERSONAL');
                setDateTime(planned ? planned.toISOString().slice(0, 16) : '');
                setSelection({ accountId: initialEventData.accountId, location: initialEventData.location });
                setNotes(initialEventData.note || '');
                setInvolvedUserIds(initialEventData.involvedUserIds || (initialEventData.userId ? [initialEventData.userId] : []));
            } else {
                setType('PERSONAL');
                setDateTime('');
                setSelection({});
                setNotes('');
                setInvolvedUserIds(currentUser ? [currentUser.id] : []);
            }
        }
    }, [initialEventData, open, currentUser]);

    const handleUserToggle = (userId: string) => {
        setInvolvedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notes) {
            toast.error('La descripción es obligatoria.');
            return;
        }
        setIsSaving(true);
        try {
            if (!currentUser?.id) throw new Error("No hay usuario logueado.");
            
            let finalAccountId = selection.accountId;

            // --- Lógica para crear la cuenta si es necesario ---
            if (selection.newAccountName && !selection.accountId) {
                toast.info(`Creando nueva cuenta: ${selection.newAccountName}...`);
                const newAccount = await createAccount({ name: selection.newAccountName, ownerId: currentUser.id });
                finalAccountId = newAccount.id;
                toast.success(`Cuenta "${newAccount.name}" creada con éxito.`);
            }

            const saveData = {
                accountId: finalAccountId!,
                dept: type, 
                kind: 'OTRO', // O cualquier otra lógica que tengas
                plannedFor: dateTime || undefined,
                note: notes,
                location: selection.location,
                createdById: currentUser.id,
                involvedUserIds: involvedUserIds,
            };

            const result = await createInteraction(saveData);
            onSuccess(result);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al guardar la tarea.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const dialogTitle = initialEventData?.id ? "Editar Tarea" : "Crear Nueva Tarea";
    const { data: santaData } = useData();

    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl transition-all" style={{ borderTop: `4px solid ${accentColor}` }}>
                <SBDialogContent
                    title={dialogTitle}
                    description="Añade una entrada en tu calendario y asigna responsables."
                    onSubmit={handleSubmit}
                    primaryAction={{ label: isSaving ? 'Guardando...' : (initialEventData?.id ? 'Guardar Cambios' : 'Crear Tarea'), type: 'submit', disabled: isSaving }}
                    secondaryAction={{ label: 'Cancelar', onClick: () => onOpenChange(false), disabled: isSaving }}
                >
                    <div className="space-y-4 pt-2">
                        <div className="grid gap-1.5">
                            <label htmlFor="event-notes" className="text-sm font-medium text-zinc-700">Descripción / Notas</label>
                            <textarea id="event-notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Llamar para seguimiento de la propuesta..." className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500" rows={3} required />
                        </div>
                        <div className="grid gap-1.5">
                            <label htmlFor="account-location-search" className="text-sm font-medium text-zinc-700">Cuenta o Ubicación</label>
                            <AccountSearch initialAccountId={initialEventData?.accountId} initialLocation={initialEventData?.location} onSelectionChange={setSelection} />
                        </div>
                        <div className="grid gap-1.5">
                           <label className="text-sm font-medium text-zinc-700">Departamento</label>
                           <div className="flex flex-wrap gap-2">
                               {Object.entries(DEPT_META).map(([key, meta]) => (
                                   <button type="button" key={key} onClick={() => setType(key as Department)}
                                       className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-150 border-2 ${
                                           type === key 
                                           ? 'text-white' 
                                           : 'text-zinc-700 bg-white hover:border-current'
                                       }`}
                                       style={{ 
                                           backgroundColor: type === key ? meta.color : undefined,
                                           borderColor: meta.color,
                                           color: type !== key ? meta.color : meta.textColor
                                       }}
                                   >
                                       {meta.label}
                                   </button>
                               ))}
                           </div>
                        </div>
                        <div className="grid gap-1.5">
                            <label htmlFor="event-date" className="text-sm font-medium text-zinc-700">Fecha y Hora (opcional)</label>
                            <input id="event-date" name="date" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500" />
                        </div>
                        <div className="grid gap-1.5">
                            <span className="text-sm font-medium text-zinc-700">Asignar a</span>
                            <div className="p-2 border rounded-md flex flex-wrap gap-2">
                                {(santaData?.users || []).map((user: User) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => handleUserToggle(user.id)}
                                        className={`rounded-full transition-all duration-200 ${
                                            involvedUserIds.includes(user.id)
                                                ? 'ring-2 ring-offset-1 ring-blue-500'
                                                : 'opacity-60 hover:opacity-100 filter grayscale hover:grayscale-0'
                                        }`}
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
