
"use client";
import React, { useMemo, useState } from "react";
import dynamic from 'next/dynamic';
import { RefreshCw, BrainCircuit, BarChart3, Users, UserPlus, Briefcase } from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton, KPI } from "@/components/ui/ui-primitives";
import { inWindow, orderTotal } from '@/lib/sb-core';
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';
import { SalesOutcomeDialog } from "@/features/agenda/components/SalesOutcomeDialog";             // NUEVO
import { PosEventKpisDialog } from "@/features/marketing/components/PosEventKpisDialog";         // NUEVO
import type { User as UserType, OrderSellOut, Account, Interaction } from '@/domain/ssot';
import { generateInsights } from '@/ai/flows/generate-insights-flow';

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
  const [scope, setScope] = useState<Scope>('personal'); // ⬅️ PERSONAL/GLOBAL
  const [insights, setInsights] = useState(""); const [loadingInsights, setLoadingInsights] = useState(false);

  // estado para diálogos de completar
  const [salesDialog, setSalesDialog] = useState<{open:boolean; task: Interaction|null}>({open:false, task:null});
  const [posDialog, setPosDialog] = useState<{open:boolean; task: Interaction|null}>({open:false, task:null});

  const now = new Date();
  const startDate = useMemo(() => {
    const d = new Date();
    if (timeRange==='week') d.setDate(now.getDate()-6);
    else if (timeRange==='month') { d.setDate(1); }
    else { d.setMonth(0); d.setDate(1); }
    d.setHours(0,0,0,0);
    return d;
  }, [timeRange, now]);

  // filtro por scope
  const filterByScope = <T extends { userId?:string }>(rows: T[]) => {
    if (scope==='global') return rows;
    return rows.filter(r => r.userId === currentUser?.id);
  };

  const ordersSellOut = useMemo(() => {
    const all = data?.ordersSellOut ?? [];
    const inRange = all.filter(o => inWindow(String(o.createdAt), startDate, now));
    // PERSONAL/GLOBAL por cuentas del usuario (si quieres), de momento global
    return scope==='global' ? inRange : inRange.filter(o => {
      const acc = data?.accounts.find(a => a.id === o.accountId);
      return acc?.ownerId === currentUser?.id; // atribución simple
    });
  }, [data?.ordersSellOut, data?.accounts, startDate, now, scope, currentUser?.id]);

  const salesEvolution = useMemo(() => {
    // serie simple por día/mes
    const points: { name:string; sales:number }[] = [];
    const cursor = new Date(startDate);
    const gran = timeRange==='year' ? 'month' : 'day';

    if (gran==='day') {
      while (cursor <= now) {
        const s = new Date(cursor); s.setHours(0,0,0,0);
        const e = new Date(cursor); e.setHours(23,59,59,999);
        const label = s.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
        const value = ordersSellOut.filter(o => inWindow(String(o.createdAt), s, e))
          .reduce((sum, o)=> sum + orderTotal(o), 0);
        points.push({ name: label, sales: value });
        cursor.setDate(cursor.getDate()+1);
      }
    } else {
      for (let m=0; m<12; m++){
        const s = new Date(now.getFullYear(), m, 1);
        const e = new Date(now.getFullYear(), m+1, 0, 23,59,59,999);
        if (s < startDate || s > now) continue;
        const label = s.toLocaleDateString('es-ES', { month:'short' });
        const value = ordersSellOut.filter(o => inWindow(String(o.createdAt), s, e))
          .reduce((sum, o)=> sum + orderTotal(o), 0);
        points.push({ name: label, sales: value });
      }
    }
    return points;
  }, [ordersSellOut, startDate, now, timeRange]);

  const interactions = useMemo(() => filterByScope(data?.interactions ?? []), [data?.interactions, scope, currentUser?.id]);

  const kpis = useMemo(() => {
    const newAccounts = (data?.accounts ?? []).filter(a => inWindow(a.createdAt, startDate, now));
    const newAccScoped = scope==='global' ? newAccounts : newAccounts.filter(a => a.ownerId === currentUser?.id);
    const visitsDone = interactions.filter(i => i.kind==='VISITA' && i.status==='done' && inWindow(String(i.createdAt), startDate, now));
    const accountsWithOrder = new Set((scope==='global'? data?.ordersSellOut : ordersSellOut)?.map(o=>o.accountId));
    const universe = scope==='global' ? (data?.accounts ?? []) : (data?.accounts ?? []).filter(a => a.ownerId===currentUser?.id);

    return {
      newAccounts: newAccScoped.length,
      visits: visitsDone.length,
      conversion: universe.length ? (accountsWithOrder.size / universe.length) * 100 : 0,
      sales: ordersSellOut.reduce((s,o)=> s + orderTotal(o), 0),
    };
  }, [data?.accounts, interactions, ordersSellOut, data?.ordersSellOut, scope, currentUser?.id, startDate, now]);

  // Insights IA
  const handleGenerateInsights = async () => {
    if (!data) return;
    setLoadingInsights(true); setInsights("");
    try {
      const relevant = {
        scope,
        users: data.users.map(u => ({ id:u.id, name:u.name, role:u.role })),
        accounts: (scope==='global' ? data.accounts : data.accounts.filter(a=>a.ownerId===currentUser?.id))
          .map(a=>({ id:a.id, name:a.name, stage:a.stage, owner:a.ownerId })),
        orders: ordersSellOut.map(o=>({ id:o.id, accountId:o.accountId, total:orderTotal(o), date:o.createdAt })),
        interactions: interactions.map(i=>({ id:i.id, accountId:i.accountId, kind:i.kind, status:i.status, date:i.createdAt })),
      };
      const result = await generateInsights({
        jsonData: JSON.stringify(relevant),
        context: scope==='personal'
          ? "Eres comercial. Dame 5 acciones concretas para cerrar ventas y recuperar cuentas."
          : "Eres director comercial. Señala oportunidades, riesgo de fuga y focos de ejecución del equipo."
      });
      setInsights(result);
    } finally { setLoadingInsights(false); }
  };

  // ⬇️ Hook-in con tu kanban: al marcar 'done' abrimos el diálogo correcto
  const handleTaskCompleteRequest = (task: Interaction) => {
    // si es evento/PLV → KPIs; si es ventas → resultado comercial
    const isPos = task.dept === 'MARKETING' || (task.linkedEntity?.type === 'EVENT');
    if (isPos) setPosDialog({ open:true, task });
    else setSalesDialog({ open:true, task });
  };

  return (
    <>
      <ModuleHeader
        title="Dashboard de Ventas"
        icon={BarChart3}
      />

      <div className="p-6 bg-zinc-50 space-y-6">
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
             <div className="flex items-center gap-2">
                <div className="p-1 bg-zinc-100 rounded-lg">
                    {(['personal','global'] as const).map(s => (
                        <SBButton key={s} size="sm" variant="ghost"
                        className={`font-semibold ${scope===s?'bg-white shadow-sm !text-zinc-800':'text-zinc-600'}`}
                        onClick={()=>setScope(s)}>{s==='personal'?'Personal':'Global'}</SBButton>
                    ))}
                </div>
                <SBButton variant="secondary" onClick={loadInitialData}><RefreshCw className="h-4 w-4 mr-2"/>Refrescar</SBButton>
                <SBButton variant="secondary" onClick={handleGenerateInsights} disabled={loadingInsights}>
                    <BrainCircuit className="h-4 w-4 mr-2"/>{loadingInsights?'Analizando...':'Análisis con IA'}
                </SBButton>
             </div>
        </div>
        {insights && (
          <div className="prose prose-sm p-4 bg-zinc-50 rounded-lg border max-w-none whitespace-pre-wrap">
            <h3 className="font-semibold text-zinc-800">Análisis con IA</h3>
            {insights}
          </div>
        )}

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

        {/* Izquierda widgets; derecha tareas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* aquí puedes reusar tus widgets (carrera, mix, etc.) */}
          </div>
          <div className="space-y-6">
            {/* Kanban de tareas: PERSONAL ⇒ sólo tareas del usuario. GLOBAL ⇒ todas (incluye marketing). */}
            <UpcomingTasks
              scope={scope}                 // ⬅️ añade este prop en tu componente
              onlyUserId={scope==='personal' ? currentUser?.id : undefined}
              includeDepartments={scope==='global' ? ['VENTAS','MARKETING'] : ['VENTAS']}
              onRequestComplete={(t: Interaction) => handleTaskCompleteRequest(t)} // ⬅️ abre diálogos
            />
          </div>
        </div>
      </div>

      {/* Diálogos al completar */}
      <SalesOutcomeDialog
        open={salesDialog.open}
        task={salesDialog.task}
        onOpenChange={(o)=> setSalesDialog(s=>({ ...s, open:o }))}
      />
      <PosEventKpisDialog
        open={posDialog.open}
        task={posDialog.task}
        onOpenChange={(o)=> setPosDialog(s=>({ ...s, open:o }))}
      />
    </>
  );
}
