// src/app/(app)/warehouse/inventory/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { StockMove, Item, QcStatus, SantaData, Uom } from '@/domain/ssot';
import { makeOnHandId } from '@/domain/id-helpers';
import { z } from "zod";
import { ok, fail, type ActionResult } from "@/lib/result";
import { LotSchema } from '@/domain/validators';

const CreateManualOnHandSchema = z.object({
  itemId: z.string().min(1),
  lotNumber: z.string().optional(),
  qty: z.number().positive(),
  uom: z.string().min(1),
  locationId: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  note: z.string().optional(),
  supplier: z.string().optional(),
  invoiceRef: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().default("EUR").optional(),
  category: z.enum(["fg","raw","intermediate","pack","merch","consumable"]),
  sendToQc: z.boolean().default(false),
});

type CreateManualPayload = z.infer<typeof CreateManualOnHandSchema>;

// --- Helpers ---
function simpleId(prefix="sm"): string {
  const r = Math.random().toString(36).slice(2,10);
  return `${prefix}_${r}`;
}
const pad2 = (n: number) => String(n).padStart(2, "0");

function lotPrefixFromSku(sku?: string) {
  const base = (sku || "SKU").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(-2)}${pad2(d.getMonth() + 1)}`;
  return `${base}-${yymm}`;
}

async function findNextLotNumber(itemId: string, sku?: string): Promise<string> {
  const prefix = lotPrefixFromSku(sku);
  return `${prefix}-01`;
}

async function loadItemSku(itemId: string): Promise<string | undefined> {
  return undefined;
}

function initialQcStatusFor(item?: { requiresQc?: boolean }, opts?: { sendToQc?: boolean }): QcStatus {
  if (opts?.sendToQc === true) return 'PENDING';
  if (opts?.sendToQc === false) return 'PASSED';
  // @ts-ignore
  return item?.requiresQc ? 'PENDING' : 'PASSED';
}


// --- Actions ---

export async function createManualOnHand(
  input: CreateManualPayload
): Promise<ActionResult<{ stockMoveId: string; lotNumber: string }>> {
  const parsed = CreateManualOnHandSchema.safeParse(input);
  if (!parsed.success) {
    return fail(`Datos inválidos: ${parsed.error.message}`);
  }
  const p = parsed.data;

  const sku = await loadItemSku(p.itemId);
  let lotNumber = (p.lotNumber || "").trim();
  if (!lotNumber) {
    lotNumber = await findNextLotNumber(p.itemId, sku);
  }

  const stockMoveId = simpleId("sm");
  const occurredAtIso = p.occurredAt ? new Date(p.occurredAt).toISOString() : new Date().toISOString();

  const stockMove = {
    id: stockMoveId,
    itemId: p.itemId,
    lotNumber,
    qty: p.qty,
    uom: p.uom,
    reason: "adjustment",
    toLocationId: p.locationId,
    occurredAt: occurredAtIso,
    createdAt: new Date().toISOString(),
    ref: {
      source: "manual_new_onhand",
      invoiceRef: p.invoiceRef || undefined,
      supplier: p.supplier || undefined,
      amount: p.amount ?? undefined,
      currency: p.currency || "EUR",
      note: p.note || undefined,
      category: p.category,
    },
  };

  const now = new Date().toISOString();
  const qcStatus = initialQcStatusFor(undefined, { sendToQc: p.sendToQc });
  const lot = {
    id: lotNumber,
    lotNumber,
    itemId: p.itemId,
    qcStatus: qcStatus,
    createdAt: now,
    updatedAt: now,
    quantity: p.qty,
    uom: p.uom,
  };

  try {
    await upsertMany("lots", [lot as any]);
  } catch {}

  await upsertMany("stockMoves", [stockMove as any]);

  return ok({ stockMoveId, lotNumber });
}


async function getAll<T>(coll: keyof SantaData): Promise<T[]> {
  try {
    const querySnapshot = await db.collection(coll as string).get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (e) {
    console.error(`Error loading collection ${coll}:`, e);
    return [];
  }
}

export async function rebuildOnHand() {
    console.log("[Worker/rebuildOnHand] Starting rebuild...");
    const [moves, items, lots] = await Promise.all([
      getAll<any>("stockMoves"),
      getAll<Item>("items"),
      getAll<any>("lots"),
    ]);
    const itemMap = new Map(items.map((i: Item) => [i.id, i]));
    const lotMap = new Map(lots.map((l: any) => [l.lotNumber, l]));
    
    console.log(`[Worker/rebuildOnHand] Loaded ${moves.length} moves, ${items.length} items, ${lots.length} lots.`);

    const onHandAgg: Record<string, { qty: number; uom: Uom; itemId: string; lotNumber: string; locationId: string; updatedAt: string }> = {};

    const DIRECT_SIGN: Record<string, number> = {
      receipt: +1,
      production_in: +1,
      return_in: +1,
      ship: -1,
      sale: -1,
      production_out: -1,
      return_out: -1,
      consignment_send: -1,
      consignment_sell: -1,
      consignment_return: +1,
      sample_send: -1,
      sample_consume: -1,
    };

    for (const m of moves) {
      if (!m.itemId || !m.lotNumber) continue;

      const qty = Number(m.qty ?? 0) || 0;
      const uom = m.uom ?? itemMap.get(m.itemId)?.uom ?? "unit";
      const updatedAt = m.occurredAt ?? m.createdAt ?? new Date().toISOString();

      if (DIRECT_SIGN[m.reason] !== undefined) {
        const sign = DIRECT_SIGN[m.reason];
        const loc = sign > 0 ? (m.toLocationId || m.toLocation) : (m.fromLocationId || m.fromLocation);
        if (loc) {
            const key = makeOnHandId(m.itemId, m.lotNumber, loc);
            const entry = onHandAgg[key] || { qty: 0, uom, itemId: m.itemId, lotNumber: m.lotNumber, locationId: loc, updatedAt: '1970-01-01T00:00:00Z' };
            entry.qty += qty * sign;
            if (new Date(updatedAt) > new Date(entry.updatedAt)) {
                entry.updatedAt = updatedAt;
            }
            onHandAgg[key] = entry;
        }
      } else if (m.reason === 'transfer') {
        const from = m.fromLocationId || m.fromLocation;
        const to = m.toLocationId || m.toLocation;
        if (from) {
            const key = makeOnHandId(m.itemId, m.lotNumber, from);
            const entry = onHandAgg[key] || { qty: 0, uom, itemId: m.itemId, lotNumber: m.lotNumber, locationId: from, updatedAt: '1970-01-01T00:00:00Z' };
            entry.qty -= qty;
            if (new Date(updatedAt) > new Date(entry.updatedAt)) entry.updatedAt = updatedAt;
            onHandAgg[key] = entry;
        }
        if (to) {
            const key = makeOnHandId(m.itemId, m.lotNumber, to);
            const entry = onHandAgg[key] || { qty: 0, uom, itemId: m.itemId, lotNumber: m.lotNumber, locationId: to, updatedAt: '1970-01-01T00:00:00Z' };
            entry.qty += qty;
            if (new Date(updatedAt) > new Date(entry.updatedAt)) entry.updatedAt = updatedAt;
            onHandAgg[key] = entry;
        }
      } else if (m.reason === 'adjustment') {
          const loc = m.toLocationId || m.toLocation || m.fromLocationId || m.fromLocation;
          if (loc) {
            const key = makeOnHandId(m.itemId, m.lotNumber, loc);
            const entry = onHandAgg[key] || { qty: 0, uom, itemId: m.itemId, lotNumber: m.lotNumber, locationId: loc, updatedAt: '1970-01-01T00:00:00Z' };
            entry.qty += qty;
            if (new Date(updatedAt) > new Date(entry.updatedAt)) entry.updatedAt = updatedAt;
            onHandAgg[key] = entry;
          }
      }
    }
    
    const finalOnHandDocs = Object.values(onHandAgg)
      .filter(doc => Math.abs(doc.qty) > 1e-6)
      .map(doc => {
        const item = itemMap.get(doc.itemId);
        const lot = lotMap.get(doc.lotNumber);
        return {
          id: makeOnHandId(doc.itemId, doc.lotNumber, doc.locationId),
          ...doc,
          category: item?.category,
          qcStatus: lot?.qcStatus || 'PENDING',
          qty: Math.round(doc.qty * 1000) / 1000,
        };
      });
      
    console.log(`[Worker/rebuildOnHand] Aggregated ${finalOnHandDocs.length} on-hand documents.`);

    const writer = db.bulkWriter();
    const existingSnap = await db.collection('onHand').select().get();
    existingSnap.docs.forEach(doc => writer.delete(doc.ref));
    finalOnHandDocs.forEach(doc => writer.set(db.collection('onHand').doc(doc.id), doc));
    await writer.close();

    console.log(`[Worker/rebuildOnHand] Finished. Deleted ${existingSnap.size}, wrote ${finalOnHandDocs.length}.`);
    return { ok: true, onHand: finalOnHandDocs.length, lots: lots.length };
}
