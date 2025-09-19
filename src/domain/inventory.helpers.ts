
// domain/inventory.helpers.ts - Helpers de stock
import type { InventoryItem, StockMove, Product, Uom, Material } from './ssot';

/** Devuelve el SKU de un material (fallback a id si no tiene sku) */
const getMaterialSku = (materialId: string, materials: Material[]) =>
  materials.find(m => m.id === materialId)?.sku ?? materialId;

/** Suma disponible en InventoryItem[] (qty), opcionalmente por ubicación (ej. RM/) */
export function availableForMaterial(
  materialId: string,
  inventory: InventoryItem[],
  materials: Material[],
  locationPrefix?: string
): number {
  const sku = getMaterialSku(materialId, materials);
  return inventory
    .filter(i =>
      i.sku === sku &&
      (locationPrefix ? (i.locationId || "").startsWith(locationPrefix) : true)
    )
    .reduce((s, i) => s + (i.qty ?? 0), 0);
}

/** Elige lotes FIFO para cubrir una cantidad requerida. */
export function fifoReserveLots(
  materialId: string,
  requiredQty: number,
  inventory: InventoryItem[],
  materials: Material[],
  locationPrefix = "RM/" // materias primas
): Array<{ fromLot: string; reservedQty: number; uom: Uom }> {
  if (requiredQty <= 0) return [];
  const sku = getMaterialSku(materialId, materials);

  const lots = inventory
    .filter(i => i.sku === sku && (i.locationId || "").startsWith(locationPrefix) && (i.qty ?? 0) > 0)
    .sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt)); // FIFO

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
  materials: Material[];
  at?: string;
  fromLocation?: string; // ej. "RM/MAIN"
}): StockMove[] {
  const { orderId, reservations, materials, at = new Date().toISOString(), fromLocation = "RM/MAIN" } = args;
  const skuOf = (mid: string) => getMaterialSku(mid, materials);

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
  products: Product[],
  moves: StockMove[]
): InventoryItem[] {
  // Valida existencias y descuenta (convierte a unidad base si hace falta)
  return applyStockMoves(inventory, moves, products);
}


// Conversión de UoM (simplificado, se puede mover a uom.ts si crece)
function toBaseUnits(qty: number, uom: Uom, product?: Product): number {
  // MP: L, kg, ud → ya están en base → retorno directo
  if (uom === 'uds' || uom === 'L' || uom === 'kg' || uom === 'g' || uom === 'mL' || uom === 'bottle') return qty;
  // Sólo necesitamos product para 'case' o 'pallet'
  if (!product) return qty; // fallback seguro
  if (uom === 'case')   return qty * (product.caseUnits ?? 1);
  if (uom === 'pallet') return qty * (product.casesPerPallet ?? 1) * (product.caseUnits ?? 1);
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

function findProduct(products: Product[], sku: string): Product | undefined {
  return products.find(p => p.sku === sku || p.id === sku);
}


export function assertSufficientStock(state: InventoryState, move: StockMove, products: Product[]) {
  if (!move.fromLocation) return;
  const p = findProduct(products, move.sku); // puede ser undefined para MP
  const baseQty = toBaseUnits(move.qty, move.uom, p);
  const k = key(move.sku, move.lotId, move.fromLocation);
  const curr = state.get(k)?.qty ?? 0;
  if (curr < baseQty) {
    throw new Error(`Stock insuficiente: ${move.sku} lote ${move.lotId || '—'} en ${move.fromLocation}. Hay ${curr}, necesitas ${baseQty}.`);
  }
}

export function applyStockMove(state: InventoryState, move: StockMove, products: Product[]): InventoryState {
  const newState = new Map(state); // Crear una copia del mapa para inmutabilidad
  const p = findProduct(products, move.sku);
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
      id: `inv_${kTo}`, sku: move.sku, lotNumber: move.lotId,
      uom: 'bottle', qty: 0, locationId: move.toLocation, updatedAt: move.occurredAt,
    };
    
    newState.set(kTo, { ...newItem, qty: Number(nextQty.toFixed(6)), updatedAt: move.occurredAt });
  }

  return newState;
}


export function applyStockMoves(items: InventoryItem[], moves: StockMove[], products: Product[]): InventoryItem[] {
  let state = indexInventory(items);
  for (const mv of moves) {
    if (mv.fromLocation) assertSufficientStock(state, mv, products);
    state = applyStockMove(state, mv, products);
  }
  return stateToArray(state);
}

