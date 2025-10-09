/**
 * Repository Utilities - Helpers para rellenar audit fields automáticamente
 * Usa el contexto de AsyncLocalStorage para obtener el userId actual
 */

import { getUserId } from '@/core/ctx';
import type { AuditBase } from '@/domain/ssot';

/**
 * Retorna timestamp ISO actual
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Genera un ID único basado en timestamp y random
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Añade audit fields para CREATE
 * Rellena: createdAt, updatedAt, createdById, updatedById
 */
export function withCreateAudit<T extends object>(data: T): T & AuditBase {
  const now = nowISO();
  const userId = getUserId();
  
  return {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdById: userId,
    updatedById: userId,
  } as T & AuditBase;
}

/**
 * Añade audit fields para UPDATE
 * Rellena: updatedAt, updatedById
 */
export function withUpdateAudit<T extends object>(patch: T): T & Pick<AuditBase, 'updatedAt' | 'updatedById'> {
  return {
    ...patch,
    updatedAt: nowISO(),
    updatedById: getUserId(),
  } as T & Pick<AuditBase, 'updatedAt' | 'updatedById'>;
}

/**
 * Marca un documento como borrado (soft delete)
 * Rellena: deletedAt, updatedAt, updatedById
 */
export function withDeleteAudit(): Pick<AuditBase, 'deletedAt' | 'updatedAt' | 'updatedById'> {
  const now = nowISO();
  return {
    deletedAt: now,
    updatedAt: now,
    updatedById: getUserId(),
  };
}

/**
 * Helper para generar un lote de IDs únicos
 */
export function generateIds(count: number, prefix?: string): string[] {
  return Array.from({ length: count }, () => generateId(prefix));
}

/**
 * Helper para sanitizar datos de entrada (elimina campos undefined)
 */
export function sanitize<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  return result;
}
