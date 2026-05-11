/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/holded/utils.ts

/**
 * Convierte epoch de Holded (segundos o milisegundos) a ISO UTC
 * Holded suele dar segundos (e.g. 1760479200)
 * Si alguna vez viniera en ms, esto también lo cubre
 */
export function holdedEpochToIsoUTC(v: number | null | undefined): string | null {
  if (v == null) return null;
  // Si es menor a 3 billones, asumimos que son segundos
  const ms = v < 3_000_000_000 ? v * 1000 : v;
  return new Date(ms).toISOString();
}

/**
 * Normaliza fecha a Europe/Madrid con keys derivadas
 */
export function normalizeDate(isoUTC: string, forMadrid: boolean = true) {
  const d = new Date(isoUTC);
  
  if (!forMadrid) {
    return {
      utc: isoUTC,
      dayKey: isoUTC.split('T')[0],
      monthKey: isoUTC.substring(0, 7),
      yearKey: isoUTC.substring(0, 4),
    };
  }

  // Para Europe/Madrid (UTC+1 o UTC+2 según DST)
  const madridStr = d.toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' });
  const [datePart] = madridStr.split(' ');
  
  return {
    utc: isoUTC,
    dayKey: datePart,
    monthKey: datePart.substring(0, 7),
    yearKey: datePart.substring(0, 4),
    localMadrid: madridStr,
  };
}
