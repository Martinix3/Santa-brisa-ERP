// FILE: src/server/actions/quality.actions.ts
// Quality Control Server Actions - Core Functions
// FASE 20 - Quality Module Implementation

"use server";

import { revalidatePath } from "next/cache";
import { adminDb as db } from "@/server/firebase";
import type {
  Lot,
  QcStatus,
  QualityRelease,
  QcTest,
  TraceEvent,
  OnHandView,
  ISODateString,
} from "@/domain/ssot";
import {
  validateQualityRelease,
  QcTestSchema,
} from "@/domain/ssot";
import type {
  QualityReleaseFormData,
  QualityActionResult,
  LotReleaseTableRow,
  LotReleaseFilters,
  QualityReleaseTableRow,
  QualityReleaseFilters,
} from "@/types/quality";
import {
  createRejectionFollowupTask,
  createGeminiAlert,
  queueRejectionEmail,
  queueApprovalEmail,
  checkStockAlertsAfterApproval,
} from "@/server/actions/quality-helpers";

// ✅ FASE 1: Importar TraceEventFactory
import { TraceEventFactory } from '@/lib/trace/TraceEventFactory';

// Simple ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// CORE ACTIONS
// ============================================================================

/**
 * Release or reject a lot after QC review
 * 
 * Business Flow:
 * 1. Validate form data with Zod + business rules
 * 2. Fetch lot data from Firestore
 * 3. Determine new qcStatus based on decision
 * 4. Create QualityRelease record with full traceability
 * 5. Create TraceEvent for audit trail
 * 6. Atomic transaction:
 *    - Update Lot with QC fields
 *    - Update OnHand (denormalization)
 *    - Save QualityRelease
 *    - Save TraceEvent
 *    - Save individual QcTests
 * 7. Post-transaction (non-blocking):
 *    - Create follow-up task if rejected
 *    - Create Gemini alert
 *    - Queue email notifications
 *    - Check stock alerts if approved
 * 8. Revalidate relevant paths
 * 
 * @param data - Quality release form data
 * @param reviewerId - User ID of the QC reviewer
 * @returns QualityRelease record or error
 */
export async function releaseOrRejectLot(
  data: QualityReleaseFormData,
  reviewerId: string
): Promise<QualityActionResult<QualityRelease>> {
  try {
    // Use canonical field (sku preferred over deprecated itemId)
    const itemId = data.sku || data.itemId;
    if (!itemId) {
      return {
        success: false,
        error: 'sku o itemId es requerido',
      };
    }

    // === 1. VALIDATE FORM DATA ===
    const validation = validateQualityRelease({
      id: generateId(),
      lotCode: data.lotNumber, // Map lotNumber from form to lotCode in schema
      itemId: itemId, // Use resolved itemId
      decision: data.decision,
      decisionAt: new Date().toISOString(),
      decisionBy: reviewerId,
      reason: data.reason,
      observations: data.observations,
      conditions: data.conditions,
      testsPerformed: data.testsPerformed,
      coaUrl: data.coaUrl,
      photosUrls: data.photosUrls,
      attachments: data.attachments,
      reviewDuration: data.reviewDuration,
      correctiveActions: data.correctiveActions,
      department: 'CALIDAD' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error?.message || 'Validation failed',
      };
    }

    const qualityRelease = validation.data!;

    // === 2. FETCH LOT DATA ===
    const lotRef = db.collection('lots').doc(data.lotNumber);
    const lotSnap = await lotRef.get();

    if (!lotSnap.exists) {
      return {
        success: false,
        error: `Lote ${data.lotNumber} no encontrado`,
      };
    }

    const lot = lotSnap.data() as Lot;

    // === 3. DETERMINE NEW QC STATUS ===
    let newQcStatus: QcStatus;
    switch (data.decision) {
      case 'APPROVED':
        newQcStatus = 'PASSED';
        break;
      case 'REJECTED':
        newQcStatus = 'FAILED';
        break;
      case 'CONDITIONAL':
        newQcStatus = 'CONDITIONAL';
        break;
      case 'HOLD':
        newQcStatus = 'HOLD';
        break;
      default:
        return {
          success: false,
          error: `Decisión inválida: ${data.decision}`,
        };
    }

    // === 4. CREATE TRACE EVENT usando TraceEventFactory ===
    // ✅ FASE 1: Migrar a TraceEventFactory.logQcDecision
    const qcDecisionMap = {
      'APPROVED': 'APPROVED' as const,
      'REJECTED': 'REJECTED' as const,
      'CONDITIONAL': 'APPROVED' as const, // Consideramos CONDITIONAL como aprobado con condiciones
      'HOLD': 'HOLD' as const,
    };

    // === 5. PREPARE LOT UPDATES ===
    const lotUpdates: Partial<Lot> = {
      qcStatus: newQcStatus,
      qcReviewDuration: data.reviewDuration,
      updatedAt: new Date().toISOString(),
    };

    // Add decision-specific fields
    if (data.decision === 'APPROVED' || data.decision === 'CONDITIONAL') {
      lotUpdates.qcApprovedBy = reviewerId;
      lotUpdates.qcApprovedAt = new Date().toISOString();
      lotUpdates.qcApprovalNotes = data.observations;
      if (data.decision === 'CONDITIONAL' && data.conditions) {
        lotUpdates.qcConditions = data.conditions;
      }
    } else if (data.decision === 'REJECTED') {
      lotUpdates.qcRejectedBy = reviewerId;
      lotUpdates.qcRejectedAt = new Date().toISOString();
      lotUpdates.qcRejectionReason = data.reason;
    }

    // === 6. ATOMIC TRANSACTION ===
    await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const onHandQuery = db
        .collection('onHand')
        .where('lotCode', '==', data.lotNumber);
      const onHandSnap = await transaction.get(onHandQuery);

      // Update Lot
      transaction.update(lotRef, lotUpdates);

      // Update OnHand (denormalization)
      onHandSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        transaction.update(doc.ref, {
          qcStatus: newQcStatus,
          updatedAt: new Date().toISOString(),
        });
      });

      // Save QualityRelease
      const releaseRef = db.collection('qualityReleases').doc(qualityRelease.id);
      transaction.set(releaseRef, qualityRelease);

      // Save individual QcTests
      if (data.testsPerformed && data.testsPerformed.length > 0) {
        data.testsPerformed.forEach((test) => {
          const testId = generateId();
          const qcTest: QcTest = {
            id: testId,
            lotNumber: data.lotNumber,
            parameterId: test.parameterId,
            value: test.value,
            result: test.result,
            inSpec: test.inSpec,
            testedAt: new Date().toISOString(),
            testedBy: reviewerId,
          };

          // Validate with Zod
          const testValidation = QcTestSchema.safeParse(qcTest);
          if (testValidation.success) {
            const testRef = db.collection('qcTests').doc(testId);
            transaction.set(testRef, qcTest);
          }
        });
      }
    });

    // === 6.5. CREATE TRACE EVENT usando TraceEventFactory (post-transaction) ===
    // ✅ FASE 1: Crear TraceEvent fuera de la transacción usando factory
    await TraceEventFactory.logQcDecision({
      lotNumber: data.lotNumber,
      decision: qcDecisionMap[data.decision],
      reason: data.reason,
      conditions: data.conditions,
      userId: reviewerId,
      data: {
        itemId,
        itemName: lot.itemName || lot.itemId,
        reviewDuration: data.reviewDuration,
        testsCount: data.testsPerformed?.length || 0,
        observations: data.observations,
        correctiveActions: data.correctiveActions,
      }
    });

    // === 7. POST-TRANSACTION ACTIONS (NON-BLOCKING) ===
    // These run after the transaction commits, so they don't block the response
    // If they fail, the transaction is already committed

    if (data.decision === 'REJECTED') {
      // Create follow-up task
      createRejectionFollowupTask(
        data.lotNumber,
        itemId,
        data.reason || 'No reason provided',
        reviewerId
      ).catch((err) =>
        console.error('Failed to create rejection task:', err)
      );

      // Create Gemini alert
      createGeminiAlert('LOT_REJECTED', {
        lotCode: data.lotNumber,
        itemId: itemId,
        decision: data.decision,
        reason: data.reason,
      }).catch((err) =>
        console.error('Failed to create Gemini alert:', err)
      );

      // Queue email
      queueRejectionEmail(
        data.lotNumber,
        itemId,
        data.reason || 'No reason provided',
        reviewerId
      ).catch((err) =>
        console.error('Failed to queue rejection email:', err)
      );
    } else if (data.decision === 'APPROVED' || data.decision === 'CONDITIONAL') {
      // Create Gemini alert
      createGeminiAlert(
        data.decision === 'CONDITIONAL' ? 'CONDITIONAL_APPROVAL' : 'LOT_APPROVED',
        {
          lotCode: data.lotNumber,
          itemId: itemId,
          decision: data.decision,
          conditions: data.conditions,
        }
      ).catch((err) =>
        console.error('Failed to create Gemini alert:', err)
      );

      // Queue email
      queueApprovalEmail(
        data.lotNumber,
        itemId,
        reviewerId,
        data.conditions
      ).catch((err) =>
        console.error('Failed to queue approval email:', err)
      );

      // Check stock alerts
      checkStockAlertsAfterApproval(
        itemId,
        lot.quantity
      ).catch((err) =>
        console.error('Failed to check stock alerts:', err)
      );
    }

    // === 8. REVALIDATE PATHS ===
    revalidatePath('/warehouse/inventory');
    revalidatePath('/quality/lot-release');
    revalidatePath('/quality/dashboard');

    return {
      success: true,
      data: qualityRelease as unknown as QualityRelease,
    };
  } catch (error) {
    console.error('[releaseOrRejectLot] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pending lots requiring QC review
 * 
 * Business Logic:
 * - Fetches lots with qcStatus IN ['PENDING', 'IN_PROGRESS', 'HOLD']
 * - Calculates daysInHold from receivedAt timestamp
 * - Determines priority based on days:
 *   * >7 days: CRITICAL
 *   * 3-7 days: HIGH
 *   * 1-3 days: MEDIUM
 *   * <1 day: LOW
 * - Sorts by priority (desc) then daysInHold (desc)
 * - Supports filtering by itemId, category, supplier
 * 
 * @param filters - Optional filters
 * @returns Array of lot release table rows
 */
export async function getPendingLots(
  filters?: LotReleaseFilters
): Promise<QualityActionResult<LotReleaseTableRow[]>> {
  try {
    // === 1. BUILD QUERY ===
    let query = db.collection('lots')
      .where('qcStatus', 'in', ['PENDING', 'IN_PROGRESS', 'HOLD']);

    // Apply filters
    if (filters?.supplier && filters.supplier.length > 0) {
      query = query.where('supplierId', 'in', filters.supplier);
    }

    // === 2. FETCH DATA ===
    const snapshot = await query.get();
    const lots = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as Lot);

    // === 3. TRANSFORM TO TABLE ROWS ===
    const now = new Date();
    const rows: LotReleaseTableRow[] = lots.map((lot) => {
      // Calculate days in hold
      const receivedAt = lot.receivedAt
        ? new Date(lot.receivedAt)
        : new Date(lot.createdAt);
      const diffMs = now.getTime() - receivedAt.getTime();
      const daysInHold = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Determine priority
      let priority: 'low' | 'medium' | 'high' | 'critical';
      if (daysInHold > 7) {
        priority = 'critical';
      } else if (daysInHold >= 3) {
        priority = 'high';
      } else if (daysInHold >= 1) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        id: lot.id,
        lotNumber: lot.lotNumber,
        sku: lot.itemId,
        itemId: lot.itemId, // deprecated but keep for compatibility
        itemName: lot.itemName || lot.itemId,
        category: '', // TODO: fetch from items collection
        supplier: lot.supplierId || '',
        receptionDate: receivedAt,
        qcStatus: lot.qcStatus,
        qcPlanId: lot.qcPlanId,
        qcPlanName: '', // TODO: fetch from qcPlans
        daysInHold,
        priority,
        hasCoaDocument: !!lot.qcCoa,
        requiresAnalysis: lot.qcStatus === 'PENDING' || lot.qcStatus === 'IN_PROGRESS',
      };
    });

    // === 4. APPLY ADDITIONAL FILTERS ===
    let filteredRows = rows;

    if (filters?.qcStatus && filters.qcStatus.length > 0) {
      filteredRows = filteredRows.filter(
        (row) => filters.qcStatus!.includes(row.qcStatus)
      );
    }

    if (filters?.priority && filters.priority.length > 0) {
      filteredRows = filteredRows.filter(
        (row) => filters.priority!.includes(row.priority)
      );
    }

    if (filters?.category && filters.category.length > 0) {
      filteredRows = filteredRows.filter(
        (row) => filters.category!.includes(row.category)
      );
    }

    if (filters?.daysInHoldMin !== undefined) {
      filteredRows = filteredRows.filter(
        (row) => row.daysInHold >= filters.daysInHoldMin!
      );
    }

    if (filters?.daysInHoldMax !== undefined) {
      filteredRows = filteredRows.filter(
        (row) => row.daysInHold <= filters.daysInHoldMax!
      );
    }

    // === 5. SORT ===
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    filteredRows.sort((a, b) => {
      // First by priority (desc)
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by daysInHold (desc)
      return b.daysInHold - a.daysInHold;
    });

    return {
      success: true,
      data: filteredRows,
    };
  } catch (error) {
    console.error('[getPendingLots] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get quality release history
 * 
 * @param filters - Optional filters
 * @returns Array of quality release table rows
 */
export async function getQualityReleases(
  filters?: QualityReleaseFilters
): Promise<QualityActionResult<QualityReleaseTableRow[]>> {
  try {
    // === 1. BUILD QUERY ===
    let query = db.collection('qualityReleases').orderBy('decisionAt', 'desc');

    // Apply filters
    if (filters?.decision && filters.decision.length > 0) {
      query = query.where('decision', 'in', filters.decision);
    }

    // Date range
    if (filters?.dateFrom) {
      query = query.where('decisionAt', '>=', filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      query = query.where('decisionAt', '<=', filters.dateTo.toISOString());
    }

    // Limit to 100 by default
    query = query.limit(100);

    // === 2. FETCH DATA ===
    const snapshot = await query.get();
    const releases = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as QualityRelease);

    // === 3. TRANSFORM TO TABLE ROWS ===
    const rows: QualityReleaseTableRow[] = releases.map((release: QualityRelease) => {
      const testsPerformed = release.testsPerformed || [];
      const testsPassed = testsPerformed.filter((t: any) => t.result === 'PASS').length;

      return {
        id: release.id,
        lotNumber: release.lotCode,
        itemName: release.itemName || release.itemId,
        decision: release.decision,
        decisionAt: new Date(release.decisionAt),
        reviewedBy: release.decisionBy,
        reviewedByName: release.decisionBy, // TODO: fetch user name
        reviewDuration: release.reviewDuration,
        testsCount: testsPerformed.length,
        testsPassedCount: testsPassed,
        passRate: testsPerformed.length > 0 ? (testsPassed / testsPerformed.length) * 100 : 0,
      };
    });

    return {
      success: true,
      data: rows,
    };
  } catch (error) {
    console.error('[getQualityReleases] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get quality release by ID
 * 
 * @param releaseId - Quality release ID
 * @returns Quality release record
 */
export async function getQualityReleaseById(
  releaseId: string
): Promise<QualityActionResult<QualityRelease>> {
  try {
    const doc = await db.collection('qualityReleases').doc(releaseId).get();

    if (!doc.exists) {
      return {
        success: false,
        error: `Quality release ${releaseId} not found`,
      };
    }

    return {
      success: true,
      data: doc.data() as QualityRelease,
    };
  } catch (error) {
    console.error('[getQualityReleaseById] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get QC tests for a lot
 * 
 * @param lotCode - Lot number
 * @returns Array of QC tests
 */
export async function getQcTestsForLot(
  lotCode: string
): Promise<QualityActionResult<QcTest[]>> {
  try {
    const snapshot = await db
      .collection('qcTests')
      .where('lotCode', '==', lotCode)
      .orderBy('testedAt', 'desc')
      .get();

    const tests = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as QcTest);

    return {
      success: true,
      data: tests,
    };
  } catch (error) {
    console.error('[getQcTestsForLot] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start QC review for a lot
 * Updates qcStatus to IN_PROGRESS and sets reviewStartedAt
 * 
 * @param lotCode - Lot number
 * @param reviewerId - User ID of the reviewer
 * @returns Updated lot or error
 */
export async function startQcReview(
  lotCode: string,
  reviewerId: string
): Promise<QualityActionResult<Lot>> {
  try {
    const lotRef = db.collection('lots').doc(lotCode);
    const lotSnap = await lotRef.get();

    if (!lotSnap.exists) {
      return {
        success: false,
        error: `Lote ${lotCode} no encontrado`,
      };
    }

    const lot = lotSnap.data() as Lot;

    // Only allow starting review if status is PENDING or HOLD
    if (lot.qcStatus !== 'PENDING' && lot.qcStatus !== 'HOLD') {
      return {
        success: false,
        error: `No se puede iniciar revisión: estado actual es ${lot.qcStatus}`,
      };
    }

    const updates: Partial<Lot> = {
      qcStatus: 'IN_PROGRESS',
      qcReviewStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await lotRef.update(updates);

    // Also update onHand
    const onHandQuery = db
      .collection('onHand')
      .where('lotCode', '==', lotCode);
    const onHandSnap = await onHandQuery.get();

    const batch = db.batch();
    onHandSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, {
        qcStatus: 'IN_PROGRESS',
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    revalidatePath('/warehouse/inventory');
    revalidatePath('/quality/lot-release');

    return {
      success: true,
      data: { ...lot, ...updates },
    };
  } catch (error) {
    console.error('[startQcReview] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
