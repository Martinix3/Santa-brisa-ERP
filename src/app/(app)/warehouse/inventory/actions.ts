
// src/app/(app)/warehouse/inventory/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { upsertMany } from '@/lib/dataprovider/actions';
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
    if (firstReason === "production_output") return "PENDING";
    if (firstReason === "receipt") return requiresQc ? "PENDING" : "PASSED";
    return requiresQc ? "PENDING" : "PASSED";
}

export async function rebuildOnHand() {
    const [moves, items] = await Promise.all([
      getAll<any>("stockMoves"),
      getAll<any>("items"),
    ]);
    const itemMap = new Map(items.map((i: any) => [i.id, i]));

    // --- agregaciones ---
    const onHand: Record<string, any> = {};       // key = item|lot|location (SAFE)
    const lots: Record<string, any> = {};         // key = lotNumber
    const reservations: Record<string, any> = {}; // key = item|lot|location
    
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
      const qty = Number(m.qty ?? 0) || 0;
      const absQty = Math.abs(qty);
      const sign = qty < 0 ? -1 : 1;
      const ts = m.occurredAt ?? m.createdAt ?? new Date().toISOString();
      const from = (m.fromLocation?.trim() || m.fromLocationId?.trim()) as string | undefined;
      const to   = (m.toLocation?.trim()   || m.toLocationId?.trim())   as string | undefined;
      const uom  = m.uom ?? itemMap.get(m.itemId)?.uom ?? "unit";

      // track lot
      if (m.lotNumber) {
        const lot = (lots[m.lotNumber] ||= {
          lotNumber: m.lotNumber,
          itemId: m.itemId,
          uom,
          createdAt: ts,
          updatedAt: ts,
          firstReason: m.reason,
        });
        if (new Date(ts) < new Date(lot.createdAt)) lot.createdAt = ts;
        if (new Date(ts) > new Date(lot.updatedAt)) lot.updatedAt = ts;
      }

      const reason = m.reason as string;

      function add(loc: string | undefined | null, delta: number) {
        if (!loc || !m.itemId || !m.lotNumber) return;
        const k = makeOnHandId(m.itemId, m.lotNumber, loc);
        const cur = (onHand[k] ||= { id: k, itemId: m.itemId, lotNumber: m.lotNumber, locationId: loc, qty: 0, uom, updatedAt: ts, createdAt: ts });
        cur.qty += delta;
        if (new Date(ts) > new Date(cur.updatedAt)) cur.updatedAt = ts;
      }
      
      if (DIRECT_SIGN[reason] !== undefined && DIRECT_SIGN[reason] !== 0) {
        const loc = DIRECT_SIGN[reason] > 0 ? to : from;
        add(loc, DIRECT_SIGN[reason] * absQty);
      } else if (reason === 'transfer') {
        if (from) add(from, -absQty);
        if (to) add(to, absQty);
      } else if (reason === 'adjustment') {
        add(to ?? from, qty); // qty ya tiene signo
      } else if (reason === "reservation") {
        const loc = to ?? from;
        if (loc) {
          const rk = makeOnHandId(m.itemId, m.lotNumber, loc);
          const cur = (reservations[rk] ||= { id: rk, itemId: m.itemId, lotNumber: m.lotNumber, locationId: loc, qty: 0, updatedAt: ts });
          cur.qty += sign * absQty;
          cur.updatedAt = ts;
        }
      }
    }

    const lotsDocs = Object.values(lots).map((l: any) => {
      const item = itemMap.get(l.itemId);
      const requiresQc = !!(item as any)?.requiresQc;
      return {
        id: l.lotNumber,
        lotNumber: l.lotNumber,
        itemId: l.itemId,
        uom: l.uom,
        qcStatus: qcFromFirstReason(l.firstReason, requiresQc),
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      };
    });

    const qcByLot = new Map<string, QcStatus>(lotsDocs.map((l: any) => [l.lotNumber, l.qcStatus as QcStatus]));

    const onHandDocs = Object.values(onHand)
      .map((o: any) => ({
        ...o,
        qty: Math.round((Number(o.qty) || 0) * 1000) / 1000,
        qcStatus: qcByLot.get(o.lotNumber) ?? 'PENDING',
      }))
      .filter((o: any) => Math.round(o.qty * 1000) !== 0);

    const resMap = new Map<string, number>();
    for (const r of Object.values(reservations)) {
      const qty = Math.round((Number((r as any).qty) || 0) * 1000) / 1000;
      if (!qty) continue;
      resMap.set((r as any).id, qty);
    }
    for (const oh of onHandDocs as any[]) {
      oh.reservedQty = resMap.get(oh.id) ?? 0;
      if (oh.reservedQty < 0) oh.reservedQty = 0;
    }

    await Promise.all([
      upsertMany("onHand", onHandDocs),
      upsertMany("lots", lotsDocs),
      upsertMany("reservations", Object.values(reservations)),
    ]);

    return { ok: true, onHand: onHandDocs.length, lots: lotsDocs.length, reservations: resMap.size };
}
