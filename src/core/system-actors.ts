/**
 * System Actors - IDs estandarizados para actores no humanos
 * Usa estos en webhooks, workers, cron jobs, etc.
 */

export const SYSTEM = {
  /** Webhook de Holded */
  HOLDED: 'SYSTEM_HOLDED',
  
  /** Webhook de Shopify */
  SHOPIFY: 'SYSTEM_SHOPIFY',
  
  /** Webhook de Sendcloud */
  SENDCLOUD: 'SYSTEM_SENDCLOUD',
  
  /** Background workers generales */
  WORKER: 'SYSTEM_WORKER',
  
  /** Cron jobs / tareas programadas */
  CRON: 'SYSTEM_CRON',
  
  /** Migraciones de datos */
  MIGRATION: 'SYSTEM_MIGRATION',
  
  /** Import manual desde CSV/Excel */
  IMPORT: 'SYSTEM_IMPORT',
  
  /** Santa Brain AI */
  AI: 'SYSTEM_AI',
  
  /** Desconocido/fallback */
  UNKNOWN: 'SYSTEM_UNKNOWN',
} as const;

export type SystemActor = typeof SYSTEM[keyof typeof SYSTEM];

/**
 * Helper para verificar si un userId es un actor del sistema
 */
export function isSystemActor(userId: string): boolean {
  return userId.startsWith('SYSTEM_');
}

/**
 * Helper para obtener el nombre legible de un actor del sistema
 */
export function getActorDisplayName(userId: string): string {
  if (!isSystemActor(userId)) return userId;
  
  const mapping: Record<string, string> = {
    [SYSTEM.HOLDED]: 'Holded Integration',
    [SYSTEM.SHOPIFY]: 'Shopify Integration',
    [SYSTEM.SENDCLOUD]: 'Sendcloud Integration',
    [SYSTEM.WORKER]: 'Background Worker',
    [SYSTEM.CRON]: 'Scheduled Task',
    [SYSTEM.MIGRATION]: 'Data Migration',
    [SYSTEM.IMPORT]: 'Data Import',
    [SYSTEM.AI]: 'Santa Brain AI',
    [SYSTEM.UNKNOWN]: 'System (Unknown)',
  };
  
  return mapping[userId] || 'System';
}
