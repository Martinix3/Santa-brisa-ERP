
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { EventMarketing, Interaction } from '@/domain/ssot';
import { SBCard, SBButton, DataTableSB, SB_COLORS } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';

function StatusPill({ status }: { status: EventMarketing['status'] }) {
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
  const [completingEvent, setCompletingEvent] = useState<EventMarketing | null>(null);

  const events = useMemo(() => santaData?.events || [], [santaData]);

  const handleAddOrUpdateEvent = async (event: Omit<Interaction, 'createdAt' | 'status'> & { id?: string }) => {
      if (!currentUser || !santaData) return;
      
      let finalData = { ...santaData };
      const newInteraction: Interaction = {
          ...event,
          id: `int_${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'open',
          userId: currentUser.id,
      };

      const newMktEvent: EventMarketing = {
          id: `mkt_${Date.now()}`,
          title: newInteraction.note!,
          status: 'planned',
          startAt: newInteraction.plannedFor || new Date().toISOString(),
          city: newInteraction.location,
      };
      finalData.events = [...(finalData.events || []), newMktEvent];
      newInteraction.linkedEntity = { type: 'Campaign', id: newMktEvent.id };

      finalData.interactions = [...(finalData.interactions || []), newInteraction];
      
      setData(finalData);
      
      if(isPersistenceEnabled) {
          await saveCollection('events', finalData.events);
          await saveCollection('interactions', finalData.interactions);
      }

      setIsNewEventDialogOpen(false);
  };
  
  const handleSaveCompletedTask = async (taskId: string, payload: any) => {
    if (!santaData || !completingEvent) return;
    
    const updatedMktEvents = santaData.events.map(me => {
        if (me.id === completingEvent.id) {
            return {
                ...me,
                status: 'closed',
                spend: payload.cost,
                goal: { ...(me.goal || {}), leads: payload.leads, sampling: payload.attendees },
            } as EventMarketing;
        }
        return me;
    });

    setData({ ...santaData, events: updatedMktEvents });
    if (isPersistenceEnabled) {
        await saveCollection('events', updatedMktEvents);
    }

    setCompletingEvent(null);
  };

  const cols: Col<EventMarketing>[] = [
    { key: 'title', header: 'Evento', render: r => <div className="font-semibold">{r.title}</div> },
    { key: 'status', header: 'Estado', render: r => <StatusPill status={r.status} /> },
    { key: 'startAt', header: 'Fecha', render: r => new Date(r.startAt).toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'}) },
    { key: 'city', header: 'Ubicación', render: r => r.city || 'N/A'},
    { key: 'spend', header: 'Gasto', className: "justify-end", render: r => formatCurrency(r.spend) },
    { key: 'leads', header: 'Leads', className: "justify-end", render: r => formatNumber(r.goal?.leads) },
    { key: 'sampling', header: 'Asistentes', className: "justify-end", render: r => formatNumber(r.goal?.sampling) },
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
            initialEventData={{dept: 'MARKETING'} as any}
        />
    )}

    {completingEvent && (
        <MarketingTaskCompletionDialog
            task={{id: completingEvent.id, note: `Resultados para ${completingEvent.title}`} as Interaction}
            open={!!completingEvent}
            onClose={() => setCompletingEvent(null)}
            onComplete={handleSaveCompletedTask}
        />
    )}
    </>
  );
}
