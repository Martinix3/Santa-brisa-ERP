// ============================================================================
// src/server/actions/inventory.actions.ts
// Server Actions de Inventario (findNextLotNumber exportado)
// ============================================================================

'use server';

import { adminDb as db } from '@/server/firebase';
import type { Item } from '@/domain/ssot';

// Si tu SSOT no expone Item, puedes usar este mínimo:
// type Item = { id: string; sku?: string; name?: string; category?: string };

/** Deriva el prefijo del lote a partir del SKU o fallback (itemId), con marca de YYMM. */
function lotPrefixFromSku(sku?: string, fallback?: string) {
  const base = (sku || fallback || 'LOT').trim().toUpperCase();
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${base}-${yy}${mm}-`;
}

/** Carga un item para obtener su SKU si lo necesitas. */
async function loadItem(sku: string): Promise<Item | null> {
  const doc = await db.collection('items').doc(itemId).get();
  return doc.exists ? ({ id: doc.id, ...(doc.data() as any) } as Item) : null;
}

/**
 * Devuelve el próximo número de lote disponible con formato:
 *   <SKU|ITEMID>-YYMM-XX
 * Busca en la colección 'lots' por prefijo y calcula el siguiente correlativo.
 */
export async function findNextLotNumber(sku: string, skuFromCaller?: string): Promise<string> {
  let sku = skuFromCaller;
  if (!sku) {
    const item = await loadItem(itemId);
    sku = item?.sku || itemId;
  }

  const prefix = lotPrefixFromSku(sku, itemId);
  const lotsColl = db.collection('lots');

  // Rango por prefijo (lexicográfico): >= prefix y < prefix + 'z'
  const snap = await lotsColl
    .where('lotNumber', '>=', prefix)
    .where('lotNumber', '<', `${prefix}z`)
    .select('lotNumber')
    .get();

  let maxSeq = 0;
  snap.forEach((doc) => {
    const ln = String(doc.get('lotNumber') || '');
    const tail = ln.slice(prefix.length); // “XX”
    const n = parseInt(tail.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  });

  const next = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${next}`;
}

// (Si necesitas más acciones de inventario, añádelas aquí)

// ---- STUBS TEMPORALES (remover cuando implementes real) ----
export async function updateProductionOrderStatus(..._a:any[]){ return { ok:true }; }
export async function completeProductionOrder(..._a:any[]){ return { ok:true }; }
export async function addIncident(..._a:any[]){ return { ok:true }; }
export async function planProduction(..._a:any[]){ return { ok:true, plan:{} }; }
export async function previewPlanning(..._a:any[]){ return { ok:true, preview:{} }; }
