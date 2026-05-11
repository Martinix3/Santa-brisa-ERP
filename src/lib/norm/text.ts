/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

export const normText = (s?: string) =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');

export const normName = (s?: string) =>
  normText(s).replace(/\b(s\.?l\.?|s\.?l\.?u\.?|sl|slu|sa|s\.a\.)\b/g, '').trim();
