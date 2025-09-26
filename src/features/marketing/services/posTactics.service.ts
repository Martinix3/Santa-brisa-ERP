// src/features/marketing/services/posTactics.service.ts
'use server';

import { z } from 'zod';
import { PosTactic, PosTacticItem, PosCostCatalogEntry, PlvMaterial, PosResult } from '@/domain/ssot';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { computePosResult } from './pos.service';


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
    catalogCode: z.string().optional(),
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

  const items: PosTacticItem[] = data.items.map((i, idx) => {
    const unit = Number(i.unitCost ?? 0);
    const qty = Number(i.qty ?? 1);
    return {
      id: i.id ?? `${Date.now()}_${idx}`,
      catalogCode: i.catalogCode,
      description: i.description,
      qty, unitCost: unit,
      actualCost: unit * qty,
      uom: i.uom,
      vendor: i.vendor,
      assetId: i.assetId,
    };
  });

  const actualCost = items.reduce((s, it) => s + (it.actualCost || 0), 0);
  const payload: PosTactic = {
    id,
    accountId: data.accountId,
    tacticCode: data.tacticCode ?? 'OTHER',
    description: data.description,
    items,
    actualCost,
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
