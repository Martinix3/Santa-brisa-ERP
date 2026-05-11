/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


// src/lib/result.ts
export type FieldErrors = Record<string, string>; // ej: { "name":"Requerido", "items[0].qty":">0" }

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code?: string; message: string; fieldErrors?: FieldErrors; retryable?: boolean };

export function ok<T>(data: T): ActionResult<T> { return { ok: true, data }; }
export function fail<T = unknown>(message: string, more?: Partial<Omit<ActionResult<T>, "ok">>): ActionResult<T> {
  return { ok: false, message, ...more } as ActionResult<T>;
}
