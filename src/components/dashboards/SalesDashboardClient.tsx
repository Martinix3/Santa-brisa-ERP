"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { DrawerController } from "@/ui/drawers/DrawerController";
import { KpiWidget } from "@/components/widgets/KpiWidget";
import { AlertsWidget } from "@/components/widgets/AlertsWidget";
import { ProjectsCircleWidget } from "@/components/widgets/ProjectsCircleWidget";
import { MiniCalendarCollapsible } from "@/components/widgets/MiniCalendarCollapsible";
import { TasksWidget, TaskItem } from "@/components/widgets/TasksWidget";

type RangeKey = "DAY" | "WEEK" | "MONTH" | "YEAR";

export default function SalesDashboardClient({
  kpis,
  alerts,
  projects,
  tasks = [],
  defaultRange = "DAY",
}: {
  kpis: { id: string; label: string; value: string; hint?: string }[];
  alerts: { id: string; kind: "email" | "visita" | "pedido"; text: string; accountId?: string }[];
  projects: { id: string; name: string; todo: number; doing: number; done: number; trend: "up" | "down" | "flat" }[];
  tasks?: TaskItem[];
  defaultRange?: RangeKey;
}) {
  const [range, setRange] = useState<RangeKey>(defaultRange);

  return (
    <DrawerController>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="sb-header-glass p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Dashboard Ventas</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Equipo comercial · Pipeline · Actividad
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Range Tabs - Full width, scrollable en mobile */}
          <div className="lg:col-span-12">
            <div className="sb-card-glass-light p-2 rounded-2xl flex gap-2 overflow-x-auto">
              {(["DAY", "WEEK", "MONTH", "YEAR"] as RangeKey[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRange(t)}
                  className={`sb-btn flex-shrink-0 ${range === t ? "sb-btn--primary" : "sb-btn--ghost"}`}
                >
                  {t === "DAY" ? "Día" : t === "WEEK" ? "Semana" : t === "MONTH" ? "Mes" : "Año"}
                </button>
              ))}
            </div>
          </div>

          {/* KPI strip - 2 cols mobile, 3 cols tablet, 5 cols desktop */}
          <div className="lg:col-span-12 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <KpiWidget key={k.id} {...k} />
            ))}
          </div>

          {/* Desktop: Alerts (8 cols) + Projects (4 cols) lado a lado */}
          {/* Mobile: Apilados */}
          <div className="lg:col-span-8 space-y-4 lg:space-y-0">
            <AlertsWidget items={alerts} />
          </div>

          <div className="lg:col-span-4">
            <ProjectsCircleWidget projects={projects} />
          </div>

          {/* Desktop: Tasks (7 cols) + Calendario (5 cols) lado a lado */}
          {/* Mobile: Apilados */}
          <div className="lg:col-span-7">
            <TasksWidget title="Tareas" items={tasks} />
          </div>

          <div className="lg:col-span-5">
            <MiniCalendarCollapsible />
          </div>
        </div>
      </div>
    </DrawerController>
  );
}
