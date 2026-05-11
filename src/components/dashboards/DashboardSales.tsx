/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { getSalesDashboardData } from "@/server/actions/dashboard-sales";
import SalesDashboardClient from "./SalesDashboardClient";

export default async function DashboardSales() {
  // 1) Datos reales del server action
  const result = await getSalesDashboardData();
  
  if (!result.success || !result.data) {
    return (
      <div className="p-6">
        <div className="sb-card p-6">
          <p className="text-destructive">Error: {result.error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    );
  }

  const data = result.data;

  // 2) KPI strip (con fallbacks seguros)
  const sales = data?.salesKpis?.currentSales ?? 0;
  const monthGoal = data?.salesKpis?.monthlyTarget ?? Math.max(40000, sales * 1.5);
  const openOrdersCount = data?.salesKpis?.orders ?? 0;
  const visitsThisWeek = data?.salesKpis?.visits ?? 0;
  const conversion30 = data?.salesKpis?.conversion ?? 0;

  const kpis = [
    { id: "sales", label: "Ventas (rango)", value: `€ ${Number(sales).toLocaleString()}`, hint: "datos reales" },
    { id: "goal", label: "% Objetivo (rango)", value: `${Math.min(100, Math.round((sales / monthGoal) * 100))}%`, hint: `Objetivo € ${monthGoal.toLocaleString()}` },
    { id: "open", label: "Pedidos abiertos", value: String(openOrdersCount), hint: "pendientes" },
    { id: "visits", label: "Visitas", value: String(visitsThisWeek), hint: "semana" },
    { id: "conv", label: "Conversión 30d", value: `${conversion30}%`, hint: "" },
  ];

  // 3) Alerts → derivadas de actividad o tareas
  const alerts = (data?.tasks ?? [])
    .slice(0, 5)
    .map((task: any) => ({
      id: task.id ?? crypto.randomUUID(),
      kind: (task.type === "visit" ? "visita" : task.type === "email" ? "email" : "pedido") as "email" | "visita" | "pedido",
      text: task.title ?? task.description ?? "Tarea pendiente",
      accountId: task.accountId ?? undefined,
    }));

  // 4) Projects donut → derivamos de accountsByStage como ejemplo
  const stageCounts = Object.entries(data?.accountsByStage ?? {}).map(([stage, count]: [string, any]) => ({
    stage,
    count: Number(count ?? 0),
  }));

  const projects = [];
  if (stageCounts.length) {
    const sum = (k: string) => stageCounts.filter(s => s.stage === k).reduce((a, b) => a + b.count, 0);
    const potencial = sum("POTENCIAL");
    const seguimiento = sum("SEGUIMIENTO");
    const activa = sum("ACTIVA");
    
    projects.push(
      { 
        id: "p1", 
        name: "Cartera Activa", 
        todo: potencial, 
        doing: seguimiento, 
        done: activa, 
        trend: "flat" as const
      },
      { 
        id: "p2", 
        name: "Prospección",    
        todo: potencial, 
        doing: Math.round(potencial * 0.3), 
        done: Math.round(potencial * 0.2), 
        trend: "up" as const
      },
    );
  }

  // 5) Tasks → derivadas de tasks o interactions
  const tasks = (data?.tasks ?? [])
    .slice(0, 20)
    .map((task: any) => {
      let status: 'OPEN' | 'DONE' | 'CANCELLED' = 'OPEN';
      if (task.status === 'COMPLETADA' || task.status === 'DONE') {
        status = 'DONE';
      } else if (task.status === 'CANCELADA' || task.status === 'CANCELLED') {
        status = 'CANCELLED';
      }
      return {
        id: task.id ?? crypto.randomUUID(),
        title: task.title ?? task.summary ?? 'Tarea',
        dueISO: task.when ?? task.dueAt ?? undefined,
        status,
        accountName: task.account?.name ?? task.accountName ?? undefined,
      };
    });

  return (
    <SalesDashboardClient
      kpis={kpis}
      alerts={alerts}
      projects={projects}
      tasks={tasks}
      defaultRange="DAY"
    />
  );
}
