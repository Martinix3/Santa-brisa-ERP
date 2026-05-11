// src/services/canonical/audit.service.ts
// SSOT V2+ Audit Service - Immutable Hash Chain for Audit Trail
// Greenfield Implementation

import { adminDb as db } from '@/server/firebase';
import type * as admin from 'firebase-admin';
import { AuditLog, assertSchema, AuditLogSchema } from '@/domain/ssot-v2-plus-schemas';
import crypto from 'crypto';

export class AuditService {
  /**
   * Append audit log entry with hash chain validation
   * Standalone version (not in transaction)
   */
  static async append(
    entry: Omit<AuditLog, 'id' | 'schemaVersion' | 'hash' | 'at' | 'prevHash'>
  ): Promise<string> {
    const ref = db.collection('auditLogs').doc();
    
    // Get previous hash for this entity
    const prevSnap = await db.collection('auditLogs')
      .where('entity.id', '==', entry.entity.id)
      .orderBy('at', 'desc')
      .limit(1)
      .get();
    
    const prevHash = prevSnap.empty 
      ? undefined 
      : (prevSnap.docs[0].data() as AuditLog).hash;
    
    const withAt = { ...entry, at: new Date(), prevHash };
    const hash = AuditService.computeHash(withAt);
    
    const log: AuditLog = {
      ...withAt,
      id: ref.id,
      hash,
      schemaVersion: 1,
    };
    
    // Validate with schema
    assertSchema(AuditLogSchema, log, 'AuditLog');
    
    await ref.set(log);
    return ref.id;
  }

  /**
   * Append audit log within existing Firestore transaction
   * 
   * NOTE: Cannot query with orderBy inside transaction without index.
   * If you need prevHash, pass it from caller or use standalone append().
   */
  static async appendInTx(
    tx: admin.firestore.Transaction,
    entry: Omit<AuditLog, 'id' | 'schemaVersion' | 'hash' | 'at' | 'prevHash'>,
    prevHash?: string
  ): Promise<void> {
    const ref = db.collection('auditLogs').doc();
    
    const withAt = { 
      ...entry, 
      at: new Date(),
      prevHash 
    };
    
    const hash = AuditService.computeHash(withAt);
    
    const log: AuditLog = {
      ...withAt,
      id: ref.id,
      hash,
      schemaVersion: 1,
    };
    
    // Validate with schema
    assertSchema(AuditLogSchema, log, 'AuditLog');
    
    tx.set(ref, log);
  }

  /**
   * Compute SHA-256 hash for audit log entry
   */
  static computeHash(payload: Record<string, any>): string {
    const serialized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Verify hash chain integrity for an entity
   */
  static async verifyHashChain(entityType: string, entityId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const logs = await db.collection('auditLogs')
      .where('entity.type', '==', entityType)
      .where('entity.id', '==', entityId)
      .orderBy('at', 'asc')
      .get();
    
    const errors: string[] = [];
    let prevHash: string | undefined;
    
    for (const doc of logs.docs) {
      const log = doc.data() as AuditLog;
      
      // Verify prevHash matches
      if (log.prevHash !== prevHash) {
        errors.push(`Hash chain broken at ${log.id}: expected prevHash ${prevHash}, got ${log.prevHash}`);
      }
      
      // Verify computed hash matches stored hash
      const { hash, ...rest } = log;
      const computedHash = AuditService.computeHash(rest);
      if (computedHash !== log.hash) {
        errors.push(`Hash mismatch at ${log.id}: expected ${log.hash}, computed ${computedHash}`);
      }
      
      prevHash = log.hash;
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
