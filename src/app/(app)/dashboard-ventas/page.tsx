
"use client";
import React, { useMemo, useState } from "react";
import dynamic from 'next/dynamic';
import { RefreshCw, BrainCircuit, BarChart3, Users, UserPlus, Briefcase } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton, KPI } from "@/components/ui/ui-primitives";
import { inWindow, orderTotal } from '@/lib/sb-core';
import { SalesOutcomeDialog } from "@/features/agenda/components/SalesOutcomeDialog";
import { PosEventKpisDialog } from "@/features/marketing/components/PosEventKpisDialog";
import type { Interaction, OrderSellOut } from '@/domain/ssot';
import { generateInsights } from '@/ai/flows/generate-insights-flow';
import { TaskBoard } from "@/features/agenda/TaskBoard";
import { mapInteractionsToTasks } from "@/features/agenda/mappers";

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr:false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr:false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr:false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr:false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr:false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr:false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr:false });

type TimeRange = 'week'|'month'|'year';
type Scope = 'personal'|'global';

export default function SalesDashboardPage() {
  const { data, currentUser, loadInitialData } = useData();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [scope, setScope] = useState<Scope>('personal');

  const [salesDlg, setSalesDlg] = useState<{open:boolean; task:Interaction|null}>({open:false, task:null});
  const [posDlg, setPosDlg] = useState<{open:boolean; task:Interaction|null}>({open:false, task:null});

  const now = new Date();
  const startDate = useMemo(() => {
    const d = new Date();
    if (timeRange==='week') d.setDate(now.getDate()-6);
    else if (timeRange==='month') { d.setDate(1); }
    else { d.setMonth(0); d.setDate(1); }
    d.setHours(0,0,0,0);
    return d;
  }, [timeRange, now]);

  const ordersSellOut = useMemo(() => {
    const all = data?.ordersSellOut ?? [];
    const inRange = all.filter(o => inWindow(String(o.createdAt), startDate, now));
    if (scope==='global') return inRange;
    const owns = new Set((data?.accounts||[]).filter(a=>a.ownerId===currentUser?.id).map(a=>a.id));
    return inRange.filter(o => owns.has(o.accountId));
  }, [data?.ordersSellOut, data?.accounts, startDate, now, scope, currentUser?.id]);

  const salesEvolution = useMemo(() => {
    const points: { name:string; sales:number }[] = [];
    const cursor = new Date(startDate);
    const gran = timeRange==='year' ? 'month' : 'day';
    if (gran==='day') {
      while (cursor <= now) {
        const s = new Date(cursor); s.setHours(0,0,0,0);
        const e = new Date(cursor); e.setHours(23,59,59,999);
        const label = s.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
        points.push({
          name: label,
          sales: ordersSellOut.filter(o => inWindow(String(o.createdAt), s, e)).reduce((sum, o:OrderSellOut)=> sum + orderTotal(o), 0),
        });
        cursor.setDate(cursor.getDate()+1);
      }
    } else {
      for (let m=0; m<12; m++){
        const s = new Date(now.getFullYear(), m, 1);
        const e = new Date(now.getFullYear(), m+1, 0, 23,59,59,999);
        if (s < startDate || s > now) continue;
        const label = s.toLocaleDateString('es-ES', { month:'short' });
        points.push({
          name: label,
          sales: ordersSellOut.filter(o => inWindow(String(o.createdAt), s, e)).reduce((sum, o:OrderSellOut)=> sum + orderTotal(o), 0),
        });
      }
    }
    return points;
  }, [ordersSellOut, startDate, now, timeRange]);

  const interactions = useMemo(() => {
    const all = data?.interactions ?? [];
    if (scope==='global') return all.filter(i => i.dept === 'VENTAS');
    return all.filter(i => i.dept === 'VENTAS' && i.userId === currentUser?.id);
  }, [data?.interactions, scope, currentUser?.id]);

  const kpis = useMemo(() => {
    const newAcc = (data?.accounts||[]).filter(a => inWindow(a.createdAt, startDate, now));
    const newAccScoped = scope==='global' ? newAcc : newAcc.filter(a => a.ownerId===currentUser?.id);
    const visitsDone = interactions.filter(i => i.kind==='VISITA' && i.status==='done' && inWindow(String(i.createdAt), startDate, now));
    const accountsWithOrder = new Set(ordersSellOut.map(o=>o.accountId));
    const universe = scope==='global' ? (data?.accounts||[]) : (data?.accounts||[]).filter(a=>a.ownerId===currentUser?.id);
    return {
      newAccounts: newAccScoped.length,
      visits: visitsDone.length,
      conversion: universe.length ? (accountsWithOrder.size / universe.length) * 100 : 0,
      sales: ordersSellOut.reduce((s,o)=> s + orderTotal(o), 0),
    };
  }, [data?.accounts, interactions, ordersSellOut, scope, currentUser?.id, startDate, now]);

  const onRequestComplete = (task: Interaction) => {
    const isPOS = task.dept === 'MARKETING' || task.linkedEntity?.type === 'EVENT';
    isPOS ? setPosDlg({open:true, task}) : setSalesDlg({open:true, task});
  };

  const tasks = useMemo(() => {
    return mapInteractionsToTasks(interactions, data?.accounts);
  }, [interactions, data?.accounts]);

  return (
    <>
      <ModuleHeader
        title="Dashboard de Ventas"
        icon={BarChart3}
      >
          <div className="flex items-center gap-2">
            <div className="p-1 bg-zinc-100 rounded-lg">
              {(['personal','global'] as const).map(s => (
                <SBButton key={s} size="sm" variant="ghost"
                  className={`font-semibold ${scope===s?'bg-white shadow-sm !text-zinc-800':'text-zinc-600'}`}
                  onClick={()=>setScope(s)}>{s==='personal'?'Personal':'Global'}</SBButton>
              ))}
            </div>
            <SBButton variant="secondary" onClick={loadInitialData}><RefreshCw className="h-4 w-4 mr-2"/>Refrescar</SBButton>
            <SBButton variant="secondary" onClick={async ()=>{
              const r = await generateInsights({ jsonData: "{}", context: scope==='personal'?'comercial':'director' });
              console.log(r);
            }}><BrainCircuit className="h-4 w-4 mr-2"/>Análisis con IA</SBButton>
          </div>
      </ModuleHeader>

      <div className="p-6 bg-zinc-50 space-y-6">
        <div className="flex items-center p-1 bg-zinc-100 rounded-lg w-fit">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPI label={`Nuevas Cuentas (${timeRange})`} value={kpis.newAccounts} icon={UserPlus}/>
          <KPI label={`Visitas (${timeRange})`} value={kpis.visits} icon={Users}/>
          <KPI label="Conversión a pedido (total)" value={`${kpis.conversion.toFixed(1)}%`} icon={BarChart3}/>
          <KPI label={`Ventas (${timeRange})`} value={new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(kpis.sales)} icon={Briefcase}/>
        </div>

        <SBCard title={`Evolución de ventas (${timeRange==='week'?'semana':timeRange==='month'?'mes':'año'})`}>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)) }/>
                <Tooltip formatter={(v)=> new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v)) }/>
                <Line type="monotone" dataKey="sales" stroke="#D7713E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SBCard>

        <SBCard title="Tablero de Tareas de Ventas">
          <div className="p-4">
            <TaskBoard
              tasks={tasks}
              onTaskStatusChange={(id, status) => {
                const task = interactions.find(t => t.id === id);
                if (task) onRequestComplete(task);
              }}
              onCompleteTask={(id) => {
                const task = interactions.find(t => t.id === id);
                if (task) onRequestComplete(task);
              }}
            />
          </div>
        </SBCard>
      </div>

      <SalesOutcomeDialog open={salesDlg.open} task={salesDlg.task} onOpenChange={(o)=>setSalesDlg(s=>({...s,open:o}))}/>
      <PosEventKpisDialog open={posDlg.open} task={posDlg.task} onOpenChange={(o)=>setPosDlg(s=>({...s,open:o}))}/>
    </>
  );
}

    