
// src/server/workers/inventory.rebuildOnHand.worker.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { StockMove, Item, QcStatus, SantaData, Uom } from '@/domain/ssot';
import { makeOnHandId } from '@/domain/id-helpers';

async function getAll<T>(coll: keyof SantaData): Promise<T[]> {
  try {
    const querySnapshot = await db.collection(coll as string).get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (e) {
    console.error(`Error loading collection ${coll}:`, e);
    return [];
  }
}

function qcFromFirstReason(firstReason: string | undefined, requiresQc: boolean | undefined): QcStatus {
    if (firstReason === "production_out") return "PENDING";
    if (firstReason === "receipt") return requiresQc ? "PENDING" : "PASSED";
    return requiresQc ? "PENDING" : "PASSED";
}

export async function run() {
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
