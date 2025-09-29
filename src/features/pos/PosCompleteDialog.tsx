// src/features/pos/PosCompleteDialog.tsx
"use client";
import React, { useEffect, useState } from "react";
import { getPosCompletionContext, finalizePosDelivery, finalizePosKpis } from "@/features/pos/server/pos-complete";
import { DeliveryQtyForm } from './DeliveryQtyForm';
import { KpisDynamicForm } from './KpisDynamicForm';
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  tacticId: string;           // viene desde la tarea linkeada
};

export function PosCompleteDialog({ open, onOpenChange, tacticId }: Props) {
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<null | Awaited<ReturnType<typeof getPosCompletionContext>>>(null);

  useEffect(() => {
    if (!open || !tacticId) return;
    (async () => {
      setLoading(true);
      try {
        const c = await getPosCompletionContext({ tacticId });
        setCtx(c);
      } catch (e:any) {
        toast.error(e.message || "No se pudo cargar la táctica POS");
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tacticId, onOpenChange]);

  if (!open) return null;

  const close = ()=> onOpenChange(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Completar táctica POS</h3>
          <button className="text-sm text-zinc-500" onClick={close}>Cerrar</button>
        </div>

        {!ctx || loading ? (
          <div className="p-6 text-sm text-zinc-600">Cargando…</div>
        ) : ctx.fulfillmentMode === "DELIVERY_QTY" ? (
          <DeliveryQtyForm
            defaultPlanned={ctx.tactic.qtyPlanned ?? undefined}
            onSubmit={async ({ qty, photos }) => {
              await finalizePosDelivery({ tacticId, taskId: ctx.tactic.taskId, qtyDelivered: qty, photoUrls: photos });
              toast.success("Entrega registrada");
              close();
            }}
          />
        ) : (
          <KpisDynamicForm
            title={ctx.catalogItem?.name || "KPIs"}
            template={ctx.catalogItem?.defaultKpisTemplate}
            onSubmit={async ({ kpis, photos, realCost }) => {
              await finalizePosKpis({ tacticId, taskId: ctx.tactic.taskId, kpis, photos, realCost });
              toast.success("KPIs guardados");
              close();
            }}
            // si es custom de tipo 'CUSTOM_DEFERRED', template podrá venir vacío ⇒ mostramos genérico
          />
        )}
      </div>
    </div>
  );
}
