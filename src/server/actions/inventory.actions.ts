
// ============================================================================
// src/server/actions/inventory.actions.ts
// Server Actions de Inventario unificadas y limpias.
// Exporta la lógica real y todos los stubs necesarios para la aplicación.
// ============================================================================

'use server';

import { adminDb as db } from '@/server/firebase';

// --- Tipos de Resultado Estándar para Server Actions ---
type ActionOk<T = unknown> = { ok: true; data?: T; message?: string };
type ActionErr = { ok: false; message: string };
export type ActionResult<T = unknown> = ActionOk<T> | ActionErr;


// --- Lógica Principal de Inventario ---

/**
 * Deriva el prefijo del lote a partir del SKU o fallback (itemId), con formato YYMM.
 * @param sku - El SKU del producto.
 * @param fallback - Un valor a usar si el SKU no está disponible (generalmente el itemId).
 * @returns El prefijo del lote, ej: "SKU123-2510-".
 */
function lotPrefixFromSku(sku?: string, fallback?: string): string {
  const base = (sku || fallback || 'LOT').trim().toUpperCase();
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${base}-${yy}${mm}-`;
}

/**
 * Carga un item de la base de datos para obtener su SKU.
 * @param itemId - El ID del documento del item.
 * @returns Un objeto con el id y el sku del item, o null si no se encuentra.
 */
async function loadItem(itemId: string): Promise<{ id: string; sku?: string } | null> {
  const doc = await db.collection('items').doc(itemId).get();
  return doc.exists ? ({ id: doc.id, ...(doc.data() as any) }) : null;
}

/**
 * Busca en la colección 'lots' y calcula el siguiente número de lote correlativo
 * para un item específico, basado en el formato <SKU|ITEMID>-YYMM-XX.
 * @param itemId - El ID del item para el que se genera el lote.
 * @param skuFromCaller - El SKU del item (opcional, si ya se conoce).
 * @returns El próximo número de lote disponible como string.
 */
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
    const lotNumber = String(doc.get('lotNumber') || '');
    const sequencePart = lotNumber.slice(prefix.length);
    const numericSequence = parseInt(sequencePart.replace(/\D/g, ''), 10);
    if (!Number.isNaN(numericSequence) && numericSequence > maxSeq) {
      maxSeq = numericSequence;
    }
  });

  const nextSequence = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${nextSequence}`;
}


// ----------------------- STUBS TEMPORALES -----------------------
// Funciones temporales para evitar errores en partes no implementadas de la UI.

// Stubs de Inventario y Calidad de Datos
export async function rebuildOnHand(..._args: any[]): Promise<ActionResult<{ count: number }>> {
  console.log("STUB: rebuildOnHand invocado");
  await new Promise(res => setTimeout(res, 1000)); // Simula latencia
  return { ok: true, data: { count: 125 } };
}

export async function createManualOnHand(..._args: any[]): Promise<ActionResult<{ stockMoveId: string; lotNumber: string }>> {
  return { ok: true, data: { stockMoveId: 'stub-move-id', lotNumber: 'STUB-LOT-01' } };
}

export async function performDataQualityCheck(..._args: any[]): Promise<ActionResult<{ issues: any[] }>> {
  return { ok: true, data: { issues: [] } };
}

// Stubs de Producción
export async function updateProductionOrderStatus(..._args: any[]): Promise<ActionResult> {
  return { ok: true, message: 'stub' };
}

export async function completeProductionOrder(..._args: any[]): Promise<ActionResult> {
  return { ok: true, message: 'stub' };
}

export async function addIncident(..._args: any[]): Promise<ActionResult> {
  return { ok: true, message: 'stub' };
}

export async function planProduction(..._args: any[]): Promise<ActionResult<{ plan: {} }>> {
  return { ok: true, data: { plan: {} } };
}

export async function previewPlanning(..._args: any[]): Promise<ActionResult<{ preview: {} }>> {
  return { ok: true, data: { preview: {} } };
}
