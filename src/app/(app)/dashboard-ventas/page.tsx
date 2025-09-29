
// src/app/(app)/dashboard-ventas/page.tsx
"use client";
import React, { useMemo, useState } from "react";
import dynamic from 'next/dynamic';
import {
  RefreshCw, BrainCircuit, BarChart3, Users, UserPlus, Briefcase,
  PackageCheck, CalendarClock, Target
} from "lucide-react";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton, KPI } from "@/components/ui/ui-primitives";
import { inWindow, orderTotal } from "@/lib/sb-core";
import { UpcomingTasks } from "@/features/agenda/components/UpcomingTasks";
import { SalesOutcomeDialog } from "@/features/agenda/components/SalesOutcomeDialog";
import { PosCompleteDialog } from "@/features/pos/PosCompleteDialog"; // ⬅️ nuevo unificado
import type { Interaction, OrderSellOut } from "@/domain/ssot";
import { generateInsights } from "@/ai/flows/generate-insights-flow";

// recharts (lazy)
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr:false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr:false });
const ComposedChart = dynamic(() => import("recharts").then(m => m.ComposedChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr:false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr:false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr:false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr:false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr:false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr:false });

type TimeRange = "week"|"month"|"year";
type Scope = "personal"|"global";

export default function SalesDashboardPage() {
  const { data, currentUser, loadInitialData } = useData();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [scope, setScope] = useState<Scope>("personal");

  // diálogos
  const [salesDlg, setSalesDlg] = useState<{open:boolean; task:Interaction|null}>({ open:false, task:null });
  const [posDlg, setPosDlg] = useState<{open:boolean; tacticId:string|null}>({ open:false, tacticId:null });

  const now = new Date();
  const startDate = useMemo(() => {
    const d = new Date();
    if (timeRange==="week") d.setDate(now.getDate()-6);
    else if (timeRange==="month") { d.setDate(1); }
    else { d.setMonth(0); d.setDate(1); }
    d.setHours(0,0,0,0);
    return d;
  }, [timeRange, now]);

  // helpers de filtro por scope
  const owns = useMemo(() => new Set((data?.accounts||[]).filter(a => a.ownerId===currentUser?.id).map(a => a.id)), [data?.accounts, currentUser?.id]);
  const applyScopeOrders = (rows: OrderSellOut[]) => scope==="global" ? rows : rows.filter(o => owns.has(o.accountId));
  const applyScopeTasks  = (rows: Interaction[]) => scope==="global" ? rows : rows.filter(i => i.userId===currentUser?.id);

  // datos base en rango
  const sellOutInRange = useMemo(() => {
    const base = (data?.ordersSellOut||[]).filter(o => inWindow(String(o.createdAt), startDate, now));
    return applyScopeOrders(base);
  }, [data?.ordersSellOut, startDate, now, scope, applyScopeOrders]);

  const interactions = useMemo(() => applyScopeTasks(data?.interactions||[]), [data?.interactions, scope, currentUser?.id, applyScopeTasks]);

  // POS tácticas (para KPIs del tablero)
  const posTactics = useMemo(() => {
    const all = (data as any)?.posTactics || [];
    const scoped = scope==="global" ? all : all.filter((t:any) => owns.has(t.accountId));
    return scoped.filter((t:any) => inWindow(t.createdAt, startDate, now));
  }, [data, scope, startDate, now, owns]);

  // KPIs
  const kpis = useMemo(() => {
    const newAcc = (data?.accounts||[]).filter(a => inWindow(a.createdAt, startDate, now));
    const newAccScoped = scope==="global" ? newAcc : newAcc.filter(a => a.ownerId===currentUser?.id);

    const visitsDone = interactions.filter(i => i.kind==="VISITA" && i.status==="done" && inWindow(String(i.createdAt), startDate, now)).length;
    const salesEUR = sellOutInRange.reduce((s,o)=> s + orderTotal(o), 0);

    // POS KPIs
    const posScheduled = posTactics.filter((t:any) => t.status==="SCHEDULED").length;
    const posDelivered = posTactics.filter((t:any) => t.status==="DELIVERED" || t.status==="CLOSED").length;
    const overdueTasks = (interactions||[]).filter(i => i.status!=="done" && i.plannedFor && new Date(i.plannedFor) < now).length;

    const accountsWithOrder = new Set(sellOutInRange.map(o => o.accountId));
    const universe = scope==="global" ? (data?.accounts||[]) : (data?.accounts||[]).filter(a => a.ownerId===currentUser?.id);
    const conversion = universe.length ? (accountsWithOrder.size / universe.length) * 100 : 0;

    return {
      newAccounts: newAccScoped.length,
      visitsDone,
      salesEUR,
      conversion,
      posScheduled,
      posDelivered,
      overdueTasks,
    };
  }, [data?.accounts, interactions, sellOutInRange, posTactics, scope, currentUser?.id, startDate, now]);

  // Serie combinada Ventas + nº tácticas POS en el periodo
  const evolution = useMemo(() => {
    const pts: { name:string; sales:number; posCount:number }[] = [];
    const gran = timeRange==="year" ? "month" : "day";
    const cur = new Date(startDate);

    const tacticsInRange = (data as any)?.posTactics?.filter((t:any)=> inWindow(t.createdAt, startDate, now)) || [];
    const tacticsScoped = scope==="global" ? tacticsInRange : tacticsInRange.filter((t:any)=> owns.has(t.accountId));

    if (gran==="day") {
      while (cur <= now) {
        const s = new Date(cur); s.setHours(0,0,0,0);
        const e = new Date(cur); e.setHours(23,59,59,999);
        const name = s.toLocaleDateString("es-ES",{ day:"2-digit", month:"short" });
        const sales = sellOutInRange.filter(o => inWindow(String(o.createdAt), s, e)).reduce((sum,o)=>sum+orderTotal(o),0);
        const posCount = tacticsScoped.filter((t:any)=> inWindow(t.createdAt, s, e)).length;
        pts.push({ name, sales, posCount });
        cur.setDate(cur.getDate()+1);
      }
    } else {
      for (let m=0; m<12; m++){
        const s = new Date(now.getFullYear(), m, 1);
        const e = new Date(now.getFullYear(), m+1, 0, 23,59,59,999);
        if (s < startDate || s > now) continue;
        const name = s.toLocaleDateString("es-ES",{ month:"short" });
        const sales = sellOutInRange.filter(o => inWindow(String(o.createdAt), s, e)).reduce((sum,o)=>sum+orderTotal(o),0);
        const posCount = tacticsScoped.filter((t:any)=> inWindow(t.createdAt, s, e)).length;
        pts.push({ name, sales, posCount });
      }
    }
    return pts;
  }, [sellOutInRange, timeRange, startDate, now, data, scope, owns]);

  // Completar tarjeta del kanban
  const onRequestComplete = (task: Interaction) => {
    const link = task.linkedEntity;
    if (link?.type === "POS_TACTIC") {
      // cerrar con entrega/KPIs según fulfillment del catálogo
      setPosDlg({ open:true, tacticId: link.id });
    } else {
      // ventas normal (pedido / otra interacción / POS)
      setSalesDlg({ open:true, task });
    }
  };

  return (
    <>
      <ModuleHeader
        title="Dashboard de Ventas"
        icon={BarChart3}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-zinc-100 rounded-lg">
            {(["personal","global"] as const).map(s => (
              <SBButton
                key={s}
                size="sm"
                variant="ghost"
                className={`font-semibold ${scope===s ? "bg-white shadow-sm !text-zinc-800" : "text-zinc-600"}`}
                onClick={()=>setScope(s)}
              >
                {s==="personal" ? "Personal" : "Global"}
              </SBButton>
            ))}
          </div>
          <SBButton variant="secondary" onClick={loadInitialData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refrescar
          </SBButton>
          <SBButton
            variant="secondary"
            onClick={async ()=>{
              const result = await generateInsights({
                jsonData: JSON.stringify({
                  scope,
                  accounts: (data?.accounts||[]).length,
                  orders: sellOutInRange.length,
                  pos: posTactics.length,
                }),
                context: scope==="personal"
                  ? "Comercial: dame 5 acciones rápidas para cerrar ventas y activar POS eficaces"
                  : "Dirección: oportunidades por cuentas, POS y foco de ejecución del equipo"
              });
              console.log(result);
            }}
          >
            <BrainCircuit className="h-4 w-4 mr-2" /> Análisis con IA
          </SBButton>
        </div>
      </ModuleHeader>

      <div className="p-6 bg-zinc-50 space-y-6">
        {/* Selector de periodo */}
        <div className="flex items-center p-1 bg-zinc-100 rounded-lg w-fit">
          {(["week","month","year"] as const).map(range => (
            <SBButton
              key={range}
              size="sm"
              onClick={()=>setTimeRange(range)}
              variant="ghost"
              className={`font-semibold ${timeRange===range ? "bg-white shadow-sm !text-zinc-800" : "text-zinc-600"}`}
            >
              {range==="week" ? "Semana" : range==="month" ? "Mes" : "Año"}
            </SBButton>
          ))}
        </div>

        {/* KPIs fila 1 (ventas + ejecución comercial) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <KPI label={`Nuevas Cuentas (${timeRange})`} value={kpis.newAccounts} icon={UserPlus}/>
          <KPI label={`Visitas cerradas (${timeRange})`} value={kpis.visitsDone} icon={Users}/>
          <KPI label="Conversión a pedido" value={`${kpis.conversion.toFixed(1)}%`} icon={BarChart3}/>
          <KPI label={`Ventas (${timeRange})`} value={new Intl.NumberFormat("es-ES",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(kpis.salesEUR)} icon={Briefcase}/>
          <KPI label="POS programadas" value={kpis.posScheduled} icon={CalendarClock}/>
          <KPI label="POS entregadas/cerradas" value={kpis.posDelivered} icon={PackageCheck}/>
        </div>

        {/* Avisos ejecución */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SBCard title="Alarmas rápidas">
            <div className="p-4 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-600">Tareas vencidas</span>
                <span className={`px-2 py-0.5 rounded text-xs ${kpis.overdueTasks>0?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>
                  {kpis.overdueTasks}
                </span>
              </div>
              {/* aquí podrías añadir “cuentas sin pedido 60+ días”, etc. */}
            </div>
          </SBCard>

          <SBCard title="Evolución de ventas + POS">
            <div className="h-56 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedSalesPosChart data={evolution}/>
              </ResponsiveContainer>
            </div>
          </SBCard>

          <SBCard title="Objetivo simple (demo)">
            <div className="p-4 text-sm text-zinc-600">
              <Target className="h-4 w-4 inline mr-2" />
              Añade aquí tu progreso vs objetivo del mes/año.
            </div>
          </SBCard>
        </div>

        {/* Widgets + Kanban */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* aquí puedes reusar: carrera comerciales, mix, top cuentas... */}
          </div>

          {/* Kanban: pasadas / próximas / hechas — con cierre guiado */}
          <div className="space-y-6">
            <UpcomingTasks
              scope={scope}
              onlyUserId={scope==="personal" ? currentUser?.id : undefined}
              includeDepartments={scope==="global" ? ["VENTAS","MARKETING"] : ["VENTAS"]}
              onRequestComplete={(t: Interaction) => {
                const link = t.linkedEntity;
                if (link?.type === "POS_TACTIC") setPosDlg({ open:true, tacticId: link.id });
                else setSalesDlg({ open:true, task: t });
              }}
            />
          </div>
        </div>
      </div>

      {/* Diálogos */}
      <SalesOutcomeDialog
        open={salesDlg.open}
        task={salesDlg.task}
        onOpenChange={(o)=> setSalesDlg(s=>({ ...s, open:o }))}
      />
      <PosCompleteDialog
        open={posDlg.open}
        tacticId={posDlg.tacticId!}
        onOpenChange={(o)=> setPosDlg(s=>({ ...s, open:o }))}
      />
    </>
  );
}

/** Gráfico combinado: barras = nº tácticas POS, línea = ventas € */
function ComposedSalesPosChart({ data }:{ data:{ name:string; sales:number; posCount:number }[] }) {
  return (
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" fontSize={12}/>
      <YAxis yAxisId="left" fontSize={12} tickFormatter={(v)=> new Intl.NumberFormat("es-ES",{ style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Number(v)) }/>
      <YAxis yAxisId="right" orientation="right" fontSize={12}/>
      <Tooltip formatter={(v:any, name:any)=>{
        if (name==="sales") return [new Intl.NumberFormat("es-ES",{ style:"currency", currency:"EUR" }).format(Number(v)), "Ventas"];
        return [v, "POS"];
      }}/>
      <Bar yAxisId="right" dataKey="posCount" name="POS" fill="#a1a1aa" />
      <Line yAxisId="left" type="monotone" dataKey="sales" name="Ventas" stroke="#D7713E" strokeWidth={2} dot={{ r: 3 }}/>
    </ComposedChart>
  );
}
