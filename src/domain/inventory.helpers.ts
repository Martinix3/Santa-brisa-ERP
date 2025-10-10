// domain/inventory.helpers.ts - Helpers de stock
import type { OnHandView, StockMove, Uom, Item } from './ssot';

/** Suma disponible en OnHandView[] (qty), opcionalmente por ubicación (ej. RM/MAIN) */
export function availableForItem(
  sku: string,
  onHand: OnHandView[],
  locationPrefix?: string
): number {
  return onHand
    .filter(i =>
      i.sku === sku &&
      (locationPrefix ? (i.warehouseId || "").startsWith(locationPrefix) : true)
    )
    .reduce((s, i) => s + (i.qty ?? 0), 0);
}


/** Elige lotes FIFO para cubrir una cantidad requerida. */
export function fifoReserveLots(
  sku: string,
  requiredQty: number,
  onHand: OnHandView[],
  locationPrefix: string
): Array<{ fromLotNumber: string; reservedQty: number; uom: Uom }> {
  if (requiredQty <= 0) return [];

  const lots = onHand
    .filter(i => i.sku === sku && (i.warehouseId || "").startsWith(locationPrefix) && (i.qty ?? 0) > 0 && i.lotNumbers)
    .sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)); // FIFO

  const picks: Array<{ fromLotNumber: string; reservedQty: number; uom: Uom }> = [];
  let rem = requiredQty;

  for (const it of lots) {
    if (rem <= 0) break;
    const take = Math.min(it.qty ?? 0, rem);
    if (take > 0) {
      const lotNumber = it.lotNumbers ? Object.keys(it.lotNumbers)[0] : undefined;
      if (!lotNumber) {
        console.warn(`fifoReserveLots: OnHand item ${it.id} for sku ${it.sku} has no lotNumber.`);
        continue;
      }
      picks.push({ fromLotNumber: lotNumber, reservedQty: take, uom: 'UNIT' as Uom });
      rem -= take;
    }
  }
  return picks;
}


/** Genera movimientos de consumo (production_out) a partir de reservas */
export function buildConsumptionMoves(args: {
  orderId: string;
  reservations: Array<{ sku: string; fromLotNumber: string; reservedQty: number; uom: Uom }>;
  at?: string;
  fromLocationId?: string; // ej. "RM/MAIN"
}): StockMove[] {
  const { orderId, reservations, at = new Date().toISOString(), fromLocationId = "RM/MAIN" } = args;

  return reservations.map((r, idx) => ({
    id: `mv_cons_${orderId}_${idx}`,
    date: at,
    type: 'OUT' as const,
    reason: 'CONSUMPTION',
    warehouseId: fromLocationId,
    items: [{
      sku: r.sku,
      quantity: r.reservedQty,
      lotNumber: r.fromLotNumber
    }],
    documentRef: { kind: 'productionOrder' as const, id: orderId },
    createdAt: at,
    updatedAt: at
  } as StockMove));
}

// NOTE: La lógica de `applyStockMoves` se ha simplificado, ya que los workers/triggers
// serán los responsables de recalcular las vistas `onHand` y `reservations`.
// Las funciones de validación de stock y aplicación de movimientos ya no son necesarias
// en el frontend si se asume que los datos de las vistas son correctos
