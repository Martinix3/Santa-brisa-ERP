// src/lib/inventory.ts
import type { OrderSellOut, QcStatus, OnHandView, Lot, StockMove, VelocityInput } from '@/domain/ssot';
import { qcToBucket } from '@/domain/ssot';
import type { Item } from '@/domain/ssot';

// ===========================================
// TIPOS DE DATOS ENRIQUECIDOS
// ===========================================

export type StockShortageDetail = {
  itemId: string;
  qtyRequired: number;
  qtyAvailable: number; // Stock que cumple con QC
  qtyShort: number;
  qtyOnHold: number; // NUEVO: Stock pendiente de QC
};

export type AllocationDetail = {
  itemId: string;
  lotNumber: string;
  qty: number;
  expiryAt?: string | null;
  originInfo: string; // NUEVO: Origen del lote (producción, recepción)
};

// ===========================================
// FUNCIÓN checkOrderStock MEJORADA
// ===========================================

export function checkOrderStock(
  order: OrderSellOut,
  onHand: OnHandView[],
  lotsMaster: Lot[] // NUEVO: Necesitamos el maestro de lotes para obtener el origen
): { allocations: AllocationDetail[]; shortages: StockShortageDetail[] } {
  if (!order?.lines?.length) return { allocations: [], shortages: [] };

  const lotMasterMap = new Map((lotsMaster || []).map(l => [l.lotNumber, l]));

  const allocations: AllocationDetail[] = [];
  const shortages: StockShortageDetail[] = [];

  for (const line of order.lines) {
    const { itemId, qty } = line;
    if (!qty || qty <= 0) continue;

    // 1. Obtenemos TODO el stock físico para este item
    const allStockForThisItem = onHand.filter(r => r.itemId === itemId);

    // 2. Calculamos el stock disponible (RELEASED) y en cuarentena (HOLD)
    const availableStock = allStockForThisItem
      .filter(r => qcToBucket(r.qcStatus) === 'RELEASED')
      .map(r => ({ ...r, free: Math.max(0, r.qty - (r.reservedQty ?? 0)) }))
      .filter(r => r.free > 0);
      
    const onHoldQty = allStockForThisItem
      .filter(r => qcToBucket(r.qcStatus) === 'HOLD')
      .reduce((sum, r) => sum + r.qty, 0);

    // 3. Ordenamos el stock disponible por FEFO (First-Expiry, First-Out)
    const sortedLots = [...availableStock].sort((a, b) => {
        const ax = a.expiryAt ? Date.parse(a.expiryAt) : Number.POSITIVE_INFINITY;
        const bx = b.expiryAt ? Date.parse(b.expiryAt) : Number.POSITIVE_INFINITY;
        return ax - bx;
    });

    let remaining = qty;
    for (const lot of sortedLots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.free);
      if (take > 0) {
        // 4. Buscamos el origen del lote en el maestro de lotes
        const masterLot = lotMasterMap.get(lot.lotNumber);
        const originInfo = masterLot?.producedByOrderId 
            ? `Prod: ${masterLot.producedByOrderId}`
            : (masterLot as any).createdByGoodsReceiptId
            ? `Recep: ${(masterLot as any).createdByGoodsReceiptId}`
            : 'Ajuste manual';

        allocations.push({
          itemId,
          lotNumber: lot.lotNumber,
          qty: take,
          expiryAt: lot.expiryAt,
          originInfo, // Añadimos la información de origen
        });
        remaining -= take;
      }
    }

    if (remaining > 0) {
      const totalAvailable = sortedLots.reduce((s, l) => s + l.free, 0);
      shortages.push({
        itemId,
        qtyRequired: qty,
        qtyAvailable: totalAvailable,
        qtyShort: Math.max(0, qty - totalAvailable),
        qtyOnHold: onHoldQty, // Añadimos el stock en cuarentena
      });
    }
  }

  return { allocations, shortages };
}


export function inheritOrResetQcStatus(parents: QcStatus[], forceReQc?: boolean): QcStatus {
    if (forceReQc) return 'PENDING';
    const allReleased = parents.every(p => p === 'PASSED' || p === 'WAIVED');
    return allReleased ? 'PASSED' : 'PENDING';
}

// ===========================================
// ROLLUP POR SKU (agrupación de lotes)
// ===========================================

export type SkuStockSummary = {
  itemId: string;

  // Totales
  totalPhysical: number;        // suma qty todos los lotes (cualquier QC)
  totalReleasedFree: number;    // solo RELEASED y sin reservar (qty - reservedQty)
  totalOnHold: number;          // en cuarentena (HOLD/PENDING agrupado)

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

// ----- Buckets QC (usa tu helper real) -----
function isReleased(qcStatus: QcStatus): boolean {
  const b = qcToBucket(qcStatus);
  return b === 'RELEASED';
}
function isHold(qcStatus: QcStatus): boolean {
  const b = qcToBucket(qcStatus);
  return b === 'HOLD'; // incluye PENDING/ON_HOLD según tu mapping
}

// ----- Util: días entre fechas -----
function diffDays(a: Date, b: Date) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / MS);
}

/**
 * Agrupa onHand por SKU y calcula el resumen de stock real.
 * - Suma física total
 * - Disponible real (RELEASED y sin reservar)
 * - En cuarentena (HOLD)
 * - Caducidades (earliest + near/expired)
 * - Estado agregado (pill)
 */
export function computeSkuRollup(
  onHand: OnHandView[],
  opts: SkuRollupOptions = {}
): Record<string, SkuStockSummary> {
  const nearExpiryDays = opts.nearExpiryDays ?? 30;
  const minByItem = opts.minStockByItem ?? {};
  const now = opts.now ?? new Date();

  const bySku: Record<string, SkuStockSummary> = {};

  for (const r of onHand) {
    const itemId = r.itemId;
    const reserved = r.reservedQty ?? 0;
    const free = Math.max(0, r.qty - reserved);

    if (!bySku[itemId]) {
      bySku[itemId] = {
        itemId,
        totalPhysical: 0,
        totalReleasedFree: 0,
        totalOnHold: 0,
        earliestExpiryAt: null,
        daysToEarliestExpiry: null,
        lotsCount: 0,
        status: 'OK',
        nearExpiryCount: 0,
        expiredCount: 0,
      };
    }
    const acc = bySku[itemId];
    acc.lotsCount += 1;
    acc.totalPhysical += r.qty;

    // Buckets QC
    if (isReleased(r.qcStatus)) acc.totalReleasedFree += free;
    if (isHold(r.qcStatus)) acc.totalOnHold += r.qty;

    // Caducidad
    if (r.expiryAt) {
      const d = new Date(r.expiryAt);
      const daysLeft = diffDays(d, now);

      // earliest
      if (!acc.earliestExpiryAt || new Date(acc.earliestExpiryAt) > d) {
        acc.earliestExpiryAt = r.expiryAt;
        acc.daysToEarliestExpiry = daysLeft;
      }
      // contadores near/expired
      if (daysLeft < 0) acc.expiredCount += 1;
      else if (daysLeft <= nearExpiryDays) acc.nearExpiryCount += 1;
    }
  }

  // Determinar estado agregado por SKU
  for (const [itemId, acc] of Object.entries(bySku)) {
    const minTarget = minByItem[itemId] ?? 0;

    const oos = acc.totalReleasedFree <= 0;
    const low = !oos && acc.totalReleasedFree < Math.max(1, minTarget);
    const hasHold = acc.totalOnHold > 0;
    const expired = acc.expiredCount > 0;
    const near = acc.nearExpiryCount > 0;

    let status: SkuStockSummary['status'] = 'OK';
    if (expired) status = 'EXPIRED';
    else if (oos) status = 'OOS';
    else if (near) status = 'NEAR_EXPIRY';
    else if (low) status = 'LOW';
    else if (hasHold) status = 'HOLD';
    acc.status = status;
  }

  return bySku;
}

// ===========================================
// AVISOS (para tarjetas/banner simples)
// ===========================================

export type StockAlert =
  | { type: 'OOS'; itemId: string; message: string }
  | { type: 'LOW'; itemId: string; message: string }
  | { type: 'NEAR_EXPIRY'; itemId: string; message: string }
  | { type: 'EXPIRED'; itemId: string; message: string }
  | { type: 'HOLD'; itemId: string; message: string };

export function computeStockAlerts(
  summaries: Record<string, SkuStockSummary>
): StockAlert[] {
  const alerts: StockAlert[] = [];
  for (const s of Object.values(summaries)) {
    switch (s.status) {
      case 'OOS':
        alerts.push({ type: 'OOS', itemId: s.itemId, message: 'Sin stock liberado' });
        break;
      case 'LOW':
        alerts.push({
          type: 'LOW',
          itemId: s.itemId,
          message: `Stock bajo (${s.totalReleasedFree} uds liberadas)`,
        });
        break;
      case 'NEAR_EXPIRY':
        alerts.push({
          type: 'NEAR_EXPIRY',
          itemId: s.itemId,
          message: `Lotes próximos a caducar (≤ ventana)`,
        });
        break;
      case 'EXPIRED':
        alerts.push({
          type: 'EXPIRED',
          itemId: s.itemId,
          message: `Hay lotes caducados`,
        });
        break;
      case 'HOLD':
        alerts.push({
          type: 'HOLD',
          itemId: s.itemId,
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
  switch (status) {
    case 'OK':          return 'sb-badge sb-badge--ok';
    case 'LOW':         return 'sb-badge sb-badge--warn';
    case 'OOS':         return 'sb-badge sb-badge--danger';
    case 'NEAR_EXPIRY': return 'sb-badge sb-badge--warn';
    case 'EXPIRED':     return 'sb-badge sb-badge--danger';
    case 'HOLD':        return 'sb-badge sb-badge--info';
    default:            return 'sb-badge';
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
export function computeCoverage(summaries: Record<string, SkuStockSummary>, velocity: VelocityInput[], lookbackDays: number) {
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

export function computeExpiryBuckets(onHand: OnHandView[], stepDays: number, numSteps: number) {
  const buckets: { label: string; from: Date; to: Date; items: OnHandView[] }[] = [];
  const now = new Date();
  for(let i=0; i<numSteps; i++) {
    const from = new Date(now.getTime() + i*stepDays*86400000);
    const to = new Date(from.getTime() + stepDays*86400000);
    buckets.push({ label: `+${i*stepDays}d`, from, to, items: [] });
  }
  for(const oh of onHand) {
    if (!oh.expiryAt) continue;
    const exp = new Date(oh.expiryAt);
    const b = buckets.find(b => exp >= b.from && exp < b.to);
    if(b) b.items.push(oh);
  }
  return buckets;
}

export function detectQcStuck(onHand: OnHandView[], now: Date, daysStuck: number) {
  return onHand.filter(oh =>
    isHold(oh.qcStatus) &&
    diffDays(now, new Date(oh.createdAt)) > daysStuck
  );
}

export function auditOnHandVsLots(onHand: OnHandView[], lots: Lot[]) {
  const onHandLots = new Set(onHand.map(oh => oh.lotNumber));
  const masterLots = new Set(lots.map(l => l.lotNumber));
  return {
    inOnHandNotLots: [...onHandLots].filter(l => !masterLots.has(l)),
    inLotsNotOnHand: [...masterLots].filter(l => !onHandLots.has(l)),
  };
}
