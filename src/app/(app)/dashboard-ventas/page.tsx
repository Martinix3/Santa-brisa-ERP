// src/app/(app)/dashboard-ventas/page.tsx
"use client";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageCircle, Euro, Package, Briefcase, CheckSquare, TrendingUp, TrendingDown,
} from "lucide-react";
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

// ============================================================================
// SANTA BRISA DESIGN SYSTEM: CONSTANTS
// ============================================================================
// Siguiendo la paleta definida en el brief.
// Usamos 'slate' de Tailwind que se corresponde con los neutros fríos definidos.
const SANTA_BRISA_COLORS = {
  text: {
    header: '#111827',     // slate-900
    body: '#374151',       // slate-700
    muted: '#6b7280',      // slate-500
  },
  border: '#e5e7eb',         // slate-200
  background: {
    page: '#ffffff',
    module: '#f9fafb',   // slate-50
  },
  brand: {
    accent: '#F4C542',
    sun: '#F2E5A0',
  },
  secondary: {
    copper: '#B25A32',
    water: '#77D9CF',
    orange: '#F26D3D',
  },
  semantic: {
    danger: '#991b1b',      // red-800
    danger_bg: '#fef2f2',   // red-50
  }
};

const salesMixColors = [
  SANTA_BRISA_COLORS.brand.accent,
  SANTA_BRISA_COLORS.secondary.water,
  SANTA_BRISA_COLORS.secondary.copper,
  SANTA_BRISA_COLORS.secondary.orange,
];


// ============================================================================
// COMPONENT: KpiCard
// ============================================================================
// ✅ Santabrisseado:
//    - Fondo gris claro (#f9fafb) -> bg-slate-50
//    - Borde simple, sin sombra -> border border-slate-200
//    - Iconos en color 'muted' -> text-slate-500
//    - Jerarquía de texto ajustada a la paleta.
//    - Animación 'hover' de elevación sutil.
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
  color,
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
  color: string;
}) => {
  const isUp = change?.startsWith('+');

  const numericValue = useMemo(() => {
    const n = parseFloat((value || '0').toString().replace(/[^\d.,-]/g, '').replace(',', '.'));
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
    <motion.div
      className="bg-slate-50 p-5 rounded-lg border border-slate-200 transition-transform duration-200 hover:-translate-y-1"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-white p-2 rounded-lg border border-slate-200">
          <Icon className="text-slate-500" size={20} />
        </div>
        <p className="text-sm text-slate-700 font-medium">{title}</p>
      </div>

      <p className="text-3xl font-bold text-slate-900">{value}</p>

      {change && (
        <div className="flex items-center text-sm mt-1">
          {isUp ? (
            <TrendingUp className="text-green-500 mr-1" size={16} />
          ) : (
            <TrendingDown className="text-red-500 mr-1" size={16} />
          )}
          <span className={`${isUp ? 'text-green-600' : 'text-red-600'} font-semibold mr-1`}>{change}</span>
          <span className="text-slate-500">vs mes anterior</span>
        </div>
      )}

      {(goal || leaderValue !== undefined) && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progreso</span>
            <span>{goal ? goal : `${numericValue} / ${denom}`}</span>
          </div>

          <div className="relative w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            {leaderValue !== undefined && (
              <div
                aria-hidden
                className="absolute left-0 top-0 h-1.5 rounded-full"
                style={{ width: `${leaderPct}%`, backgroundColor: `${color}33` }}
              />
            )}
            <div className="relative h-1.5 rounded-full" style={{ width: `${myPct}%`, backgroundColor: color }} />
          </div>

          {leaderValue !== undefined && (
            <div className="mt-1 text-[11px] text-slate-500">
              {isLeader ? 'Eres líder 🔝'
                : <>Líder: <b>{leaderName ?? '—'}</b> con <b>{leaderValue}</b>{missing > 0 ? <> — te faltan <b>{missing}</b></> : null}</>}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function SalesDashboardPage() {
  const { data } = useData();
  const [timeRange] = useState<"week" | "month" | "year">("month");

  // Hooks de datos (sin cambios en la lógica)
  const kpis = useMemo(() => {
    // ... lógica sin cambios ...
    if (!data) return { newAccounts: 0, conversionRate: 0, revenue: 0, boxesSold: 0, visits: 0, posTactics: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newAccounts = (data.accounts || []).filter(a => new Date(a.createdAt) >= startOfMonth).length;
    const visitsArr = (data.interactions || []).filter(i => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfMonth);
    const visits = visitsArr.length;
    const orders = (data.ordersSellOut || []).filter(o => new Date(o.createdAt) >= startOfMonth);
    const revenue = orders.reduce((sum, o) => sum + orderTotal(o), 0);
    const posTactics = (data.posTactics || []).filter(t => new Date(t.createdAt) >= startOfMonth).length;
    const bottlesSold = orders.reduce((sum, o) => sum + orderToBottles(o, data.items as Item[]), 0);
    const boxesSold = Math.round(bottlesSold / 6);
    const conversionRate = visits > 0 ? (orders.length / visits) * 100 : 0;
    return { newAccounts, conversionRate, revenue, boxesSold, visits, posTactics };
  }, [data]);

  const leaders = useMemo(() => {
    // ... lógica sin cambios ...
    if (!data) {
      return {
        newAccounts: { value: 0, userId: undefined as string | undefined, name: undefined as string | undefined },
        boxesSold:   { value: 0, userId: undefined, name: undefined },
        visits:      { value: 0, userId: undefined, name: undefined },
        posTactics:  { value: 0, userId: undefined, name: undefined },
      };
    }
    const usersById = new Map((data.users || []).map(u => [u.id, u as User]));
    const uName = (id?: string) => (id ? (usersById.get(id)?.name ?? '—') : '—');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const countByOwner: Record<string, number> = {};
    (data.accounts || []).filter(a => new Date(a.createdAt) >= startOfMonth).forEach(a => { const owner = a.ownerId ?? 'unknown'; countByOwner[owner] = (countByOwner[owner] || 0) + 1; });
    const [accLeaderId, accLeaderVal] = Object.entries(countByOwner).reduce<[string | undefined, number]>((m, [id, v]) => (v > m[1] ? [id, v] : m), [undefined, 0]);
    const countVisitsByUser: Record<string, number> = {};
    (data.interactions || []).filter(i => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfMonth).forEach(i => { const uid = i.userId ?? 'unknown'; countVisitsByUser[uid] = (countVisitsByUser[uid] || 0) + 1; });
    const [visitLeaderId, visitLeaderVal] = Object.entries(countVisitsByUser).reduce<[string | undefined, number]>((m, [id, v]) => (v > m[1] ? [id, v] : m), [undefined, 0]);
    const boxesByOwner: Record<string, number> = {};
    (data.ordersSellOut || []).filter(o => new Date(o.createdAt) >= startOfMonth).forEach(o => { const acc = data.accounts.find(a => a.id === o.accountId); const owner = acc?.ownerId ?? 'unknown'; const bottles = orderToBottles(o, data.items as Item[]); boxesByOwner[owner] = (boxesByOwner[owner] || 0) + Math.round(bottles / 6); });
    const [boxesLeaderId, boxesLeaderVal] = Object.entries(boxesByOwner).reduce<[string | undefined, number]>((m, [id, v]) => (v > m[1] ? [id, v] : m), [undefined, 0]);
    const tacticsByOwner: Record<string, number> = {};
    (data.posTactics || []).filter(t => new Date(t.createdAt) >= startOfMonth).forEach(t => { const acc = data.accounts.find(a => a.id === t.accountId); const owner = acc?.ownerId ?? 'unknown'; tacticsByOwner[owner] = (tacticsByOwner[owner] || 0) + 1; });
    const [tacticLeaderId, tacticLeaderVal] = Object.entries(tacticsByOwner).reduce<[string | undefined, number]>((m, [id, v]) => (v > m[1] ? [id, v] : m), [undefined, 0]);
    return {
      newAccounts: { value: accLeaderVal, userId: accLeaderId, name: uName(accLeaderId) },
      boxesSold:   { value: boxesLeaderVal, userId: boxesLeaderId, name: uName(boxesLeaderId) },
      visits:      { value: visitLeaderVal, userId: visitLeaderId, name: uName(visitLeaderId) },
      posTactics:  { value: tacticLeaderVal, userId: tacticLeaderId, name: uName(tacticLeaderId) },
    };
  }, [data]);

  const salesEvolutionData = useMemo(() => {
    // ... lógica sin cambios ...
    if (!data) return [];
    const salesByDay: Record<string, { Ventas: number, POS: number }> = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    (data.ordersSellOut || []).forEach(o => { const date = new Date(o.createdAt); if (date < startOfMonth) return; const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); if (!salesByDay[day]) salesByDay[day] = { Ventas: 0, POS: 0 }; salesByDay[day].Ventas += orderTotal(o); });
    (data.posTactics || []).forEach(t => { const date = new Date(t.createdAt); if (date < startOfMonth) return; const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); if (!salesByDay[day]) salesByDay[day] = { Ventas: 0, POS: 0 }; salesByDay[day].POS += 1; });
    return Object.entries(salesByDay).map(([name, values]) => ({ name, ...values }));
  }, [data]);

  const salesMixData = useMemo(() => {
    // ... lógica sin cambios ...
    if (!data) return [];
    const salesBySegment: Record<string, number> = { HORECA: 0, RETAIL: 0, ONLINE: 0, DISTRIBUIDOR: 0 };
    (data.ordersSellOut || []).forEach(o => { const account = data.accounts.find(a => a.id === o.accountId); if (account && (account as Account).segment) { if (salesBySegment[account.segment] !== undefined) { salesBySegment[account.segment] += orderTotal(o); } } });
    const total = Object.values(salesBySegment).reduce((s, v) => s + v, 0);
    if (total === 0) return [{ name: 'Sin datos', value: 100 }];
    return Object.entries(salesBySegment).map(([name, value]) => ({ name, value: (value / total) * 100 }));
  }, [data]);

  // ✅ Animación de carga escalonada para los bloques de contenido
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };


  return (
    <div className="p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* ✅ Santabrisseado: Colores de texto e iconos ajustados */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard de Ventas</h1>
          </div>
        </div>

        {/* ✅ Santabrisseado: Colores y borde activo con la marca */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-4">
            <button className="py-2 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">Semana</button>
            <button className="py-2 px-1 text-sm font-medium text-slate-900 border-b-2" style={{ borderColor: SANTA_BRISA_COLORS.brand.accent }}>Mes</button>
            <button className="py-2 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">Año</button>
          </nav>
        </div>

        <motion.div
          className="mt-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts.toString()} color={SANTA_BRISA_COLORS.brand.accent} goal={`${kpis.newAccounts} / 10`} goalNumber={10} leaderValue={leaders.newAccounts.value} leaderName={leaders.newAccounts.name} />
            <KpiCard icon={MessageCircle} title="Conversión a pedido" value={`${kpis.conversionRate.toFixed(1)}%`} color={SANTA_BRISA_COLORS.brand.accent} />
            <KpiCard icon={Euro} title="Facturación" value={`${kpis.revenue.toLocaleString('es-ES')} €`} color={SANTA_BRISA_COLORS.brand.accent} />
            <KpiCard icon={Package} title="Cajas vendidas" value={kpis.boxesSold.toString()} color={SANTA_BRISA_COLORS.brand.accent} goal={`${kpis.boxesSold} / 100`} goalNumber={100} leaderValue={leaders.boxesSold.value} leaderName={leaders.boxesSold.name} />
            <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits.toString()} color={SANTA_BRISA_COLORS.brand.accent} goal={`${kpis.visits} / 200`} goalNumber={200} leaderValue={leaders.visits.value} leaderName={leaders.visits.name} />
            <KpiCard icon={CheckSquare} title="POS tactics colocadas" value={kpis.posTactics.toString()} color={SANTA_BRISA_COLORS.brand.accent} goal={`${kpis.posTactics} / 20`} goalNumber={20} leaderValue={leaders.posTactics.value} leaderName={leaders.posTactics.name} />
          </div>

          <motion.div
            className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
            variants={containerVariants} // Anima este bloque también
          >
            {/* ✅ Santabrisseado: Contenedor blanco con borde y sombra sutil */}
            <motion.div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
              <h3 className="font-semibold text-slate-900">Evolución de ventas + POS</h3>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  {/* ✅ Santabrisseado: Colores de gráfico y tooltip según el brief */}
                  <LineChart data={salesEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={SANTA_BRISA_COLORS.border} />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke={SANTA_BRISA_COLORS.text.muted} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} stroke={SANTA_BRISA_COLORS.text.muted} />
                    <Tooltip contentStyle={{ backgroundColor: SANTA_BRISA_COLORS.text.header, border: 'none', borderRadius: '6px' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="Ventas" stroke={SANTA_BRISA_COLORS.brand.accent} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="POS" stroke={SANTA_BRISA_COLORS.secondary.water} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <div className="lg:col-span-1 space-y-6">
              <motion.div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <h3 className="font-semibold text-slate-900">Mix de Ventas</h3>
                <div className="mt-4 h-36 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      {/* ✅ Santabrisseado: Colores del PieChart */}
                      <Pie data={salesMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5}>
                        {salesMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={salesMixColors[index % salesMixColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} contentStyle={{ backgroundColor: SANTA_BRISA_COLORS.text.header, border: 'none', borderRadius: '6px' }} itemStyle={{ color: '#fff' }} />
                      <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "11px", color: SANTA_BRISA_COLORS.text.body }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <UpcomingTasks department="VENTAS" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}