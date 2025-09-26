// domain/inventory.helpers.ts - Helpers de stock
import type { InventoryItem, StockMove, Uom, Item } from './ssot';

/** Devuelve el SKU de un item (fallback a id si no tiene sku) */
const getItemSku = (itemId: string, items: Item[]) =>
  items.find(i => i.id === itemId)?.sku ?? itemId;

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
  locationPrefix: 'RM/MAIN' | 'PKG/MAIN' | 'FG/MAIN'
): Array<{ fromLot: string; reservedQty: number; uom: Uom }> {
  if (requiredQty <= 0) return [];

  const lots = onHand
    .filter(i => i.itemId === itemId && (i.locationId || "").startsWith(locationPrefix) && (i.qty ?? 0) > 0)
    .sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)); // FIFO

  const picks: Array<{ fromLot: string; reservedQty: number; uom: Uom }> = [];
  let rem = requiredQty;

  for (const it of lots) {
    if (rem <= 0) break;
    const take = Math.min(it.qty ?? 0, rem);
    if (take > 0) {
      if (!it.lotNumber) {
        console.warn(`fifoReserveLots: OnHand item ${it.id} for item ${it.itemId} has no lotNumber.`);
        continue;
      }
      picks.push({ fromLot: it.lotNumber, reservedQty: take, uom: it.uom });
      rem -= take;
    }
  }
  return picks;
}


/** Genera movimientos de consumo (production_out) a partir de reservas */
export function buildConsumptionMoves(args: {
  orderId: string;
  reservations: Array<{ itemId: string; fromLot: string; reservedQty: number; uom: Uom }>;
  items: Item[];
  at?: string;
  fromLocation?: string; // ej. "RM/MAIN"
}): StockMove[] {
  const { orderId, reservations, items, at = new Date().toISOString(), fromLocation = "RM/MAIN" } = args;

  return reservations.map((r, idx) => ({
    id: `mv_cons_${orderId}_${idx}`,
    itemId: r.itemId,
    lotNumber: r.fromLot,
    uom: r.uom,
    qty: -r.reservedQty, // Negativo para salida
    locationId: fromLocation,
    reason: "production_out",
    occurredAt: at,
    createdAt: at,
    ref: { prodOrderId: orderId },
  }));
}

// NOTE: La lógica de `applyStockMoves` se ha simplificado, ya que los workers/triggers
// serán los responsables de recalcular las vistas `onHand` y `reservations`.
// Las funciones de validación de stock y aplicación de movimientos ya no son necesarias
// en el frontend si se asume que los datos de las vistas son correctos.
