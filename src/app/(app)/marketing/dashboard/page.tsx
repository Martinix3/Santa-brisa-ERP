
"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton, KPI } from '@/components/ui/ui-primitives';
import { DEPT_META } from '@/domain/ssot';
import type { Interaction, EventMarketing, OnlineCampaign } from '@/domain/ssot';
import { Calendar, AlertCircle, Clock, Megaphone } from 'lucide-react';


function StatusPill({ status }: { status: 'planned' | 'active' | 'closed' | 'cancelled' }) {
    const styles = {
        planned: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800',
        closed: 'bg-zinc-100 text-zinc-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}


function MarketingDashboardPageContent() {
    const { data } = useData();
    const events = data?.events || [];
    const campaigns = data?.onlineCampaigns || [];

    const kpis = {
        activeEvents: events.filter((e: EventMarketing) => e.status === 'active').length,
        activeCampaigns: campaigns.filter((c: OnlineCampaign) => c.status === 'active').length,
        totalBudget: campaigns.reduce((acc, c) => acc + c.budget, 0),
    };

    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-semibold text-zinc-800">Dashboard de Marketing</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPI label="Eventos Activos" value={kpis.activeEvents.toString()} />
                <KPI label="Campañas Online Activas" value={kpis.activeCampaigns.toString()} />
                <KPI label="Presupuesto Total Online" value={`€${kpis.totalBudget.toLocaleString()}`} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title="Próximos Eventos">
                    {events.filter((e: EventMarketing) => e.status === 'planned' || e.status === 'active').slice(0, 5).map((event: EventMarketing) => (
                        <div key={event.id} className="p-3 border-b last:border-b-0">
                            <p className="font-semibold">{event.title}</p>
                            <div className="flex justify-between items-center text-sm text-zinc-600 mt-1">
                                <span>{new Date(event.startAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} en {event.city}</span>
                                <StatusPill status={event.status} />
                            </div>
                        </div>
                    ))}
                </SBCard>
                <SBCard title="Campañas Online">
                     {campaigns.slice(0, 5).map((campaign: OnlineCampaign) => (
                        <div key={campaign.id} className="p-3 border-b last:border-b-0">
                            <p className="font-semibold">{campaign.title}</p>
                            <div className="flex justify-between items-center text-sm text-zinc-600 mt-1">
                                <span>{campaign.channel} &middot; €{campaign.budget}</span>
                                <StatusPill status={campaign.status} />
                            </div>
                        </div>
                    ))}
                </SBCard>
            </div>
        </div>
    )
}


function UpcomingEvents() {
    const { data } = useData();
    const { overdue, upcoming } = useMemo(() => {
        if (!data?.interactions) return { overdue: [], upcoming: [] };
        
        const now = new Date();
        const openInteractions = data.interactions
            .filter(i => i.dept === 'MARKETING' && i.status === 'open' && i.plannedFor);
            
        const overdue = openInteractions
            .filter(i => new Date(i.plannedFor!) < now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
            
        const upcoming = openInteractions
            .filter(i => new Date(i.plannedFor!) >= now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());

        return { overdue, upcoming };
    }, [data]);

    const allEvents = [...overdue, ...upcoming].slice(0, 5);

    if (allEvents.length === 0) {
        return null;
    }

    return (
        <SBCard title="Próximas Tareas de Marketing">
            <div className="p-4 space-y-3">
                {allEvents.map((event: Interaction) => {
                    const isOverdue = new Date(event.plannedFor!) < new Date();
                    const Icon = isOverdue ? AlertCircle : Clock;
                    const iconColor = isOverdue ? 'text-rose-500' : 'text-cyan-500';

                    return (
                         <div key={event.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${isOverdue ? 'bg-rose-50/50 border-rose-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                            <div className="p-2 rounded-full" style={{ backgroundColor: DEPT_META.MARKETING.color, color: DEPT_META.MARKETING.textColor }}>
                                <Icon size={16} />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{event.note}</p>
                                <p className={`text-xs ${isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-500'}`}>{new Date(event.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SBCard>
    );
}

export default function Page(){
  return (
    <div className="space-y-6">
      <MarketingDashboardPageContent/>
      <div className="pt-6">
        <UpcomingEvents/>
      </div>
    </div>
  );
}
