
// src/app/(app)/dashboard-ventas/page.tsx — Santa Brisa DS aplicado
"use client";

import React, { useMemo, useState } from "react";
import {
  Users, MessageCircle, Euro, Package, Briefcase, CheckSquare, TrendingUp, TrendingDown, BarChart3
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/dataprovider";
import type { Interaction, OrderSellOut, Account, PosTactic, Item, User } from "@/domain/ssot";
import { orderTotal, orderToBottles } from "@/lib/sb-core";
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

/* =============================================================
   🎨 Design System Santa Brisa — Tokens locales (usar en línea)
   ============================================================= */
const SB = {
  text: {
    primary: "#111827",
    secondary: "#374151",
    muted: "#6b7280",
  },
  border: "#e5e7eb",
  surfaces: { page: "hsl(var(--background))", muted: "hsl(var(--secondary))", white: "hsl(var(--secondary))" },
  brand: {
    accent: "#F4C542", // Amarillo SB (principal y acción)
    cobre: "#B25A32",  // Secundaria
    agua:  "#77D9CF",  // Secundaria
    naranja: "#F26D3D"
  },
};

/* =============================================================
   🧱 KpiCard (con “barra fantasma” del líder) — DS aplicado
   ============================================================= */
const KpiCard = ({
  icon: Icon,
  title,
  value,
  change,
  progress,
  goal,
  goalNumber,
  leaderValue,
  leaderName,
  color = SB.brand.accent,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  change?: string;
  progress?: number;
  goal?: string;
  goalNumber?: number;
  leaderValue?: number;
  leaderName?: string;
  color?: string;
}) => {
  const isUp = change?.startsWith("+");
  const numericValue = useMemo(() => {
    const n = parseFloat((value || "0").toString().replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [value]);
  const denom = useMemo(() => {
    if (goalNumber && goalNumber > 0) return goalNumber;
    return Math.max(numericValue, leaderValue ?? 0, 1);
  }, [goalNumber, numericValue, leaderValue]);
  const myPct = Math.min(100, (progress ?? (numericValue / denom) * 100));
  const leaderPct = Math.min(100, ((leaderValue ?? 0) / denom) * 100);
  const isLeader = leaderValue !== undefined && numericValue >= (leaderValue ?? 0);
  const missing = Math.max(0, Math.ceil((leaderValue ?? 0) - numericValue));

  return (
    <div className="bg-white p-5 rounded-lg border" style={{ borderColor: SB.border }}>
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-white p-2 rounded-lg border" style={{ borderColor: SB.border }}>
          <Icon className="text-gray-500" size={20} />
        </div>
        <p className="text-sm font-medium" style={{ color: SB.text.secondary }}>{title}</p>
      </div>

      <p className="text-3xl font-bold" style={{ color: SB.text.primary }}>{value}</p>

      {change && (
        <div className="flex items-center text-sm mt-1">
          {isUp ? (
            <TrendingUp className="text-green-600 mr-1" size={16} />
          ) : (
            <TrendingDown className="text-red-600 mr-1" size={16} />
          )}
          <span className={`${isUp ? "text-green-600" : "text-red-600"} font-semibold mr-1`}>{change}</span>
          <span className="text-gray-500">vs mes anterior</span>
        </div>
      )}

      {(goal || leaderValue !== undefined) && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso</span>
            <span>{goal ? goal : `${numericValue} / ${denom}`}</span>
          </div>

          <div className="relative w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            {leaderValue !== undefined && (
              <div aria-hidden className="absolute left-0 top-0 h-1.5 rounded-full" style={{ width: `${leaderPct}%`, backgroundColor: `${color}33` }} />
            )}
            <div className="relative h-1.5 rounded-full" style={{ width: `${myPct}%`, backgroundColor: color }} />
          </div>

          {leaderValue !== undefined && (
            <div className="mt-1 text-[11px] text-gray-500">
              {isLeader ? 'Eres líder 🔝' : <>Líder: <b>{leaderName ?? '—'}</b> con <b>{leaderValue}</b>{missing > 0 ? <> — te faltan <b>{missing}</b></> : null}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
      const acc = data.accounts.find((a:any)=> a.id === t.accountId);
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

  const pieColors = [SB.brand.accent, SB.brand.agua, SB.brand.cobre, SB.brand.naranja];

  return (
    <div className="p-6" style={{ background: SB.surfaces.page }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
          </div>
          <div className="hidden md:flex items-center gap-1 rounded-lg border p-1 bg-slate-100">
            {(['week', 'month', 'year'] as const).map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${timeRange === range ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts.toString()} color={SB.brand.accent}
            goal={`${kpis.newAccounts} / 10`} goalNumber={10} progress={(kpis.newAccounts / 10) * 100}
            leaderValue={leaders.newAccounts.value} leaderName={leaders.newAccounts.name} />

          <KpiCard icon={MessageCircle} title="Conversión a pedido" value={`${kpis.conversionRate.toFixed(1)}%`} color={SB.brand.accent} />

          <KpiCard icon={Euro} title="Facturación" value={`${kpis.revenue.toLocaleString('es-ES')} €`} color={SB.brand.accent} />

          <KpiCard icon={Package} title="Cajas vendidas" value={kpis.boxesSold.toString()} color={SB.brand.accent}
            goal={`${kpis.boxesSold} / 100`} goalNumber={100} progress={(kpis.boxesSold / 100) * 100}
            leaderValue={leaders.boxesSold.value} leaderName={leaders.boxesSold.name} />

          <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits.toString()} color={SB.brand.accent}
            goal={`${kpis.visits} / 200`} goalNumber={200} progress={(kpis.visits / 200) * 100}
            leaderValue={leaders.visits.value} leaderName={leaders.visits.name} />

          <KpiCard icon={CheckSquare} title="POS tactics colocadas" value={kpis.posTactics.toString()} color={SB.brand.accent}
            goal={`${kpis.posTactics} / 20`} goalNumber={20} progress={(kpis.posTactics / 20) * 100}
            leaderValue={leaders.posTactics.value} leaderName={leaders.posTactics.name} />
        </div>

        {/* Grids */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-lg p-5 shadow-sm bg-white" style={{ border: `1px solid ${SB.border}` }}>
            <h3 className="font-semibold" style={{ fontSize: 16, color: SB.text.primary }}>Evolución de ventas + POS</h3>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={SB.border} />
                  <XAxis dataKey="name" tick={{ fill: SB.text.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: SB.text.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 6 }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: SB.text.muted }} />
                  <Line type="monotone" dataKey="Ventas" stroke={SB.brand.accent} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="POS" stroke={SB.brand.cobre} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg p-5 shadow-sm bg-white" style={{ border: `1px solid ${SB.border}` }}>
              <h3 className="font-semibold" style={{ fontSize: 16, color: SB.text.primary }}>Mix de Ventas</h3>
              <div className="mt-4 h-36 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salesMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                      {salesMixData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 6, color: '#fff' }} />
                    <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11, color: SB.text.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <UpcomingTasks department="VENTAS" />
          </div>
        </div>
      </div>

      {/* Animación sutil (fadeInUp) */}
      <style jsx global>{`
        @keyframes sb-fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .sb-animate-in { animation: sb-fadeInUp .25s ease-out both; }
      `}</style>
    </div>
  );
}
