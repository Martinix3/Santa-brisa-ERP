// src/lib/result.ts
export type FieldErrors = Record<string, string>; // ej: { "name":"Requerido", "items[0].qty":">0" }

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code?: string; message: string; fieldErrors?: FieldErrors; retryable?: boolean };

export function ok<T>(data: T): ActionResult<T> { return { ok: true, data }; }
export function fail(message: string, more?: Partial<Omit<ActionResult, "ok">>): ActionResult {
  return { ok: false, message, ...more };
}
