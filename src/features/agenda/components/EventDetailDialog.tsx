
"use client";
import React from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import type { Interaction, InteractionStatus } from '@/domain/ssot';
import { Calendar, Tag, User as UserIcon, Building, Link as LinkIcon, Edit, Trash2, Check, X } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onUpdateStatus,
  onEdit,
  onDelete
}: {
  event: Interaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (id: string, status: InteractionStatus) => void;
  onEdit: (event: Interaction) => void;
  onDelete: (id: string) => void;
}) {
    const { data: santaData } = useData();
    const account = santaData?.accounts.find(a => a.id === event.accountId);
    const owner = santaData?.users.find(u => u.id === event.userId);
    const linkedEntity = event.linkedEntity ? santaData?.ordersSellOut.find(o => o.id === event.linkedEntity?.id) : null;
    
    const handleConfirmAndClose = () => {
        onUpdateStatus(event.id, 'done');
        onOpenChange(false);
    };

    const primaryAction = event.status === 'processing'
    ? { label: 'Confirmar y Cerrar Tarea', onClick: handleConfirmAndClose }
    : { label: 'Marcar como Hecha', onClick: () => onUpdateStatus(event.id, 'done') };

  return (
    <SBDialog open={open} onOpenChange={onOpenChange}>
      <SBDialogContent
        title={event.note || "Detalle del Evento"}
        description={event.plannedFor ? new Date(event.plannedFor).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : ''}
        onSubmit={(e) => e.preventDefault()}
        primaryAction={primaryAction}
        secondaryAction={{ label: 'Cerrar', onClick: () => onOpenChange(false) }}
      >
        <div className="space-y-3 pt-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${event.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                {event.status === 'done' ? 'Completada' : 'Pendiente'}
            </span>
            {event.dept && <span className="px-2 py-1 text-xs rounded-full font-semibold bg-blue-100 text-blue-800">{event.dept}</span>}
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
            <UserIcon className="h-4 w-4 text-zinc-500" />
            <span>{owner?.name || 'N/A'}</span>

            {account && <>
                <Building className="h-4 w-4 text-zinc-500" />
                <span>{account.name}</span>
            </>}
            
            {event.linkedEntity && linkedEntity &&
                <>
                  <LinkIcon className="h-4 w-4 text-zinc-500" />
                  <a href="#" className="text-blue-600 hover:underline">
                      {event.linkedEntity.type} #{event.linkedEntity.id.slice(0,8)}…
                  </a>
                </>
            }

            {event.tags && event.tags.length > 0 &&
                <>
                  <Tag className="h-4 w-4 text-zinc-500" />
                  <div className="flex flex-wrap gap-1">
                    {event.tags.map(tag => <span key={tag} className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{tag}</span>)}
                  </div>
                </>
            }
          </div>

           {event.status === 'processing' && event.linkedEntity && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800">Acción de IA Pendiente de Revisión</h4>
                  <p className="text-blue-700 mt-1">Santa Brain ha creado la siguiente entidad. Por favor, revísala y confirma si es correcta.</p>
                  <div className="mt-2 bg-white p-2 rounded">
                    <p><strong>Tipo:</strong> {event.linkedEntity.type}</p>
                    <p><strong>ID:</strong> {event.linkedEntity.id}</p>
                    {/* Aquí se podría mostrar más detalle del pedido, etc. */}
                  </div>
              </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => { onOpenChange(false); onDelete(event.id); }} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md text-xs flex items-center gap-1"><Trash2 size={14}/> Eliminar</button>
              <button type="button" onClick={() => { onOpenChange(false); onEdit(event); }} className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-md text-xs flex items-center gap-1"><Edit size={14}/> Editar</button>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
