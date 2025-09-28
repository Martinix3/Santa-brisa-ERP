// src/lib/inventory.ts
import type { OrderSellOut, QcStatus } from '@/domain/ssot';
import type { OnHandView } from '@/domain/ssot';
import { qcToBucket } from '@/domain/ssot';

export type StockShortage = {
  itemId: string;
  qtyRequired: number;
  qtyAvailable: number;
  qtyShort: number;
};

export type Allocation = { itemId: string; lotNumber: string; qty: number; expiryAt?: string|null };

type OrderLine = { itemId: string; qty: number };

export function checkOrderStock(
  order: OrderSellOut,
  onHand: OnHandView[],
  itemsCatalog?: { id: string; uom?: string }[]
): { allocations: Allocation[]; shortages: StockShortage[] } {
  if (!order?.lines?.length) return { allocations: [], shortages: [] };

  // Solo consideramos FG y lotes RELEASED (PASSED|WAIVED)
  const isReleased = (qc: QcStatus) => qcToBucket(qc) === 'RELEASED';
  const fg = onHand.filter(r => r.locationId?.startsWith('FG/') && isReleased(r.qcStatus));

  const allocations: Allocation[] = [];
  const shortages: StockShortage[] = [];

  for (const line of order.lines) {
    const itemId = line.itemId;
    const qty = line.qty;
    if (!qty || qty <= 0) continue;

    // Lotes de ese item, ordenados FEFO (expiry nulos al final)
    const lots = fg
      .filter(r => r.itemId === itemId)
      .map(r => ({ ...r, free: Math.max(0, r.qty - (r.reservedQty ?? 0)) }))
      .filter(r => r.free > 0)
      .sort((a, b) => {
        const ax = a.expiryAt ? Date.parse(a.expiryAt) : Number.POSITIVE_INFINITY;
        const bx = b.expiryAt ? Date.parse(b.expiryAt) : Number.POSITIVE_INFINITY;
        return ax - bx;
      });

    let remaining = qty;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lot.free);
      if (take > 0) {
        allocations.push({ itemId, lotNumber: lot.lotNumber, qty: take, expiryAt: lot.expiryAt ?? undefined });
        remaining -= take;
      }
    }

    if (remaining > 0) {
      const available = lots.reduce((s, l) => s + l.free, 0);
      shortages.push({
        itemId,
        qtyRequired: qty,
        qtyAvailable: available,
        qtyShort: Math.max(0, qty - available),
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
