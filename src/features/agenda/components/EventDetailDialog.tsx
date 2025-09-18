
// src/features/agenda/components/EventDetailDialog.tsx
"use client";
import React from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import type { Interaction, InteractionStatus, OrderSellOut, Account } from '@/domain/ssot';
import { useData } from '@/lib/dataprovider';
import { User as UserIcon, Calendar, MapPin, Edit2, Trash2, X, Tag, CheckCircle, ShoppingCart } from 'lucide-react';
import { DEPT_META, orderTotal } from '@/domain/ssot';

function LinkedEntityInfo({ entity, data }: { entity: Interaction['linkedEntity'], data: any }) {
    if (!entity || !data) return null;

    let linkedItem: any = null;
    let label = '';
    let url = '';

    if (entity.type === 'Order' && data.ordersSellOut) {
        linkedItem = data.ordersSellOut.find((o: OrderSellOut) => o.id === entity.id);
        if (linkedItem) {
            const account = data.accounts.find((a: Account) => a.id === linkedItem.accountId);
            label = `Pedido para ${account?.name || 'N/A'} - ${orderTotal(linkedItem).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
            url = `/orders`; // Simplified link
        }
    } else if (entity.type === 'Account' && data.accounts) {
        linkedItem = data.accounts.find((a: Account) => a.id === entity.id);
        if (linkedItem) {
            label = `Cuenta Creada: ${linkedItem.name}`;
            url = `/accounts/${linkedItem.id}`;
        }
    } else if (entity.type === 'Interaction' && data.interactions) {
        linkedItem = data.interactions.find((i: Interaction) => i.id === entity.id);
         if (linkedItem) {
            label = `Interacción Creada: ${linkedItem.note}`;
            url = `#`; // No detail page for interactions yet
        }
    }
    
    if (!linkedItem) return <p className="text-sm text-zinc-500">Entidad enlazada no encontrada.</p>;

    return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-1">Acción de IA</p>
             <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">
                {label}
            </a>
        </div>
    );
}

export function EventDetailDialog({ event, open, onOpenChange, onUpdateStatus, onEdit, onDelete }: {
    event: Interaction | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdateStatus: (id: string, status: InteractionStatus) => void;
    onEdit: (event: Interaction) => void;
    onDelete: (id: string) => void;
}) {
    const { data: santaData } = useData();

    if (!event) return null;

    const involvedUsers = (event.involvedUserIds || []).map(id => santaData?.users.find(u => u.id === id)).filter(Boolean);
    const owner = santaData?.users.find(u => u.id === event.userId);
    const account = event.accountId ? santaData?.accounts.find(a => a.id === event.accountId) : null;
    const deptStyle = DEPT_META[event.dept!] || DEPT_META.VENTAS;
    const isPendingReview = event.status === 'processing';

    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
            <SBDialogContent
                title={event.note || 'Detalle del Evento'}
                description={`Tarea para el departamento de ${deptStyle.label}`}
                onSubmit={(e) => { e.preventDefault(); onOpenChange(false); }}
                primaryAction={{ label: 'Cerrar', onClick: () => onOpenChange(false) }}
                secondaryAction={{ label: 'Editar', onClick: () => onEdit(event) }}
            >
                <div className="space-y-4 pt-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: deptStyle.color, color: deptStyle.textColor }}>
                           {deptStyle.label}
                        </span>
                        {event.kind && <span className="font-semibold text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md">{event.kind}</span>}
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium text-zinc-800">{new Date(event.plannedFor!).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</span>
                    </div>

                    {event.location && (
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-zinc-500" />
                            <span className="text-zinc-700">{event.location}</span>
                        </div>
                    )}
                    
                    {account && (
                        <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-zinc-500" />
                             <span className="text-zinc-700">Cuenta: <a href={`/accounts/${account.id}`} className="font-semibold text-blue-600 hover:underline">{account.name}</a></span>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold text-zinc-800 mb-2">Responsables:</h4>
                        <div className="flex flex-wrap gap-2">
                            {owner && (
                                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                                    <UserIcon size={14} />
                                    <span className="font-bold">Owner:</span> {owner.name}
                                </div>
                            )}
                            {involvedUsers.map(user => (
                                <div key={user!.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs">
                                    <UserIcon size={14} />
                                    {user!.name}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {event.note && (
                        <div>
                             <h4 className="font-semibold text-zinc-800 mb-1">Notas:</h4>
                             <p className="text-zinc-600 whitespace-pre-wrap">{event.note}</p>
                        </div>
                    )}
                    
                    {isPendingReview && event.linkedEntity && (
                        <LinkedEntityInfo entity={event.linkedEntity} data={santaData} />
                    )}
                </div>
                 <div className="mt-6 flex justify-between items-center">
                    <div className="flex gap-2">
                         <button onClick={() => onEdit(event)} className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-100">
                            <Edit2 size={14} /> Editar
                        </button>
                        {!isPendingReview && (
                            <button onClick={() => onDelete(event.id)} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50">
                                <Trash2 size={14} /> Eliminar
                            </button>
                        )}
                    </div>
                    {isPendingReview ? (
                         <button onClick={() => onUpdateStatus(event.id, 'done')} className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold">
                            <CheckCircle size={16} /> Confirmar y Cerrar Tarea
                        </button>
                    ) : (event.status !== 'done' && (
                        <button onClick={() => onUpdateStatus(event.id, 'done')} className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold">
                            <CheckCircle size={16} /> Completar Tarea
                        </button>
                    ))}
                 </div>
            </SBDialogContent>
        </SBDialog>
    );
}
