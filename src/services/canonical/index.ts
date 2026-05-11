// src/services/canonical/index.ts
// SSOT v2 - Servicios Canónicos

export { OnHandService, OnHandInvariants } from './onhand.service';
export { LotService } from './lot.service';
export { SkuService } from './sku.service';
export { FefoService } from './fefo.service';
export { ReconciliationService } from './reconciliation.service';

export type { QcBucket, OnHand } from './onhand.service';

/**
 * Re-export de tipos canónicos para uso en toda la aplicación
 */
export type ItemId = string;
export type LotCode = string;
export type LocationId = string;

/**
 * Helpers para construcción de IDs canónicos
 */
export const CanonicalIds = {
  onHand: (itemId: ItemId, lotCode: LotCode, locationId: LocationId) => 
    `${itemId}::${lotCode}::${locationId}`,
    
  stockMove: () => {
    // Usar Firestore auto-generated ID para stockMoves
    return undefined; // Firestore genera automáticamente
  },
  
  traceEvent: () => {
    // Usar Firestore auto-generated ID para traceEvents
    return undefined; // Firestore genera automáticamente
  },
  
  goodsReceipt: () => `GR_${Date.now()}`,
  shipment: () => `SH_${Date.now()}`,
  
  supplier: () => `SUP_${Date.now()}`
};

/**
 * Constantes del sistema SSOT v2
 */
export const SSOT_CONFIG = {
  // Versiones de schema
  SCHEMA_VERSIONS: {
    onHand: 1,
    lots: 2,        // v2 incluye lotCode
    items: 1,
    stockMoves: 2,  // v2 usa itemId + lotCode
    traceEvents: 1,
    alertEvents: 1,
    documents: 1,
    locations: 1
  },
  
  // Configuración de planta por defecto
  DEFAULT_PLANT: 'SB',
  
  // Límites del sistema
  LIMITS: {
    MAX_LOTS_PER_DAY: 999,
    MAX_SKU_VARIANTS: 99,
    SKU_MIN_LENGTH: 3,
    SKU_MAX_LENGTH: 32
  }
} as const;
