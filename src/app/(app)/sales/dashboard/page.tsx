// src/app/(app)/dashboard-ventas/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Users, MessageCircle, Euro, Package, Briefcase, CheckSquare, TrendingUp, TrendingDown, BarChart3
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import type { Interaction, OrderSellOut, Account, PosTactic, Item, User } from "@/domain/ssot";
import { orderToBottles, orderTotal } from '@/lib/sb-core';
import { UpcomingTasks } from "@/features/agenda/components/UpcomingTasks";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import { SBButton, SBCard } from "@/components/ui/ui-primitives";
import KpiCard from "@/components/ui/KpiCard";
import { SB_THEME } from "@/domain/ssot";

const SB = SB_THEME;


/* =============================================================
   📈 Página principal
   ============================================================= */
export default function SalesDashboardPage() {
  const { data } = useData();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  // KPIs (mes)
  const kpis = useMemo(() => {
    if (!data) return { newAccounts: 0, conversionRate: 0, revenue: 0, boxesSold: 0, visits: 0, posTactics: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newAccounts = (data.accounts || []).filter((a:any) => new Date(a.createdAt) >= startOfMonth).length;
    const visitsArr = (data.interactions || []).filter((i:any) => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfMonth);
    const visits = visitsArr.length;
    const orders = (data.ordersSellOut || []).filter((o:any) => new Date(o.createdAt) >= startOfMonth);
    const revenue = orders.reduce((sum:number, o:any) => sum + orderTotal(o), 0);
    const posTactics = (data.posTactics || []).filter((t:any) => new Date(t.createdAt) >= startOfMonth).length;
    const bottlesSold = orders.reduce((sum:number, o:any) => sum + orderToBottles(o, data.items as Item[]), 0);
    const boxesSold = Math.round(bottlesSold / 6);
    const conversionRate = visits > 0 ? (orders.length / visits) * 100 : 0;
    return { newAccounts, conversionRate, revenue, boxesSold, visits, posTactics };
  }, [data, timeRange]);

  // Líderes (mes)
  const leaders = useMemo(() => {
    if (!data) {
      return {
        newAccounts: { value: 0, userId: undefined as string | undefined, name: undefined as string | undefined },
        boxesSold:   { value: 0, userId: undefined, name: undefined },
        visits:      { value: 0, userId: undefined, name: undefined },
        posTactics:  { value: 0, userId: undefined, name: undefined },
      };
    }
    const usersById = new Map((data.users || []).map((u:any)=>[u.id, u as User]));
    const uName = (id?: string) => (id ? (usersById.get(id)?.name ?? '—') : '—');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const countByOwner: Record<string, number> = {};
    (data.accounts || []).filter((a:any)=> new Date(a.createdAt) >= startOfMonth).forEach((a:any) => {
      const owner = a.ownerId ?? 'unknown';
      countByOwner[owner] = (countByOwner[owner] || 0) + 1;
    });
    const [accLeaderId, accLeaderVal] = Object.entries(countByOwner).reduce<[string|undefined, number]>((m,[id,v]) => (v>m[1]?[id,v]:m), [undefined,0]);

    const countVisitsByUser: Record<string, number> = {};
    (data.interactions || []).filter((i:any)=> i.kind==='VISITA' && new Date(i.createdAt) >= startOfMonth).forEach((i:any)=>{
      const uid = i.userId ?? 'unknown';
      countVisitsByUser[uid] = (countVisitsByUser[uid] || 0) + 1;
    });
    const [visitLeaderId, visitLeaderVal] = Object.entries(countVisitsByUser).reduce<[string|undefined, number]>((m,[id,v]) => (v>m[1]?[id,v]:m), [undefined,0]);

    const boxesByOwner: Record<string, number> = {};
    (data.ordersSellOut || []).filter((o:any)=> new Date(o.createdAt) >= startOfMonth).forEach((o:any)=>{
      const acc = data.accounts.find((a:any) => a.id === o.accountId);
      const owner = acc?.ownerId ?? 'unknown';
      const bottles = orderToBottles(o, data.items as Item[]);
      boxesByOwner[owner] = (boxesByOwner[owner] || 0) + Math.round(bottles / 6);
    });
    const [boxesLeaderId, boxesLeaderVal] = Object.entries(boxesByOwner).reduce<[string|undefined, number]>((m,[id,v]) => (v>m[1]?[id,v]:m), [undefined,0]);

    const tacticsByOwner: Record<string, number> = {};
    (data.posTactics || []).filter((t:any)=> new Date(t.createdAt) >= startOfMonth).forEach((t:any)=>{
      const acc = data.accounts.find((a:any) => a.id === t.accountId);
      const owner = acc?.ownerId ?? 'unknown';
      tacticsByOwner[owner] = (tacticsByOwner[owner] || 0) + 1;
    });
    const [tacticLeaderId, tacticLeaderVal] = Object.entries(tacticsByOwner).reduce<[string|undefined, number]>((m,[id,v]) => (v>m[1]?[id,v]:m), [undefined,0]);

    return {
      newAccounts: { value: accLeaderVal, userId: accLeaderId, name: uName(accLeaderId) },
      boxesSold:   { value: boxesLeaderVal, userId: boxesLeaderId, name: uName(boxesLeaderId) },
      visits:      { value: visitLeaderVal, userId: visitLeaderId, name: uName(visitLeaderId) },
      posTactics:  { value: tacticLeaderVal, userId: tacticLeaderId, name: uName(tacticLeaderId) },
    };
  }, [data, timeRange]);

  // Evolución ventas + POS (mes)
  const salesEvolutionData = useMemo(() => {
    if (!data) return [] as Array<{name:string; Ventas:number; POS:number}>;
    const salesByDay: Record<string, { Ventas: number, POS: number }> = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    (data.ordersSellOut || []).forEach((o:any) => {
      const date = new Date(o.createdAt);
      if (date < startOfMonth) return;
      const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      if (!salesByDay[day]) salesByDay[day] = { Ventas: 0, POS: 0 };
      salesByDay[day].Ventas += orderTotal(o);
    });

    (data.posTactics || []).forEach((t:any) => {
      const date = new Date(t.createdAt);
      if (date < startOfMonth) return;
      const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      if (!salesByDay[day]) salesByDay[day] = { Ventas: 0, POS: 0 };
      salesByDay[day].POS += 1;
    });

    return Object.entries(salesByDay).map(([name, values]) => ({ name, ...values }));
  }, [data]);

  // Mix por segmento
  const salesMixData = useMemo(() => {
    if (!data) return [] as Array<{name:string; value:number}>;
    const salesBySegment: Record<string, number> = { HORECA: 0, RETAIL: 0, ONLINE: 0, DISTRIBUIDOR: 0 };
    (data.ordersSellOut || []).forEach((o:any) => {
      const account = data.accounts.find((a:any) => a.id === o.accountId);
      if (account && (account as Account).segment && salesBySegment[account.segment] !== undefined) {
        salesBySegment[account.segment] += orderTotal(o);
      }
    });
    const total = Object.values(salesBySegment).reduce((s, v) => s + v, 0);
    if (total === 0) return [{ name: 'Sin datos', value: 100 }];
    return Object.entries(salesBySegment).map(([name, value]) => ({ name, value: (value / total) * 100 }));
  }, [data]);

  const pieColors = [SB_THEME.chart.line[0], SB_THEME.chart.line[1], SB_THEME.chart.line[2], SB_THEME.chart.line[3]];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
          </div>
          <div className="hidden md:flex items-center gap-1 rounded-lg border p-1 bg-slate-100">
            {(['week', 'month', 'year'] as const).map(range => (
                <SBButton
                    key={range}
                    size="sm"
                    variant={timeRange === range ? 'primary' : 'ghost'}
                    onClick={() => setTimeRange(range)}
                    className={`font-semibold ${timeRange === range ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'}`}
                >
                    {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                </SBButton>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts.toString()} goal={`${kpis.newAccounts} / 10`} leaderValue={leaders.newAccounts.value} leaderName={leaders.newAccounts.name} />
          <KpiCard icon={MessageCircle} title="Conversión a pedido" value={`${kpis.conversionRate.toFixed(1)}%`} />
          <KpiCard icon={Euro} title="Facturación" value={`${kpis.revenue.toLocaleString('es-ES')} €`} />
          <KpiCard icon={Package} title="Cajas vendidas" value={kpis.boxesSold.toString()} goal={`${kpis.boxesSold} / 100`} leaderValue={leaders.boxesSold.value} leaderName={leaders.boxesSold.name} />
          <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits.toString()} goal={`${kpis.visits} / 200`} leaderValue={leaders.visits.value} leaderName={leaders.visits.name} />
          <KpiCard icon={CheckSquare} title="POS tactics colocadas" value={kpis.posTactics.toString()} goal={`${kpis.posTactics} / 20`} leaderValue={leaders.posTactics.value} leaderName={leaders.posTactics.name} />
        </div>

        {/* Grids */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SBCard className="lg:col-span-2">
             <div className="p-5">
                <h3 className="font-semibold text-text-primary text-base">Evolución de ventas + POS</h3>
                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesEvolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={SB_THEME.chart.grid} />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--text-muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--text-muted))', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 6 }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--text-muted))' }} />
                      <Line type="monotone" dataKey="Ventas" stroke={SB_THEME.chart.line[0]} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="POS" stroke={SB_THEME.chart.line[1]} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </SBCard>

          <div className="lg:col-span-1 space-y-6">
            <SBCard>
               <div className="p-5">
                  <h3 className="font-semibold text-text-primary text-base">Mix de Ventas</h3>
                  <div className="mt-4 h-36 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={salesMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                          {salesMixData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 6, color: '#fff' }} />
                        <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11, color: 'hsl(var(--text-muted))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
              </div>
            </SBCard>

            <UpcomingTasks department="VENTAS" />
          </div>
        </div>
      </div>
    </div>
  );
}
