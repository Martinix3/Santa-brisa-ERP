/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/config/locations.ts
/**
 * Canonical location IDs for SSOT v2
 * DO NOT use hardcoded strings like 'MAIN' - use these constants
 */
export const CANONICAL_LOCATIONS = {
  /** Main warehouse location (canonical name in Spanish) */
  ALMACEN_PRINCIPAL: 'ALMACEN_PRINCIPAL',
  /** Virtual location for manual adjustments */
  VIRTUAL_MANUAL: 'VIRTUAL_MANUAL',
  /** Virtual location for production input */
  VIRTUAL_PRODUCTION: 'VIRTUAL_PRODUCTION',
} as const;

export type CanonicalLocationId = typeof CANONICAL_LOCATIONS[keyof typeof CANONICAL_LOCATIONS];

/** Default location for warehouse operations */
export const DEFAULT_LOCATION = CANONICAL_LOCATIONS.ALMACEN_PRINCIPAL;

/** List of all valid physical locations */
export const DEFAULT_WAREHOUSE_LOCATIONS = [
  CANONICAL_LOCATIONS.ALMACEN_PRINCIPAL,
];
