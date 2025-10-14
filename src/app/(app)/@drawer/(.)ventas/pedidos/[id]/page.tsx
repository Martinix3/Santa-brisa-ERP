"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EntityDrawerShell } from "@/components/drawers/EntityDrawerShell";
import { useData } from "@/lib/dataprovider";
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
  Trash2
} from "lucide-react";

export default function OrderDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data } = useData();
  const { id } = use(params);
  
  // Buscar el pedido y cuenta
  const order = useMemo(() => {
    return data?.ordersSellOut?.find(o => o.id === id);
  }, [data?.ordersSellOut, id]);

  const account = useMemo(() => {
    if (!order?.accountId) return null;
    return data?.accounts?.find(a => a.id === order.accountId);
  }, [data?.accounts, order?.accountId]);

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
    <EntityDrawerShell
      title={order.docNumber || `Pedido #${order.id.substring(0, 8)}`}
      subtitle={`${order.flow === 'PLACEMENT' ? 'Colocación' : 'Venta Directa'} · ${getStatusLabel(order.status)}`}
      actions={
        <div className="flex gap-2">
          <button className="sb-btn sb-btn--sm sb-btn--ghost">
            <Edit size={16} />
            Editar
          </button>
          <button className="sb-btn sb-btn--sm sb-btn--ghost text-destructive">
            <Trash2 size={16} />
            Cancelar
          </button>
        </div>
      }
      onClose={() => router.back()}
    >
      {/* Header con status y datos principales */}
      <div className="p-6 border-b border-border/30 bg-secondary/10">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
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
      <div className="p-6 border-b border-border/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package size={18} />
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

      {/* Información adicional */}
      <div className="p-6 space-y-4">
        {/* Notas */}
        {order.notes && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText size={16} />
              Notas
            </h4>
            <p className="text-sm text-muted-foreground bg-secondary/10 p-3 rounded-lg">
              {order.notes}
            </p>
          </div>
        )}

        {/* Datos técnicos */}
        <div>
          <h4 className="font-medium mb-2">Información Técnica</h4>
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
          <div>
            <h4 className="font-medium mb-2">IDs Externos</h4>
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
    </EntityDrawerShell>
  );
}
