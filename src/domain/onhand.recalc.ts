// src/domain/onhand.recalc.ts
import type { StockMove, Uom, Item, OnHand } from '@/domain/ssot';

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

function key(sku: string, lot?: string, loc?: string) {
  return [sku, lot || '', loc || ''].join('|');
}

export function deriveOnHand(stockMoves: StockMove[], items: Item[], nowIso = new Date().toISOString()): OnHand[] {
  const itemMap = new Map(items.map(i => [i.sku, i]));
  const acc = new Map<string, { qty: number; sku: string; warehouse?: string; lotNumbers: Record<string, number>; createdAt?: string; updatedAt?: string }>();

  for (const m of stockMoves) {
    // En SSOT v7, StockMove tiene: type, reason, warehouseId, toWarehouseId, items[]
    const fromWarehouse = m.warehouseId;
    const toWarehouse = m.toWarehouseId;

    // Procesar cada item del movimiento
    for (const moveItem of m.items || []) {
      const { sku, quantity, lotNumber } = moveItem;
      
      // Determinar el signo según type y reason
      let sign = 0;
      if (m.type === 'IN') sign = 1;
      else if (m.type === 'OUT') sign = -1;
      else if (m.type === 'TRANSFER') {
        // Transfer: restar de origen, sumar a destino
        if (fromWarehouse) {
          const kFrom = key(sku, lotNumber, fromWarehouse);
          const cur = acc.get(kFrom) || { qty: 0, sku, warehouse: fromWarehouse, lotNumbers: {}, createdAt: m.createdAt };
          const lot = lotNumber || 'default';
          cur.lotNumbers[lot] = (cur.lotNumbers[lot] || 0) - quantity;
          cur.qty = cur.qty - quantity;
          acc.set(kFrom, { ...cur, updatedAt: m.date });
        }
        if (toWarehouse) {
          const kTo = key(sku, lotNumber, toWarehouse);
          const cur = acc.get(kTo) || { qty: 0, sku, warehouse: toWarehouse, lotNumbers: {}, createdAt: m.createdAt };
          const lot = lotNumber || 'default';
          cur.lotNumbers[lot] = (cur.lotNumbers[lot] || 0) + quantity;
          cur.qty = cur.qty + quantity;
          acc.set(kTo, { ...cur, updatedAt: m.date });
        }
        continue; // Ya procesado
      } else if (m.type === 'ADJUSTMENT') {
        // Adjustment puede ser +/- según la cantidad
        sign = quantity >= 0 ? 1 : -1;
      }

      // Aplicar el movimiento (IN, OUT, ADJUSTMENT)
      if (sign !== 0) {
        const warehouse = sign > 0 ? (toWarehouse || fromWarehouse) : fromWarehouse;
        const k = key(sku, lotNumber, warehouse);
        const cur = acc.get(k) || { qty: 0, sku, warehouse, lotNumbers: {}, createdAt: m.createdAt };
        const lot = lotNumber || 'default';
        const delta = sign * Math.abs(quantity);
        cur.lotNumbers[lot] = (cur.lotNumbers[lot] || 0) + delta;
        cur.qty = cur.qty + delta;
        acc.set(k, { ...cur, updatedAt: m.date });
      }
    }
  }

  // Map → array, filtrando con qty cercana a 0
  const out: OnHand[] = [];
  for (const [id, v] of acc.entries()) {
    if (Math.abs(v.qty) < 1e-9) continue;
    const item = itemMap.get(v.sku);
    out.push({
      id,
      sku: v.sku,
      warehouseId: v.warehouse || '',
      qty: Number(v.qty.toFixed(6)),
      lotNumbers: v.lotNumbers,
      createdAt: v.createdAt || nowIso,
      updatedAt: v.updatedAt || nowIso,
    });
  }
  // opcional: ordenar por updatedAt desc
  out.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return out;
}
