// src/components/orders/OrderRowQuickActions.tsx
"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { type OrderSellOut, type OrderStatus } from '@/domain/ssot';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  open: ['confirmed', 'cancelled', 'lost'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['invoiced', 'cancelled'],
  invoiced: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
  lost: []
};

const ACTION_CONFIG: Record<OrderStatus, { label: string; variant: string; icon?: string }> = {
  confirmed: { label: 'Confirmar', variant: 'success', icon: '✓' },
  shipped: { label: 'Enviar', variant: 'info', icon: '📦' },
  invoiced: { label: 'Facturar', variant: 'warning', icon: '📄' },
  paid: { label: 'Cobrar', variant: 'success', icon: '💰' },
  cancelled: { label: 'Cancelar', variant: 'destructive', icon: '✕' },
  lost: { label: 'Perdido', variant: 'destructive', icon: '💔' },
  open: { label: 'Abrir', variant: 'default', icon: '📝' }
};

interface OrderRowQuickActionsProps {
  order: OrderSellOut;
  onChangeStatus: (status: OrderStatus) => Promise<void>;
  disabled?: boolean;
}

export function OrderRowQuickActions({
  order,
  onChangeStatus,
  disabled = false
}: OrderRowQuickActionsProps) {
  const [isPending, setIsPending] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    status: OrderStatus | null;
  }>({ isOpen: false, status: null });

  const validNextStates = VALID_TRANSITIONS[order.status] ?? [];

  if (validNextStates.length === 0) {
    return (
      <div className="order-quick-actions">
        <span className="order-quick-actions__final">Estado final</span>
      </div>
    );
  }

  const executeStatusChange = async (newStatus: OrderStatus) => {
    setIsPending(true);
    const config = ACTION_CONFIG[newStatus];

    try {
      await onChangeStatus(newStatus);
      toast.success(`Pedido ${config.label.toLowerCase()} correctamente`);
    } catch (error) {
      console.error('Error changing order status:', error);
      toast.error(`Error al ${config.label.toLowerCase()} el pedido`);
    } finally {
      setIsPending(false);
      setConfirmation({ isOpen: false, status: null });
    }
  };

  const handleActionClick = (newStatus: OrderStatus) => {
    if (disabled || isPending) return;

    const isDestructive = ['cancelled', 'lost'].includes(newStatus);

    if (isDestructive) {
      setConfirmation({ isOpen: true, status: newStatus });
    } else {
      executeStatusChange(newStatus);
    }
  };

  const confirmAction = () => {
    if (confirmation.status) {
      executeStatusChange(confirmation.status);
    }
  };

  const activeConfig = confirmation.status ? ACTION_CONFIG[confirmation.status] : null;

  return (
    <>
      <div className="order-quick-actions flex gap-2">
        {validNextStates.map((status) => {
          const config = ACTION_CONFIG[status];

          return (
            <button
              key={status}
              className={`sb-btn sb-btn--xs sb-btn--${config.variant} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled || isPending}
              title={`Cambiar estado a ${config.label}`}
              onClick={() => handleActionClick(status)}
            >
              {config.icon && <span className="sb-btn__icon">{config.icon}</span>}
              {config.label}
            </button>
          );
        })}
      </div>

      <SBDialog
        open={confirmation.isOpen}
        onOpenChange={(open) => !isPending && setConfirmation(prev => ({ ...prev, isOpen: open }))}
      >
        {activeConfig && (
          <SBDialogContent
            title={`¿${activeConfig.label} pedido?`}
            description={`Esta acción cambiará el estado del pedido ${order.docNumber || order.id || ''} a "${activeConfig.label}". ¿Estás seguro?`}
            primaryAction={{
              label: activeConfig.label,
              onClick: confirmAction,
              disabled: isPending,
              type: 'button' // SBDialogContent expects type for primaryAction
            }}
            secondaryAction={{
              label: 'Volver',
              onClick: () => setConfirmation({ isOpen: false, status: null }),
              disabled: isPending
            }}
          >
            <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <p>Esta acción puede tener efectos en el inventario y la facturación.</p>
            </div>
          </SBDialogContent>
        )}
      </SBDialog>
    </>
  );
}
