// src/app/(app)/warehouse/inventory/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { StockMove, Item, QcStatus, SantaData } from '@/domain/ssot';

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
    const onHand: Record<string, any> = {};
    const lots: Record<string, any> = {};
    const reservations: Record<string, any> = {};

    for (const m of moves) {
      const absQty = Math.abs(m.qty ?? 0);
      const ts = m.occurredAt ?? m.createdAt ?? new Date().toISOString();
      const from = m.fromLocation?.trim() || m.fromLocationId?.trim();
      const to = m.toLocation?.trim() || m.toLocationId?.trim();

      // track lot
      const lot = (lots[m.lotNumber] ||= {
        lotNumber: m.lotNumber,
        itemId: m.itemId,
        uom: m.uom ?? itemMap.get(m.itemId)?.uom ?? "unit",
        createdAt: ts,
        updatedAt: ts,
        firstReason: m.reason,
      });
      if (new Date(ts) < new Date(lot.createdAt)) lot.createdAt = ts;
      if (new Date(ts) > new Date(lot.updatedAt)) lot.updatedAt = ts;

      // from → resta
      if (from) {
        const k = `${m.itemId}|${m.lotNumber}|${from}`;
        const cur = (onHand[k] ||= { id: k, itemId: m.itemId, lotNumber: m.lotNumber, locationId: from, qty: 0, uom: m.uom, updatedAt: ts });
        cur.qty -= absQty;
        cur.updatedAt = ts;
      }
      // to → suma
      if (to) {
        const k = `${m.itemId}|${m.lotNumber}|${to}`;
        const cur = (onHand[k] ||= { id: k, itemId: m.itemId, lotNumber: m.lotNumber, locationId: to, qty: 0, uom: m.uom, updatedAt: ts });
        cur.qty += absQty;
        cur.updatedAt = ts;
      }

      // reservas
      if (m.reason === "reservation") {
        const rk = `${m.itemId}|${m.lotNumber}|${to ?? from}`;
        const cur = (reservations[rk] ||= { id: rk, itemId: m.itemId, lotNumber: m.lotNumber, locationId: to ?? from, qty: 0, updatedAt: ts });
        cur.qty += absQty;
        cur.updatedAt = ts;
      }
    }

    // Deriva qcStatus inicial
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

    // Filtra onHand con qty > 0
    const onHandDocs = Object.values(onHand).filter((o: any) => Math.round(o.qty * 1000) !== 0);

    // Persiste
    await Promise.all([
      upsertMany("onHand", onHandDocs),
      upsertMany("lots", lotsDocs),
      upsertMany("reservations", Object.values(reservations)),
    ]);

    return { ok: true, onHand: onHandDocs.length, lots: lotsDocs.length };
}