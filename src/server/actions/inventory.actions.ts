'use server';
/**
 * Server actions for Warehouse → Inventory
 * NOTE:
 *  - Keep UI/client logic in page components.
 *  - Keep data fetching/mutations here (server-only).
 */

import { adminDb as db } from '@/server/firebase';
import type { StockMove } from '@/domain/ssot';

/**
 * Rebuilds the derived "onHand" view (rollup by SKU/lot) from source-of-truth collections.
 * This is a safe NOOP placeholder that compiles; wire DB when ready.
 */
export async function rebuildOnHand(): Promise<{ ok: true; count?: number; message?: string }> {
  // In a real implementation, you would read from stockMoves and recalculate onHand totals.
  // For now, this is a placeholder.
  console.log("[Action] rebuildOnHand invoked.");
  return { ok: true, count: 0, message: 'Rebuild logic not yet implemented.' };
}

/**
 * Upsert a single OnHand record (e.g., manual correction or initial seed).
 * Provide at least sku, lotNumber and qty.
 */
export async function upsertOnHand(input: {
  sku: string;
  lotNumber: string;
  qty: number;
  locationId?: string;
  qcStatus?: string;
  notes?: string;
}): Promise<{ ok: true; id?: string; note?: string }> {
  // TODO: implement:
  // const id = `${input.sku}__${input.lotNumber}__${input.locationId ?? 'MAIN'}`;
  // await db.collection('onHand').doc(id).set({...}, { merge: true });
  return { ok: true, note: 'stub upsertOnHand executed (no DB writes in this placeholder)' };
}

/**
 * Record a stock move (inbound/outbound/transfer). When wired, this should:
 *  - Append a StockMove
 *  - Update onHand deltas (atomic/batch)
 */
export async function recordStockMove(move: Pick<StockMove,
  'id' | 'kind' | 'sku' | 'lotNumber' | 'qty' | 'uom' | 'fromLocation' | 'toLocation' | 'reason'
>) {
  // TODO: implement
  return { ok: true, note: 'stub recordStockMove executed' };
}

/**
 * Creates a new manual stock adjustment.
 */
export async function createManualOnHand(payload: any) {
  // Placeholder implementation
  console.log('[Action] createManualOnHand received payload:', payload);
  return { ok: true, data: { stockMoveId: `stub_${Date.now()}`, lotNumber: payload.lotNumber || 'STUB-LOT' } };
}
