// src/features/pos/server/pos-actions.ts
"use server";
import { adminDb as db } from "@/server/firebase";

// Línea POS unificada
export type PosLineInput =
  | { kind: "CATALOGO"; catalogItemId: string; qty: number; scheduleAt?: string }   // PLV del catálogo
  | { kind: "CUSTOM"; desc: string; visibility?: "ALTA"|"MEDIA"|"BAJA"; estCost?: number; scheduleAt?: string }
  | { kind: "EVENTO"; scheduleAt: string };                                         // evento POS

export async function createPosTacticsBatch(input: {
  accountId: string;
  createdById: string;
  lines: PosLineInput[];
}) {
  const now = new Date().toISOString();
  const batch = db.batch();
  const results: { tacticId: string }[] = [];

  for (const line of input.lines) {
    const tRef = db.collection("posTactics").doc();
    const payload: any = {
      id: tRef.id, accountId: input.accountId, createdById: input.createdById,
      status: "APPROVED", createdAt: now, updatedAt: now
    };

    if (line.kind === "CATALOGO") {
      payload.type = "PLV_CATALOG";
      payload.catalogItemId = line.catalogItemId;
      payload.qtyPlanned = line.qty;

      if (line.scheduleAt) {
        const iRef = db.collection("interactions").doc();
        batch.set(iRef, {
          id: iRef.id, accountId: input.accountId, dept: "MARKETING",
          kind: "ENTREGA_PLV", note: `Entregar ${line.qty} uds`,
          plannedFor: line.scheduleAt, status: "open",
          linkedEntity: { type: "POS_TACTIC", id: tRef.id },
          createdAt: now, updatedAt: now
        });
        payload.status = "SCHEDULED";
        payload.deliveryTaskId = iRef.id;
      }
    }

    if (line.kind === "CUSTOM") {
      payload.type = "CUSTOM";
      payload.customDesc = line.desc;
      payload.visibility = line.visibility || "MEDIA";
      payload.estCost = line.estCost ?? undefined;

      if (line.scheduleAt) {
        const iRef = db.collection("interactions").doc();
        batch.set(iRef, {
          id: iRef.id, accountId: input.accountId, dept: "MARKETING",
          kind: "POS_CUSTOM", note: line.desc,
          plannedFor: line.scheduleAt, status: "open",
          linkedEntity: { type: "POS_TACTIC", id: tRef.id },
          createdAt: now, updatedAt: now
        });
        payload.status = "SCHEDULED";
        payload.deliveryTaskId = iRef.id;
      }
    }

    if (line.kind === "EVENTO") {
      payload.type = "EVENT";
      const iRef = db.collection("interactions").doc();
      batch.set(iRef, {
        id: iRef.id, accountId: input.accountId, dept: "MARKETING",
        kind: "EVENTO_POS", note: "Evento POS",
        plannedFor: line.scheduleAt, status: "open",
        linkedEntity: { type: "POS_TACTIC", id: tRef.id },
        createdAt: now, updatedAt: now
      });
      payload.status = "SCHEDULED";
      payload.eventTaskId = iRef.id;
    }

    batch.set(tRef, payload);
    results.push({ tacticId: tRef.id });
  }

  await batch.commit();
  return { tactics: results };

}