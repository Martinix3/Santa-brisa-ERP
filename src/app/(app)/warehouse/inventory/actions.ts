// src/app/(app)/warehouse/inventory/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { StockMove, Item, QcStatus, SantaData, Uom, ItemCategory } from '@/domain/ssot';
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

const lotPrefixFromSku = (sku?: string, itemId?: string) => {
  const base = (sku || itemId || 'SKU').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${base}-${yymm}`;
};


async function findNextLotNumber(itemId: string, sku?: string): Promise<string> {
    const prefix = lotPrefixFromSku(sku, itemId);
    const lotsColl = db.collection('lots');
    const query = lotsColl.where('lotNumber', '>=', prefix).where('lotNumber', '<', prefix + 'z');
    const snapshot = await query.get();

    if (snapshot.empty) {
        return `${prefix}-01`;
    }

    let maxSeq = 0;
    snapshot.docs.forEach(doc => {
        const lotNum = doc.data().lotNumber || '';
        const seq = parseInt(lotNum.split('-').pop() || '0', 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    });

    const nextSeq = (maxSeq + 1).toString().padStart(2, '0');
    return `${prefix}-${nextSeq}`;
}

async function loadItem(itemId: string): Promise<Item | null> {
    const doc = await db.collection('items').doc(itemId).get();
    return doc.exists ? (doc.data() as Item) : null;
}

function initialQcStatusFor(item: Item, opts: { sendToQc: boolean }): QcStatus {
  if (opts.sendToQc) return 'PENDING';
  const criticalCategories: (Item['category'] | undefined)[] = ['raw', 'pack', 'fg', 'intermediate'];
  return criticalCategories.includes(item.category) ? 'PENDING' : 'PASSED';
}

// --- Action Refactorizada ---
export async function createManualOnHand(
  input: CreateManualPayload
): Promise<ActionResult<{ stockMoveId: string; lotNumber: string }>> {
  const parsed = CreateManualOnHandSchema.safeParse(input);
  if (!parsed.success) {
    return fail(`Datos inválidos: ${parsed.error.message}`);
  }
  const p = parsed.data;

  try {
    const item = await loadItem(p.itemId);
    if (!item) {
        return fail(`El producto con ID ${p.itemId} no existe.`);
    }

    let lotNumber = (p.lotNumber || "").trim();
    if (!lotNumber) {
      lotNumber = await findNextLotNumber(p.itemId, item.sku);
    }

    const occurredAtIso = p.occurredAt ? new Date(p.occurredAt).toISOString() : new Date().toISOString();
    const nowIso = new Date().toISOString();
    
    // Usar el validador de Zod para asegurar la consistencia del lote
    const lotData = LotSchema.parse({
      lotNumber: lotNumber,
      itemId: p.itemId,
      quantity: p.qty,
      uom: p.uom,
      qcStatus: initialQcStatusFor(item, { sendToQc: p.sendToQc }),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const stockMove = {
      id: simpleId("sm"),
      itemId: p.itemId,
      lotNumber,
      qty: p.qty,
      uom: p.uom,
      reason: "adjustment",
      toLocationId: p.locationId,
      occurredAt: occurredAtIso,
      createdAt: nowIso,
      ref: { /* ... */ },
    };

    const batch = db.batch();
    
    const lotRef = db.collection('lots').doc(lotNumber);
    batch.set(lotRef, lotData, { merge: true });

    const stockMoveRef = db.collection('stockMoves').doc(stockMove.id);
    batch.set(stockMoveRef, stockMove as any);

    await batch.commit();

    return ok({ stockMoveId: stockMove.id, lotNumber });

  } catch (error: any) {
    console.error("Error creando entrada manual de stock:", error);
     if (error instanceof z.ZodError) {
        return fail("Error de validación al crear el lote.", { fieldErrors: error.flatten().fieldErrors });
    }
    return fail(error.message || "Ocurrió un error inesperado en el servidor.");
  }
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
    finalOnHandDocs.forEach(doc => writer.set(db.collection('onHand').doc(doc.id), doc as any));
    await writer.close();

    console.log(`[Worker/rebuildOnHand] Finished. Deleted ${existingSnap.size}, wrote ${finalOnHandDocs.length}.`);
    return { ok: true, onHand: finalOnHandDocs.length, lots: lots.length };
}
