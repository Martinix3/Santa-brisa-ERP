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

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      open: 'sb-badge sb-badge--primary',
      confirmed: 'sb-badge sb-badge--success',
      shipped: 'sb-pill sb-pill--primary',
      invoiced: 'sb-pill sb-pill--success',
      paid: 'sb-badge sb-badge--success',
      cancelled: 'sb-badge sb-badge--destructive',
      lost: 'sb-badge sb-badge--destructive'
    };
    return classes[status] || 'sb-badge';
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
      <div className="sb-header-glass p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Pedidos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestión de pedidos de venta directa y colocación
            </p>
          </div>
          <div className="sb-actions">
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
      </div>

      <div className="sb-page__content">
        {/* Tabs */}
        <div className="sb-tabs mb-6">
          <button
            className="sb-tab"
            aria-selected={activeTab === 'direct'}
            onClick={() => setActiveTab('direct')}
          >
            <ShoppingCart size={16} />
            Venta Directa
            <span className="sb-badge sb-badge--primary">{directOrders.length}</span>
          </button>
          <button
            className="sb-tab"
            aria-selected={activeTab === 'placement'}
            onClick={() => setActiveTab('placement')}
          >
            <TrendingUp size={16} />
            Colocación
            <span className="sb-badge">{placementOrders.length}</span>
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
        <div className="sb-card-glass-light p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar pedidos..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="sb-input pl-9"
              />
            </div>

            {/* Status */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="sb-select"
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
              className="sb-input"
            />

            {/* Fecha hasta */}
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="sb-input"
            />
          </div>
        </div>

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
                        <span className={getStatusBadgeClass(order.status)}>
                          {getStatusLabel(order.status)}
                        </span>
                        {activeTab === 'placement' && order.distributorId && (
                          <span className="sb-badge">
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
