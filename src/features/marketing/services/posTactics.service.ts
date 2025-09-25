
// src/features/marketing/services/posTactics.service.ts
'use server';

import { z } from 'zod';
import { PosTactic, PosTacticItem, PosCostCatalogEntry, PlvMaterial, PosResult } from '@/domain/ssot';
import { adminDb as db } from '@/server/firebaseAdmin'; // ajusta a tu inicialización (Admin SDK)
import { Timestamp } from 'firebase-admin/firestore';

// === Helpers ===
const nowISO = () => new Date().toISOString();

const TacticInput = z.object({
  id: z.string().optional(),
  accountId: z.string(),
  tacticCode: z.string(),
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
const ORDERS_COLL = 'ordersSellOut'; // ajusta al nombre de tu colección
const ACCOUNTS_COLL = 'accounts';

// === CRUD Catálogo ===
export async function upsertPosCostCatalogEntry(entry: PosCostCatalogEntry) {
  const ref = db.collection(CATALOG_COLL).doc(entry.code);
  const payload = {
    ...entry,
    updatedAt: nowISO(),
    createdAt: entry.createdAt ?? nowISO(),
  };
  await ref.set(payload, { merge: true });
  return (await ref.get()).data() as PosCostCatalogEntry;
}

export async function listPosCostCatalog(status?: 'ACTIVE'|'DRAFT'|'ARCHIVED') {
  let q = db.collection(CATALOG_COLL) as FirebaseFirestore.Query;
  if (status) q = q.where('status', '==', status);
  const snap = await q.get();
  return snap.docs.map(d => d.data() as PosCostCatalogEntry);
}

// === CRUD PLV simple (para selector en el diálogo) ===
export async function listPlvInStock() {
  const snap = await db.collection(PLV_COLL).where('status', '==', 'IN_STOCK').get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as PlvMaterial) }));
}

// === Atribución de revenue ±N días ===
// Supone ORDERS: { accountId, date(ISO), amount:number, items[], status }
type OrdersLike = { accountId: string; createdAt: string; totalAmount: number; };

/**
 * getAttributedRevenue
 * Asocia pedidos de una cuenta dentro de ventana [start-N, end+N]
 * Si pasas appliesToSkuIds, filtra por items que contengan esos SKUs (si tu modelo lo permite).
 */
export async function getAttributedRevenue(accountId: string, startISO: string, endISO: string, windowDays = 7, appliesToSkuIds?: string[]) {
  const start = new Date(startISO); const end = new Date(endISO);
  const lo = new Date(start); lo.setDate(lo.getDate() - windowDays);
  const hi = new Date(end);   hi.setDate(hi.getDate() + windowDays);

  // Por simplicidad: filtramos por rango de fecha y accountId.
  let q = db.collection(ORDERS_COLL)
    .where('accountId', '==', accountId)
    .where('createdAt', '>=', lo.toISOString())
    .where('createdAt', '<=', hi.toISOString());

  const snap = await q.get();
  let orders = snap.docs.map(d => d.data() as any);

  // (Opcional) filtrar por SKUs si tu modelo guarda items[].sku
  if (appliesToSkuIds && appliesToSkuIds.length) {
    orders = snap.docs
      .map(d => d.data() as any)
      .filter(o => Array.isArray(o.lines) && o.lines.some((it: any) => appliesToSkuIds.includes(it.sku)))
      .map(o => ({ accountId: o.accountId, createdAt: o.createdAt, totalAmount: o.totalAmount }));
  }

  const revenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  return { revenue, ordersCount: orders.length };
}

// === Estimación Lift% vs baseline ===
// baseline: media diaria (o semanal) de ventas previas X días a la táctica
export async function estimateLiftPct(accountId: string, startISO: string, endISO: string, lookbackDays = 30) {
  const start = new Date(startISO);
  const baseLo = new Date(start); baseLo.setDate(baseLo.getDate() - lookbackDays);
  const baseHi = new Date(start); baseHi.setDate(baseHi.getDate() - 1);

  const baseQ = db.collection(ORDERS_COLL)
    .where('accountId', '==', accountId)
    .where('createdAt', '>=', baseLo.toISOString())
    .where('createdAt', '<=', baseHi.toISOString());

  const baseSnap = await baseQ.get();
  const baseRevenue = baseSnap.docs.reduce((s, d) => s + (Number((d.data() as any).totalAmount) || 0), 0);
  const baseDays = Math.max(1, (baseHi.getTime() - baseLo.getTime()) / (1000*3600*24));
  const basePerDay = baseRevenue / baseDays;

  // revenue durante la táctica + ventana
  const { revenue } = await getAttributedRevenue(accountId, startISO, endISO, 0);

  const tacticDays = Math.max(1, (new Date(endISO).getTime() - new Date(startISO).getTime()) / (1000*3600*24));
  const tacticPerDay = revenue / tacticDays;

  if (basePerDay <= 0) return { liftPct: undefined, confidence: 'LOW' as const };
  const liftPct = ((tacticPerDay / basePerDay) - 1) * 100;
  const confidence = (lookbackDays >= 30 && tacticDays >= 3) ? 'MEDIUM' : 'LOW';
  return { liftPct, confidence };
}

// === UPSERT / CLOSE TACTIC ===
export async function upsertPosTactic(input: UpsertPosTacticInput, createdById: string) {
  const data = TacticInput.parse(input);
  const id = data.id ?? db.collection(TACTICS_COLL).doc().id;

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
    tacticCode: data.tacticCode,
    description: data.description,
    appliesToSkuIds: data.appliesToSkuIds,
    items,
    plannedCost: data.status === 'planned' ? actualCost : undefined,
    actualCost: data.status !== 'planned' ? actualCost : 0,
    executionScore: data.executionScore,
    status: data.status,
    createdAt: nowISO(),
    createdById,
    updatedAt: nowISO(),
  };

  await db.collection(TACTICS_COLL).doc(id).set(payload, { merge: true });
  return payload;
}

export async function closePosTactic(tacticId: string, { windowDays = 7 }: { windowDays?: number } = {}) {
  const ref = db.collection(TACTICS_COLL).doc(tacticId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Tactic not found');

  const t = snap.data() as PosTactic;
  const startISO = t.createdAt;
  const endISO = nowISO();

  const { revenue } = await getAttributedRevenue(t.accountId, startISO, endISO, windowDays, t.appliesToSkuIds);
  const { liftPct, confidence } = await estimateLiftPct(t.accountId, startISO, endISO, 30);

  const totalCost = t.actualCost || t.plannedCost || 0;
  const roi = totalCost > 0 ? (revenue - totalCost) / totalCost : undefined;

  const result: PosTacticResult = {
    roi, liftPct, confidence: (confidence ?? 'LOW'),
    revenueAttributed: revenue,
  };

  const payload: Partial<PosTactic> = {
    status: 'closed',
    result,
    updatedAt: nowISO(),
  };

  await ref.set(payload, { merge: true });
  return { id: tacticId, ...payload };
}
