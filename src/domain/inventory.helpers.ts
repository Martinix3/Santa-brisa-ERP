/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// domain/inventory.helpers.ts - Helpers de stock
import type { OnHandView, StockMove, Uom, Item } from './ssot';

/** Suma disponible en OnHandView[] (qty), opcionalmente por ubicación (ej. RM/MAIN) */
export function availableForItem(
  itemId: string,
  onHand: OnHandView[],
  locationPrefix?: string
): number {
  return onHand
    .filter((i) =>
      i.itemId === itemId &&
      (locationPrefix ? (i.locationId || "").startsWith(locationPrefix) : true)
    )
    .reduce((s: number, i) => s + (i.qty ?? 0), 0);
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
    .filter((i) => i.itemId === itemId && (i.locationId || "").startsWith(locationPrefix) && (i.qty ?? 0) > 0 && i.lotCode)
    .sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)); // FIFO

  const picks: Array<{ fromLotNumber: string; reservedQty: number; uom: Uom }> = [];
  let rem = requiredQty;

  for (const it of lots) {
    if (rem <= 0) break;
    const take = Math.min(it.qty ?? 0, rem);
    if (take > 0) {
      if (!it.lotCode) {
        console.warn(`fifoReserveLots: OnHand item ${it.id} for item ${it.itemId} has no lotCode.`);
        continue;
      }
      picks.push({ fromLotNumber: it.lotCode!, reservedQty: take, uom: it.uom });
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

  return reservations.map((r, idx: number) => ({
    id: `mv_cons_${orderId}_${idx}`,
    sku: r.itemId,
    lotCode: r.fromLotNumber,
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

/**
 * Genera un código amigable para mostrar lotes. Si el formato ya es canónico (SKU-YYMM-SS),
 * se devuelve tal cual; en caso contrario se crea un código corto basado en SKU + fecha.
 */
export function buildFriendlyLotCode(opts: {
  lotNumber?: string | null;
  lotCode?: string | null;
  sku?: string | null;
  createdAt?: string | null;
}): string {
  const raw = (opts.lotNumber ?? opts.lotCode ?? '').trim();
  if (!raw) return 'LOTE-SIN-NOMBRE';
  const upper = raw.toUpperCase();
  if (/^[A-Z0-9]+-\d{4}-\d{2,}$/.test(upper)) {
    return upper;
  }

  const sku = (opts.sku ?? 'LOT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'LOT';

  let yymm = '0000';
  if (opts.createdAt) {
    const date = new Date(opts.createdAt);
    if (!Number.isNaN(date.getTime())) {
      const yy = String(date.getUTCFullYear()).slice(-2);
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      yymm = `${yy}${mm}`;
    }
  }

  const numericTail = upper.replace(/\D/g, '');
  const sequence = numericTail ? numericTail.slice(-2).padStart(2, '0') : '01';

  return `${sku}-${yymm}-${sequence}`;
}

/** Detecta incidencias de UoM entre lo registrado en onHand y el maestro de items. */
export function hasUomMismatch(lotUom?: string | null, itemUom?: string | null): boolean {
  if (!lotUom || !itemUom) return false;
  const normalize = (u: string) => u.trim().toLowerCase();
  return normalize(lotUom) !== normalize(itemUom);
}
