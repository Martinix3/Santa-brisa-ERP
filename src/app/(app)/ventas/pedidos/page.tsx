"use client";

import { useData } from "@/lib/dataprovider";
import { SBCard } from "@/components/ui/ui-primitives";
import Link from "next/link";
import { 
  ShoppingCart, 
  Search,
  Filter,
  Download,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useMemo, useState } from "react";
import type { OrderSellOut } from "@/domain/ssot";

type OrderFilter = {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

export default function PedidosPage() {
  const { data } = useData();
  const [activeTab, setActiveTab] = useState<'direct' | 'placement'>('direct');
  const [filters, setFilters] = useState<OrderFilter>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Obtener pedidos del SSOT
  const allOrders = data?.ordersSellOut || [];

  // Separar por flujo
  const { directOrders, placementOrders } = useMemo(() => {
    const direct = allOrders.filter(o => 
      o.flow === 'DIRECT' || 
      (!o.flow && !o.distributorId) // Si no tiene flow pero tampoco distribuidor, asumimos Direct
    );
    const placement = allOrders.filter(o => 
      o.flow === 'PLACEMENT' || 
      (!o.flow && o.distributorId) // Si no tiene flow pero tiene distribuidor, asumimos Placement
    );
    return { directOrders: direct, placementOrders: placement };
  }, [allOrders]);

  // Obtener nombres de cuentas
  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.accounts?.forEach(acc => {
      map.set(acc.id, acc.name);
    });
    return map;
  }, [data?.accounts]);

  // Aplicar filtros
  const filteredOrders = useMemo(() => {
    const ordersToFilter = activeTab === 'direct' ? directOrders : placementOrders;
    
    return ordersToFilter.filter(order => {
      // Filtro de búsqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          order.id.toLowerCase().includes(searchLower) ||
          order.accountId?.toLowerCase().includes(searchLower) ||
          order.docNumber?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de status
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [activeTab, directOrders, placementOrders, filters]);

  // KPIs por tab
  const kpis = useMemo(() => {
    const orders = activeTab === 'direct' ? directOrders : placementOrders;
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'open').length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return { total, pending, confirmed, shipped, totalAmount };
  }, [activeTab, directOrders, placementOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'confirmed': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'shipped': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      case 'invoiced': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
      case 'paid': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Abierto',
      confirmed: 'Confirmado',
      shipped: 'Enviado',
      invoiced: 'Facturado',
      paid: 'Pagado',
      cancelled: 'Cancelado',
      lost: 'Perdido'
    };
    return labels[status] || status;
  };

  return (
    <div className="sb-page">
      {/* Header */}
      <div className="sb-page__header">
        <div>
          <h1 className="sb-page__title flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de pedidos de venta directa y colocación
          </p>
        </div>
        <div className="flex gap-2">
          <button className="sb-btn sb-btn--ghost">
            <Download size={16} />
            Exportar
          </button>
          <button className="sb-btn sb-btn--primary">
            <Plus size={16} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      <div className="sb-page__content">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ShoppingCart size={16} />
              Venta Directa
              <span className="sb-badge sb-badge--primary">{directOrders.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('placement')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'placement'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={16} />
              Colocación
              <span className="sb-badge sb-badge--secondary">{placementOrders.length}</span>
            </div>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="sb-kpi">
            <div className="sb-kpi__value">{kpis.total}</div>
            <div className="sb-kpi__label">📦 TOTAL PEDIDOS</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi__value">{kpis.pending}</div>
            <div className="sb-kpi__label">
              <Clock size={14} className="inline mr-1" />
              PENDIENTES
            </div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi__value">{kpis.confirmed}</div>
            <div className="sb-kpi__label">
              <CheckCircle2 size={14} className="inline mr-1" />
              CONFIRMADOS
            </div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi__value">{kpis.shipped}</div>
            <div className="sb-kpi__label">📮 ENVIADOS</div>
          </div>
          <div className="sb-kpi">
            <div className="sb-kpi__value">€{(kpis.totalAmount / 1000).toFixed(1)}K</div>
            <div className="sb-kpi__label">💰 TOTAL</div>
          </div>
        </div>

        {/* Filtros */}
        <SBCard className="mb-6">
          <div className="sb-card__content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar pedidos..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Status */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 rounded-lg border border-border/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abierto</option>
                <option value="confirmed">Confirmado</option>
                <option value="shipped">Enviado</option>
                <option value="invoiced">Facturado</option>
                <option value="paid">Pagado</option>
                <option value="cancelled">Cancelado</option>
              </select>

              {/* Fecha desde */}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 rounded-lg border border-border/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {/* Fecha hasta */}
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 rounded-lg border border-border/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </SBCard>

        {/* Lista de Pedidos */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <SBCard>
              <div className="sb-card__content py-12 text-center">
                <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No hay pedidos</p>
                <p className="text-sm text-muted-foreground">
                  {filters.search || filters.status !== 'all'
                    ? 'Intenta ajustar los filtros'
                    : `No hay pedidos de ${activeTab === 'direct' ? 'venta directa' : 'colocación'}`}
                </p>
              </div>
            </SBCard>
          ) : (
            filteredOrders.map((order) => (
              <Link
                key={order.id}
                href={`/ventas/pedidos/${order.id}`}
                className="block hover-raise cursor-pointer transition-all"
              >
                <SBCard>
                  <div className="sb-card__content">
                  <div className="flex items-start justify-between">
                    {/* Info principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {order.docNumber || `#${order.id.substring(0, 8)}`}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {activeTab === 'placement' && order.distributorId && (
                          <span className="sb-badge sb-badge--secondary">
                            Distribuidor: {order.distributorId}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Cliente</p>
                          <p className="font-medium">{accountsMap.get(order.accountId) || order.accountId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Fecha</p>
                          <p className="font-medium">
                            {new Date(order.orderDate || order.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Líneas</p>
                          <p className="font-medium">{order.lines?.length || 0} productos</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Total</p>
                          <p className="font-semibold text-lg">
                            {(order.totalAmount || 0).toFixed(2)} {order.currency}
                          </p>
                        </div>
                      </div>

                      {/* Líneas de pedido (preview) */}
                      {order.lines && order.lines.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-xs text-muted-foreground mb-2">Productos:</p>
                          <div className="flex flex-wrap gap-2">
                            {order.lines.slice(0, 3).map((line, idx) => (
                              <span key={idx} className="text-xs bg-secondary/30 px-2 py-1 rounded">
                                {line.qty} × {line.itemId}
                              </span>
                            ))}
                            {order.lines.length > 3 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{order.lines.length - 3} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones rápidas */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Cambiar status
                        }}
                        className="sb-btn sb-btn--sm sb-btn--ghost"
                      >
                        Cambiar Status
                      </button>
                      {activeTab === 'direct' && order.status === 'confirmed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Crear orden logística
                          }}
                          className="sb-btn sb-btn--sm sb-btn--primary"
                        >
                          Generar Envío
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </SBCard>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
