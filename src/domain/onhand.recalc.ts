
// src/domain/onhand.recalc.ts
import type { StockMove, OnHandView, Uom } from '@/domain/ssot';

const SIGN: Record<string, number> = {
  receipt: +1,
  production_in: +1,
  transfer: 0,      // suma en destino y resta en origen más abajo
  adjustment: 0,    // puede ser +/-; usamos qty tal cual
  ship: -1,
  sale: -1,
  return_in: +1,
  return_out: -1,
  production_out: -1,
  consignment_send: -1,
  consignment_return: +1,
  consignment_sell: -1,
  sample_send: -1,
  sample_consume: -1,
  reserve: 0,       // si reservas en otra vista, no afecta onHand
  unreserve: 0,
};

function key(itemId: string, lot?: string, loc?: string) {
  return [itemId, lot || '', loc || ''].join('|');
}

export function deriveOnHand(stockMoves: StockMove[], nowIso = new Date().toISOString()): OnHandView[] {
  const acc = new Map<string, { qty: number; uom: Uom; itemId: string; lot?: string; loc?: string; createdAt?: string; updatedAt?: string }>();

  for (const m of stockMoves) {
    const fromLoc = (m as any).fromLocationId ?? m.fromLocation;
    const toLoc   = (m as any).toLocationId   ?? m.toLocation;

    // 1) movimientos que suman/restan directamente
    if (SIGN[m.reason] !== 0) {
      const loc = SIGN[m.reason] > 0 ? toLoc : fromLoc;
      const k = key(m.itemId, m.lotNumber, loc);
      const cur = acc.get(k) || { qty: 0, uom: m.uom, itemId: m.itemId, lot: m.lotNumber, loc, createdAt: m.createdAt };
      const delta = (SIGN[m.reason] as number) * m.qty;
      acc.set(k, { ...cur, qty: cur.qty + delta, updatedAt: m.occurredAt });
    }

    // 2) transfer: resta en origen y suma en destino
    if (m.reason === 'transfer') {
      if (fromLoc) {
        const kFrom = key(m.itemId, m.lotNumber, fromLoc);
        const cur = acc.get(kFrom) || { qty: 0, uom: m.uom, itemId: m.itemId, lot: m.lotNumber, loc: fromLoc, createdAt: m.createdAt };
        acc.set(kFrom, { ...cur, qty: cur.qty - m.qty, updatedAt: m.occurredAt });
      }
      if (toLoc) {
        const kTo = key(m.itemId, m.lotNumber, toLoc);
        const cur = acc.get(kTo) || { qty: 0, uom: m.uom, itemId: m.itemId, lot: m.lotNumber, loc: toLoc, createdAt: m.createdAt };
        acc.set(kTo, { ...cur, qty: cur.qty + m.qty, updatedAt: m.occurredAt });
      }
    }

    // 3) adjustment: aplicar qty tal cual al destino (o a la misma loc si no hay)
    if (m.reason === 'adjustment') {
      const loc = toLoc ?? fromLoc;
      const k = key(m.itemId, m.lotNumber, loc);
      const cur = acc.get(k) || { qty: 0, uom: m.uom, itemId: m.itemId, lot: m.lotNumber, loc, createdAt: m.createdAt };
      acc.set(k, { ...cur, qty: cur.qty + m.qty, updatedAt: m.occurredAt });
    }
  }

  // Map → array, filtrando lotes con qty 0
  const out: OnHandView[] = [];
  for (const [id, v] of acc.entries()) {
    if (Math.abs(v.qty) < 1e-9) continue;
    out.push({
      id,
      itemId: v.itemId,
      lotNumber: v.lot,
      locationId: v.loc,
      qty: Number(v.qty.toFixed(6)),
      uom: v.uom,
      createdAt: v.createdAt || nowIso,
      updatedAt: v.updatedAt || nowIso,
    });
  }
  // opcional: ordenar por updatedAt desc
  out.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return out;
}
