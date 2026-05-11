/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/lib/dates.ts
export function normalizeTs(input: any, fallback: Date = new Date()): Date {
  try {
    if (!input) return fallback;
    if (typeof input?.toDate === 'function') return input.toDate(); // Firestore Timestamp
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    if (typeof input === 'string') return new Date(input);
    return fallback;
  } catch {
    return fallback;
  }
}
