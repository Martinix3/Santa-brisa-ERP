// src/features/pos/server/pos-actions.ts
"use server";
import { adminDb as db } from "@/server/firebase";

export type PosLineInput =
  | { kind:'CATALOGO'; catalogItemId:string; qty?:number; scheduleAt?:string; estCostOverride?:number }
  | { kind:'CUSTOM'; desc:string; visibility?:'ALTA'|'MEDIA'|'BAJA'; estCost?:number; scheduleAt?:string };

export async function createPosTacticsBatch(input: {
  accountId: string;
  createdById: string;
  lines: PosLineInput[];
}) {
  const now = new Date().toISOString();
  const batch = db.batch();
  const out: { tacticId:string }[] = [];

  // carga catálogo para conocer fulfillmentMode / defaultTaskKind / defaultCost
  const catalogSnap = await db.collection("posCatalog").get();
  const catalog = new Map<string, any>(catalogSnap.docs.map(d => [d.id, d.data()]));

  for (const line of input.lines) {
    const tRef = db.collection("posTactics").doc();
    const payload: any = {
      id: tRef.id, accountId: input.accountId, createdById: input.createdById,
      status: 'APPROVED', createdAt: now, updatedAt: now
    };

    if (line.kind === 'CATALOGO') {
      const item = catalog.get(line.catalogItemId);
      if (!item) throw new Error("Ítem de catálogo no encontrado");

      payload.catalogItemId = item.id;
      payload.qtyPlanned = line.qty ?? (item.family === 'MATERIAL' ? 1 : undefined);
      payload.estCost = line.estCostOverride ?? item.defaultCost;

      // Si se agenda, crear UNA interacción con el kind por defecto del ítem
      if (line.scheduleAt && item.defaultTaskKind) {
        const iRef = db.collection("interactions").doc();
        batch.set(iRef, {
          id: iRef.id,
          accountId: input.accountId,
          dept: 'MARKETING',
          kind: item.defaultTaskKind,                    // 'ENTREGA_PLV' | 'EVENTO_POS' | 'SERVICIO_POS'
          note: item.name,
          plannedFor: line.scheduleAt,
          status: 'open',
          linkedEntity: { type:'POS_TACTIC', id: tRef.id },
          createdAt: now, updatedAt: now
        });
        payload.status = 'SCHEDULED';
        payload.taskId = iRef.id;
      }
    }

    if (line.kind === 'CUSTOM') {
      payload.customDesc = line.desc;
      payload.visibility = line.visibility ?? 'MEDIA';
      payload.estCost = line.estCost ?? undefined;

      if (line.scheduleAt) {
        const iRef = db.collection("interactions").doc();
        batch.set(iRef, {
          id: iRef.id,
          accountId: input.accountId,
          dept: 'MARKETING',
          kind: 'POS_CUSTOM',                            // genérico
          note: line.desc,
          plannedFor: line.scheduleAt,
          status: 'open',
          linkedEntity: { type:'POS_TACTIC', id: tRef.id },
          createdAt: now, updatedAt: now
        });
        payload.status = 'SCHEDULED';
        payload.taskId = iRef.id;
      }
    }

    batch.set(tRef, payload);
    out.push({ tacticId: tRef.id });
  }

  await batch.commit();
  return { tactics: out };
}
