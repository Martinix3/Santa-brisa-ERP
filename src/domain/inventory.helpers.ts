
// domain/inventory.helpers.ts - Helpers de stock
import type { InventoryItem, StockMove, Uom } from './ssot';

/** Devuelve el SKU de un material (fallback a id si no tiene sku) */
const getMaterialSku = (materialId: string, inventory: InventoryItem[]) =>
  inventory.find(m => m.id === materialId)?.sku ?? materialId;

/** Suma disponible en InventoryItem[] (qty), opcionalmente por ubicación (ej. RM/MAIN) */
export function availableForMaterial(
  materialId: string,
  inventory: InventoryItem[],
  locationPrefix: 'RM/MAIN' | 'PKG/MAIN' | 'FG/MAIN'
): number {
  const sku = getMaterialSku(materialId, inventory);
  return inventory
    .filter(i =>
      i.sku === sku &&
      (locationPrefix ? (i.locationId || "") === locationPrefix : true)
    )
    .reduce((s, i) => s + (i.qty ?? 0), 0);
}

/** Elige lotes FIFO para cubrir una cantidad requerida. */
export function fifoReserveLots(
  materialId: string,
  requiredQty: number,
  inventory: InventoryItem[],
  locationPrefix: 'RM/MAIN' | 'PKG/MAIN' | 'FG/MAIN'
): Array<{ fromLot: string; reservedQty: number; uom: Uom }> {
  if (requiredQty <= 0) return [];
  const sku = getMaterialSku(materialId, inventory);

  const lots = inventory
    .filter(i => i.sku === sku && (i.locationId || "") === locationPrefix && (i.qty ?? 0) > 0)
    .sort((a, b) => +new Date(a.updatedAt || a.createdAt) - +new Date(b.updatedAt || b.createdAt)); // FIFO

  const picks: Array<{ fromLot: string; reservedQty: number; uom: Uom }> = [];
  let rem = requiredQty;

  for (const it of lots) {
    if (rem <= 0) break;
    const take = Math.min(it.qty ?? 0, rem);
    if (take > 0) {
      picks.push({ fromLot: it.lotNumber!, reservedQty: take, uom: it.uom });
      rem -= take;
    }
  }
  return picks;
}


/** Genera movimientos de consumo (production_out) a partir de reservas */
export function buildConsumptionMoves(args: {
  orderId: string;
  reservations: Array<{ materialId: string; fromLot: string; reservedQty: number; uom: Uom }>;
  inventory: InventoryItem[];
  at?: string;
  fromLocation?: string; // ej. "RM/MAIN"
}): StockMove[] {
  const { orderId, reservations, inventory, at = new Date().toISOString(), fromLocation = "RM/MAIN" } = args;
  const skuOf = (mid: string) => getMaterialSku(mid, inventory);

  return reservations.map((r, idx) => ({
    id: `mv_cons_${orderId}_${idx}`,
    sku: skuOf(r.materialId),
    lotId: r.fromLot,
    uom: r.uom,
    qty: r.reservedQty,
    fromLocation: fromLocation,
    reason: "production_out",
    occurredAt: at,
    createdAt: at,
    ref: { prodOrderId: orderId },
  }));
}

/** Aplica consumo: devuelve inventario actualizado */
export function consumeForOrder(
  inventory: InventoryItem[],
  moves: StockMove[]
): InventoryItem[] {
  // Valida existencias y descuenta (convierte a unidad base si hace falta)
  return applyStockMoves(inventory, moves);
}


// Conversión de UoM (simplificado, se puede mover a uom.ts si crece)
function toBaseUnits(qty: number, uom: Uom, product?: InventoryItem): number {
  // MP: L, kg, ud → ya están en base → retorno directo
  if (uom === 'uds' || uom === 'L' || uom === 'kg' || uom === 'g' || uom === 'mL' || uom === 'bottle') return qty;
  // Sólo necesitamos product para 'case' o 'pallet'
  if (!product) return qty; // fallback seguro
  // These fields don't exist on InventoryItem, needs refactor
  // if (uom === 'case')   return qty * (product.caseUnits ?? 1);
  // if (uom === 'pallet') return qty * (product.casesPerPallet ?? 1) * (product.caseUnits ?? 1);
  return qty;
}


export type InventoryState = Map<string, InventoryItem>;
const key = (sku: string, lot?: string, loc?: string) => `${sku}::${lot || '-' }::${loc || '-'}`;

export function indexInventory(items: InventoryItem[]): InventoryState {
  const m = new Map<string, InventoryItem>();
  for (const it of items) m.set(key(it.sku, it.lotNumber, it.locationId), { ...it });
  return m;
}

export function stateToArray(state: InventoryState): InventoryItem[] {
  return Array.from(state.values());
}

function findProduct(inventory: InventoryItem[], sku: string): InventoryItem | undefined {
  return inventory.find(p => p.sku === sku || p.id === sku);
}


export function assertSufficientStock(state: InventoryState, move: StockMove, inventory: InventoryItem[]) {
  if (!move.fromLocation) return;
  const p = findProduct(inventory, move.sku); // puede ser undefined para MP
  const baseQty = toBaseUnits(move.qty, move.uom, p);
  const k = key(move.sku, move.lotId, move.fromLocation);
  const curr = state.get(k)?.qty ?? 0;
  if (curr < baseQty) {
    throw new Error(`Stock insuficiente: ${move.sku} lote ${move.lotId || '—'} en ${move.fromLocation}. Hay ${curr}, necesitas ${baseQty}.`);
  }
}

export function applyStockMove(state: InventoryState, move: StockMove, inventory: InventoryItem[]): InventoryState {
  const newState = new Map(state); // Crear una copia del mapa para inmutabilidad
  const p = findProduct(inventory, move.sku);
  const baseQty = toBaseUnits(move.qty, move.uom, p);

  if (move.fromLocation) {
    const kFrom = key(move.sku, move.lotId, move.fromLocation);
    const currentItem = newState.get(kFrom);
    const currentQty = currentItem?.qty ?? 0;
    const nextQty = currentQty - baseQty;
    
    if (nextQty < -1e-9) throw new Error(`Stock negativo en ${kFrom}: ${nextQty}`);

    if (currentItem) {
      if (nextQty === 0) {
        newState.delete(kFrom);
      } else {
        newState.set(kFrom, { ...currentItem, qty: Number(nextQty.toFixed(6)), updatedAt: move.occurredAt });
      }
    } else if (baseQty > 0) {
      throw new Error(`No existe inventario en ${kFrom} para restar.`);
    }
  }

  if (move.toLocation) {
    const kTo = key(move.sku, move.lotId, move.toLocation);
    const currentItem = newState.get(kTo);
    const currentQty = currentItem?.qty ?? 0;
    const nextQty = currentQty + baseQty;

    const newItem: InventoryItem = currentItem ?? {
      id: `inv_${kTo}`, sku: move.sku, lotNumber: move.lotId, name: 'New Item',
      uom: 'bottle', qty: 0, locationId: move.toLocation, updatedAt: move.occurredAt, createdAt: move.createdAt,
      category: 'raw'
    };
    
    newState.set(kTo, { ...newItem, qty: Number(nextQty.toFixed(6)), updatedAt: move.occurredAt });
  }

  return newState;
}


export function applyStockMoves(items: InventoryItem[], moves: StockMove[]): InventoryItem[] {
  let state = indexInventory(items);
  for (const mv of moves) {
    if (mv.fromLocation) assertSufficientStock(state, mv, items);
    state = applyStockMove(state, mv, items);
  }
  return stateToArray(state);
}
