/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/utils/firestore.ts
// Helper utilities to serialize Firestore data into plain JSON-safe objects.

export function toIso(value: unknown, fallback?: string): string | undefined {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') {
      try {
        return candidate.toDate().toISOString();
      } catch {
        return fallback;
      }
    }
  }
  return fallback;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (value && typeof value === 'object') {
    const candidate = value as { toNumber?: () => number };
    if (typeof candidate.toNumber === 'function') {
      try {
        return candidate.toNumber();
      } catch {
        return fallback;
      }
    }
    // Some Timestamp objects might leak here; treat as fallback
  }
  return fallback;
}

export function normalizeLotNumbers(input: unknown): Record<string, any> | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const entries = Object.entries(input as Record<string, any>).map(([lotCode, payload]) => {
    if (!payload || typeof payload !== 'object') return [lotCode, payload];

    const normalised: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'qty' || key === 'reserved' || key === 'reservedQty') {
        normalised[key] = toNumber(value);
      } else if (
        key.toLowerCase().includes('at') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('time')
      ) {
        normalised[key] = toIso(value) ?? null;
      } else {
        normalised[key] = value;
      }
    }
    return [lotCode, normalised];
  });

  return Object.fromEntries(entries);
}
