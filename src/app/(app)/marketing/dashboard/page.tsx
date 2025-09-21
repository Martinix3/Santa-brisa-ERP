

// src/app/(app)/marketing/dashboard/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { DEPT_META } from '@/domain/ssot';
import type { Interaction, MarketingEvent, OnlineCampaign, InfluencerCollab, PosTactic } from '@/domain/ssot';
import { Calendar, AlertCircle, Clock, Target, Euro, TrendingUp, BarChart, Percent, PieChart } from 'lucide-react';

// ===================================
// Helper Functions & Types
// ===================================
type TimeRange = 'week' | 'month' | 'year';
const fmtEur = (n?: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtPct = (n?: number) => `${(n || 0).toFixed(1)}%`;

type ChannelData = {
  spend: number;
  revenue: number;
  roi: number;
  actions: number;
};

// ===================================
// KPI Card Component
// ===================================

function KpiCard({ title, value, icon: Icon, color = "#71717a" }: { title: string; value: string; icon: React.ElementType; color?: string; }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}1A`, color }}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
                <p className="text-sm font-medium text-zinc-600">{title}</p>
            </div>
        </div>
    );
}

// ===================================
// Main Dashboard Logic & Component
// ===================================

function MarketingDashboardPageContent() {
    const { data } = useData();
    const [timeRange, setTimeRange] = useState<TimeRange>('month');

    // 1. Data Aggregation (as per brief)
    const dashboardData = useMemo(() => {
        if (!data) {
            return {
                events: { spend: 0, revenue: 0, actions: 0 },
                online: { spend: 0, revenue: 0, actions: 0 },
                collabs: { spend: 0, revenue: 0, actions: 0 },
                pos: { spend: 0, revenue: 0, actions: 0 },
            };
        }

        const now = new Date();
        let startDate = new Date();
        if (timeRange === 'week') {
            startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday of current week
        } else if (timeRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else { // year
            startDate = new Date(now.getFullYear(), 0, 1);
        }
        startDate.setHours(0,0,0,0);

        const inTimeRange = (dateStr?: string) => dateStr && new Date(dateStr) >= startDate && new Date(dateStr) <= now;

        const eventsData = (data.marketingEvents || []).filter(e => inTimeRange(e.startAt) && (e.status === 'closed' || e.status === 'active')).reduce((acc, e) => {
            acc.spend += e.spend || 0;
            acc.revenue += e.kpis?.revenueAttributed || 0;
            acc.actions += 1;
            return acc;
        }, { spend: 0, revenue: 0, actions: 0 });

        const onlineData = (data.onlineCampaigns || []).filter(c => inTimeRange(c.startAt) && (c.status === 'closed' || c.status === 'active')).reduce((acc, c) => {
            acc.spend += c.spend || 0;
            acc.revenue += c.metrics?.revenue || 0;
            acc.actions += 1;
            return acc;
        }, { spend: 0, revenue: 0, actions: 0 });

        const collabsData = (data.influencerCollabs || []).filter(c => inTimeRange(c.dates?.goLiveAt) && (c.status === 'COMPLETED' || c.status === 'LIVE')).reduce((acc, c) => {
            acc.spend += (c.costs?.cashPaid || 0) + (c.costs?.productCost || 0) + (c.costs?.shippingCost || 0);
            acc.revenue += c.tracking?.revenue || 0;
            acc.actions += 1;
            return acc;
        }, { spend: 0, revenue: 0, actions: 0 });
        
        const posData = (data.posTactics || []).filter(t => inTimeRange(t.createdAt) && (t.status === 'closed' || t.status === 'active')).reduce((acc, t) => {
            acc.spend += t.actualCost || 0;
            acc.revenue += t.result?.upliftMargin || 0; // Using upliftMargin as revenue proxy
            acc.actions += 1;
            return acc;
        }, { spend: 0, revenue: 0, actions: 0 });

        return { events: eventsData, online: onlineData, collabs: collabsData, pos: posData };
    }, [data, timeRange]);

    // 2. Calculations (as per brief)
    const totals = useMemo(() => {
        const channels = Object.values(dashboardData);
        const totalSpend = channels.reduce((sum, ch) => sum + ch.spend, 0);
        const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
        const totalActions = channels.reduce((sum, ch) => sum + ch.actions, 0);
        const totalRoi = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        return { totalSpend, totalRevenue, totalActions, totalRoi };
    }, [dashboardData]);

    const investmentMix = useMemo(() => {
        const channels: Array<{ name: string; data: ChannelData }> = [
            { name: 'Eventos', data: { ...dashboardData.events, roi: dashboardData.events.spend > 0 ? dashboardData.events.revenue / dashboardData.events.spend : 0 } },
            { name: 'Online', data: { ...dashboardData.online, roi: dashboardData.online.spend > 0 ? dashboardData.online.revenue / dashboardData.online.spend : 0 } },
            { name: 'Collabs', data: { ...dashboardData.collabs, roi: dashboardData.collabs.spend > 0 ? dashboardData.collabs.revenue / dashboardData.collabs.spend : 0 } },
            { name: 'POS', data: { ...dashboardData.pos, roi: dashboardData.pos.spend > 0 ? dashboardData.pos.revenue / dashboardData.pos.spend : 0 } },
        ];
        return channels.map(ch => ({
            ...ch,
            mix: totals.totalSpend > 0 ? (ch.data.spend / totals.totalSpend) * 100 : 0,
        })).sort((a,b) => b.data.spend - a.data.spend);
    }, [dashboardData, totals.totalSpend]);

    const upcomingActions = useMemo(() => {
      if (!data) return [];
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const allActions = [
        ...(data.marketingEvents || []).filter(e => e.status === 'planned' && new Date(e.startAt) <= in30Days).map(e => ({ date: e.startAt, title: e.title, type: 'Evento' })),
        ...(data.onlineCampaigns || []).filter(c => c.status === 'planned' && new Date(c.startAt) <= in30Days).map(c => ({ date: c.startAt, title: c.title, type: 'Campaña' })),
        ...(data.influencerCollabs || []).filter(c => c.status === 'AGREED' && c.dates?.goLiveAt && new Date(c.dates.goLiveAt) <= in30Days).map(c => ({ date: c.dates!.goLiveAt!, title: `Collab: ${c.creatorName}`, type: 'Collab' })),
        ...(data.posTactics || []).filter(t => t.status === 'planned' && new Date(t.createdAt) <= in30Days).map(t => ({ date: t.createdAt, title: `POS: ${t.tacticCode}`, type: 'Táctica POS' })),
      ];
      return allActions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    const pendingTasks = useMemo(() => {
        if (!data?.interactions) return [];
        const now = new Date();
        const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        return data.interactions
            .filter(i => i.dept === 'MARKETING' && i.status === 'open' && i.plannedFor && new Date(i.plannedFor) <= in14Days)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
    }, [data]);
    
    const timeRangeLabels = {
        week: 'Semana',
        month: 'Mes',
        year: 'Año'
    };

    // 3. Visualization (as per brief)
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800">Dashboard de Marketing</h1>
                <div className="flex items-center p-1 bg-zinc-100 rounded-lg">
                    {(['week', 'month', 'year'] as const).map(range => (
                        <SBButton
                            key={range}
                            size="sm"
                            onClick={() => setTimeRange(range)}
                            variant="ghost"
                            className={`font-semibold ${timeRange === range ? 'bg-white shadow-sm !text-zinc-800' : 'text-zinc-600'}`}
                        >
                            {timeRangeLabels[range]}
                        </SBButton>
                    ))}
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title={`Inversión (${timeRangeLabels[timeRange]})`} value={fmtEur(totals.totalSpend)} icon={Euro} color="#D7713E" />
                <KpiCard title={`Ingresos (${timeRangeLabels[timeRange]})`} value={fmtEur(totals.totalRevenue)} icon={TrendingUp} color="#16a34a"/>
                <KpiCard title={`ROI (${timeRangeLabels[timeRange]})`} value={`${totals.totalRoi.toFixed(2)}x`} icon={Percent} color="#618E8F" />
                <KpiCard title={`Acciones (${timeRangeLabels[timeRange]})`} value={totals.totalActions.toString()} icon={Target} color="#A7D8D9"/>
            </div>

            {/* Investment Mix & ROI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title={`Mix de Inversión y ROI por Canal (${timeRangeLabels[timeRange]})`}>
                    <div className="divide-y divide-zinc-100">
                        <div className="grid grid-cols-4 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                            <span>Canal</span>
                            <span className="text-right">Inversión</span>
                            <span className="text-right">Mix</span>
                            <span className="text-right">ROI</span>
                        </div>
                        {investmentMix.map(ch => (
                            <div key={ch.name} className="grid grid-cols-4 p-3 items-center hover:bg-zinc-50/50 text-sm">
                                <div className="font-medium">{ch.name}</div>
                                <div className="text-right font-mono">{fmtEur(ch.data.spend)}</div>
                                <div className="text-right font-mono">{fmtPct(ch.mix)}</div>
                                <div className={`text-right font-semibold ${ch.data.roi > 1 ? 'text-green-600' : 'text-red-600'}`}>{ch.data.roi.toFixed(2)}x</div>
                            </div>
                        ))}
                    </div>
                </SBCard>
                
                {/* Placeholder for RVI - Block 4 from brief */}
                <div className="p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                    <BarChart className="h-10 w-10 text-zinc-300 mb-2"/>
                    <h3 className="font-semibold text-zinc-600">Rotación vs Inversión (RVI)</h3>
                    <p className="text-sm text-zinc-400 mt-1">Este bloque mostrará el impacto de la inversión en las ventas a nivel de tienda. Próximamente.</p>
                </div>
            </div>

             {/* Upcoming & Pending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title="Próximos 30 Días">
                    <div className="p-2 max-h-72 overflow-y-auto">
                        {upcomingActions.length > 0 ? upcomingActions.map((action, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50">
                                <div className="p-2 bg-zinc-100 rounded-md">
                                    <Calendar size={16} className="text-zinc-600"/>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{action.title}</p>
                                    <p className="text-xs text-zinc-500">{new Date(action.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - {action.type}</p>
                                </div>
                            </div>
                        )) : <p className="text-center text-sm text-zinc-500 p-8">No hay acciones planificadas.</p>}
                    </div>
                </SBCard>
                 <SBCard title="Tareas Pendientes (Próximos 14 días)">
                    <div className="p-2 max-h-72 overflow-y-auto">
                        {pendingTasks.length > 0 ? pendingTasks.map((task: Interaction) => (
                            <div key={task.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 ${new Date(task.plannedFor!) < new Date() ? 'bg-red-50/50' : ''}`}>
                                <div className="p-2 rounded-md" style={{ backgroundColor: DEPT_META.MARKETING.color + '20' }}>
                                    {new Date(task.plannedFor!) < new Date() ? <AlertCircle size={16} className="text-red-500"/> : <Clock size={16} style={{color: DEPT_META.MARKETING.color }} />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{task.note}</p>
                                    <p className="text-xs text-zinc-500">{new Date(task.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                                </div>
                            </div>
                        )) : <p className="text-center text-sm text-zinc-500 p-8">No tienes tareas pendientes.</p>}
                    </div>
                </SBCard>
            </div>
        </div>
    )
}

export default function Page(){
  const { data } = useData();
  if (!data) return <div className="p-6">Cargando dashboard de marketing...</div>;
  return <MarketingDashboardPageContent/>;
}
