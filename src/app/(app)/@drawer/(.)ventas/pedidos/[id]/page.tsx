"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EntityDrawerShell } from "@/components/drawers/EntityDrawerShell";
import { ChangeStatusModal } from "@/components/orders/ChangeStatusModal";
import { useData } from "@/lib/dataprovider";
import type { OrderStatus } from "@/types/orders";
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/types/orders";
import { 
  ShoppingCart, 
  Calendar, 
  User, 
  MapPin,
  Package,
  DollarSign,
  Truck,
  FileText,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";

export default function OrderDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data } = useData();
  const { id } = use(params);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Buscar el pedido y cuenta
  const order = useMemo(() => {
    return data?.ordersSellOut?.find(o => o.id === id);
  }, [data?.ordersSellOut, id]);

  const account = useMemo(() => {
    if (!order?.accountId) return null;
    return data?.accounts?.find(a => a.id === order.accountId);
  }, [data?.accounts, order?.accountId]);

  // Usuario actual - temporal placeholder
  const currentUser = { id: 'current-user', name: 'Usuario Actual' };

  if (!order) {
    return (
      <EntityDrawerShell
        title="Pedido no encontrado"
        onClose={() => router.back()}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <ShoppingCart size={48} className="text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No se encontró el pedido #{id}
          </p>
        </div>
      </EntityDrawerShell>
    );
  }

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
    <EntityDrawerShell
      title={order.docNumber || `Pedido #${order.id.substring(0, 8)}`}
      subtitle={`${order.flow === 'PLACEMENT' ? 'Colocación' : 'Venta Directa'} · ${getStatusLabel(order.status)}`}
      actions={
        <div className="flex gap-2">
          <button 
            onClick={() => setShowStatusModal(true)}
            className="sb-btn sb-btn--sm sb-btn--primary"
          >
            <RefreshCw size={16} />
            Cambiar Estado
          </button>
          <button className="sb-btn sb-btn--sm sb-btn--ghost">
            <Edit size={16} />
            Editar
          </button>
        </div>
      }
      onClose={() => router.back()}
    >
      {/* Header con status y datos principales */}
      <div className="sb-section">
        <div className="flex items-center justify-between mb-4">
          <span className={getStatusBadgeClass(order.status)}>
            {getStatusLabel(order.status)}
          </span>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {(order.totalAmount || 0).toFixed(2)} {order.currency}
            </p>
            <p className="text-xs text-muted-foreground">Total del pedido</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="font-medium">
                {new Date(order.orderDate || order.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{account?.name || order.accountId}</p>
            </div>
          </div>
        </div>

        {order.flow === 'PLACEMENT' && order.distributorId && (
          <div className="mt-3 p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Distribuidor</p>
                <p className="font-medium">{order.distributorId}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Líneas del pedido */}
      <div className="sb-section">
        <h3 className="sb-section__title">
          <Package size={18} className="inline mr-2" />
          Productos ({order.lines?.length || 0})
        </h3>
        {order.lines && order.lines.length > 0 ? (
          <div className="space-y-3">
            {order.lines.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{line.itemId}</p>
                  <p className="text-sm text-muted-foreground">
                    {line.qty} {line.uom} × {line.priceUnit.toFixed(2)}€
                  </p>
                  {line.discountPct && line.discountPct > 0 && (
                    <p className="text-xs text-success">
                      Descuento: {line.discountPct}%
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {((line.qty * line.priceUnit) * (1 - (line.discountPct || 0) / 100)).toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin líneas de pedido
          </p>
        )}
      </div>

      {/* Status Timeline - Placeholder para Fase 1.2 */}
      <div className="sb-section">
        <h4 className="sb-section__title">📅 Historial de Estados</h4>
        <div className="text-sm text-muted-foreground italic">
          Timeline de cambios de status (próximamente)
        </div>
      </div>

      {/* AI Insights - Placeholder para Fase 6 */}
      <div className="sb-section border-2 border-dashed border-primary/20">
        <h4 className="sb-section__title">🤖 Insights IA</h4>
        <div className="text-sm text-muted-foreground italic">
          Recomendaciones y análisis con Gemini (próximamente)
        </div>
      </div>

      {/* Información adicional */}
      <div className="space-y-4">
        {/* Notas */}
        {order.notes && (
          <div className="sb-section">
            <h4 className="sb-section__title">
              <FileText size={16} className="inline mr-2" />
              Notas
            </h4>
            <p className="text-sm text-muted-foreground">
              {order.notes}
            </p>
          </div>
        )}

        {/* Datos técnicos */}
        <div className="sb-section">
          <h4 className="sb-section__title">Información Técnica</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-secondary/10 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">ID</p>
              <p className="font-mono text-xs">{order.id}</p>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Fuente</p>
              <p className="font-medium">{order.source || 'Manual'}</p>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Creado</p>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleString('es-ES')}
              </p>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Actualizado</p>
              <p className="font-medium">
                {new Date(order.updatedAt).toLocaleString('es-ES')}
              </p>
            </div>
          </div>
        </div>

        {/* IDs externos */}
        {order.external && Object.keys(order.external).length > 0 && (
          <div className="sb-section">
            <h4 className="sb-section__title">IDs Externos</h4>
            <div className="space-y-2">
              {order.external.shopifyOrderId && (
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Shopify</p>
                  <p className="font-mono text-xs">{order.external.shopifyOrderId}</p>
                </div>
              )}
              {order.external.holdedEstimateId && (
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Holded (Presupuesto)</p>
                  <p className="font-mono text-xs">{order.external.holdedEstimateId}</p>
                </div>
              )}
              {order.external.holdedInvoiceId && (
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Holded (Factura)</p>
                  <p className="font-mono text-xs">{order.external.holdedInvoiceId}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer con acciones */}
      <div className="p-6 border-t border-border/30 bg-secondary/5">
        <div className="flex gap-3">
          {order.status === 'open' && (
            <button className="sb-btn sb-btn--primary flex-1">
              Confirmar Pedido
            </button>
          )}
          {order.status === 'confirmed' && order.flow === 'DIRECT' && (
            <button className="sb-btn sb-btn--primary flex-1">
              <Truck size={16} />
              Generar Envío
            </button>
          )}
          {order.status === 'shipped' && (
            <button className="sb-btn sb-btn--primary flex-1">
              <FileText size={16} />
              Ver Albarán
            </button>
          )}
          <button className="sb-btn sb-btn--ghost">
            <FileText size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <ChangeStatusModal
          orderId={order.id}
          currentStatus={order.status as OrderStatus}
          userId={currentUser.id}
          userName={currentUser.name || 'Usuario'}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false);
            router.refresh();
          }}
        />
      )}
    </EntityDrawerShell>
  );
}
