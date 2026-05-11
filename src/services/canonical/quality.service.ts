// src/services/canonical/quality.service.ts
// SSOT V2+ Quality Service - Transactional QC Decision Processing
// Greenfield Implementation

import { adminDb as db } from '@/server/firebase';
import type * as admin from 'firebase-admin';
import { 
  Invariants, 
  type Lot, 
  type OnHand, 
  type QualityRelease,
  assertSchema,
  QualityReleaseSchema
} from '@/domain/ssot-v2-plus-schemas';
import { OnHandService } from './onhand.service';
import { AuditService } from './audit.service';

export class QualityService {
  /**
   * Procesa decisión QC con transaccionalidad completa
   * 
   * Mueve buckets, actualiza lote, crea QualityRelease y TraceEvent, y tasks si REJECTED.
   * CRÍTICO: Debe ejecutarse SIEMPRE dentro de una Transaction externa (runTransaction).
   * 
   * @param tx - Firestore transaction
   * @param params - QC decision parameters
   * @returns Object with releaseId and array of created taskIds
   */
  static async processQualityDecisionV2(
    tx: admin.firestore.Transaction,
    params: {
      lotCode: string;
      decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
      results: Array<{ 
        parameterId: string; 
        methodId: string; 
        value: number | string; 
        status: 'OK' | 'FAIL' | 'NA'; 
        unit?: string;
        testedBy?: string;
        testedAt?: Date;
      }>;
      planId?: string;
      reviewedBy: string;
      observations?: string;
      conditions?: string[];
      rejectionReason?: string;
    }
  ): Promise<{ releaseId: string; tasksCreated: string[] }> {
    
    // Buscar lote por lotCode (no asumir que lotCode == document ID)
    const lotQuery = await tx.get(
      db.collection('lots')
        .where('lotCode', '==', params.lotCode)
        .limit(1)
    );
    
    if (lotQuery.empty) {
      throw new Error(`Lot not found: ${params.lotCode}`);
    }
    
    const lotSnap = lotQuery.docs[0];
    const lotRef = lotSnap.ref;
    const lot = lotSnap.data() as Lot;

    // 1. Calcular bucket destino
    const toBucket = params.decision === 'APPROVED' ? 'RELEASED'
                   : params.decision === 'REJECTED' ? 'REJECTED'
                   : 'HOLD';  // CONDITIONAL queda en HOLD con condiciones

    // 2. Verificar si hay stock en HOLD antes de mover
    // Si el lote ya fue procesado, no intentar mover stock
    if (lot.qcStatus !== 'PENDING' && lot.qcStatus !== 'IN_PROGRESS' && lot.qcStatus !== 'HOLD') {
      throw new Error(`Lot ${lot.lotCode} has already been processed (status: ${lot.qcStatus}). Cannot process QC decision again.`);
    }

    // 3. Buscar OnHand (necesario para obtener locationId y validar stock)
    const onHandQuery = await tx.get(
      db.collection('onHand')
        .where('itemId', '==', lot.itemId)
        .where('lotCode', '==', lot.lotCode)
        .limit(1)
    );
    
    if (onHandQuery.empty) {
      throw new Error(
        `OnHand record not found for lot ${lot.lotCode}. ` +
        `Cannot process QC decision without inventory information.`
      );
    }

    // 4. Verificar OnHand HOLD antes de transferir
    if (toBucket !== 'HOLD') {
      const onHand = onHandQuery.docs[0].data() as OnHand;
      const holdQty = onHand.qty.HOLD || 0;
      
      if (holdQty <= 0) {
        throw new Error(
          `Lot ${lot.lotCode} has no stock in HOLD bucket (current: ${holdQty}). ` +
          `This lot may have already been processed. Current OnHand state: ` +
          `HOLD=${onHand.qty.HOLD}, RELEASED=${onHand.qty.RELEASED}, REJECTED=${onHand.qty.REJECTED}`
        );
      }
      
      if (holdQty < lot.quantity) {
        throw new Error(
          `Insufficient stock in HOLD bucket for lot ${lot.lotCode}. ` +
          `Required: ${lot.quantity}, Available: ${holdQty}`
        );
      }
    }

    // === FIN DE TODAS LAS LECTURAS - INICIO DE ESCRITURAS ===

    // 5. Mover HOLD → destino solo si no es CONDITIONAL (que ya está en HOLD)
    if (toBucket !== 'HOLD') {
      // Obtener OnHand ya leído (evita lecturas adicionales en la transacción)
      const onHandForTransfer = onHandQuery.docs[0].data() as OnHand;
      
      await OnHandService.transferBetweenBuckets(tx, {
        itemId: lot.itemId,
        lotCode: lot.lotCode,
        locationId: onHandForTransfer.locationId,
        fromBucket: 'HOLD',
        toBucket,
        qty: lot.quantity,
        userId: params.reviewedBy,
        currentOnHand: onHandForTransfer  // Pasar OnHand pre-leído
      });
    }

    // 6. Actualizar lote
    const lotUpdates: Partial<Lot> = {
      qcStatus: params.decision === 'APPROVED' ? 'PASSED' 
              : params.decision === 'REJECTED' ? 'FAILED' 
              : 'CONDITIONAL',
      updatedAt: new Date(),
      updatedBy: params.reviewedBy
    };
    
    if (params.decision === 'APPROVED') {
      lotUpdates.qcApprovedBy = params.reviewedBy;
      lotUpdates.qcApprovedAt = new Date();
    } else if (params.decision === 'REJECTED') {
      lotUpdates.qcRejectedBy = params.reviewedBy;
      lotUpdates.qcRejectedAt = new Date();
      lotUpdates.qcRejectionReason = params.rejectionReason;
    }
    
    if (params.conditions) {
      lotUpdates.qcConditions = params.conditions;
    }
    
    tx.update(lotRef, lotUpdates);

    // 7. Crear QualityRelease
    const releaseRef = db.collection('qualityReleases').doc();
    const release: Omit<QualityRelease, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date } = {
      id: releaseRef.id,
      lotCode: lot.lotCode,
      itemId: lot.itemId,
      planId: params.planId,
      results: params.results.map(r => ({
        ...r,
        testedAt: r.testedAt || new Date()
      })),
      decision: params.decision,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date(),
      observations: params.observations,
      conditions: params.conditions,
      rejectionReason: params.rejectionReason,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1
    };
    
    // Validar con schema
    assertSchema(QualityReleaseSchema, release, 'QualityRelease');
    
    tx.set(releaseRef, release);

    // 8. TraceEvent de dominio
    const teRef = db.collection('traceEvents').doc();
    tx.set(teRef, {
      id: teRef.id,
      kind: params.decision === 'APPROVED' ? 'QC_RELEASED' : 'QC_FAILED',
      occurredAt: new Date(),
      createdAt: new Date(),
      itemId: lot.itemId,
      lotCode: lot.lotCode,
      qty: lot.quantity,
      userId: params.reviewedBy,
      data: { 
        planId: params.planId, 
        resultsCount: params.results.length,
        decision: params.decision
      },
      schemaVersion: 1
    });

    // 9. Task si REJECTED
    const tasksCreated: string[] = [];
    
    if (params.decision === 'REJECTED') {
      const taskRef = db.collection('tasks').doc();
      tx.set(taskRef, {
        id: taskRef.id,
        kind: 'FOLLOWUP',
        title: `Follow-up rechazo · ${lot.lotCode}`,
        description: params.rejectionReason || 'Lote rechazado en QC',
        linkedEntity: { type: 'lot', id: lot.lotCode },
        dueAt: new Date(Date.now() + 24 * 3600 * 1000), // +24h
        priority: 'HIGH',
        assignedToRole: 'QUALITY',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: params.reviewedBy,
        schemaVersion: 1
      });
      tasksCreated.push(taskRef.id);
    }

    // 10. Audit log (dentro de TX)
    await AuditService.appendInTx(tx, {
      entity: { type: 'qualityRelease', id: releaseRef.id },
      action: 'CREATE',
      by: params.reviewedBy,
      diff: { 
        after: {
          decision: params.decision,
          lotCode: lot.lotCode,
          reviewedBy: params.reviewedBy
        }
      }
    });

    return { releaseId: releaseRef.id, tasksCreated };
  }
}
