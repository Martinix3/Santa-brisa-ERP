"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useMemo } from "react";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock,
  Euro,
  FileText,
  AlertCircle,
  Store,
  Users,
  ShoppingCart,
  UtensilsCrossed,
  Globe,
  Filter,
  BarChart3,
  Plus
} from "lucide-react";
import { OrderWithAccount } from "@/types/orders";
import { KpiCard } from "@/components/dashboards/shared/KpiCard";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";
import type { OrderSellOut } from "@/domain/ssot";

// Import new UI components
import { StatusBadge, ChannelChip, SourceChip, OwnerBadge, FlowBadge } from "@/components/ui/OrderBadges";
import { OrderRowQuickActions } from "@/components/orders/OrderRowQuickActions";
import { OrderCompleteness } from "@/components/orders/OrderCompleteness";
import { OrderAdvancedFilters } from "@/components/orders/OrderAdvancedFilters";

// Import drawer hook
import { useDrawer } from "@/ui/drawers/drawer-registry";
import { createOrder } from "@/server/actions/orders";
import { useRouter } from "next/navigation";

interface PedidosContentProps {
  initialOrders: OrderWithAccount[];
}

type OrderTab = "todos" | "directa" | "placement";
type ChannelFilter = "all" | "PRIVATE" | "DISTRIBUTOR" | "ONLINE" | "HORECA" | "CATERING";

export function PedidosContent({ initialOrders }: PedidosContentProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>("todos");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Drawer hook
  const { open: openDrawer } = useDrawer();
  const router = useRouter();

  // Filter by tab (flow) and channel
  const tabFilteredOrders = useMemo(() => {
    let orders = initialOrders;

    // Filter by flow
    if (activeTab === "directa") {
      orders = orders.filter((o) => o.flow === "DIRECT");
    } else if (activeTab === "placement") {
      orders = orders.filter((o) => o.flow === "PLACEMENT");
    }

    // Filter by channel (V2.1)
    if (channelFilter !== "all") {
      orders = orders.filter((o) => (o as OrderSellOut).channel === channelFilter);
    }

    return orders;
  }, [initialOrders, activeTab, channelFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const orders = tabFilteredOrders;

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const newOrders = orders.filter((o) => o.status === "open" || o.status === "confirmed").length;
    const inTransit = orders.filter((o) => o.status === "shipped").length;
    const delivered = orders.filter((o) => o.status === "invoiced" || o.status === "paid").length;
    const invoiced = orders.filter((o) => o.status === "invoiced").length;
    const paid = orders.filter((o) => o.status === "paid").length;

    return {
      total: orders.length,
      revenue: totalRevenue,
      new: newOrders,
      inTransit,
      delivered,
      invoiced,
      paid,
    };
  }, [tabFilteredOrders]);

  // Get channel icon and label
  const getChannelInfo = (channel?: string) => {
    const channelMap: Record<string, { icon: any; label: string; color: string }> = {
      PRIVATE: { icon: Users, label: "Privado", color: "text-blue-600" },
      DISTRIBUTOR: { icon: Store, label: "Distribuidor", color: "text-purple-600" },
      ONLINE: { icon: ShoppingCart, label: "Online", color: "text-green-600" },
      HORECA: { icon: UtensilsCrossed, label: "Horeca", color: "text-orange-600" },
      CATERING: { icon: UtensilsCrossed, label: "Catering", color: "text-red-600" },
    };
    return channelMap[channel || ""] || { icon: Package, label: channel || "-", color: "text-gray-600" };
  };

  // Count orders by channel
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      PRIVATE: 0,
      DISTRIBUTOR: 0,
      ONLINE: 0,
      HORECA: 0,
      CATERING: 0,
    };
    
    initialOrders.forEach((order) => {
      const channel = (order as OrderSellOut).channel;
      if (channel && counts[channel] !== undefined) {
        counts[channel]++;
      }
    });
    
    return counts;
  }, [initialOrders]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      open: { label: "ABIERTO", className: "bg-warning/10 text-warning" },
      confirmed: { label: "CONFIRMADO", className: "bg-info/10 text-info" },
      shipped: { label: "EN TRÁNSITO", className: "bg-info/10 text-info" },
      invoiced: { label: "FACTURADO", className: "bg-primary/10 text-primary" },
      paid: { label: "PAGADO", className: "bg-success/10 text-success" },
      cancelled: { label: "CANCELADO", className: "bg-error/10 text-error" },
    };

    const config = statusMap[status] || { label: status.toUpperCase(), className: "bg-secondary" };
    return config;
  };

  // Mock alerts (TODO: obtener de server action)
  const alerts = [
    {
      id: "1",
      type: "warning" as const,
      title: "3 pedidos pendientes de confirmar",
      description: "Revisar y confirmar antes de fin de día",
      actionLabel: "Ver pedidos",
    },
    {
      id: "2",
      type: "info" as const,
      title: "5 pedidos en tránsito",
      description: "Entregas programadas esta semana",
      actionLabel: "Ver seguimiento",
    },
    {
      id: "3",
      type: "critical" as const,
      title: "Pedido SB-2025-892 retrasado",
      description: "Contactar con logística urgente",
      actionLabel: "Ver detalle",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gestión de Pedidos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seguimiento · Estados · Facturación
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all">
              Exportar reporte
            </button>
            <button 
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              onClick={() => {
                console.log('🔵 Botón "Nuevo pedido" clickeado');
                console.log('🔵 openDrawer function:', openDrawer);
                openDrawer('new-order', {
                  onSave: async (order: Partial<OrderSellOut>) => {
                    console.log('💾 Guardando pedido:', order);
                    const result = await createOrder(order);
                    console.log('✅ Resultado:', result);
                    if (result.success) {
                      // Refresh the page to show the new order
                      router.refresh();
                    } else {
                      // Show error (could be improved with a toast notification)
                      alert(`Error: ${result.message}`);
                    }
                  }
                });
                console.log('🔵 openDrawer llamado');
              }}
            >
              <Plus size={16} />
              Nuevo pedido
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "todos", label: "Todos", icon: Package, count: initialOrders.length },
          { 
            key: "directa", 
            label: "Venta Directa", 
            icon: Truck,
            count: initialOrders.filter((o) => o.flow === "DIRECT").length 
          },
          { 
            key: "placement", 
            label: "Placement", 
            icon: Package,
            count: initialOrders.filter((o) => o.flow === "PLACEMENT").length 
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80"
              }`}
              onClick={() => setActiveTab(t.key as OrderTab)}
            >
              <Icon size={16} />
              {t.label}
              <span className="sb-kpi-badge px-2 py-0.5 text-xs">{t.count}</span>
            </button>
          );
        })}
        
        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
            showAdvancedFilters
              ? "bg-secondary text-secondary-foreground"
              : "border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80"
          }`}
        >
          <Filter size={16} />
          Filtros avanzados
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <OrderAdvancedFilters
          orders={tabFilteredOrders as OrderSellOut[]}
          onFiltersChange={(filteredOrders) => {
            // Handle filtered orders - could update a state or trigger re-render
            console.log('Filtered orders:', filteredOrders);
          }}
          showCompactView={false}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard 
          label="Facturación" 
          value={formatCurrency(kpis.revenue)} 
          variant="light" 
          icon={<Euro size={18} />}
        />
        <KpiCard 
          label="Nuevos/Confirmados" 
          value={kpis.new} 
          variant="light" 
          icon={<Clock size={18} />}
        />
        <KpiCard 
          label="En tránsito" 
          value={kpis.inTransit} 
          variant="light" 
          icon={<Truck size={18} />}
        />
        <KpiCard 
          label="Pagados" 
          value={kpis.paid} 
          variant="light" 
          icon={<CheckCircle2 size={18} />}
          trend="up"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna Principal: Tabla de Pedidos */}
        <div className="lg:col-span-2 space-y-5">
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} />
              <h3 className="text-sm font-semibold">Pedidos activos</h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {tabFilteredOrders.length} pedidos
              </span>
            </div>
            
            {tabFilteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No hay pedidos en esta categoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/30">
                      <th className="pb-2 font-medium">Pedido</th>
                      <th className="pb-2 font-medium">Cliente</th>
                      <th className="pb-2 font-medium">Tipo</th>
                      <th className="pb-2 font-medium">Canal</th>
                      <th className="pb-2 font-medium">Comercial</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium">Calidad</th>
                      <th className="pb-2 font-medium">Importe</th>
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {tabFilteredOrders.map((order) => {
                      const statusConfig = getStatusBadge(order.status);
                      const orderV21 = order as OrderSellOut;
                      const channelInfo = getChannelInfo(orderV21.channel);
                      const ChannelIcon = channelInfo.icon;
                      
                      return (
                        <tr key={order.id} className="hover:bg-secondary/30 cursor-pointer">
                          <td className="py-3 font-medium">{order.docNumber || order.id}</td>
                          <td className="py-3">
                            <div>
                              <div className="font-medium text-sm">
                                {orderV21.customerName || order.account?.name || "Sin cuenta"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {orderV21.customerVat || "-"}
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <FlowBadge flow={orderV21.flow} size="sm" />
                          </td>
                          <td className="py-3">
                            <ChannelChip channel={orderV21.channel} />
                          </td>
                          <td className="py-3">
                            <OwnerBadge ownerName={orderV21.ownerName} />
                          </td>
                          <td className="py-3">
                            <StatusBadge status={order.status as any} />
                          </td>
                          <td className="py-3">
                            <OrderCompleteness order={orderV21} compact={true} />
                          </td>
                          <td className="py-3 font-semibold">
                            {formatCurrency(order.totalAmount || 0)}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString("es-ES") : 
                             order.createdAt ? new Date((order.createdAt as any).toDate?.() || order.createdAt).toLocaleDateString("es-ES") : "-"}
                          </td>
                          <td className="py-3">
                            <OrderRowQuickActions 
                              order={orderV21}
                              onChangeStatus={async (newStatus) => {
                                console.log(`Changing order ${order.id} status to ${newStatus}`);
                                // Handle status change
                                // TODO: Implement actual status change logic
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resumen por Estado */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} />
              <h3 className="text-sm font-semibold">Estado de pedidos</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Nuevos/Confirmados</div>
                <div className="text-2xl font-bold">{kpis.new}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">En tránsito</div>
                <div className="text-2xl font-bold">{kpis.inTransit}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Facturados</div>
                <div className="text-2xl font-bold">{kpis.invoiced}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Cobrados</div>
                <div className="text-2xl font-bold text-success">{kpis.paid}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Lateral: Alertas y Resumen */}
        <div className="space-y-5">
          {/* Alertas */}
          <AlertsCard alerts={alerts} variant="light" />

          {/* Resumen Rápido */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} />
              <h3 className="text-sm font-semibold">Resumen {activeTab}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total pedidos</span>
                <span className="font-semibold">{kpis.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Facturación</span>
                <span className="font-semibold">{formatCurrency(kpis.revenue)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-muted-foreground">Ticket promedio</span>
                <span className="font-semibold">
                  {kpis.total > 0 ? formatCurrency(kpis.revenue / kpis.total) : "€0"}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros por Canal V2.1 */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-sm font-semibold mb-3">Filtrar por canal</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setChannelFilter("all")}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm flex items-center justify-between ${
                  channelFilter === "all" 
                    ? "border-primary bg-primary/10 text-primary font-medium" 
                    : "border-border/30 bg-background/30 hover:bg-background/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Globe size={16} />
                  Todos los canales
                </span>
                <span className="text-xs opacity-60">{initialOrders.length}</span>
              </button>
              
              <button 
                onClick={() => setChannelFilter("PRIVATE")}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm flex items-center justify-between ${
                  channelFilter === "PRIVATE" 
                    ? "border-primary bg-primary/10 text-primary font-medium" 
                    : "border-border/30 bg-background/30 hover:bg-background/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Privado
                </span>
                <span className="text-xs opacity-60">{channelCounts.PRIVATE}</span>
              </button>

              <button 
                onClick={() => setChannelFilter("DISTRIBUTOR")}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm flex items-center justify-between ${
                  channelFilter === "DISTRIBUTOR" 
                    ? "border-primary bg-primary/10 text-primary font-medium" 
                    : "border-border/30 bg-background/30 hover:bg-background/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Store size={16} className="text-purple-600" />
                  Distribuidor
                </span>
                <span className="text-xs opacity-60">{channelCounts.DISTRIBUTOR}</span>
              </button>

              <button 
                onClick={() => setChannelFilter("ONLINE")}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm flex items-center justify-between ${
                  channelFilter === "ONLINE" 
                    ? "border-primary bg-primary/10 text-primary font-medium" 
                    : "border-border/30 bg-background/30 hover:bg-background/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-green-600" />
                  Online
                </span>
                <span className="text-xs opacity-60">{channelCounts.ONLINE}</span>
              </button>

              <button 
                onClick={() => setChannelFilter("HORECA")}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm flex items-center justify-between ${
                  channelFilter === "HORECA" 
                    ? "border-primary bg-primary/10 text-primary font-medium" 
                    : "border-border/30 bg-background/30 hover:bg-background/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <UtensilsCrossed size={16} className="text-orange-600" />
                  Horeca
                </span>
                <span className="text-xs opacity-60">{channelCounts.HORECA}</span>
              </button>

              <button 
                onClick={() => setChannelFilter("CATERING")}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm flex items-center justify-between ${
                  channelFilter === "CATERING" 
                    ? "border-primary bg-primary/10 text-primary font-medium" 
                    : "border-border/30 bg-background/30 hover:bg-background/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <UtensilsCrossed size={16} className="text-red-600" />
                  Catering
                </span>
                <span className="text-xs opacity-60">{channelCounts.CATERING}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
