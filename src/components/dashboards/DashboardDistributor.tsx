"use client";

import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  Package, 
  Truck, 
  TrendingUp, 
  Upload, 
  FileText,
  CreditCard,
  Gift,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { AlertsCard } from "./shared/AlertsCard";

export default function DashboardDistributor() {
  const { currentUser } = useData();
  const [tab, setTab] = useState<"pedidos" | "sellout" | "inventario" | "pos" | "finanzas">("pedidos");

  // Datos mock (reemplazar con server actions)
  const ordersSummary = {
    pending: 3,
    inTransit: 5,
    delivered: 28,
    otif: 94
  };

  const sellOutData = [
    { week: 'S1', sellOut: 3200, stock: 8500 },
    { week: 'S2', sellOut: 3800, stock: 7900 },
    { week: 'S3', sellOut: 4100, stock: 7200 },
    { week: 'S4', sellOut: 3600, stock: 6800 }
  ];

  const myOrders = [
    { id: 'SB-2025-345', status: 'EN_TRANSITO', eta: 'Mañana 15:00', value: 2450, items: 48 },
    { id: 'SB-2025-342', status: 'PREPARACION', eta: 'Viernes 10:00', value: 1890, items: 36 },
    { id: 'SB-2025-338', status: 'ENTREGADO', eta: 'Entregado', value: 3200, items: 62 }
  ];

  const stockSummary = {
    totalValue: 18500,
    skus: 24,
    rotation: 45,
    coverage: 18
  };

  const plvMaterials = [
    { id: '1', name: 'Door stopper Santa Brisa', available: 50, requested: 0 },
    { id: '2', name: 'Carta cócteles verano', available: 200, requested: 0 },
    { id: '3', name: 'Kit degustación Margarita Day', available: 15, requested: 0 }
  ];

  const financeSummary = {
    creditLimit: 50000,
    creditUsed: 12300,
    openInvoices: 3,
    bonusAvailable: 850
  };

  // Alertas + Tareas integradas
  const alerts = [
    // Alertas operativas
    { 
      id: '1', 
      type: 'warning' as const, 
      title: 'Pedido SB-2025-345 en tránsito', 
      description: 'Llegada prevista mañana 15:00',
      actionLabel: 'Ver pedido'
    },
    { 
      id: '2', 
      type: 'info' as const, 
      title: 'Stock bajo: SB-LIME-01', 
      description: '18 unidades · 8 días de cobertura',
      actionLabel: 'Hacer pedido'
    },
    // Tareas del distribuidor
    { 
      id: 'task-1', 
      type: 'critical' as const, 
      title: '📋 Subir datos sell-out diciembre', 
      description: 'Vence hoy · Pendiente CSV',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-2', 
      type: 'warning' as const, 
      title: '📋 Pagar factura FRA-2025-892', 
      description: 'Vence mañana · €4,200',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-3', 
      type: 'info' as const, 
      title: '📋 Solicitar material PLV para feria', 
      description: 'Esta semana · Door stoppers y cartas',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Portal Distribuidor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Distribuidora Central Madrid
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all">
              Descargar catálogo
            </button>
            <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Nuevo pedido
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "pedidos", label: "Mis Pedidos", icon: Package },
          { key: "sellout", label: "Sell-out", icon: TrendingUp },
          { key: "inventario", label: "Mi Stock", icon: Package },
          { key: "pos", label: "Material PLV", icon: Gift },
          { key: "finanzas", label: "Finanzas", icon: CreditCard }
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

      {/* TAB: PEDIDOS */}
      {tab === "pedidos" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="En preparación" value={ordersSummary.pending} variant="light" />
            <KpiCard label="En tránsito" value={ordersSummary.inTransit} variant="light" icon={<Truck size={18} />} />
            <KpiCard label="Entregados (mes)" value={ordersSummary.delivered} variant="light" icon={<CheckCircle2 size={18} />} />
            <KpiCard label="OTIF %" value={`${ordersSummary.otif}%`} variant="light" trend="up" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} />
              <h3 className="text-sm font-semibold">Mis pedidos activos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/30">
                    <th className="pb-2 font-medium">Pedido</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Items</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {myOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/30">
                      <td className="py-3 font-medium">{order.id}</td>
                      <td className="py-3">
                        <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                          order.status === 'ENTREGADO' 
                            ? 'bg-success/10 text-success'
                            : order.status === 'EN_TRANSITO'
                            ? 'bg-info/10 text-info'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">{order.items}</td>
                      <td className="py-3">€{order.value.toLocaleString()}</td>
                      <td className="py-3 text-muted-foreground">{order.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          {/* Alertas + Tareas */}
          <AlertsCard alerts={alerts} variant="light" />
          </div>
        </>
      )}

      {/* TAB: SELL-OUT */}
      {tab === "sellout" && (
        <>
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload size={18} />
                <h3 className="text-sm font-semibold">Subir datos de sell-out</h3>
              </div>
              <button className="h-8 px-3 rounded-lg border border-border/40 text-xs font-medium hover:bg-secondary transition-all">
                Descargar plantilla CSV
              </button>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                Arrastra tu archivo CSV aquí o haz click para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formato: fecha, tienda, sku, cantidad, importe
              </p>
              <button className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
                Seleccionar archivo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="Sell-out últimas 4 semanas"
              data={sellOutData}
              dataKey="sellOut"
              xAxisKey="week"
              type="bar"
              height={240}
              formatter={(v) => `€${v.toLocaleString()}`}
            />

            <div className="sb-card-glass-light p-5 hover-raise">
              <h3 className="text-sm font-semibold mb-4">Top SKUs vendidos</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">SB-MARGARITA-750</span>
                  <span className="font-bold">€4,200</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">SB-LIME-01</span>
                  <span className="font-bold">€3,800</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">SB-TAJIN-OT</span>
                  <span className="font-bold">€2,100</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB: INVENTARIO */}
      {tab === "inventario" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Valor stock" value={`€${(stockSummary.totalValue / 1000).toFixed(1)}K`} variant="light" />
            <KpiCard label="SKUs" value={stockSummary.skus} variant="light" />
            <KpiCard label="Rotación (días)" value={stockSummary.rotation} variant="light" />
            <KpiCard label="Cobertura (días)" value={stockSummary.coverage} variant="light" />
          </div>

          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-sm font-semibold mb-4">Stock en mi depósito</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/30">
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Cantidad</th>
                    <th className="pb-2 font-medium">Cobertura</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <tr className="hover:bg-secondary/30">
                    <td className="py-3">SB-MARGARITA-750</td>
                    <td className="py-3">142 u.</td>
                    <td className="py-3">22 días</td>
                    <td className="py-3">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-success/10 text-success">
                        OK
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-secondary/30">
                    <td className="py-3">SB-LIME-01</td>
                    <td className="py-3">18 u.</td>
                    <td className="py-3">8 días</td>
                    <td className="py-3">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-warning/10 text-warning">
                        Bajo
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB: MATERIAL PLV */}
      {tab === "pos" && (
        <div className="sb-card-glass-light p-5 hover-raise">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} />
            <h3 className="text-sm font-semibold">Material PLV disponible</h3>
          </div>
          <div className="space-y-3">
            {plvMaterials.map((material) => (
              <div
                key={material.id}
                className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-4 hover:bg-background/50 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{material.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {material.available} unidades disponibles
                    </div>
                  </div>
                  <button className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all whitespace-nowrap">
                    Solicitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: FINANZAS */}
      {tab === "finanzas" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Límite de crédito"
              value={`€${(financeSummary.creditLimit / 1000).toFixed(0)}K`}
              variant="light"
              icon={<CreditCard size={18} />}
            />
            <KpiCard
              label="Crédito utilizado"
              value={`€${(financeSummary.creditUsed / 1000).toFixed(1)}K`}
              hint={`${((financeSummary.creditUsed / financeSummary.creditLimit) * 100).toFixed(0)}% usado`}
              variant="light"
            />
            <KpiCard
              label="Facturas abiertas"
              value={financeSummary.openInvoices}
              variant="light"
              icon={<FileText size={18} />}
            />
            <KpiCard
              label="Bonificación disponible"
              value={`€${financeSummary.bonusAvailable}`}
              hint="Por objetivos"
              variant="light"
              trend="up"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="sb-card-glass-light p-5 hover-raise">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={18} />
                <h3 className="text-sm font-semibold">Crédito disponible</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Límite total</span>
                  <span className="font-semibold">€{financeSummary.creditLimit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Utilizado</span>
                  <span className="font-semibold text-warning">€{financeSummary.creditUsed.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${(financeSummary.creditUsed / financeSummary.creditLimit) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
                  <span className="font-medium">Disponible</span>
                  <span className="font-bold text-success">
                    €{(financeSummary.creditLimit - financeSummary.creditUsed).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="sb-card-glass-light p-5 hover-raise">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} />
                <h3 className="text-sm font-semibold">Facturas pendientes</h3>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">FRA-2025-892</span>
                    <span className="font-bold">€4,200</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vence: 15 Dic 2024
                  </div>
                </div>
                <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">FRA-2025-885</span>
                    <span className="font-bold">€3,850</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vence: 22 Dic 2024
                  </div>
                </div>
                <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">FRA-2025-878</span>
                    <span className="font-bold">€4,250</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vence: 28 Dic 2024
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
