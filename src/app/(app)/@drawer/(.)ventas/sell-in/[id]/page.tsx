"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EntityDrawerShell } from "@/components/drawers/EntityDrawerShell";
import { useData } from "@/lib/dataprovider";
import { 
  Package,
  ShoppingCart,
  User,
  Calendar,
  TrendingUp,
  FileText,
  Box
} from "lucide-react";

export default function OrderDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data } = useData();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'info' | 'productos'>('info');
  
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
          <p className="text-muted-foreground">No se encontró el pedido #{id}</p>
        </div>
      </EntityDrawerShell>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      open: 'sb-badge bg-yellow-100 text-yellow-800',
      confirmed: 'sb-badge bg-blue-100 text-blue-800',
      shipped: 'sb-badge bg-cyan-100 text-cyan-800',
      invoiced: 'sb-badge bg-purple-100 text-purple-800',
      paid: 'sb-badge sb-badge--success',
      cancelled: 'sb-badge sb-badge--destructive',
      lost: 'sb-badge bg-gray-100 text-gray-800'
    };
    return classes[status] || 'sb-badge';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Pendiente',
      confirmed: 'Confirmado',
      shipped: 'Enviado',
      invoiced: 'Facturado',
      paid: 'Pagado',
      cancelled: 'Cancelado',
      lost: 'Perdido'
    };
    return labels[status] || status;
  };

  const getCanalBadge = () => {
    if (order.source === 'SHOPIFY') return 'sb-badge bg-cyan-100 text-cyan-800';
    if (order.flow === 'PLACEMENT') return 'sb-badge bg-purple-100 text-purple-800';
    if (order.flow === 'DIRECT') return 'sb-badge bg-orange-100 text-orange-800';
    return 'sb-badge';
  };

  const getCanalLabel = () => {
    if (order.source === 'SHOPIFY') return 'Shopify';
    if (order.flow === 'PLACEMENT') return 'Distribuidor';
    if (order.flow === 'DIRECT') return 'HORECA';
    return 'Otro';
  };

  return (
    <EntityDrawerShell
      title={order.docNumber || `Pedido #${order.id.substring(0, 8)}`}
      subtitle={`${getStatusLabel(order.status)} · ${account?.name || 'Cliente'}`}
      actions={
        <button 
          onClick={() => router.push(`/ventas/pedidos/${order.id}`)}
          className="sb-btn sb-btn--sm sb-btn--ghost"
        >
          Ver Completo
        </button>
      }
      onClose={() => router.back()}
    >
      <div className="sb-tabs">
        <button
          className="sb-tab"
          aria-selected={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
        >
          Información
        </button>
        <button
          className="sb-tab"
          aria-selected={activeTab === 'productos'}
          onClick={() => setActiveTab('productos')}
        >
          Productos ({order.lines.length})
        </button>
      </div>

      {activeTab === 'info' && (
        <>
          <div className="sb-section">
            <div className="flex items-center justify-between mb-4">
              <span className={getStatusBadgeClass(order.status)}>
                {getStatusLabel(order.status)}
              </span>
              <span className={getCanalBadge()}>
                {getCanalLabel()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold">
                  €{order.totalAmount?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Productos</p>
                <p className="text-2xl font-bold">{order.lines.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {new Date(order.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{account?.name || 'N/A'}</p>
                </div>
              </div>
              {order.docNumber && (
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Número</p>
                    <p className="font-mono text-xs font-medium">{order.docNumber}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Flow</p>
                  <p className="font-medium text-xs">{order.flow}</p>
                </div>
              </div>
            </div>
          </div>

          {account && (
            <div className="sb-section">
              <h3 className="sb-section__title">
                <User size={18} className="inline mr-2" />
                Información del Cliente
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                  <p className="font-medium">{account.name}</p>
                </div>
                {account.stage && (
                  <div className="bg-secondary/10 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Stage</p>
                    <p className="font-medium">{account.stage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="sb-section">
            <h3 className="sb-section__title">
              <FileText size={18} className="inline mr-2" />
              Resumen de Importes
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span>€{order.totalAmount?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          <div className="sb-section">
            <h4 className="sb-section__title">Información Técnica</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-secondary/10 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">ID</p>
                <p className="font-mono text-xs">{order.id}</p>
              </div>
              <div className="bg-secondary/10 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Account ID</p>
                <p className="font-mono text-xs">{order.accountId.substring(0, 12)}...</p>
              </div>
              <div className="bg-secondary/10 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Creado</p>
                <p className="font-medium text-xs">
                  {new Date(order.createdAt).toLocaleString('es-ES')}
                </p>
              </div>
              <div className="bg-secondary/10 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Actualizado</p>
                <p className="font-medium text-xs">
                  {new Date(order.updatedAt).toLocaleString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'productos' && (
        <div className="sb-section">
          <h3 className="sb-section__title">
            <Box size={18} className="inline mr-2" />
            Productos ({order.lines.length})
          </h3>
          {order.lines.length > 0 ? (
            <div className="space-y-2">
              {order.lines.map((line, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{line.name || line.itemId}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.qty} {line.uom}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin productos
            </p>
          )}
        </div>
      )}
    </EntityDrawerShell>
  );
}
