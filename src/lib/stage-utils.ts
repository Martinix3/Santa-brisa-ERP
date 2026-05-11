/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/lib/stage-utils.ts
// Shared helpers to normalize account stages across the app (SSOT + Pipeline)

import type { Stage } from '@/domain/ssot';

function clean(input?: string): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .trim()
    .toUpperCase();
}

// Map arbitrary labels to SSOT Stage
export function normalizeStageToSSOT(x?: string): Stage {
  const s = clean(x);

  // Exact SSOT values first
  if (s === 'POTENCIAL' || s === 'SEGUIMIENTO' || s === 'ACTIVA' || s === 'FALLIDA' || s === 'CERRADA' || s === 'BAJA') {
    return s as Stage;
  }

  // Common synonyms → ACTIVA
  if (['ACTIVE', 'ACTIVO', 'CLOSED WON', 'CLOSED_WON', 'WON', 'NEGOTIATION', 'NEGOCIACION', 'PROPOSAL'].includes(s)) {
    return 'ACTIVA';
  }

  // Common synonyms → SEGUIMIENTO
  if (['QUALIFYING', 'FOLLOWUP', 'SEGUIMIENTO'].includes(s)) {
    return 'SEGUIMIENTO';
  }

  // Common synonyms → FALLIDA
  if (['CLOSED LOST', 'CLOSED_LOST', 'LOST', 'PERDIDO', 'PERDIDA'].includes(s)) {
    return 'FALLIDA';
  }

  // Common synonyms → POTENCIAL
  if (['CONTACTED', 'PROSPECT', 'PROSPECTO', 'NEW', 'NUEVO'].includes(s)) {
    return 'POTENCIAL';
  }

  // By convention, map anything unknown to POTENCIAL so items show in pipeline
  return 'POTENCIAL';
}

// Map arbitrary labels to the 4 pipeline columns
export function normalizeStageToPipeline(x?: string): Extract<Stage, 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA'> {
  const ssot = normalizeStageToSSOT(x);
  if (ssot === 'CERRADA' || ssot === 'BAJA') return 'FALLIDA';
  return ssot as Extract<Stage, 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA'>;
}

