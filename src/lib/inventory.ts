// src/lib/inventory.ts
import type { OrderSellOut, QcStatus } from '@/domain/ssot';
import type { OnHandView } from './onhand_view';

export type StockShortage = { itemId: string; qtyRequired: number; qtyAvailable: number; qtyShort: number; };
export type AllocationLine = { itemId: string; lotNumber: string; locationId: string; qtyPicked: number; expiryAt?: string|null; };
export type StockCheckResult = { shortages: StockShortage[]; allocations: AllocationLine[]; };

function isReleased(v: OnHandView) {
  const qc = v.qcStatus ?? 'PENDING';
  return qc === 'PASSED';
}
const byExpiryFEFO = (a?: string|null,b?:string|null)=>(!a&&!b?0:!a?1:!b?-1:(new Date(a).getTime()-new Date(b).getTime()));

export function checkOrderStock(order: OrderSellOut, onHand: OnHandView[], opts?: { locationId?: string }): StockCheckResult {
  if (!order?.lines?.length) return { shortages: [], allocations: [] };
  const location = opts?.locationId;

  const eligible = onHand
    .filter(v => (!location || v.locationId === location))
    .filter(isReleased)
    .map(v => ({ ...v, freeQty: Math.max(0, v.qty - (v.reservedQty ?? 0)) }))
    .filter(v => v.freeQty > 0)
    .sort((a,b)=>byExpiryFEFO(a.expiryAt??null, b.expiryAt??null));

  const byItem: Record<string, typeof eligible> = {};
  for (const e of eligible) (byItem[e.itemId] ??= []).push(e);

  const allocations: AllocationLine[] = [];
  const shortages: StockShortage[] = [];

  for (const line of order.lines) {
    let remaining = line.qty;
    for (const lot of (byItem[line.itemId] ?? [])) {
      if (remaining <= 0) break;
      const take = Math.min(lot.freeQty, remaining);
      if (take > 0) {
        allocations.push({ itemId: line.itemId, lotNumber: lot.lotNumber, locationId: lot.locationId, qtyPicked: take, expiryAt: lot.expiryAt ?? null });
        lot.freeQty -= take;
        remaining -= take;
      }
    }
    if (remaining > 0) shortages.push({ itemId: line.itemId, qtyRequired: line.qty, qtyAvailable: line.qty - remaining, qtyShort: remaining });
  }

  return { shortages, allocations };
}
