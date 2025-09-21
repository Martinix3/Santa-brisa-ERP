

"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { BarChart3, Target, Users, Briefcase, BrainCircuit, UserPlus, MoreHorizontal, Check, AlertCircle, Clock, PieChart as PieChartIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { SB_COLORS } from '@/domain/ssot';
import type { User as UserType, OrderSellOut, Account, Interaction, Product, Party, UserRole, Stage, OrderStatus, AccountType } from '@/domain/ssot';
import { inWindow, orderTotal } from '@/lib/sb-core';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import { Avatar } from "@/components/ui/Avatar";
import { sbAsISO } from '@/features/agenda/helpers';
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';

const formatEur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const formatShortDate = (date: Date) => new Intl.DateTimeFormat('es-ES', { month: 'short', day: 'numeric' }).format(date);

function KPI({label, value, icon: Icon}:{label:string; value:number|string; icon: React.ElementType}){
  return (
    <div className="rounded-xl border border-zinc-200 p-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-600">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-2xl font-semibold text-zinc-900">{typeof value==="number"? value.toLocaleString("es-ES"): value}</div>
            </div>
        </div>
    </div>
  );
}

type TimeRange = 'week' | 'month' | 'year';

type UserReportData = {
    id: string;
    name: string;
    activeAccounts: number;
    newAccounts: number;
    newOrders: number;
    totalEUR: number;
    avgTicket: number;
    conversionRate: number;
};

type UserReportPopoverProps = {
    userReport: UserReportData | null;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    timeRange: TimeRange;
};

function UserReportPopover({ userReport, onClose, anchorEl, timeRange }: UserReportPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!userReport || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();
    const popoverStyle = {
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`,
    };

    return (
        <div ref={popoverRef} style={popoverStyle} className="fixed z-10 w-80 bg-white border rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-zinc-800">{userReport.name}</h4>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100"><X size={16}/></button>
            </div>
            <div className="space-y-1 text-sm">
                 <div className="flex justify-between"><span className="text-zinc-500">Cuentas Activas:</span> <span className="font-medium">{userReport.activeAccounts}</span></div>
                 <div className="flex justify-between"><span className="text-zinc-500">Nuevas Cuentas ({timeRange}):</span> <span className="font-medium">{userReport.newAccounts}</span></div>
                 <div className="flex justify-between"><span className="text-zinc-500">Pedidos ({timeRange}):</span> <span className="font-medium">{userReport.newOrders}</span></div>
                 <div className="flex justify-between"><span className="text-zinc-500">Ventas ({timeRange}):</span> <span className="font-medium">{formatEur(userReport.totalEUR)}</span></div>
                 <div className="flex justify-between"><span className="text-zinc-500">Ticket Medio:</span> <span className="font-medium">{formatEur(userReport.avgTicket)}</span></div>
                 <div className="flex justify-between"><span className="text-zinc-500">Tasa Conversión:</span> <span className="font-medium">{userReport.conversionRate.toFixed(1)}%</span></div>
            </div>
        </div>
    );
}

function CommercialsRace({
  users, data, onUserClick
}: { users: UserType[], data: any, onUserClick: (report: UserReportData, target: HTMLElement) => void }) {

  const raceData = useMemo(() => {
    if (!data || !users) return [];

    // Periodo de la carrera (anual por defecto). Si quieres que siga Semana/Mes/Año, pásale start/end por props.
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const targetsByRep: Record<string, { newAccountsTarget?: number }> = (data as any).salesTargets?.byRep ?? {};

    return users.map(user => {
      const userAccounts = data.accounts.filter((a: Account) => a.ownerId === user.id);
      const openedInPeriod = userAccounts.filter((a: Account) => inWindow(a.createdAt, startOfYear, new Date())).length;

      const target = targetsByRep[user.id]?.newAccountsTarget ?? 0;
      const remaining = Math.max(0, target - openedInPeriod);
      const percentage = target > 0 ? Math.min(100, (openedInPeriod / target) * 100) : 0;

      const userAccountIds = new Set(userAccounts.map((a:Account) => a.id));
      const ordersInPeriod = data.ordersSellOut
        .filter((o: OrderSellOut) => userAccountIds.has(o.accountId) && inWindow(o.createdAt, startOfYear, new Date()));
      const totalSales = ordersInPeriod.reduce((sum: number, o: OrderSellOut) => sum + orderTotal(o), 0);

      const report: UserReportData = {
        id: user.id,
        name: user.name,
        activeAccounts: userAccounts.filter((a: Account) => a.stage === 'ACTIVA').length,
        newAccounts: openedInPeriod,
        newOrders: ordersInPeriod.length,
        totalEUR: totalSales,
        avgTicket: ordersInPeriod.length ? totalSales / ordersInPeriod.length : 0,
        conversionRate: userAccounts.length
          ? (new Set(ordersInPeriod.map((o: OrderSellOut) => o.accountId)).size / userAccounts.length) * 100
          : 0
      };

      return { id: user.id, name: user.name, opened: openedInPeriod, target, remaining, percentage, report };
    }).sort((a, b) => a.remaining - b.remaining);
  }, [data, users]);

  return (
    <SBCard title="Carrera hacia objetivo (Cuentas nuevas)">
      <div className="p-4 space-y-4">
        {raceData.map(u => (
          <button key={u.id} onClick={(e)=>onUserClick(u.report, e.currentTarget)} className="w-full text-left space-y-1 group" aria-label={`Progreso de ${u.name}`}>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <Avatar name={u.name} size="md" />
                <span className="font-medium group-hover:text-sb-cobre">{u.name}</span>
              </div>
              <span className="font-semibold">{u.opened} / {u.target} <span className="text-zinc-500">({u.remaining} por abrir)</span></span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-3 rounded-full"
                style={{ background: SB_COLORS.primary.copper }}
                initial={{ width: 0 }}
                animate={{ width: `${u.percentage}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
              />
            </div>
          </button>
        ))}
      </div>
    </SBCard>
  );
}

function resolveChannel(acc: Account): 'ONLINE'|'PRIVADA'|'HORECA'|'RETAIL'|'EXCLUDE' {
  // Excluye distribuidor/importador usando el modo de cuenta
  // (si tu dataset ya trae type DISTRIBUIDOR/IMPORTADOR puedes usarlo directamente)
  // Nota: customerRoleData no está aquí; para excluir, basta computeAccountMode si ya mapeas billerId/ownerId.
  // Si no, fallback por acc.type:
  if ((acc as any).type === 'DISTRIBUIDOR' || (acc as any).type === 'IMPORTADOR') return 'EXCLUDE';
  if ((acc as any).channel === 'Online' || (acc as any).source === 'Shopify') return 'ONLINE';
  if ((acc as any).type === 'HORECA' || (acc as any).channel === 'Horeca') return 'HORECA';
  if ((acc as any).type === 'RETAIL' || (acc as any).channel === 'Retail') return 'RETAIL';
  return 'PRIVADA';
}

function SalesChannelDonut({ data, timeRange }: { data:any; timeRange:TimeRange }){
  const now = new Date();
  const start = new Date(now);
  if (timeRange==='week') start.setDate(now.getDate()-7);
  else if (timeRange==='month') { start.setDate(1); }
  else { start.setMonth(0); start.setDate(1); }
  start.setHours(0,0,0,0);

  const orders = data.ordersSellOut.filter((o:OrderSellOut)=> inWindow(o.createdAt, start, now));
  const accById = new Map<string,Account>(data.accounts.map((a:Account)=>[a.id,a]));
  const mix = { ONLINE:0, PRIVADA:0, HORECA:0, RETAIL:0 };

  for (const o of orders){
    const acc = accById.get(o.accountId);
    if (!acc) continue;
    const ch = resolveChannel(acc);
    if (ch === 'EXCLUDE') continue;
    mix[ch as keyof typeof mix] += orderTotal(o);
  }

  const rows = Object.entries(mix)
    .map(([name,value])=>({ name, value }))
    .filter(r=>r.value>0);

  if (!rows.length) return <SBCard title="Mix Comercial"><p className="p-4 text-center text-sm text-zinc-500">Sin datos en el periodo.</p></SBCard>;

  const COLORS = ['#F7D15F', '#D7713E', '#618E8F', '#A7D8D9'];

  return (
    <SBCard title={`Mix Comercial (${timeRange})`}>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name" labelLine={false}
              label={({cx,cy,midAngle,innerRadius,outerRadius,percent, name}:any)=>{
                const r = innerRadius + (outerRadius-innerRadius)*0.5;
                const x = cx + r * Math.cos(-midAngle * Math.PI / 180);
                const y = cy + r * Math.sin(-midAngle * Math.PI / 180);
                return <text x={x} y={y} fontSize="12" textAnchor={x>cx?'start':'end'} dominantBaseline="central">{`${name} ${(percent*100).toFixed(0)}%`}</text>
              }}>
              {rows.map((_,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v:number)=>formatEur(v)} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </SBCard>
  );
}

function buildTimeSeries(orders: OrderSellOut[], start: Date, end: Date, granularity:'day'|'month'){
  const out: { name:string; sales:number; target?:number }[] = [];
  const cursor = new Date(start);

  if (granularity === 'day') {
    while (cursor <= end) {
      const dayStart = new Date(cursor); dayStart.setHours(0,0,0,0);
      const dayEnd   = new Date(cursor); dayEnd.setHours(23,59,59,999);
      const name = dayStart.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit' }); // ej. "lun 22"
      const sales = orders
        .filter(o => inWindow(o.createdAt, dayStart, dayEnd))
        .reduce((s,o)=> s + orderTotal(o), 0);
      out.push({ name, sales });
      cursor.setDate(cursor.getDate()+1);
    }
  } else {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    for (let i = 0; i < months; i++) {
      const m = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
      const mEnd   = new Date(m.getFullYear(), m.getMonth()+1, 0, 23,59,59,999);
      const name = mStart.toLocaleDateString('es-ES', { month:'short' }); // "ene"
      const sales = orders
        .filter(o => inWindow(o.createdAt, mStart, mEnd))
        .reduce((s,o)=> s + orderTotal(o), 0);
      out.push({ name, sales });
    }
  }
  return out;
}

function TeamDashboardContent() {
  const { data } = useData();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedUserReport, setSelectedUserReport] = useState<UserReportData | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  const users = useMemo(() => data?.users.filter((u: UserType) => u.role === 'comercial' || u.role === 'owner') || [], [data]);
  
  const { teamStats, salesEvolutionData } = useMemo(() => {
    if(!data) return { teamStats: { totalNewAccounts: 0, conversionRate: 0, attributedSales: 0, visitsInPeriod: 0 }, salesEvolutionData: [] };
    
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === 'week') {
        startDate.setDate(now.getDate() - (now.getDay() - 1 || 7) + 1); // Start of week (Monday)
    } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else { // year
        startDate = new Date(now.getFullYear(), 0, 1);
    }
    startDate.setHours(0,0,0,0);


    const ordersInPeriod = data.ordersSellOut.filter(o => inWindow(o.createdAt, startDate, now));
    const granularity = timeRange === 'year' ? 'month' : 'day';
    const baseSeries = buildTimeSeries(ordersInPeriod, startDate, now, granularity);

    // línea de objetivo (global o por rep si filtras uno):
    const revenueTarget = (data as any).salesTargets?.revenueTarget ?? null;
    const salesEvolutionData = baseSeries.map(p => ({
      ...p,
      target: revenueTarget ? Math.round(revenueTarget / baseSeries.length) : undefined
    }));

    const totalNewAccounts = data.accounts.filter(a => inWindow(a.createdAt, startDate, now)).length;
    
    const accountsWithOrders = new Set(data.ordersSellOut.map(o => o.accountId));
    const conversionRate = data.accounts.length > 0 ? (accountsWithOrders.size / data.accounts.length) * 100 : 0;
    
    const attributedSales = ordersInPeriod.reduce((sum, order) => sum + orderTotal(order), 0);

    const visitsInPeriod = data.interactions.filter(i =>
        i.kind === 'VISITA' &&
        i.status === 'done' &&
        inWindow(i.createdAt, startDate, now)
    ).length;

    const teamStats = { totalNewAccounts, conversionRate, attributedSales, visitsInPeriod };
    return { teamStats, salesEvolutionData };
  }, [data, timeRange]);
  
  const handleGenerateInsights = async () => {
    if (!data) return;
    setLoadingInsights(true);
    setInsights("");
    try {
        const relevantData = {
            users: data.users.map(u => ({ id: u.id, name: u.name, role: u.role })),
            accounts: data.accounts.map(a => ({ id: a.id, name: a.name, stage: a.stage, type: a.type, owner: a.ownerId })),
            orders: data.ordersSellOut.map(o => ({ id: o.id, accountId: o.accountId, status: o.status, total: orderTotal(o), date: o.createdAt })),
            interactions: data.interactions.map(i => ({ id: i.id, accountId: i.accountId, userId: i.userId, kind: i.kind, date: i.createdAt })),
        };
        const result = await generateInsights({ 
            jsonData: JSON.stringify(relevantData),
            context: "Eres un director de ventas. Analiza los datos de comerciales, cuentas y pedidos para encontrar oportunidades de venta, clientes en riesgo, o comerciales con bajo rendimiento."
        });
        setInsights(result);
    } catch (e) {
        console.error(e);
        setInsights("Hubo un error al generar el informe. Inténtalo de nuevo.");
    } finally {
        setLoadingInsights(false);
    }
  };
  
  const handleUserClick = (report: UserReportData, target: HTMLElement) => {
    setSelectedUserReport(report);
    setPopoverAnchor(target);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center p-1 bg-zinc-100 rounded-lg">
                {(['week', 'month', 'year'] as const).map(range => (
                    <SBButton
                        key={range}
                        size="sm"
                        onClick={() => setTimeRange(range)}
                        variant="ghost"
                        className={`font-semibold ${timeRange === range ? 'bg-white shadow-sm !text-zinc-800' : 'text-zinc-600'}`}
                    >
                        {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                    </SBButton>
                ))}
            </div>
             <SBButton variant="secondary" onClick={handleGenerateInsights} disabled={loadingInsights}>
                <BrainCircuit className="h-4 w-4" /> {loadingInsights ? 'Analizando...' : 'Análisis con IA'}
            </SBButton>
        </div>

        {insights && (
            <div className="prose prose-sm p-4 bg-zinc-50 rounded-lg border max-w-none whitespace-pre-wrap">
                <h3 className="font-semibold text-zinc-800">Análisis con IA</h3>
                {insights}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPI icon={UserPlus} label={`Nuevas Cuentas (${timeRange})`} value={teamStats.totalNewAccounts} />
            <KPI icon={Users} label={`Visitas (${timeRange})`} value={teamStats.visitsInPeriod} />
            <KPI icon={BarChart3} label="Conversión a pedido (total)" value={`${teamStats.conversionRate.toFixed(1)}%`} />
            <KPI icon={Briefcase} label={`Ventas (${timeRange})`} value={formatEur(teamStats.attributedSales)} />
        </div>
        
        <SBCard title="Evolución de Ventas">
            <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesEvolutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(value) => formatEur(value as number)} />
                        <Tooltip formatter={(value) => formatEur(value as number)} />
                        <Line type="monotone" dataKey="sales" stroke={SB_COLORS.primary.copper} strokeWidth={2} dot={{ r: 3 }} />
                        {teamStats.attributedSales > 0 && (
                          <Line type="monotone" dataKey="target" stroke="#999" strokeDasharray="4 4" dot={false} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </SBCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <CommercialsRace users={users} data={data} onUserClick={handleUserClick} />
                <SalesChannelDonut data={data} timeRange={timeRange} />
            </div>
            <div className="space-y-6">
                <UpcomingTasks department="VENTAS" />
            </div>
        </div>
        
        <UserReportPopover 
            userReport={selectedUserReport} 
            onClose={() => setSelectedUserReport(null)}
            anchorEl={popoverAnchor}
            timeRange={timeRange}
        />
    </div>
  );
}

export default function SalesDashboardPage() {
    return (
        <>
            <ModuleHeader title="Dashboard de Ventas de Equipo" icon={BarChart3} />
            <div className="p-6 bg-zinc-50 flex-grow">
              <TeamDashboardContent />
            </div>
        </>
    )
}
