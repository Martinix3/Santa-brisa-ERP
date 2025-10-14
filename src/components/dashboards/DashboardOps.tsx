"use client";

import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  Activity, 
  Boxes, 
  ClipboardCheck, 
  Factory, 
  PackageSearch, 
  Truck, 
  TriangleAlert, 
  Gauge, 
  Recycle,
  Calendar
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { AlertsCard } from "./shared/AlertsCard";

export default function DashboardOps() {
  const { currentUser } = useData();
  const [tab, setTab] = useState<"hoy" | "logistica" | "inventario" | "calidad" | "produccion">("hoy");

  // Datos mock (reemplazar con server actions)
  const todayKpis = {
    ordersInTransit: 12,
    criticalStock: 5,
    lotsInQC: 3,
    activeProductionOrders: 2
  };

  const alerts = [
    // Alertas operativas
    { id: '1', type: 'critical' as const, title: 'Rotura stock: SB-LIME-01', description: '< 10 unidades restantes', actionLabel: 'Ver inventario' },
    { id: '2', type: 'warning' as const, title: 'QC pendiente: Lote L-BASE-422', description: 'Esperando liberación', actionLabel: 'Abrir QC' },
    { id: '3', type: 'info' as const, title: 'Reserva FEFO próxima a caducar', description: 'Lote L-ENV-093 - 7 días', actionLabel: 'Ver detalles' },
    // Tareas integradas
    { id: 'task-1', type: 'critical' as const, title: '📋 Liberar lote L-BASE-422', description: 'Vence hoy · QC pendiente', actionLabel: 'Ver tarea' },
    { id: 'task-2', type: 'warning' as const, title: '📋 Revisar stock crítico SB-LIME-01', description: 'Vence mañana · Reposición urgente', actionLabel: 'Ver tarea' },
    { id: 'task-3', type: 'info' as const, title: '📋 Planificar producción semana próxima', description: 'Esta semana · Coordinación', actionLabel: 'Ver tarea' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard OPS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Operaciones · Logística · Inventario · Calidad · Producción
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all">
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "hoy", label: "Hoy", icon: Calendar },
          { key: "logistica", label: "Logística", icon: Truck },
          { key: "inventario", label: "Inventario", icon: Boxes },
          { key: "calidad", label: "Calidad", icon: ClipboardCheck },
          { key: "produccion", label: "Producción", icon: Factory }
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80"
              }`}
              onClick={() => setTab(t.key as any)}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* HOY - Resumen cross-OPS */}
      {tab === "hoy" && (
        <>
          {/* KPIs superiores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Órdenes en tránsito"
              value={todayKpis.ordersInTransit}
              hint="últimas 24h"
              variant="light"
              icon={<Truck size={20} />}
            />
            <KpiCard
              label="Stock crítico (SKUs)"
              value={todayKpis.criticalStock}
              hint="< min. seguridad"
              variant="light"
              icon={<TriangleAlert size={20} />}
              trend="down"
            />
            <KpiCard
              label="Lotes en QC"
              value={todayKpis.lotsInQC}
              hint="2 PENDING · 1 HOLD"
              variant="light"
              icon={<ClipboardCheck size={20} />}
            />
            <KpiCard
              label="Órdenes de producción"
              value={todayKpis.activeProductionOrders}
              hint="en curso"
              variant="light"
              icon={<Factory size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Movimientos del día */}
            <div className="sb-card-glass-light xl:col-span-2 p-5 hover-raise">
              <div className="flex items-center gap-2 mb-4">
                <Truck size={18} />
                <h3 className="text-sm font-semibold">Movimientos y envíos de hoy</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">•</span>
                  <span>Salida <strong>SB-ALB-2025-114</strong> → Cliente: La Rebotica (Madrid) — 14:20</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-info mt-0.5">•</span>
                  <span>Entrada proveedor <strong>AGV-TEQ-7</strong> — 12:05</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Transferencia a PRO: Lote <strong>L-ENV-093</strong> — 10:10</span>
                </li>
              </ul>
            </div>

            {/* Alertas */}
            <AlertsCard alerts={alerts} variant="light" />
          </div>
        </>
      )}

      {/* LOGÍSTICA */}
      {tab === "logistica" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="sb-card-glass-light xl:col-span-2 p-5 hover-raise">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck size={18} />
                <h3 className="text-sm font-semibold">Salidas programadas</h3>
              </div>
              <span className="sb-kpi-badge px-3 py-1 text-xs">Hoy</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/30">
                    <th className="pb-2 font-medium">Hora</th>
                    <th className="pb-2 font-medium">Destinatario</th>
                    <th className="pb-2 font-medium">Bultos</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <tr className="hover:bg-secondary/30">
                    <td className="py-3">14:30</td>
                    <td className="py-3">Dis. Central Madrid</td>
                    <td className="py-3">6</td>
                    <td className="py-3">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-info/10 text-info">
                        Etiquetado
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-secondary/30">
                    <td className="py-3">16:00</td>
                    <td className="py-3">Hotel Fuerte</td>
                    <td className="py-3">4</td>
                    <td className="py-3">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                        Picking
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <PackageSearch size={18} />
              <h3 className="text-sm font-semibold">Incidencias transporte</h3>
            </div>
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground">
                • Retraso 24h envío SB-ALB-2025-110 (Menorca) — incidencia meteorológica
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INVENTARIO */}
      {tab === "inventario" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="SKUs en stock" value="128" variant="light" />
            <KpiCard label="Valor inventario" value="€ 84.320" variant="light" />
            <KpiCard label="Roturas" value="3" variant="light" trend="down" />
            <KpiCard label="Cobertura media" value="26 días" variant="light" />
          </div>

          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Boxes size={18} />
              <h3 className="text-sm font-semibold">Stock crítico (Top 10)</h3>
            </div>
            <ul className="grid md:grid-cols-2 gap-2 text-sm">
              <li className="flex items-center gap-2">
                <span>• SB-LIME-01 — 12 u.</span>
                <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-destructive/10 text-destructive">
                  crítico
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span>• SB-BOT-750 — 60 u.</span>
                <span className="sb-kpi-badge px-2 py-0.5 text-xs">bajo</span>
              </li>
              <li className="flex items-center gap-2">
                <span>• SB-TAJIN-OT — 24 u.</span>
                <span className="sb-kpi-badge px-2 py-0.5 text-xs">bajo</span>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* CALIDAD */}
      {tab === "calidad" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="sb-card-glass-light xl:col-span-2 p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck size={18} />
              <h3 className="text-sm font-semibold">Lotes en control de calidad</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/30">
                    <th className="pb-2 font-medium">Lote</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Parámetros</th>
                    <th className="pb-2 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <tr className="hover:bg-secondary/30">
                    <td className="py-3 font-medium">L-BASE-422</td>
                    <td className="py-3">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-warning/10 text-warning">
                        PENDING
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">Brix, pH, EtOH</td>
                    <td className="py-3">
                      <button className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all">
                        Abrir QC
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-secondary/30">
                    <td className="py-3 font-medium">L-ENV-093</td>
                    <td className="py-3">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-destructive/10 text-destructive">
                        HOLD
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">Sensory</td>
                    <td className="py-3">
                      <button className="h-7 px-3 rounded-lg border border-border/40 text-xs font-medium hover:bg-secondary transition-all">
                        Ver
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} />
              <h3 className="text-sm font-semibold">Parámetros fuera de rango</h3>
            </div>
            <div className="text-sm space-y-3">
              <div>
                <p>• pH objetivo 3.2 ±0.1 → muestra 3.35</p>
                <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-destructive/10 text-destructive mt-1 inline-block">
                  alto
                </span>
              </div>
              <div>
                <p>• Brix objetivo 17.0 ±0.4 → muestra 16.3</p>
                <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-info/10 text-info mt-1 inline-block">
                  bajo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCCIÓN */}
      {tab === "produccion" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Órdenes en curso" value="2" variant="light" />
            <KpiCard label="Rend. última orden" value="97.4%" variant="light" trend="up" />
            <KpiCard label="Merma (7d)" value="1.8%" variant="light" />
            <KpiCard label="OEE (estim.)" value="82%" variant="light" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="sb-card-glass-light xl:col-span-2 p-5 hover-raise">
              <div className="flex items-center gap-2 mb-4">
                <Factory size={18} />
                <h3 className="text-sm font-semibold">Órdenes de producción activas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/30">
                      <th className="pb-2 font-medium">OP</th>
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">%</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    <tr className="hover:bg-secondary/30">
                      <td className="py-3 font-medium">OP-2025-118</td>
                      <td className="py-3">Santa Brisa Margarita 13.5%</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '64%' }} />
                          </div>
                          <span className="text-xs">64%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-info/10 text-info">
                          Mixing
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">Hoy 18:00</td>
                    </tr>
                    <tr className="hover:bg-secondary/30">
                      <td className="py-3 font-medium">OP-2025-119</td>
                      <td className="py-3">Base cítrica</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '12%' }} />
                          </div>
                          <span className="text-xs">12%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="sb-kpi-badge px-2 py-0.5 text-xs">Prep</span>
                      </td>
                      <td className="py-3 text-muted-foreground">Mañana 12:00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sb-card-glass-light p-5 hover-raise">
              <div className="flex items-center gap-2 mb-4">
                <Gauge size={18} />
                <h3 className="text-sm font-semibold">Cuellos de botella</h3>
              </div>
              <div className="text-sm space-y-3">
                <p>• Envasado 750 ml — ritmo 420 u/h (objetivo 520)</p>
                <p>• Lavadora botellas — setup lento (12 min)</p>
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-primary/5">
                  <Recycle size={16} className="text-primary mt-0.5" />
                  <span className="text-xs">
                    <strong>Sugerencia:</strong> adelantar cambio de formato a 16:00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
