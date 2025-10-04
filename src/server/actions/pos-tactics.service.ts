// @ts-nocheck
// src/server/actions/pos-tactics.service.ts
'use server';

import { z } from 'zod';
import { PosTactic, PosTacticItem, PosCostCatalogEntry, PlvMaterial, PosResult } from '@/domain/ssot';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { computePosResult } from '@/features/marketing/services/pos.service';


// === Helpers ===
const nowISO = () => new Date().toISOString();

const TacticInput = z.object({
  id: z.string().optional(),
  accountId: z.string(),
  eventId: z.string().optional(),
  interactionId: z.string().optional(),
  orderId: z.string().optional(),
  tacticCode: z.string().optional(),
  description: z.string().optional(),
  appliesToSkuIds: z.array(z.string()).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    catalogItemId: z.string().optional(),
    description: z.string(),
    qty: z.number().min(0).default(1),
    unitCost: z.number().min(0).default(0),
    uom: z.enum(['UNIT','HOUR','BATCH']).optional(),
    vendor: z.string().optional(),
    assetId: z.string().optional(),
  })).min(1),
  executionScore: z.number().min(0).max(100).default(80),
  status: z.enum(['planned','active','closed','cancelled']).default('active'),
});

export type UpsertPosTacticInput = z.infer<typeof TacticInput>;
export type PosLineInput = UpsertPosTacticInput['items'][0];


const CATALOG_COLL = 'posCostCatalog';
const TACTICS_COLL = 'posTactics';
const PLV_COLL = 'plv_material';

// === Funciones de lectura (llamadas desde Server Components) ===
export async function listPosCostCatalog(status?: 'ACTIVE'|'DRAFT'|'ARCHIVED'): Promise<PosCostCatalogEntry[]> {
  let q = db.collection(CATALOG_COLL) as FirebaseFirestore.Query;
  if (status) q = q.where('status', '==', status);
  const snap = await q.get();
  return snap.docs.map(d => d.data() as PosCostCatalogEntry);
}

export async function listPlvInStock(): Promise<PlvMaterial[]> {
  const snap = await db.collection(PLV_COLL).where('status', '==', 'IN_STOCK').get();
  return snap.docs.map(d => ({ ...(d.data() as PlvMaterial), id: d.id }));
}

export async function listPosTactics(): Promise<PosTactic[]> {
  const snap = await db.collection(TACTICS_COLL).orderBy('createdAt', 'desc').limit(100).get();
  return snap.docs.map(d => d.data() as PosTactic);
}

// === Server Actions (llamadas desde Client Components) ===
export async function upsertPosTactic(input: UpsertPosTacticInput, createdById: string): Promise<PosTactic> {
  const data = TacticInput.parse(input);
  const id = data.id || db.collection(TACTICS_COLL).doc().id;

  const items: any[] = data.items.map((i, idx) => {
    const unit = Number(i.unitCost ?? 0);
    const qty = Number(i.qty ?? 1);
    return {
      id: i.id ?? `${Date.now()}_${idx}`,
      catalogCode: i.catalogItemId,
      description: i.description,
      qty,
      unitCost: unit,
      uom: i.uom,
      vendor: i.vendor,
      assetId: i.assetId,
    };
  });

  const estCost = items.reduce((s, it) => s + (it.unitCost || 0) * (it.qty || 1), 0);
  const payload: PosTactic = {
    id,
    accountId: data.accountId,
    tacticCode: data.tacticCode ?? 'OTHER',
    description: data.description,
    items,
    estCost,
    actualCost: estCost, // Default actual to estimated
    executionScore: data.executionScore,
    status: data.status,
    createdAt: nowISO(),
    createdById,
    updatedAt: nowISO(),
  };

  await db.collection(TACTICS_COLL).doc(id).set(payload, { merge: true });
  return payload;
}

export async function closePosTactic(tacticId: string, { windowDays = 7 }: { windowDays?: number } = {}): Promise<Partial<PosTactic>> {
  const ref = db.collection(TACTICS_COLL).doc(tacticId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Tactic not found');

  const t = snap.data() as PosTactic;
  const startISO = t.createdAt;
  const endISO = nowISO();

  const result: PosResult = await computePosResult({
    accountId: t.accountId,
    startDate: startISO,
    endDate: endISO,
    costTotal: t.actualCost,
    executionScore: t.executionScore,
  });

  const payload: Partial<PosTactic> = {
    status: 'closed',
    result,
    updatedAt: nowISO(),
  };

  await ref.set(payload, { merge: true });
  return { id: tacticId, ...payload };
}


export async function createPosTacticsBatch(input: {
  accountId: string;
  createdById: string;
  lines: PosLineInput[];
}) {
  const now = new Date().toISOString();
  const batch = db.batch();
  const out: { tacticId:string }[] = [];

  // carga catálogo para conocer fulfillmentMode / defaultTaskKind / defaultCost
  const catalogSnap = await db.collection("posCostCatalog").get();
  const catalog = new Map<string, any>(catalogSnap.docs.map(d => [d.id, d.data()]));

  for (const line of input.lines) {
    const tRef = db.collection("posTactics").doc();
    const payload: any = {
      id: tRef.id, accountId: input.accountId, createdById: input.createdById,
      status: 'APPROVED', createdAt: now, updatedAt: now
    };

    if (line.kind === 'CATALOGO') {
      if (!line.catalogItemId) throw new Error("CATALOGO requiere catalogItemId");
      const item = catalog.get(line.catalogItemId);
      if (!item) throw new Error("Ítem de catálogo no encontrado");

      payload.catalogItemId = item.id;
      payload.qtyPlanned = line.qty ?? (item.family === 'MATERIAL' ? 1 : undefined);
      payload.estCost = line.estCost ?? item.defaultCost;
      payload.description = item.name; // Use catalog name as description

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
      if (!line.desc) throw new Error("CUSTOM requiere desc (descripción)");
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
