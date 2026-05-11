"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { updateOrderStatus } from "@/server/actions/orders";
import type { OrderStatus } from "@/types/orders";
import { 
  STATUS_LABELS, 
  STATUS_BADGE_CLASSES, 
  getAvailableTransitions 
} from "@/types/orders";
import { X, AlertCircle, CheckCircle } from "lucide-react";

type ChangeStatusModalProps = {
  orderId: string;
  currentStatus: OrderStatus;
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ChangeStatusModal({
  orderId,
  currentStatus,
  userId,
  userName,
  onClose,
  onSuccess
}: ChangeStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableStatuses = getAvailableTransitions(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStatus) {
      setError("Selecciona un nuevo estado");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateOrderStatus(
        orderId,
        selectedStatus,
        userId,
        userName,
        note || undefined
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  if (availableStatuses.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cambiar Estado</h3>
            <button onClick={onClose} className="sb-btn sb-btn--icon sb-btn--ghost">
              <X size={20} />
            </button>
          </div>
          <div className="text-center py-8">
            <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay transiciones disponibles desde el estado actual
            </p>
          </div>
          <button onClick={onClose} className="sb-btn sb-btn--ghost w-full mt-4">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Cambiar Estado del Pedido</h3>
          <button onClick={onClose} className="sb-btn sb-btn--icon sb-btn--ghost">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto mb-4 text-success" />
            <p className="text-lg font-medium mb-2">¡Estado actualizado!</p>
            <p className="text-sm text-muted-foreground">
              El pedido se ha actualizado correctamente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Current Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Estado Actual
              </label>
              <div className={STATUS_BADGE_CLASSES[currentStatus]}>
                {STATUS_LABELS[currentStatus]}
              </div>
            </div>

            {/* New Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nuevo Estado *
              </label>
              <div className="space-y-2">
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedStatus === status
                        ? 'border-primary bg-primary/10'
                        : 'border-border/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{STATUS_LABELS[status]}</span>
                      <span className={STATUS_BADGE_CLASSES[status]}>
                        {status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Nota (opcional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Agrega una nota sobre este cambio..."
                className="sb-input min-h-[80px] resize-none"
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="sb-btn sb-btn--ghost flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="sb-btn sb-btn--primary flex-1"
                disabled={loading || !selectedStatus}
              >
                {loading ? 'Actualizando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
