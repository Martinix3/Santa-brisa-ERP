// domain/inventory.helpers.ts - Helpers de stock
import type { OnHandView, StockMove, Uom, Item } from './ssot';

/** Suma disponible en OnHandView[] (qty), opcionalmente por ubicación (ej. RM/MAIN) */
export function availableForItem(
  itemId: string,
  onHand: OnHandView[],
  locationPrefix?: string
): number {
  return onHand
    .filter(i =>
      i.itemId === itemId &&
      (locationPrefix ? (i.locationId || "").startsWith(locationPrefix) : true)
    )
    .reduce((s, i) => s + (i.qty ?? 0), 0);
}


/** Elige lotes FIFO para cubrir una cantidad requerida. */
export function fifoReserveLots(
  itemId: string,
  requiredQty: number,
  onHand: OnHandView[],
  locationPrefix: string
): Array<{ fromLotNumber: string; reservedQty: number; uom: Uom }> {
  if (requiredQty <= 0) return [];

  const lots = onHand
    .filter(i => i.itemId === itemId && (i.locationId || "").startsWith(locationPrefix) && (i.qty ?? 0) > 0 && i.lotNumber)
    .sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)); // FIFO

  const picks: Array<{ fromLotNumber: string; reservedQty: number; uom: Uom }> = [];
  let rem = requiredQty;

  for (const it of lots) {
    if (rem <= 0) break;
    const take = Math.min(it.qty ?? 0, rem);
    if (take > 0) {
      if (!it.lotNumber) {
        console.warn(`fifoReserveLots: OnHand item ${it.id} for item ${it.itemId} has no lotNumber.`);
        continue;
      }
      picks.push({ fromLotNumber: it.lotNumber!, reservedQty: take, uom: it.uom });
      rem -= take;
    }
  }
  return picks;
}


/** Genera movimientos de consumo (production_out) a partir de reservas */
export function buildConsumptionMoves(args: {
  orderId: string;
  reservations: Array<{ itemId: string; fromLotNumber: string; reservedQty: number; uom: Uom }>;
  at?: string;
  fromLocationId?: string; // ej. "RM/MAIN"
}): StockMove[] {
  const { orderId, reservations, at = new Date().toISOString(), fromLocationId = "RM/MAIN" } = args;

  return reservations.map((r, idx) => ({
    id: `mv_cons_${orderId}_${idx}`,
    itemId: r.itemId,
    lotNumber: r.fromLotNumber,
    uom: r.uom,
    qty: -r.reservedQty, // Negativo para salida
    fromLocationId: fromLocationId,
    reason: "production_out",
    occurredAt: at,
    createdAt: at,
    ref: { prodOrderId: orderId },
  } as StockMove));
}

// NOTE: La lógica de `applyStockMoves` se ha simplificado, ya que los workers/triggers
// serán los responsables de recalcular las vistas `onHand` y `reservations`.
// Las funciones de validación de stock y aplicación de movimientos ya no son necesarias
// en el frontend si se asume que los datos de las vistas son correctos
