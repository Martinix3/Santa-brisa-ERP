"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Filter, Download } from "lucide-react";
import type { Order } from "@/domain/ssot";

interface AccountOrdersTabProps {
  accountId: string;
  orders: Order[];
  onCreateOrder?: () => void;
}

export function AccountOrdersTab({ accountId, orders, onCreateOrder }: AccountOrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flowFilter, setFlowFilter] = useState<'all' | 'DIRECT' | 'PLACEMENT'>('all');

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (flowFilter === 'DIRECT' && order.distributorId) return false;
    if (flowFilter === 'PLACEMENT' && !order.distributorId) return false;
    return true;
  });

  // Calculate totals
  const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const orderCount = filteredOrders.length;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      open: 'sb-badge sb-badge--default',
      confirmed: 'sb-badge sb-badge--primary',
      shipped: 'sb-badge sb-badge--success',
      invoiced: 'sb-badge sb-badge--success',
      paid: 'sb-badge sb-badge--success',
      cancelled: 'sb-badge sb-badge--destructive',
      lost: 'sb-badge sb-badge--destructive'
    };
    return badges[status] || 'sb-badge';
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

  if (orders.length === 0) {
    return (
      <div className="sb-card-glass-light p-8 text-center">
        <h3 className="font-semibold text-lg mb-2">No hay pedidos registrados</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Crea el primer pedido para esta cuenta
        </p>
        <button
          onClick={onCreateOrder}
          className="sb-btn sb-btn--primary"
        >
          <Plus size={16} />
          <span>Crear Pedido</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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

          <select
            value={flowFilter}
            onChange={(e) => setFlowFilter(e.target.value as any)}
            className="sb-select"
          >
            <option value="all">Todos los flujos</option>
            <option value="DIRECT">Venta Directa</option>
            <option value="PLACEMENT">Colocación</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button className="sb-btn sb-btn--ghost">
            <Download size={16} />
            <span>Exportar</span>
          </button>
          <button
            onClick={onCreateOrder}
            className="sb-btn sb-btn--primary"
          >
            <Plus size={16} />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="sb-card-glass-light p-4">
          <p className="text-xs text-muted-foreground">Total Pedidos</p>
          <p className="text-2xl font-bold">{orderCount}</p>
        </div>
        <div className="sb-card-glass-light p-4">
          <p className="text-xs text-muted-foreground">Importe Total</p>
          <p className="text-2xl font-bold">€{Math.round(totalAmount).toLocaleString()}</p>
        </div>
        <div className="sb-card-glass-light p-4">
          <p className="text-xs text-muted-foreground">Ticket Medio</p>
          <p className="text-2xl font-bold">
            €{orderCount > 0 ? Math.round(totalAmount / orderCount).toLocaleString() : 0}
          </p>
        </div>
        <div className="sb-card-glass-light p-4">
          <p className="text-xs text-muted-foreground">Último Pedido</p>
          <p className="text-sm font-semibold">
            {filteredOrders[0] 
              ? format(new Date(filteredOrders[0].createdAt), "dd MMM", { locale: es })
              : 'N/A'
            }
          </p>
        </div>
      </div>

      {/* Orders table */}
      {filteredOrders.length === 0 ? (
        <div className="sb-card-glass-light p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay pedidos que coincidan con los filtros
          </p>
        </div>
      ) : (
        <div className="sb-card-glass-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Flujo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => {
                      window.location.href = `/ventas/pedidos/${order.id}`;
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      #{order.docNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`sb-badge ${
                        order.distributorId 
                          ? 'sb-badge--warning' 
                          : 'sb-badge--primary'
                      }`}>
                        {order.distributorId ? 'Placement' : 'Direct'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadge(order.status)}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      €{(order.totalAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
