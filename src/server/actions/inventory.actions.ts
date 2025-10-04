// ============================================================================
// src/server/actions/inventory.actions.ts
// Server Actions de Inventario — versión mínima y limpia (sin código huérfano)
// Exporta findNextLotNumber y stubs temporales compatibles con los consumidores.
// ============================================================================

'use server';

import { adminDb as db } from '@/server/firebase';

// Deriva el prefijo del lote a partir del SKU o fallback (itemId), con YYMM.
function lotPrefixFromSku(sku?: string, fallback?: string) {
  const base = (sku || fallback || 'LOT').trim().toUpperCase();
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${base}-${yy}${mm}-`;
}

// Carga un item para obtener su SKU si lo necesitas (opcional).
async function loadItem(itemId: string): Promise<{ id: string; sku?: string } | null> {
  const doc = await db.collection('items').doc(itemId).get();
  return doc.exists ? ({ id: doc.id, ...(doc.data() as any) }) : null;
}

/** Devuelve el próximo número de lote: <SKU|ITEMID>-YYMM-XX */
export async function findNextLotNumber(
  itemId: string,
  skuFromCaller?: string
): Promise<string> {
  let sku = skuFromCaller;
  if (!sku) {
    const item = await loadItem(itemId);
    sku = item?.sku || itemId;
  }

  const prefix = lotPrefixFromSku(sku, itemId);
  const snap = await db.collection('lots')
    .where('lotNumber', '>=', prefix)
    .where('lotNumber', '<', `${prefix}z`)
    .select('lotNumber')
    .get();

  let maxSeq = 0;
  snap.forEach((doc) => {
    const ln = String(doc.get('lotNumber') || '');
    const tail = ln.slice(prefix.length);
    const n = parseInt(tail.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  });

  const next = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${next}`;
}

// ----------------------- STUBS TEMPORALES -----------------------
type ActionOk<T=unknown> = { ok: true; data?: T; message?: string };
type ActionErr = { ok: false; message: string };
export type ActionResult<T=unknown> = ActionOk<T> | ActionErr;

export async function rebuildOnHand(..._args: any[]): Promise<ActionResult> {
  return { ok: true, message: 'stub' };
}

export async function createManualOnHand(..._args: any[]): Promise<ActionResult<{ stockMoveId: string; lotNumber: string }>> {
  return { ok: true, data: { stockMoveId: 'stub', lotNumber: 'STUB-00' } };
}

export async function performDataQualityCheck(..._args: any[]): Promise<ActionResult<{ issues: any[] }>> {
  return { ok: true, data: { issues: [] } };
}
