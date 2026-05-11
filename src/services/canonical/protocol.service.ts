// src/services/canonical/protocol.service.ts
// SSOT V2+ Protocol Service - Production Protocol Run Management
// Greenfield Implementation

import { adminDb as db } from '@/server/firebase';
import type * as admin from 'firebase-admin';
import {
  ProductionProtocol,
  ProductionProtocolRun,
  Invariants,
  assertSchema,
  ProductionProtocolRunSchema,
} from '@/domain/ssot-v2-plus-schemas';
import { AuditService } from './audit.service';

export class ProtocolService {
  /**
   * Start a new protocol run
   * Must be called within a transaction
   */
  static async startRun(
    tx: admin.firestore.Transaction,
    params: {
      protocolId: string;
      orderId?: string;
      startedBy: string;
    }
  ): Promise<string> {
    const pRef = db.doc(`productionProtocols/${params.protocolId}`);
    const pSnap = await tx.get(pRef);
    
    if (!pSnap.exists) {
      throw new Error(`Protocol not found: ${params.protocolId}`);
    }
    
    const protocol = pSnap.data() as ProductionProtocol;
    
    if (protocol.status !== 'ACTIVE') {
      throw new Error(`Cannot start run for ${protocol.status} protocol`);
    }
    
    const runRef = db.collection('productionProtocolRuns').doc();
    const run: ProductionProtocolRun = {
      id: runRef.id,
      orderId: params.orderId,
      protocolId: protocol.id,
      protocolVersion: protocol.version,
      startedAt: new Date(),
      status: 'OPEN',
      checks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1,
    };
    
    // Validate with schema
    assertSchema(ProductionProtocolRunSchema, run, 'ProductionProtocolRun');
    
    tx.set(runRef, run);
    
    // Audit log
    await AuditService.appendInTx(tx, {
      entity: { type: 'protocolRun', id: run.id },
      action: 'CREATE',
      by: params.startedBy,
      diff: { after: run },
    });
    
    return runRef.id;
  }

  /**
   * Submit a check for a protocol step
   * Must be called within a transaction
   */
  static async submitCheck(
    tx: admin.firestore.Transaction,
    params: {
      runId: string;
      stepId: string;
      value?: boolean | number | string;
      unit?: string;
      documentIds?: string[];
      photoIds?: string[];
      signature?: {
        by: string;
        role: string;
        signatureHash?: string;
        comment?: string;
      };
      passed: boolean;
      by: string;
      notes?: string;
      overrideReason?: string;
    }
  ): Promise<void> {
    const rRef = db.doc(`productionProtocolRuns/${params.runId}`);
    const rSnap = await tx.get(rRef);
    
    if (!rSnap.exists) {
      throw new Error(`Protocol run not found: ${params.runId}`);
    }
    
    const run = rSnap.data() as ProductionProtocolRun;
    
    if (run.status !== 'OPEN') {
      throw new Error(`Cannot submit check for ${run.status} protocol run`);
    }
    
    // Check if step already has a check
    const existingCheck = run.checks.find(c => c.stepId === params.stepId);
    if (existingCheck) {
      throw new Error(`Step ${params.stepId} already has a check submitted`);
    }
    
    const newCheck = {
      stepId: params.stepId,
      at: new Date(),
      by: params.by,
      value: params.value,
      unit: params.unit,
      documentIds: params.documentIds,
      photoIds: params.photoIds,
      signature: params.signature ? { 
        ...params.signature, 
        at: new Date() 
      } : undefined,
      passed: params.passed,
      notes: params.notes,
      overrideReason: params.overrideReason,
    };
    
    const newChecks = [...run.checks, newCheck];
    
    tx.update(rRef, { 
      checks: newChecks, 
      updatedAt: new Date() 
    });
    
    // Audit log
    await AuditService.appendInTx(tx, {
      entity: { type: 'protocolRun', id: params.runId },
      action: 'UPDATE',
      by: params.by,
      diff: { 
        before: { checks: run.checks }, 
        after: { checks: newChecks } 
      },
    });
  }

  /**
   * Complete a protocol run
   * Validates all required steps are passed
   * Must be called within a transaction
   */
  static async completeRun(
    tx: admin.firestore.Transaction,
    params: {
      runId: string;
      by: string;
    }
  ): Promise<void> {
    const rRef = db.doc(`productionProtocolRuns/${params.runId}`);
    const rSnap = await tx.get(rRef);
    
    if (!rSnap.exists) {
      throw new Error(`Protocol run not found: ${params.runId}`);
    }
    
    const run = rSnap.data() as ProductionProtocolRun;
    
    if (run.status !== 'OPEN') {
      throw new Error(`Cannot complete ${run.status} protocol run`);
    }
    
    // Get protocol to validate completion
    const pRef = db.doc(`productionProtocols/${run.protocolId}`);
    const pSnap = await tx.get(pRef);
    
    if (!pSnap.exists) {
      throw new Error(`Protocol not found: ${run.protocolId}`);
    }
    
    const protocol = pSnap.data() as ProductionProtocol;
    
    // Validate completion with invariants
    const completedRun: ProductionProtocolRun = {
      ...run,
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    
    const validationError = Invariants.protocolRunComplete(protocol, completedRun);
    if (validationError) {
      throw new Error(`Cannot complete protocol run: ${validationError}`);
    }
    
    // Update run status
    tx.update(rRef, {
      status: 'COMPLETED',
      completedAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Audit log
    await AuditService.appendInTx(tx, {
      entity: { type: 'protocolRun', id: run.id },
      action: 'UPDATE',
      by: params.by,
      diff: {
        before: { status: 'OPEN' },
        after: { status: 'COMPLETED', completedAt: new Date() },
      },
    });
    
    // If protocol has compliance schedule, update it
    if (protocol.frequency && protocol.frequency !== 'ON_DEMAND' && protocol.frequency !== 'PER_BATCH') {
      const scheduleSnap = await db.collection('complianceSchedule')
        .where('protocolId', '==', protocol.id)
        .limit(1)
        .get();
      
      if (!scheduleSnap.empty) {
        const scheduleRef = scheduleSnap.docs[0].ref;
        // Will be handled by ComplianceService.updateAfterRun()
      }
    }
  }

  /**
   * Block a protocol run (e.g., equipment failure, safety issue)
   * Must be called within a transaction
   */
  static async blockRun(
    tx: admin.firestore.Transaction,
    params: {
      runId: string;
      reason: string;
      by: string;
    }
  ): Promise<void> {
    const rRef = db.doc(`productionProtocolRuns/${params.runId}`);
    const rSnap = await tx.get(rRef);
    
    if (!rSnap.exists) {
      throw new Error(`Protocol run not found: ${params.runId}`);
    }
    
    const run = rSnap.data() as ProductionProtocolRun;
    
    if (run.status !== 'OPEN') {
      throw new Error(`Cannot block ${run.status} protocol run`);
    }
    
    tx.update(rRef, {
      status: 'BLOCKED',
      blockReason: params.reason,
      updatedAt: new Date(),
    });
    
    // Audit log
    await AuditService.appendInTx(tx, {
      entity: { type: 'protocolRun', id: run.id },
      action: 'UPDATE',
      by: params.by,
      diff: {
        after: { status: 'BLOCKED', blockReason: params.reason },
      },
    });
  }
}
