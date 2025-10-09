/**
 * Audit Logger - Helper para registrar cambios en auditLogs
 * Registra quién hizo qué cambio y cuándo de forma consistente
 */

import { getFirebaseSync } from '@/lib/firebaseClient';
import { collection, doc, setDoc } from 'firebase/firestore';
import { getUserId, getContext } from '@/core/ctx';
import type { AuditLog } from '@/domain/ssot';
import { generateId, nowISO } from './repos/_utils';

type AuditParams = {
  action: AuditLog['action'];
  entity: AuditLog['entity'];
  entityId: string;
  diff?: any;
};

/**
 * Registra un cambio en auditLogs
 * Usa el contexto actual para obtener el actor automáticamente
 */
export async function audit(params: AuditParams): Promise<string> {
  try {
    const { firestoreDb } = getFirebaseSync();
    if (!firestoreDb) {
      console.warn('[audit] Firestore no disponible, skip audit log');
      return '';
    }

    const ctx = getContext();
    const log: AuditLog = {
      id: generateId('audit'),
      actorId: getUserId(),
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      diff: params.diff,
      createdAt: nowISO(),
    };

    // Incluir metadata del contexto si existe
    if (ctx?.source) {
      log.diff = {
        ...log.diff,
        _source: ctx.source,
        _meta: ctx.meta,
      };
    }

    const ref = doc(collection(firestoreDb, 'auditLogs'), log.id);
    await setDoc(ref, log);

    return log.id;
  } catch (error) {
    // No fallar si audit falla, solo log
    console.error('[audit] Error registrando audit log:', error);
    return '';
  }
}

/**
 * Registra creación de entidad
 */
export async function auditCreate(entity: string, entityId: string, data: any): Promise<void> {
  await audit({
    action: 'CREATE',
    entity,
    entityId,
    diff: { after: data },
  });
}

/**
 * Registra actualización de entidad
 */
export async function auditUpdate(
  entity: string,
  entityId: string,
  before: any,
  after: any
): Promise<void> {
  await audit({
    action: 'UPDATE',
    entity,
    entityId,
    diff: { before, after },
  });
}

/**
 * Registra eliminación de entidad
 */
export async function auditDelete(entity: string, entityId: string, data: any): Promise<void> {
  await audit({
    action: 'DELETE',
    entity,
    entityId,
    diff: { before: data },
  });
}

/**
 * Registra importación/sync desde sistema externo
 */
export async function auditSync(
  entity: string,
  entityId: string,
  externalSystem: string,
  data: any
): Promise<void> {
  await audit({
    action: 'SYNC',
    entity,
    entityId,
    diff: {
      externalSystem,
      data,
    },
  });
}

/**
 * Registra exportación de datos
 */
export async function auditExport(entity: string, metadata: any): Promise<void> {
  await audit({
    action: 'EXPORT',
    entity,
    entityId: 'bulk',
    diff: metadata,
  });
}

/**
 * Registra importación masiva
 */
export async function auditImport(entity: string, metadata: any): Promise<void> {
  await audit({
    action: 'IMPORT',
    entity,
    entityId: 'bulk',
    diff: metadata,
  });
}
