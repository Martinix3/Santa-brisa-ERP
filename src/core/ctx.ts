/**
 * Request Context - AsyncLocalStorage para atribución de cambios
 * Permite rastrear quién (usuario o sistema) hace cada cambio sin pasar userId por parámetros
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  userId: string;
  roles?: string[];
  email?: string;
  source?: 'api' | 'webhook' | 'worker' | 'cron' | 'migration';
  meta?: Record<string, any>;
};

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Ejecuta una función dentro de un contexto de usuario
 * Esto establece el "actor" para todas las operaciones dentro de esta llamada
 */
export function withUser<T>(ctx: RequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(ctx, fn);
}

/**
 * Obtiene el contexto actual (puede ser undefined si no estamos en withUser)
 */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Obtiene el userId actual, retorna SYSTEM_UNKNOWN si no hay contexto
 */
export function getUserId(): string {
  return storage.getStore()?.userId ?? 'SYSTEM_UNKNOWN';
}

/**
 * Obtiene el email del usuario actual (si existe)
 */
export function getUserEmail(): string | undefined {
  return storage.getStore()?.email;
}

/**
 * Verifica si el usuario actual tiene un rol específico
 */
export function hasRole(role: string): boolean {
  const ctx = storage.getStore();
  return ctx?.roles?.includes(role) ?? false;
}
