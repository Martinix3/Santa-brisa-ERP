// src/features/pos/server/pos-complete.ts
"use server";

import { adminDb as db } from "@/server/firebase";

/** 1) Cargar contexto de finalización: tactic + catalog item */
export async function getPosCompletionContext(input: { tacticId: string }) {
  const tSnap = await db.collection("posTactics").doc(input.tacticId).get();
  if (!tSnap.exists) throw new Error("Táctica POS no encontrada");
  const tactic = tSnap.data() as any;

  let catalogItem: any = null;
  if (tactic.catalogItemId) {
    const cSnap = await db.collection("posCatalog").doc(tactic.catalogItemId).get();
    catalogItem = cSnap.exists ? cSnap.data() : null;
  }

  // fulfillmentMode puede venir del catálogo o inferir por tipo
  const fulfillmentMode =
    catalogItem?.fulfillmentMode ||
    (tactic.catalogItemId ? "DELIVERY_QTY" : "CUSTOM_DEFERRED");

  return {
    tactic: {
      id: tactic.id,
      accountId: tactic.accountId,
      qtyPlanned: tactic.qtyPlanned ?? null,
      status: tactic.status,
      taskId: tactic.taskId ?? tactic.deliveryTaskId ?? tactic.eventTaskId ?? null,
    },
    catalogItem: catalogItem
      ? {
          id: catalogItem.id,
          name: catalogItem.name,
          defaultCost: catalogItem.defaultCost ?? null,
          fulfillmentMode: catalogItem.fulfillmentMode,
          defaultKpisTemplate: catalogItem.defaultKpisTemplate ?? null,
        }
      : null,
    fulfillmentMode,
  };
}

/** 2) Finalizar entrega (DELIVERY_QTY) */
export async function finalizePosDelivery(input: {
  tacticId: string;
  taskId?: string | null;
  qtyDelivered: number;
  photoUrls?: string[];
}) {
  const now = new Date().toISOString();
  const tRef = db.collection("posTactics").doc(input.tacticId);
  const updates: any = {
    qtyDelivered: Number(input.qtyDelivered || 0),
    photos: input.photoUrls?.length ? input.photoUrls : undefined,
    status: "DELIVERED",
    updatedAt: now,
  };
  await tRef.update(updates);

  if (input.taskId) {
    await db.collection("interactions").doc(input.taskId).update({
      status: "done",
      updatedAt: now,
    });
  }
}

/** 3) Finalizar con KPIs (EVENT_KPIS / SERVICE_KPIS / CUSTOM_DEFERRED) */
export async function finalizePosKpis(input: {
  tacticId: string;
  taskId?: string | null;
  kpis: Record<string, string | number | undefined>;
  photos?: string[];
  realCost?: number;
}) {
  const now = new Date().toISOString();
  const tRef = db.collection("posTactics").doc(input.tacticId);
  const updates: any = {
    kpis: input.kpis,
    photos: input.photos?.length ? input.photos : undefined,
    // si es servicio/evento o custom, cerramos completamente
    status: "CLOSED",
    updatedAt: now,
  };
  if (typeof input.realCost === "number") updates.realCost = input.realCost;

  await tRef.update(updates);

  if (input.taskId) {
    await db.collection("interactions").doc(input.taskId).update({
      status: "done",
      updatedAt: now,
    });
  }
}
