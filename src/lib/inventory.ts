// src/lib/inventory.ts
import type { OrderSellOut, QcStatus, OnHandView, Lot } from '@/domain/ssot';
import { qcToBucket } from '@/domain/ssot';

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
            : (masterLot as any)?.createdByGoodsReceiptId
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