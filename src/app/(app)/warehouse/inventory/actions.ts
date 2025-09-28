// src/app/(app)/warehouse/inventory/actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { upsertMany } from '@/lib/dataprovider/actions';
import type { StockMove, Item, QcStatus, SantaData } from '@/domain/ssot';
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

    for (const m of moves) {
      const qty = Number(m.qty ?? 0) || 0;
      const absQty = Math.abs(qty);
      const sign = qty < 0 ? -1 : 1;
      const ts = m.occurredAt ?? m.createdAt ?? new Date().toISOString();
      const from = (m.fromLocation?.trim() || m.fromLocationId?.trim()) as string | undefined;
      const to   = (m.toLocation?.trim()   || m.toLocationId?.trim())   as string | undefined;
      const uom  = m.uom ?? itemMap.get(m.itemId)?.uom ?? "unit";

      // track lot
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

      // from → resta
      if (from) {
        const k = makeOnHandId(m.itemId, m.lotNumber, from);
        const cur = (onHand[k] ||= { id: k, itemId: m.itemId, lotNumber: m.lotNumber, locationId: from, qty: 0, uom, updatedAt: ts });
        cur.qty -= absQty; // movimiento físico sale de 'from'
        cur.updatedAt = ts;
      }
      // to → suma
      if (to) {
        const k = makeOnHandId(m.itemId, m.lotNumber, to);
        const cur = (onHand[k] ||= { id: k, itemId: m.itemId, lotNumber: m.lotNumber, locationId: to, qty: 0, uom, updatedAt: ts });
        cur.qty += absQty; // movimiento físico entra a 'to'
        cur.updatedAt = ts;
      }

      // reservas (reserva = +qty, liberación = -qty) – clave en el lado destino si existe, si no, fuente
      if (m.reason === "reservation") {
        const loc = to ?? from; // dónde "vive" la reserva
        if (loc) {
          const rk = makeOnHandId(m.itemId, m.lotNumber, loc);
          const cur = (reservations[rk] ||= { id: rk, itemId: m.itemId, lotNumber: m.lotNumber, locationId: loc, qty: 0, updatedAt: ts });
          cur.qty += sign * absQty; // respeta signo: reservar (+), desreservar (-)
          cur.updatedAt = ts;
        }
      }
    }

    // Deriva qcStatus inicial (si no existe en DB; aquí usamos la heurística de "firstReason + requiresQc")
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

    // Mapa rápido de qcStatus por lote para denormalizar en onHand (solo lectura/UX)
    const qcByLot = new Map<string, QcStatus>(lotsDocs.map((l: any) => [l.lotNumber, l.qcStatus as QcStatus]));

    // Filtra onHand con qty > 0
    const onHandDocs = Object.values(onHand)
      .map((o: any) => ({
        ...o,
        // redondeo suave por flotantes
        qty: Math.round((Number(o.qty) || 0) * 1000) / 1000,
        qcStatus: qcByLot.get(o.lotNumber) ?? 'PENDING', // denormalizado
      }))
      .filter((o: any) => Math.round(o.qty * 1000) !== 0);

    // Integra reservas como 'reservedQty' denormalizado en onHand
    const resMap = new Map<string, number>();
    for (const r of Object.values(reservations)) {
      const qty = Math.round((Number((r as any).qty) || 0) * 1000) / 1000;
      if (!qty) continue;
      resMap.set((r as any).id, qty);
    }
    for (const oh of onHandDocs as any[]) {
      oh.reservedQty = resMap.get(oh.id) ?? 0;
      // sanidad: no más reservas que stock (no lo corregimos aquí, solo informamos)
      if (oh.reservedQty < 0) oh.reservedQty = 0;
    }

    // Persiste
    await Promise.all([
      upsertMany("onHand", onHandDocs),
      upsertMany("lots", lotsDocs),
      upsertMany("reservations", Object.values(reservations)), // si usas colección separada
    ]);

    return { ok: true, onHand: onHandDocs.length, lots: lotsDocs.length, reservations: resMap.size };
}