/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/domain/qc-status.ts
/**
 * QC Status utilities - Centraliza lógica de estados de control de calidad
 * Siguiendo convenciones SSOT
 */

import type { QcStatus } from './ssot';

/**
 * Estados que indican que el producto está liberado para uso
 */
const RELEASED_STATUSES: readonly QcStatus[] = ['PASSED', 'WAIVED'] as const;

/**
 * Estados que indican que el producto está en cuarentena
 */
const HOLD_STATUSES: readonly QcStatus[] = ['PENDING', 'HOLD'] as const;

/**
 * Estados que indican que el producto fue rechazado
 */
const FAILED_STATUSES: readonly QcStatus[] = ['FAILED'] as const;

/**
 * Estados que requieren acción/revisión
 */
const ACTIONABLE_STATUSES: readonly QcStatus[] = ['PENDING', 'IN_PROGRESS', 'CONDITIONAL'] as const;

/**
 * Verifica si el estado QC indica que el producto está liberado
 */
export function isQcReleased(status?: QcStatus | string | null): boolean {
  if (!status) return false;
  const normalized = String(status).toUpperCase() as QcStatus;
  return RELEASED_STATUSES.includes(normalized);
}

/**
 * Verifica si el estado QC indica que el producto está en cuarentena
 */
export function isQcHold(status?: QcStatus | string | null): boolean {
  if (!status) return false;
  const normalized = String(status).toUpperCase() as QcStatus;
  return HOLD_STATUSES.includes(normalized);
}

/**
 * Verifica si el estado QC indica que el producto fue rechazado
 */
export function isQcFailed(status?: QcStatus | string | null): boolean {
  if (!status) return false;
  const normalized = String(status).toUpperCase() as QcStatus;
  return FAILED_STATUSES.includes(normalized);
}

/**
 * Verifica si el estado QC requiere acción o revisión
 */
export function isQcActionable(status?: QcStatus | string | null): boolean {
  if (!status) return false;
  const normalized = String(status).toUpperCase() as QcStatus;
  return ACTIONABLE_STATUSES.includes(normalized);
}

/**
 * Obtiene el label traducido para un estado QC
 */
export function getQcStatusLabel(status: QcStatus): string {
  const labels: Record<QcStatus, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En proceso',
    PASSED: 'Liberado',
    FAILED: 'Rechazado',
    HOLD: 'Retenido',
    CONDITIONAL: 'Condicional',
    WAIVED: 'Exonerado',
  };
  return labels[status] ?? status;
}

/**
 * Obtiene las clases CSS para el badge de estado QC
 */
export function getQcStatusBadgeClass(status: QcStatus): string {
  const base = 'px-2 py-1 text-xs font-semibold rounded-full';
  const variants: Record<QcStatus, string> = {
    PENDING: `${base} bg-yellow-100 text-yellow-800`,
    IN_PROGRESS: `${base} bg-blue-100 text-blue-800`,
    PASSED: `${base} bg-green-100 text-green-800`,
    FAILED: `${base} bg-red-100 text-red-800`,
    HOLD: `${base} bg-orange-100 text-orange-800`,
    CONDITIONAL: `${base} bg-purple-100 text-purple-800`,
    WAIVED: `${base} bg-gray-100 text-gray-800`,
  };
  return variants[status] ?? `${base} bg-zinc-100 text-zinc-800`;
}

/**
 * Determina el estado QC heredado de múltiples estados padre
 * @param parentStatuses Estados QC de los componentes/lotes padre
 * @param forceReQc Si true, fuerza re-inspección
 */
export function inheritQcStatus(
  parentStatuses: (QcStatus | undefined)[],
  forceReQc?: boolean
): QcStatus {
  if (forceReQc) return 'PENDING';
  
  const validStatuses = parentStatuses.filter((s): s is QcStatus => s !== undefined);
  if (validStatuses.length === 0) return 'PENDING';
  
  // Si todos están liberados, heredar liberado
  const allReleased = validStatuses.every(isQcReleased);
  if (allReleased) return 'PASSED';
  
  // Si alguno está rechazado, requiere inspección
  const anyFailed = validStatuses.some(isQcFailed);
  if (anyFailed) return 'PENDING';
  
  // Si alguno está en hold, heredar hold
  const anyHold = validStatuses.some(isQcHold);
  if (anyHold) return 'HOLD';
  
  // Por defecto, requiere inspección
  return 'PENDING';
}

/**
 * Determina el estado QC inicial para un nuevo lote según categoría
 * @param category Categoría del item
 * @param sendToQc Flag explícito para enviar a QC
 */
export function getInitialQcStatus(
  category?: string,
  sendToQc?: boolean
): QcStatus {
  if (sendToQc) return 'PENDING';
  
  // Categorías críticas que siempre requieren QC
  const criticalCategories = ['raw', 'pack', 'fg', 'intermediate'];
  
  if (category && criticalCategories.includes(category)) {
    return 'PENDING';
  }
  
  // Categorías no críticas se liberan automáticamente
  return 'PASSED';
}
