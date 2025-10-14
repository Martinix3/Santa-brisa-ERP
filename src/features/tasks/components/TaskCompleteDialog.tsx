"use client";

import { useState } from "react";
import { Check, X, Calendar, ShoppingCart } from "lucide-react";
import { SBButton, Select } from "@/components/ui/ui-primitives";
import { completeVisitTask, completeGenericTask, cancelTask } from "../complete";
import type { TaskNew } from "@/domain/ssot";

interface TaskCompleteDialogProps {
  task: TaskNew;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
  userId: string;
}

export function TaskCompleteDialog({
  task,
  open,
  onClose,
  onCompleted,
  userId,
}: TaskCompleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<"NEXT_VISIT" | "ORDER_PLACED" | "COMPLETED">("COMPLETED");
  const [nextEventId, setNextEventId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  async function handleComplete() {
    if (!userId) {
      alert("Usuario no autenticado");
      return;
    }

    setLoading(true);

    try {
      let result;

      if (task.kind === "VISITA") {
        // Validar que tenga los campos necesarios
        if (outcome === "NEXT_VISIT" && !nextEventId) {
          alert("Debe seleccionar o crear una próxima visita");
          setLoading(false);
          return;
        }

        if (outcome === "ORDER_PLACED" && !orderId) {
          alert("Debe seleccionar el pedido realizado");
          setLoading(false);
          return;
        }

        result = await completeVisitTask(task.id, {
          outcome: outcome as "NEXT_VISIT" | "ORDER_PLACED",
          nextEventId: outcome === "NEXT_VISIT" ? nextEventId : undefined,
          orderId: outcome === "ORDER_PLACED" ? orderId : undefined,
          closedById: userId,
        });
      } else {
        result = await completeGenericTask(task.id, userId, "COMPLETED");
      }

      if (result.ok) {
        onCompleted();
        onClose();
      } else {
        alert(result.error || "Error al completar la tarea");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al completar la tarea");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!userId) return;

    const confirmed = confirm("¿Está seguro de cancelar esta tarea?");
    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await cancelTask(task.id, userId, cancelReason);

      if (result.ok) {
        onCompleted();
        onClose();
      } else {
        alert(result.error || "Error al cancelar la tarea");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cancelar la tarea");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const isVisita = task.kind === "VISITA";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Completar Tarea</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Tarea</div>
              <div className="text-base">{task.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                Tipo: <span className="font-medium">{task.kind}</span>
              </div>
            </div>

            {isVisita ? (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                  <div className="font-medium text-blue-900 mb-2">
                    ⚠️ Validación de Visita
                  </div>
                  <div className="text-blue-800">
                    Las visitas deben cerrarse con:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Una próxima visita programada, o</li>
                      <li>Un pedido realizado</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="sb-label">¿Cómo cerrar la visita?</label>
                  <Select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as any)}
                    className="sb-select"
                  >
                    <option value="NEXT_VISIT">Programar próxima visita</option>
                    <option value="ORDER_PLACED">Pedido realizado</option>
                  </Select>
                </div>

                {outcome === "NEXT_VISIT" && (
                  <div className="p-3 border border-gray-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Próxima Visita</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Debes crear o seleccionar un evento de próxima visita
                    </div>
                    <input
                      type="text"
                      value={nextEventId}
                      onChange={(e) => setNextEventId(e.target.value)}
                      placeholder="ID del evento de próxima visita"
                      className="sb-input text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Por ahora: pega el ID manualmente. Próximamente: selector visual.
                    </div>
                  </div>
                )}

                {outcome === "ORDER_PLACED" && (
                  <div className="p-3 border border-gray-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <ShoppingCart className="w-4 h-4" />
                      <span className="font-medium">Pedido Realizado</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Selecciona el pedido que se realizó en esta visita
                    </div>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="ID del pedido"
                      className="sb-input text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Por ahora: pega el ID manualmente. Próximamente: selector visual.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
                <div className="text-green-800">
                  ✓ Esta tarea se completará como COMPLETADA
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-4 border-t">
            <SBButton
              data-variant="primary"
              onClick={handleComplete}
              disabled={loading}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              {loading ? "Completando..." : "Completar Tarea"}
            </SBButton>
            <SBButton
              data-variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </SBButton>
            <SBButton
              data-variant="destructive"
              onClick={handleCancel}
              disabled={loading}
            >
              ✕ Cancelar Tarea
            </SBButton>
          </div>
        </div>
      </div>
    </>
  );
}
