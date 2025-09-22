
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import type { MarketingEvent, Interaction, InteractionKind, Account, PosTactic } from '@/domain/ssot';
import { SBCard, SBButton, DataTableSB, KPI } from '@/components/ui/ui-primitives';
import type { Col } from '@/components/ui/ui-primitives';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { SB_COLORS } from '@/domain/ssot';
import { Calendar, AlertCircle, Clock, Megaphone, Target, Euro, Plus } from 'lucide-react';
import { NewPosTacticDialog } from '@/features/marketing/components/NewPosTacticDialog';
import { usePosTacticsService } from '@/features/marketing/services/posTactics.service';

function StatusPill({ status }: { status: MarketingEvent['status'] }) {
    const styles: Record<MarketingEvent['status'], string> = {
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
  const { data: santaData, setData, currentUser, isPersistenceEnabled, saveCollection, saveAllCollections } = useData();
  const { upsertPosTactic, catalog, plv } = usePosTacticsService();
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [completingEvent, setCompletingEvent] = useState<MarketingEvent | null>(null);
  const [isNewTacticOpen, setIsNewTacticOpen] = useState(false);
  const [tacticEventContext, setTacticEventContext] = useState<{ eventId: string; accountId?: string; } | null>(null);

  const events = useMemo(() => santaData?.marketingEvents || [], [santaData]);

  const kpis = useMemo(() => {
        const completedEvents = events.filter((e: MarketingEvent) => e.status === 'closed' && e.spend);
        const totalSpend = completedEvents.reduce((acc, e) => acc + (e.spend || 0), 0);
        const totalLeads = completedEvents.reduce((acc, e) => acc + (e.kpis?.leads || 0), 0);

        return {
            activeEvents: events.filter((e: MarketingEvent) => e.status === 'active').length,
            plannedEvents: events.filter((e: MarketingEvent) => e.status === 'planned').length,
            avgCostPerEvent: completedEvents.length > 0 ? totalSpend / completedEvents.length : 0,
            totalLeads,
        };
    }, [events]);

  const handleAddOrUpdateEvent = async (event: Omit<Interaction, 'createdAt' | 'status' | 'id'> & { id?: string }) => {
      if (!currentUser || !santaData) return;
      
      const now = new Date().toISOString();
      const newMktEvent: MarketingEvent = {
          id: `mkt_${Date.now()}`,
          title: event.note!,
          status: 'planned',
          startAt: event.plannedFor!,
          city: event.location,
          ownerUserId: currentUser.id,
          createdAt: now,
          updatedAt: now,
          kind: event.kind as any,
      };

      const newInteraction: Interaction = {
          id: `int_${Date.now()}`,
          createdAt: now,
          status: 'open',
          userId: currentUser.id,
          dept: 'MARKETING',
          kind: 'EVENTO_MKT',
          note: event.note,
          plannedFor: event.plannedFor,
          location: event.location,
          accountId: event.accountId,
          involvedUserIds: event.involvedUserIds,
          linkedEntity: { type: 'EVENT', id: newMktEvent.id },
      };
      
      await saveAllCollections({
          marketingEvents: [...(santaData.marketingEvents || []), newMktEvent],
          interactions: [...(santaData.interactions || []), newInteraction]
      });

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

    await saveCollection('marketingEvents', updatedMktEvents);

    setCompletingEvent(null);
  };
  
  const openTacticDialog = (event: MarketingEvent) => {
      setTacticEventContext({ eventId: event.id, accountId: event.accountId });
      setIsNewTacticOpen(true);
  }

  const handleSaveTactic = async (tacticData: Omit<PosTactic, 'id' | 'createdAt' | 'createdById'>) => {
      if (!tacticEventContext) return;
      try {
        await upsertPosTactic({ ...tacticData, ...tacticEventContext });
        setIsNewTacticOpen(false);
        setTacticEventContext(null);
      } catch(e) {
          console.error(e);
          alert((e as Error).message);
      }
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
            const actions = [];
            if (r.status === 'planned' || r.status === 'active') {
                actions.push(<SBButton key="complete" variant="secondary" size="sm" onClick={() => setCompletingEvent(r)}>Registrar Resultados</SBButton>);
            }
            actions.push(<SBButton key="tactic" variant="subtle" size="sm" onClick={() => openTacticDialog(r)}><Plus size={12}/> Táctica</SBButton>);
            return <div className="flex gap-2">{actions}</div>;
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPI label="Eventos Planificados" value={kpis.plannedEvents} icon={Calendar} />
            <KPI label="Eventos Activos" value={kpis.activeEvents} icon={Megaphone} />
            <KPI label="Coste Medio Evento" value={formatCurrency(kpis.avgCostPerEvent)} icon={Euro} />
            <KPI label="Leads Generados (Eventos)" value={kpis.totalLeads} icon={Target} />
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
            entity={completingEvent}
            open={!!completingEvent}
            onClose={() => setCompletingEvent(null)}
            onComplete={handleSaveCompletedTask}
        />
    )}
    
    {isNewTacticOpen && santaData && (
        <NewPosTacticDialog
            open={isNewTacticOpen}
            onClose={() => setIsNewTacticOpen(false)}
            onSave={handleSaveTactic}
            tacticBeingEdited={null}
            accounts={santaData.accounts}
            costCatalog={catalog}
            plvInventory={plv}
        />
    )}
    </>
  );
}
