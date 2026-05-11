/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


export function safeIdPart(s?: string | null) {
  if (!s) return '';
  return String(s).replaceAll("/", "~");
}

// Función canónica: usa sku
export function makeOnHandId(
  sku: string,
  lotNumber: string | undefined | null,
  locationId: string | undefined | null
) {
  return `${sku}|${safeIdPart(lotNumber)}|${safeIdPart(locationId)}`;
}

// Alias temporal para compatibilidad
/** @deprecated usar makeOnHandId(sku, ...) */
export const makeOnHandIdFromItem = makeOnHandId;
