// src/app/(app)/marketing/dashboard/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { DEPT_META, SB_THEME } from '@/domain/ssot';
import type { Interaction, MarketingEvent, OnlineCampaign, InfluencerCollab, PosTactic } from '@/domain/ssot';
import { Calendar, AlertCircle, Clock, Target, Euro, TrendingUp, BarChart, Percent, PieChart as PieChartIcon } from 'lucide-react';
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';

// ===================================
// Helper Functions & Types
// ===================================
type TimeRange = 'week' | 'month' | 'year';
const fmtEur = (n?: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n?: number) => `${(n || 0).toFixed(1)}%`;

// ===================================
// KPI Card Component
// ===================================

function KpiCard({ title, value, icon: Icon, color = "#71717a" }: { title: string; value: string; icon: React.ElementType; color?: string; }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center gap-4 shadow-sm">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}1A`, color }}>
                <Icon size={24} className="sb-icon" />
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

    // 1. Data Aggregation & Calculations (as per brief)
    const { totals, investmentMix, upcomingActions, rviCards } = useMemo(() => {
        if (!data) {
            return {
                totals: { totalSpend: 0, totalRevenue: 0, totalActions: 0, totalRoi: 0 },
                investmentMix: [],
                upcomingActions: [],
                rviCards: { rvi: 0, unitsPerEuro: 0, pctPositive: 0 }
            };
        }
        
        const now = new Date();
        const rangeStart = timeRange==='week'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay()+6)%7)) // lunes
          : timeRange==='month'
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : new Date(now.getFullYear(), 0, 1);
        rangeStart.setHours(0,0,0,0);

        const overlaps = (aStart?:string, aEnd?:string, bStart:Date=rangeStart, bEnd:Date=now) => {
          if (!aStart) return false;
          const s = new Date(aStart);
          const e = aEnd ? new Date(aEnd) : s;
          return s <= bEnd && e >= bStart;
        };
        const isActiveOrClosed = (st?:string) => ['active','closed','LIVE','COMPLETED'].includes((st||'').toUpperCase());

        // Agregación por canal
        const eventsArr = (data.marketingEvents||[]).filter(e => overlaps(e.startAt, e.endAt, rangeStart, now) && isActiveOrClosed(e.status));
        const onlineArr = (data.onlineCampaigns||[]).filter(c => overlaps(c.startAt, c.endAt, rangeStart, now) && isActiveOrClosed(c.status));
        const collabsArr = (data.influencerCollabs||[]).filter(c => overlaps(c.dates?.goLiveAt, c.dates?.endAt, rangeStart, now) && isActiveOrClosed(c.status));
        const posArr    = (data.posTactics||[]).filter(t => (t.status==='active'||t.status==='closed') && new Date(t.createdAt) >= rangeStart && new Date(t.createdAt) <= now);

        const eventsData = eventsArr.reduce((a,e)=>({spend:a.spend+(e.spend||0), revenue:a.revenue+(e.kpis?.revenueAttributed||0), actions:a.actions+1}), {spend:0,revenue:0,actions:0});
        const onlineData = onlineArr.reduce((a,c)=>({spend:a.spend+(c.spend||0), revenue:a.revenue+((c.metrics?.revenue)||0), actions:a.actions+1}), {spend:0,revenue:0,actions:0});
        const collabsData= collabsArr.reduce((a,c)=>({
          spend:a.spend+((c.costs?.cashPaid||0)+(c.costs?.productCost||0)+(c.costs?.shippingCost||0)),
          revenue:a.revenue+(c.tracking?.revenue||0),
          actions:a.actions+1
        }), {spend:0,revenue:0,actions:0});
        const posData    = posArr.reduce((a,t)=>{
          const upliftUnits = t.result?.upliftUnits || 0;
          const margin = (data as any)?.settings?.marginPerUnit || 0;
          const revenue = upliftUnits * margin;
          return { spend:a.spend+(t.actualCost||0), revenue:a.revenue+revenue, actions:a.actions+1 };
        }, {spend:0,revenue:0,actions:0});
        
        const dashboardData = {
            events: eventsData,
            online: onlineData,
            collabs: collabsData,
            pos: posData
        };

        // Totales y Mix
        const channels = Object.values(dashboardData);
        const totalSpend = channels.reduce((sum, ch) => sum + ch.spend, 0);
        const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
        const totalActions = channels.reduce((sum, ch) => sum + ch.actions, 0);
        const totalRoi = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        const totalsResult = { totalSpend, totalRevenue, totalActions, totalRoi };
        
        const investmentMixResult = [
            { name: 'Eventos', data: { ...dashboardData.events, roi: dashboardData.events.spend > 0 ? dashboardData.events.revenue / dashboardData.events.spend : 0 } },
            { name: 'Online', data: { ...dashboardData.online, roi: dashboardData.online.spend > 0 ? dashboardData.online.revenue / dashboardData.online.spend : 0 } },
            { name: 'Collabs', data: { ...dashboardData.collabs, roi: dashboardData.collabs.spend > 0 ? dashboardData.collabs.revenue / dashboardData.collabs.spend : 0 } },
            { name: 'POS', data: { ...dashboardData.pos, roi: dashboardData.pos.spend > 0 ? dashboardData.pos.revenue / dashboardData.pos.spend : 0 } },
        ].map(ch => ({
            ...ch,
            mix: totalsResult.totalSpend > 0 ? (ch.data.spend / totalsResult.totalSpend) * 100 : 0,
        })).sort((a,b) => b.data.spend - a.data.spend);

        // Próximas acciones
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const allUpcoming = [
            ...(data.marketingEvents || []).filter(e => e.status === 'planned' && new Date(e.startAt) <= in30Days).map(e => ({ date: e.startAt, title: e.title, type: 'Evento' })),
            ...(data.onlineCampaigns || []).filter(c => c.status === 'planned' && new Date(c.startAt) <= in30Days).map(c => ({ date: c.startAt, title: c.title, type: 'Campaña' })),
            ...(data.influencerCollabs || []).filter(c => c.status === 'AGREED' && c.dates?.goLiveAt && new Date(c.dates.goLiveAt) <= in30Days).map(c => ({ date: c.dates!.goLiveAt!, title: `Collab: ${c.creatorName}`, type: 'Collab' })),
            ...(data.posTactics || []).filter(t => t.status === 'planned' && new Date(t.createdAt) <= in30Days).map(t => ({ date: t.createdAt, title: `POS: ${t.tacticCode}`, type: 'Táctica POS' })),
        ];
        const upcomingActionsResult = allUpcoming.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        // RVI Cards
        const selloutWeekly = (data as any).selloutWeekly || [];
        const stores = new Set(selloutWeekly.map((s:any)=>s.storeId));
        const mk = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const sum = (xs:number[])=>xs.reduce((x,y)=>x+(y||0),0);
        const med = (xs:number[])=>{const v=[...xs].sort((a,b)=>a-b); const n=v.length; return n? (n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2):0;};
        
        const investByStore = new Map<string, number>();
        (data.posTactics||[]).forEach(t=>{
            if(!t.createdAt) return;
            const m = new Date(t.createdAt).getMonth(); const y = new Date(t.createdAt).getFullYear();
            if (`${y}-${String(m+1).padStart(2,'0')}`===mk) investByStore.set(t.accountId, (investByStore.get(t.accountId)||0) + (t.actualCost||0));
        });
        (data.marketingEvents||[]).forEach(e=>{
            if (e.startAt) {
                const d = new Date(e.startAt); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                if (e.accountId && key===mk) investByStore.set(e.accountId, (investByStore.get(e.accountId)||0) + (e.spend||0));
            }
        });

        const byStoreMonth = new Map<string, number>();
        selloutWeekly.forEach((r:any)=>{
            if(!r.weekISO) return;
            const d = new Date(r.weekISO); const key = `${r.storeId}@${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            byStoreMonth.set(key, (byStoreMonth.get(key)||0) + (r.units||0));
        });
        
        const rviRows = [...stores].map(id=>{
            const units = byStoreMonth.get(`${id}@${mk}`) || 0;
            const prev = [1,2,3].map(k=>{
              const d = new Date(now.getFullYear(), now.getMonth()-k, 1);
              const kk = `${id}@${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
              return byStoreMonth.get(kk)||0;
            }).filter(x=>x>0);
            const base = prev.length? sum(prev)/prev.length : 0;
            const uplift = units - base;
            const invest = investByStore.get(id as string)||0;
            const lift = base>0 ? uplift/base : 0;
            const upe = invest>0 ? uplift/invest : 0;
            return { lift, upe, invest, positive: uplift>0 };
        });

        const activeRvi = rviRows.filter(r=> r.invest>0);
        const inactiveRvi = rviRows.filter(r=> r.invest===0);
        const rvi = med(activeRvi.map(r=>r.lift)) - med(inactiveRvi.map(r=>r.lift));
        const unitsPerEuro = med(activeRvi.map(r=>r.upe));
        const pctPositive = activeRvi.length ? (activeRvi.filter(r=>r.positive).length / activeRvi.length) : 0;

        return { totals: totalsResult, investmentMix: investmentMixResult, upcomingActions: upcomingActionsResult, rviCards: { rvi, unitsPerEuro, pctPositive } };

    }, [data, timeRange]);


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
                
                <SBCard title={`Rotación vs Inversión (RVI) — ${timeRangeLabels[timeRange]}`}>
                  <div className="p-4 grid grid-cols-3 gap-3">
                    <KpiCard title="RVI (Δ lift%)" value={`${(rviCards.rvi*100).toFixed(0)}%`} icon={BarChart} color="#0ea5e9" />
                    <KpiCard title="Units/€ (mediana)" value={rviCards.unitsPerEuro.toFixed(2)} icon={PieChartIcon} color="#16a34a" />
                    <KpiCard title="% locales con uplift > 0" value={`${(rviCards.pctPositive*100).toFixed(0)}%`} icon={TrendingUp} color="#f59e0b" />
                  </div>
                </SBCard>
            </div>

             {/* Upcoming & Pending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title="Próximos 30 Días">
                    <div className="p-2 max-h-72 overflow-y-auto">
                        {upcomingActions.length > 0 ? upcomingActions.map((action, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50">
                                <div className="p-2 bg-zinc-100 rounded-md">
                                    <Calendar size={16} className="sb-icon text-zinc-600"/>
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{action.title}</p>
                                    <p className="text-xs text-zinc-500">{new Date(action.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - {action.type}</p>
                                </div>
                            </div>
                        )) : <p className="text-center text-sm text-zinc-500 p-8">No hay acciones planificadas.</p>}
                    </div>
                </SBCard>
                <UpcomingTasks department="MARKETING" />
            </div>
        </div>
    )
}

export default function Page(){
  const { data } = useData();
  if (!data) return <div className="p-6">Cargando dashboard de marketing...</div>;
  return <MarketingDashboardPageContent/>;
}
