"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { Package, TrendingUp, Upload, Gift, CreditCard, Truck, CheckCircle2 } from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { useAlerts } from "@/components/alerts/AlertsProvider";
import type {
  DistributorOrderSummary,
  DistributorKPIs,
  DistributorStockSummary,
  PlvMaterial,
  DistributorFinances
} from "@/server/actions/distributor-dashboard";

// =================================================================
// TYPES
// =================================================================

interface DistributorDashboardClientProps {
  distributorPartyId: string;
  locationId: string;
  initialData: {
    orders: DistributorOrderSummary[];
    kpis: DistributorKPIs;
    stockSummary: DistributorStockSummary;
    plvMaterials: PlvMaterial[];
    finances: DistributorFinances;
  };
  error?: string;
}

type TabKey = "pedidos" | "sellout" | "inventario" | "pos" | "finanzas";

// =================================================================
// HELPER FUNCTIONS
// =================================================================

function getStatusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    'paid': 'sb-badge--success',
    'invoiced': 'sb-badge--info',
    'shipped': 'sb-badge--info',
    'confirmed': 'sb-badge--warning',
    'open': 'sb-badge--default',
    'cancelled': 'sb-badge--destructive',
    'lost': 'sb-badge--destructive'
  };
  return statusMap[status] || 'sb-badge--default';
}

function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    'paid': 'PAGADO',
    'invoiced': 'FACTURADO',
    'shipped': 'ENVIADO',
    'confirmed': 'CONFIRMADO',
    'open': 'ABIERTO',
    'cancelled': 'CANCELADO',
    'lost': 'PERDIDO'
  };
  return labelMap[status] || status.toUpperCase();
}

// =================================================================
// MAIN COMPONENT
// =================================================================

export function DistributorDashboardClient({
  distributorPartyId,
  locationId,
  initialData,
  error
}: DistributorDashboardClientProps) {
  const [tab, setTab] = useState<TabKey>("pedidos");
  
  // TODO: Obtener userId de la sesión
  const userId = 'us_004'; // Mock para desarrollo
  const { alerts } = useAlerts(userId);

  // Por ahora mostrar todas las alertas
  // TODO: Filtrar por distributorPartyId cuando Alert tenga campo context
  const distributorAlerts = alerts;

  // Mostrar error si existe
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="sb-card-glass-light p-5">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error al cargar datos</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const { orders, kpis, stockSummary, plvMaterials, finances } = initialData;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header - Design System v2.1 */}
      <header className="sb-header-glass p-5">
        <h1>Portal Distribuidor</h1>
        <p className="text-muted-foreground">
          Distribuidora Central Madrid · {distributorPartyId}
        </p>
        <div className="mt-3 flex gap-2">
          <button className="sb-btn--secondary">
            Descargar catálogo
          </button>
          <button className="sb-btn--primary">
            Nuevo pedido
          </button>
        </div>
      </header>

      {/* Tabs - Design System v2.1 */}
      <nav className="sb-tabs">
        <button 
          className="sb-tab" 
          aria-selected={tab === "pedidos"}
          onClick={() => setTab("pedidos")}
        >
          <Package size={16} />
          Mis Pedidos
          <span className="sb-kpi-badge">{orders.length}</span>
        </button>
        <button 
          className="sb-tab" 
          aria-selected={tab === "sellout"}
          onClick={() => setTab("sellout")}
        >
          <TrendingUp size={16} />
          Sell-out
        </button>
        <button 
          className="sb-tab" 
          aria-selected={tab === "inventario"}
          onClick={() => setTab("inventario")}
        >
          <Package size={16} />
          Mi Stock
          <span className="sb-kpi-badge">{stockSummary.skuCount}</span>
        </button>
        <button 
          className="sb-tab" 
          aria-selected={tab === "pos"}
          onClick={() => setTab("pos")}
        >
          <Gift size={16} />
          Material PLV
          <span className="sb-kpi-badge">{plvMaterials.length}</span>
        </button>
        <button 
          className="sb-tab" 
          aria-selected={tab === "finanzas"}
          onClick={() => setTab("finanzas")}
        >
          <CreditCard size={16} />
          Finanzas
        </button>
      </nav>

      {/* TAB: PEDIDOS */}
      {tab === "pedidos" && (
        <>
          {/* KPIs - Usando KpiCard del Design System */}
          <KpiGrid>
            <KpiCard
              title="En preparación"
              value={kpis.ordersCount.pending}
            />
            <KpiCard
              title="En tránsito"
              value={kpis.ordersCount.inTransit}
            />
            <KpiCard
              title="Entregados (mes)"
              value={kpis.ordersCount.delivered}
            />
            <KpiCard
              title="OTIF %"
              value={`${kpis.otifPercentage}%`}
              delta={{ dir: "up", label: "+2% vs. mes anterior" }}
              foot="On Time In Full"
            />
          </KpiGrid>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Tabla de pedidos - Design System v2.1 */}
              <div className="sb-card-glass-light p-5 hover-raise">
                <div className="flex items-center gap-2 mb-4">
                  <Truck size={18} />
                  <h3 className="text-sm font-semibold">Mis pedidos activos</h3>
                </div>
                
                <div className="sb-table-wrap">
                  <table className="sb-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Estado</th>
                        <th>Items</th>
                        <th>Valor</th>
                        <th>ETA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay pedidos activos
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr key={order.id}>
                            <td className="font-medium">{order.docNumber || order.id}</td>
                            <td>
                              <span className={getStatusBadgeClass(order.status)}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td>{order.lineCount}</td>
                            <td>€{order.totalAmount.toLocaleString()}</td>
                            <td className="text-muted-foreground">
                              {order.estimatedDelivery || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar con alertas - Preparado para Santa Brain */}
            <aside className="space-y-5">
              <div className="sb-card-glass-light p-5">
                <h3 className="text-sm font-semibold mb-4">
                  Alertas y Tareas
                  {distributorAlerts.length > 0 && (
                    <span className="sb-kpi-badge ml-2">{distributorAlerts.length}</span>
                  )}
                </h3>
                
                {distributorAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay alertas pendientes
                  </p>
                ) : (
                  <div className="space-y-2">
                    {distributorAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                      >
                        <div className="text-sm font-medium mb-1">{alert.title}</div>
                        {alert.desc && (
                          <div className="text-xs text-muted-foreground">
                            {alert.desc}
                          </div>
                        )}
                        {alert.time && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {alert.time}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {/* TAB: SELL-OUT */}
      {tab === "sellout" && (
        <div className="sb-card-glass-light p-5 hover-raise">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <h3 className="text-sm font-semibold">Subir datos de sell-out</h3>
            </div>
            <button className="sb-btn--secondary sb-btn--sm">
              Descargar plantilla CSV
            </button>
          </div>
          
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              Arrastra tu archivo CSV aquí o haz click para seleccionar
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Formato: fecha, accountId, sku, quantity, price
            </p>
            <button className="sb-btn--primary">
              Seleccionar archivo
            </button>
          </div>

          {/* TODO: Añadir gráfico de sell-out con ChartCard */}
          <div className="mt-5 sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Sell-out últimas 4 semanas</h3>
            <p className="text-sm text-muted-foreground text-center py-8">
              Gráfico de sell-out (pendiente de implementar)
            </p>
          </div>
        </div>
      )}

      {/* TAB: INVENTARIO */}
      {tab === "inventario" && (
        <>
          <KpiGrid>
            <KpiCard
              title="Valor stock"
              value={`€${(stockSummary.totalValue / 1000).toFixed(1)}K`}
            />
            <KpiCard
              title="SKUs"
              value={stockSummary.skuCount}
            />
            <KpiCard
              title="Rotación (días)"
              value={stockSummary.avgRotation}
            />
            <KpiCard
              title="Cobertura (días)"
              value={stockSummary.avgCoverage}
            />
          </KpiGrid>

          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-sm font-semibold mb-4">Stock en mi depósito</h3>
            <p className="text-sm text-muted-foreground text-center py-8">
              Tabla de stock (componente pendiente)
            </p>
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
          
          {plvMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay material PLV disponible
            </p>
          ) : (
            <div className="space-y-3">
              {plvMaterials.map((material) => (
                <div
                  key={material.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-4 hover:bg-background/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{material.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {material.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {material.availableQty} unidades disponibles
                      </div>
                    </div>
                    <button className="sb-btn--primary sb-btn--sm">
                      Solicitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: FINANZAS */}
      {tab === "finanzas" && (
        <>
          <KpiGrid>
            <KpiCard
              title="Límite de crédito"
              value={`€${(finances.creditLimit / 1000).toFixed(0)}K`}
            />
            <KpiCard
              title="Crédito utilizado"
              value={`€${(finances.creditUsed / 1000).toFixed(1)}K`}
              foot={`${((finances.creditUsed / finances.creditLimit) * 100).toFixed(0)}% usado`}
            />
            <KpiCard
              title="Facturas abiertas"
              value={finances.openInvoices.length}
            />
            <KpiCard
              title="Bonificación disponible"
              value={`€${finances.bonusAvailable}`}
              foot="Por objetivos"
              delta={{ dir: "up", label: "+€150 este mes" }}
            />
          </KpiGrid>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Crédito disponible */}
            <div className="sb-card-glass-light p-5 hover-raise">
              <h3 className="text-sm font-semibold mb-4">Crédito disponible</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Límite total</span>
                  <span className="font-semibold">€{finances.creditLimit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Utilizado</span>
                  <span className="font-semibold text-warning">€{finances.creditUsed.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${(finances.creditUsed / finances.creditLimit) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/30">
                  <span className="font-medium">Disponible</span>
                  <span className="font-bold text-success">
                    €{finances.creditAvailable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Facturas pendientes */}
            <div className="sb-card-glass-light p-5 hover-raise">
              <h3 className="text-sm font-semibold mb-4">Facturas pendientes</h3>
              
              {finances.openInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay facturas pendientes
                </p>
              ) : (
                <div className="space-y-2">
                  {finances.openInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{invoice.docNumber || invoice.id}</span>
                        <span className="font-bold">€{invoice.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          <span className={getStatusBadgeClass(invoice.status)}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </span>
                        {invoice.dueDate && (
                          <span>Vence: {new Date(invoice.dueDate).toLocaleDateString('es-ES')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Santa Brain Integration Point */}
      {distributorAlerts.length > 0 && (
        <div className="sb-card-glass-dark p-5">
          <h3 className="text-sm font-semibold mb-3">🧠 Recomendaciones Santa Brain</h3>
          <div className="space-y-2">
            {distributorAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-sm">
                • {alert.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
