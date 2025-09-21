
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { MarketingEvent, Interaction, InteractionKind } from '@/domain/ssot';
import { SBCard, SBButton, DataTableSB } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { SB_COLORS } from '@/domain/ssot';

function StatusPill({ status }: { status: MarketingEvent['status'] }) {
    const styles = {
        planned: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800 animate-pulse',
        closed: 'bg-zinc-100 text-zinc-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

const formatNumber = (num?: number) => num?.toLocaleString('es-ES') || 'N/A';
const formatCurrency = (num?: number) => num?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) || 'N/A';

export default function Page(){
  const { data: santaData, setData, currentUser, isPersistenceEnabled, saveCollection } = useData();
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [completingEvent, setCompletingEvent] = useState<MarketingEvent | null>(null);

  const events = useMemo(() => santaData?.marketingEvents || [], [santaData]);

  const handleAddOrUpdateEvent = async (event: Omit<Interaction, 'createdAt' | 'status' | 'id'> & { id?: string }) => {
      if (!currentUser || !santaData) return;
      
      const newMktEvent: MarketingEvent = {
          id: `mkt_${Date.now()}`,
          title: event.note!,
          status: 'planned',
          startAt: event.plannedFor!,
          city: event.location,
          ownerUserId: currentUser.id,
          createdAt: new Date().toISOString(),
          kind: event.kind as any, // Asumiendo que el diálogo puede pasar el EventKind
      };

      const newInteraction: Interaction = {
          ...event,
          id: `int_${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'open',
          userId: currentUser.id,
          kind: 'EVENTO_MKT',
          dept: 'MARKETING',
          linkedEntity: { type: 'EVENT', id: newMktEvent.id },
      };

      const finalData = { 
          ...santaData,
          marketingEvents: [...(santaData.marketingEvents || []), newMktEvent],
          interactions: [...(santaData.interactions || []), newInteraction]
      };
      
      setData(finalData);
      
      if(isPersistenceEnabled) {
          await saveCollection('marketingEvents', finalData.marketingEvents);
          await saveCollection('interactions', finalData.interactions);
      }

      setIsNewEventDialogOpen(false);
  };
  
  const handleSaveCompletedTask = async (eventId: string, payload: any) => {
    if (!santaData) return;
    
    const updatedMktEvents = santaData.marketingEvents.map(me => {
        if (me.id === eventId) {
            return {
                ...me,
                status: 'closed',
                spend: payload.spend,
                kpis: {
                    leads: payload.leads,
                    sampling: payload.sampling,
                    impressions: payload.impressions,
                    interactions: payload.interactions,
                    completedAt: new Date().toISOString(),
                }
            } as MarketingEvent;
        }
        return me;
    });

    setData({ ...santaData, marketingEvents: updatedMktEvents });
    if (isPersistenceEnabled) {
        await saveCollection('marketingEvents', updatedMktEvents);
    }

    setCompletingEvent(null);
  };

  const cols: Col<MarketingEvent>[] = [
    { key: 'title', header: 'Evento', render: r => <div className="font-semibold">{r.title}</div> },
    { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
    { key: 'startAt', header: 'Fecha', render: r => new Date(r.startAt).toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'}) },
    { key: 'city', header: 'Ubicación', render: r => r.city || 'N/A'},
    { key: 'spend', header: 'Gasto', className: "justify-end", render: r => formatCurrency(r.spend) },
    { key: 'leads', header: 'Leads', className: "justify-end", render: r => formatNumber(r.kpis?.leads) },
    { key: 'sampling', header: 'Asistentes', className: "justify-end", render: r => formatNumber(r.kpis?.sampling) },
    { 
        key: 'actions', 
        header: 'Acciones', 
        render: r => {
            if (r.status === 'planned' || r.status === 'active') {
                return <SBButton variant="secondary" size="sm" onClick={() => setCompletingEvent(r)}>Registrar Resultados</SBButton>
            }
            return null;
        }
    }
  ];

  return (
    <>
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-zinc-800">Histórico de Eventos y Activaciones</h1>
            <SBButton onClick={() => setIsNewEventDialogOpen(true)}>
                Nuevo Evento
            </SBButton>
        </div>
        <SBCard title="Resultados de Eventos de Marketing" accent={SB_COLORS.primary.teal}>
             <DataTableSB rows={events} cols={cols as any} />
        </SBCard>
    </div>

    {isNewEventDialogOpen && (
        <NewEventDialog
            open={isNewEventDialogOpen}
            onOpenChange={setIsNewEventDialogOpen}
            onSave={handleAddOrUpdateEvent as any}
            accentColor={SB_COLORS.primary.teal}
            initialEventData={{dept: 'MARKETING', kind: 'EVENTO_MKT' as InteractionKind} as any}
        />
    )}

    {completingEvent && (
        <MarketingTaskCompletionDialog
            event={completingEvent}
            open={!!completingEvent}
            onClose={() => setCompletingEvent(null)}
            onComplete={handleSaveCompletedTask}
        />
    )}
    </>
  );
}
