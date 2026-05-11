/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/lib/inventory.ts
import type { Order, QcStatus, Lot, StockMove, OnHand, Item } from '@/domain/ssot';
import { isQcReleased, isQcHold, isQcFailed } from '@/domain/qc-status';

// ===========================================
// TIPOS DE DATOS ENRIQUECIDOS
// ===========================================

export type StockShortageDetail = {
  sku: string;
  qtyRequired: number;
  qtyAvailable: number; // Stock que cumple con QC
  qtyShort: number;
  qtyOnHold: number; // NUEVO: Stock pendiente de QC
};

export type AllocationDetail = {
  sku: string;
  lotNumber: string;              // SSOT v2: puede ser lotCode
  lotCode?: string;               // SSOT v2: campo canónico
  id?: string;                    // ID del onHand para makeOnHandId
  locationId: string;             // Ubicación física del lote
  qty: number;
  expiryAt?: string | null;
  originInfo?: string;            // Origen del lote (producción, recepción)
};

// ===========================================
// FUNCIÓN checkOrderStock MEJORADA
// ===========================================

export function checkOrderStock(
  order: Order,
  onHand: OnHand[],
  lotsMaster: Lot[] = [],
  opts?: { allowHold?: boolean }
): { allocations: AllocationDetail[]; shortages: StockShortageDetail[] } {
  if (!order?.items?.length) return { allocations: [], shortages: [] };

  const lotMasterMap = new Map((lotsMaster || []).map(l => [l.lotNumber, l]));

  const allocations: AllocationDetail[] = [];
  const shortages: StockShortageDetail[] = [];


  for (const line of order.items || []) {
    const sku = line.sku;
    const qty = line.qty;
    if (!qty || qty <= 0) continue;

    const allStockForThisItem = onHand.filter(r => r.sku === sku);

    // 1.b) Disponible (liberado) con tolerancia
    const availableStock = allStockForThisItem
      .filter(r => isQcReleased(r.qcStatus) || (opts?.allowHold && isQcHold(r.qcStatus)))
      .map(r => ({
        ...r,
        qty: Number(r.qty ?? 0),
        reserved: Number(r.reserved ?? 0),
        free: Math.max(0, Number(r.qty ?? 0) - Number(r.reserved ?? 0)),
      }))
      .filter(r => r.free > 0);

    const onHoldQty = allStockForThisItem
      .filter(r => isQcHold(r.qcStatus))
      .reduce((sum: number, r) => sum + Number(r.qty ?? 0), 0);

    // FEFO (v7: expiryAt no existe en OnHand, usar createdAt como proxy)
    const sortedLots = [...availableStock].sort((a, b) => {
      const ax = a.createdAt ? Date.parse(a.createdAt) : Number.POSITIVE_INFINITY;
      const bx = b.createdAt ? Date.parse(b.createdAt) : Number.POSITIVE_INFINITY;
      return ax - bx;
    });

    let remaining = qty;
    for (const lot of sortedLots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.free);
      if (take > 0) {
        // SSOT v2: usar lotCode canónico
        const lotCode = lot.lotCode || (lot.lotNumbers ? Object.keys(lot.lotNumbers)[0] : '');
        const masterLot = lotMasterMap.get(lotCode);
        const originInfo = (masterLot as any)?.producedByOrderId
          ? `Prod: ${(masterLot as any).producedByOrderId}`
          : (masterLot as any)?.createdByGoodsReceiptId
          ? `Recep: ${(masterLot as any).createdByGoodsReceiptId}`
          : 'Ajuste manual';

        allocations.push({
          sku: sku || '',
          lotNumber: lotCode || '',
          lotCode: lotCode || '',  // SSOT v2: campo canónico
          id: lot.id,              // Para makeOnHandId
          locationId: lot.locationId || lot.warehouseId || '',
          qty: take,
          expiryAt: null,
          originInfo,
        });
        remaining -= take;
      }
    }

    if (remaining > 0) {
      const totalAvailable = sortedLots.reduce((s, l) => s + l.free, 0);
      shortages.push({
        sku: sku || '',
        qtyRequired: qty,
        qtyAvailable: totalAvailable,
        qtyShort: Math.max(0, qty - totalAvailable),
        qtyOnHold: onHoldQty,
      });
    }
  }

  // retorno SIEMPRE arrays
  return { allocations: allocations ?? [], shortages: shortages ?? [] };
}


/**
 * @deprecated Use inheritQcStatus from '@/domain/qc-status'
 */
export function inheritOrResetQcStatus(parents: QcStatus[], forceReQc?: boolean): QcStatus {
    if (forceReQc) return 'PENDING';
    const allReleased = parents.every(p => p === 'PASSED' || p === 'WAIVED');
    return allReleased ? 'PASSED' : 'PENDING';
}

// ===========================================
// ROLLUP POR SKU (agrupación de lotes)
// ===========================================

export type SkuStockSummary = {
  sku: string;
  /** @deprecated Use sku */
  itemId?: string;
  lots: OnHand[];

  // Totales
  totalPhysical: number;        // suma qty todos los lotes (cualquier QC)
  totalReserved: number;
  totalReleasedFree: number;    // solo RELEASED y sin reservar (qty - reservedQty)
  totalOnHold: number;          // en cuarentena (HOLD/PENDING agrupado)
  totalValue?: number;

  // QC Breakdown
  passedQty: number;
  pendingQty: number;
  failedQty: number;

  // Caducidad (FEFO)
  earliestExpiryAt?: string | null; // fecha más próxima (si existe)
  daysToEarliestExpiry?: number | null;
  lotsCount: number;

  // Estado agregado (para "pastilla")
  status:
    | 'OK'
    | 'LOW'
    | 'OOS'
    | 'HOLD'
    | 'NEAR_EXPIRY'
    | 'EXPIRED';

  // Datos auxiliares
  nearExpiryCount: number;      // nº lotes que caducan en ventana nearExpiryDays
  expiredCount: number;         // nº lotes caducados
};

// Opciones de cálculo
export type SkuRollupOptions = {
  nearExpiryDays?: number;                      // umbral de "caduca pronto" (def 30)
  minStockByItem?: Record<string, number>;      // stock objetivo por SKU (p.ej. reorder point)
  now?: Date;                                   // inyectable para test
};


// ----- Util: días entre fechas -----
function diffDays(a: Date, b: Date) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / MS);
}

/**
 * Agrupa onHand por SKU y calcula el resumen de stock real.
 * Nota: Para calcular totalValue, necesitas pasar items en opts.
 */
export function computeSkuRollup(
  onHand: OnHand[],
  opts: SkuRollupOptions & { items?: Item[] } = {}
): Record<string, SkuStockSummary> {
  const nearExpiryDays = opts.nearExpiryDays ?? 30;
  const minByItem = opts.minStockByItem ?? {};
  const now = opts.now ?? new Date();
  const items = opts.items || [];

  // Crear mapas de items por id y por sku para lookup rápido
  const itemsById = new Map(items.map(it => [it.id, it]));
  const itemsBySku = new Map(items.map(it => [it.sku, it]));

  const bySku = new Map<string, SkuStockSummary>();

  for (const r of onHand) {
    const itemById = r.itemId ? itemsById.get(r.itemId) : undefined;
    const itemBySku = r.sku ? itemsBySku.get(r.sku) : undefined;
    const item = itemById ?? itemBySku;
    const sku = r.sku || item?.sku;
    if (!sku) continue;
    const itemId = item?.id ?? r.itemId ?? sku;

    if (!bySku.has(sku)) {
      bySku.set(sku, {
        sku,
        itemId,
        lots: [],
        totalPhysical: 0,
        totalReserved: 0,
        totalReleasedFree: 0,
        totalOnHold: 0,
        totalValue: 0,
        passedQty: 0,
        pendingQty: 0,
        failedQty: 0,
        lotsCount: 0,
        status: 'OK',
        nearExpiryCount: 0,
        expiredCount: 0,
      });
    }

    const acc = bySku.get(sku)!;
    if (!acc.itemId && itemId) acc.itemId = itemId;
    acc.lots.push(r);
    acc.lotsCount++;
    
    // Handle both SSOT v2 (qty as object) and legacy (qty as number)
    let qty: number;
    let qtyReleased: number;
    let qtyHold: number;
    let qtyRejected: number;
    
    if (typeof r.qty === 'object' && r.qty !== null) {
      // SSOT v2: qty = { RELEASED, HOLD, REJECTED }
      qtyReleased = (r.qty as any).RELEASED || 0;
      qtyHold = (r.qty as any).HOLD || 0;
      qtyRejected = (r.qty as any).REJECTED || 0;
      qty = qtyReleased + qtyHold + qtyRejected;
    } else {
      // Legacy: qty as number
      qty = Number(r.qty) || 0;
      qtyReleased = qty;
      qtyHold = 0;
      qtyRejected = 0;
    }
    
    // Handle reserved qty (can be object or number)
    let reserved: number;
    if (typeof r.reservedQty === 'object' && r.reservedQty !== null) {
      reserved = (r.reservedQty as any).RELEASED || 0;
    } else {
      reserved = Number(r.reservedQty ?? r.reserved ?? 0);
    }
    
    // ✅ Obtener unitCost desde Item master
    const unitCost = item?.stdCost || 0;
    
    acc.totalPhysical += qty;
    acc.totalReserved += reserved;
    
    // ✅ CALCULAR VALOR: qty * stdCost del item
    acc.totalValue = (acc.totalValue || 0) + (qty * unitCost);

    // QC Buckets - use the broken-down quantities
    acc.passedQty += qtyReleased;
    acc.pendingQty += qtyHold;
    acc.failedQty += qtyRejected;
    
    // Stock liberado disponible = RELEASED qty - reservado
    acc.totalReleasedFree += Math.max(0, qtyReleased - reserved);
    
    // Stock en QC (HOLD)
    acc.totalOnHold += qtyHold;

    // v7: expiryAt no existe en OnHand, skip este cálculo por completo
  }

  for (const acc of bySku.values()) {
    const minTarget = minByItem[acc.sku] ?? 0;
    const oos = acc.totalReleasedFree <= 0;
    const low = !oos && acc.totalReleasedFree < Math.max(1, minTarget);

    if (acc.expiredCount > 0) acc.status = 'EXPIRED';
    else if (oos) acc.status = 'OOS';
    else if (acc.nearExpiryCount > 0) acc.status = 'NEAR_EXPIRY';
    else if (low) acc.status = 'LOW';
    else if (acc.totalOnHold > 0) acc.status = 'HOLD';
    else acc.status = 'OK';
  }

  return Object.fromEntries(bySku.entries());
}


// ===========================================
// AVISOS (para tarjetas/banner simples)
// ===========================================

export type StockAlert =
  | { type: 'OOS'; sku: string; message: string }
  | { type: 'LOW'; sku: string; message: string }
  | { type: 'NEAR_EXPIRY'; sku: string; message: string }
  | { type: 'EXPIRED'; sku: string; message: string }
  | { type: 'HOLD'; sku: string; message: string };

export function computeStockAlerts(
  summaries: Record<string, SkuStockSummary>
): StockAlert[] {
  const alerts: StockAlert[] = [];
  for (const s of Object.values(summaries)) {
    switch (s.status) {
      case 'OOS':
        alerts.push({ type: 'OOS', sku: s.sku, message: 'Sin stock liberado' });
        break;
      case 'LOW':
        alerts.push({
          type: 'LOW',
          sku: s.sku,
          message: `Stock bajo (${s.totalReleasedFree} uds liberadas)`,
        });
        break;
      case 'NEAR_EXPIRY':
        alerts.push({
          type: 'NEAR_EXPIRY',
          sku: s.sku,
          message: `Lotes próximos a caducar (≤ ventana)`,
        });
        break;
      case 'EXPIRED':
        alerts.push({
          type: 'EXPIRED',
          sku: s.sku,
          message: `Hay lotes caducados`,
        });
        break;
      case 'HOLD':
        alerts.push({
          type: 'HOLD',
          sku: s.sku,
          message: `Stock en cuarentena pendiente de QC`,
        });
        break;
    }
  }
  return alerts;
}

// ===========================================
// UI helpers (pastillas de estado)
// ===========================================

/**
 * Devuelve clases de badge SB según estado.
 * Usa tus utilidades definidas en globals.css (.sb-badge …).
 */
export function stockStatusBadgeClass(
  status: SkuStockSummary['status']
): string {
    const base = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
        case 'OK': return `${base} bg-green-100 text-green-800`;
        case 'LOW': return `${base} bg-yellow-100 text-yellow-800`;
        case 'OOS': return `${base} bg-red-100 text-red-800`;
        case 'NEAR_EXPIRY': return `${base} bg-orange-100 text-orange-800`;
        case 'EXPIRED': return `${base} bg-red-200 text-red-900`;
        case 'HOLD': return `${base} bg-blue-100 text-blue-800`;
        default: return `${base} bg-zinc-100 text-zinc-800`;
    }
}

/**
 * Texto corto para la pill.
 */
export function stockStatusLabel(
  s: SkuStockSummary['status']
): string {
  return (
    {
      OK: 'OK',
      LOW: 'Bajo',
      OOS: 'Sin stock',
      HOLD: 'Cuarentena',
      NEAR_EXPIRY: 'Caduca pronto',
      EXPIRED: 'Caducado',
    }[s] ?? s
  );
}

// ===========================================
// ANÁLISIS ADICIONALES
// ===========================================
export function computeCoverage(summaries: Record<string, SkuStockSummary>, velocity: any[], lookbackDays: number) {
  const byItem: Record<string, { total: number; daily: number; daysCover: number | null }> = {};
  for(const v of velocity) {
    byItem[v.itemId] ||= { total: 0, daily: 0, daysCover: null };
    byItem[v.itemId].total += v.qty;
  }
  for(const [id, s] of Object.entries(byItem)) {
    s.daily = s.total / lookbackDays;
    const stock = summaries[id]?.totalReleasedFree;
    if (stock != null && s.daily > 0) {
      s.daysCover = stock / s.daily;
    }
  }
  return byItem;
}

export function suggestReplenishment(summaries: Record<string, SkuStockSummary>, coverage: Record<string, { daily: number; daysCover: number | null }>, opts: { minStockByItem: Record<string, number>, safetyByItem: Record<string, number>, targetDaysOfCover: number }) {
  const replen: Record<string, number> = {};
  for (const [itemId, s] of Object.entries(summaries)) {
    const cov = coverage[itemId];
    const min = opts.minStockByItem[itemId] ?? 0;
    const safety = opts.safetyByItem[itemId] ?? (cov?.daily ? cov.daily * 7 : 0);
    const target = Math.max(min, safety, (cov?.daily ?? 0) * opts.targetDaysOfCover);
    const deficit = target - s.totalReleasedFree;
    if (deficit > 0) replen[itemId] = deficit;
  }
  return replen;
}

export function computeExpiryBuckets(onHand: OnHand[], stepDays: number, numSteps: number) {
  const buckets: { label: string; from: Date; to: Date; items: OnHand[] }[] = [];
  const now = new Date();
  for(let i=0; i<numSteps; i++) {
    const from = new Date(now.getTime() + i*stepDays*86400000);
    const to = new Date(from.getTime() + stepDays*86400000);
    buckets.push({ label: `+${i*stepDays}d`, from, to, items: [] });
  }
  for(const oh of onHand) {
    // v7: expiryAt no existe en OnHand, skip
    if (!(oh as any).expiryAt) continue;
    const exp = new Date((oh as any).expiryAt);
    const b = buckets.find(b => exp >= b.from && exp < b.to);
    if(b) b.items.push(oh);
  }
  return buckets;
}

export function detectQcStuck(onHand: OnHand[], now: Date, daysStuck: number) {
  return onHand.filter(oh =>
    isQcHold(oh.qcStatus) &&
    diffDays(now, new Date(oh.createdAt)) > daysStuck
  );
}

export function auditOnHandVsLots(onHand: OnHand[], lots: Lot[]) {
  const onHandLots = new Set(onHand.flatMap(oh => oh.lotNumbers ? Object.keys(oh.lotNumbers) : []));
  const masterLots = new Set(lots.map(l => l.lotNumber));
  return {
    inOnHandNotLots: [...onHandLots].filter(l => !masterLots.has(l)),
    inLotsNotOnHand: [...masterLots].filter(l => !onHandLots.has(l)),
  };
}
