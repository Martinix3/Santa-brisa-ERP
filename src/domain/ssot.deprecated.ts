// ============================================================================
// DEPRECATED FILE - DO NOT USE
// ============================================================================
// 
// Este archivo contiene el modelo SSOT v6 (ANTIGUO) que ha sido DEPRECADO.
// 
// ❌ NO IMPORTAR DESDE ESTE ARCHIVO
// ✅ USAR: import { ... } from '@/domain/ssot.v7'
//
// Este archivo se mantiene SOLO como referencia temporal durante la migración.
// Será eliminado una vez completada la migración a SSOT v7.
//
// Fecha de deprecación: 9/10/2025
// Migración objetivo: SSOT v7 (src/domain/ssot.v7.ts)
// ============================================================================

/**
 * @deprecated Use SSOT v7 types from '@/domain/ssot.v7' instead
 * This file will be removed after migration is complete
 */

// Si necesitas algo de aquí, probablemente existe en SSOT v7 con otro nombre:
//
// SSOT v6 (VIEJO)          →  SSOT v7 (NUEVO)
// ==================          ====================
// Party                    →  [Eliminado - usar Account directamente]
// OrderSellOut             →  Order (con channel: 'DIRECTA' | 'COLOCACION')
// flow: 'DIRECT'           →  channel: 'DIRECTA'
// flow: 'PLACEMENT'        →  channel: 'COLOCACION'
// status: 'open'           →  status: 'ABIERTO'
// status: 'confirmed'      →  status: 'EN_PROCESO'
// status: 'shipped'        →  status: 'SERVIDO'
// status: 'invoiced'       →  status: 'FACTURADO'
// status: 'paid'           →  status: 'PAGADO'
// FinanceLink              →  [Eliminado - usar Order con documentType: 'INVOICE']
// PaymentLink              →  [Eliminado - manejar en Order.status]
// OnHandView               →  OnHand (simplificado en v7)
// SalesUnit                →  string (en v7 es más flexible)
//
// Ver documentación completa en: SSOT_V7_COMPLETE.md

console.warn('⚠️ WARNING: Importing from deprecated SSOT v6. Migrate to @/domain/ssot.v7');

export {};
