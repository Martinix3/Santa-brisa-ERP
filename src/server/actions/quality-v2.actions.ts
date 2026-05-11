// src/server/actions/quality-v2.actions.ts
// SSOT V2+ Quality Actions - Server Actions Layer
// Greenfield Implementation

'use server';

import { adminDb as db } from '@/server/firebase';
import { z } from 'zod';
import { QualityService } from '@/services/canonical/quality.service';
import { 
  QualityReleaseSchema,
  type QualityRelease,
  type Lot 
} from '@/domain/ssot-v2-plus-schemas';
import { revalidatePath } from 'next/cache';

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const QcResultInputSchema = z.object({
  parameterId: z.string().min(1),
  methodId: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  status: z.enum(['OK', 'FAIL', 'NA']),
  unit: z.string().optional(),
  testedBy: z.string().optional(),
});

const QualityDecisionInputSchema = z.object({
  lotCode: z.string().min(1),
  decision: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
  results: z.array(QcResultInputSchema),
  planId: z.string().optional(),
  observations: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  rejectionReason: z.string().optional(),
});

// ============================================================================
// RESULT TYPES
// ============================================================================

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Process QC decision for a lot (APPROVE/REJECT/CONDITIONAL)
 * 
 * @param input - QC decision data
 * @param userId - User making the decision
 */
export async function processQcDecisionV2(
  input: z.infer<typeof QualityDecisionInputSchema>,
  userId: string
): Promise<ActionResult<{ releaseId: string; tasksCreated: string[] }>> {
  try {
    // Validate input
    const validated = QualityDecisionInputSchema.parse(input);
    
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    // Execute in transaction
    const result = await db.runTransaction(async (tx) => {
      return await QualityService.processQualityDecisionV2(tx, {
        ...validated,
        reviewedBy: userId,
      });
    });
    
    // Revalidate relevant pages
    revalidatePath('/quality-v2/lots');
    revalidatePath('/quality-v2/releases');
    revalidatePath(`/quality-v2/lots/${validated.lotCode}`);
    
    return { success: true, data: result };
    
  } catch (error) {
    console.error('Error processing QC decision:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process QC decision' 
    };
  }
}

/**
 * Get pending lots for QC review
 * 
 * @param filters - Optional filters
 */
export async function getPendingLotsForQc(filters?: {
  itemId?: string;
  locationId?: string;
  supplierId?: string;
}): Promise<ActionResult<Lot[]>> {
  try {
    let query = db.collection('lots')
      .where('qcStatus', 'in', ['PENDING', 'IN_PROGRESS', 'HOLD']);
    
    if (filters?.itemId) {
      query = query.where('itemId', '==', filters.itemId);
    }
    
    if (filters?.locationId) {
      query = query.where('locationId', '==', filters.locationId);
    }
    
    if (filters?.supplierId) {
      query = query.where('supplierId', '==', filters.supplierId);
    }
    
    const snapshot = await query
      .orderBy('receivedAt', 'desc')
      .limit(100)
      .get();
    
    const lots = snapshot.docs.map(doc => doc.data() as Lot);
    
    return { success: true, data: lots };
    
  } catch (error) {
    console.error('Error fetching pending lots:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch pending lots' 
    };
  }
}

/**
 * Get quality releases for a lot
 * 
 * @param lotCode - Lot code
 */
export async function getQualityReleasesForLot(
  lotCode: string
): Promise<ActionResult<QualityRelease[]>> {
  try {
    if (!lotCode) {
      return { success: false, error: 'Lot code required' };
    }
    
    const snapshot = await db.collection('qualityReleases')
      .where('lotCode', '==', lotCode)
      .orderBy('createdAt', 'desc')
      .get();
    
    const releases = snapshot.docs.map(doc => doc.data() as QualityRelease);
    
    return { success: true, data: releases };
    
  } catch (error) {
    console.error('Error fetching quality releases:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch quality releases' 
    };
  }
}

/**
 * Get lots requiring FEFO priority (close to expiry)
 * 
 * @param daysThreshold - Days before expiry to consider urgent
 */
export async function getFefoUrgentLots(
  daysThreshold: number = 30
): Promise<ActionResult<Lot[]>> {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    const snapshot = await db.collection('lots')
      .where('qcStatus', '==', 'PASSED')
      .where('expDate', '<=', thresholdDate)
      .orderBy('expDate', 'asc')
      .limit(50)
      .get();
    
    const lots = snapshot.docs.map(doc => doc.data() as Lot);
    
    return { success: true, data: lots };
    
  } catch (error) {
    console.error('Error fetching FEFO urgent lots:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch FEFO urgent lots' 
    };
  }
}

/**
 * Start QC review for a lot (mark as IN_PROGRESS)
 * 
 * @param lotCode - Lot code
 * @param userId - User starting review
 */
export async function startQcReview(
  lotCode: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    if (!lotCode || !userId) {
      return { success: false, error: 'Lot code and user ID required' };
    }
    
    const lotRef = db.doc(`lots/${lotCode}`);
    const lotSnap = await lotRef.get();
    
    if (!lotSnap.exists) {
      return { success: false, error: `Lot not found: ${lotCode}` };
    }
    
    const lot = lotSnap.data() as Lot;
    
    if (lot.qcStatus !== 'PENDING' && lot.qcStatus !== 'HOLD') {
      return { 
        success: false, 
        error: `Cannot start review for lot with status: ${lot.qcStatus}` 
      };
    }
    
    await lotRef.update({
      qcStatus: 'IN_PROGRESS',
      updatedAt: new Date(),
      updatedBy: userId,
    });
    
    revalidatePath('/quality-v2/lots');
    revalidatePath(`/quality-v2/lots/${lotCode}`);
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error starting QC review:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start QC review' 
    };
  }
}

/**
 * Get QC statistics for dashboard
 */
export async function getQcStatistics(): Promise<ActionResult<{
  pending: number;
  inProgress: number;
  hold: number;
  avgDaysInQc: number;
}>> {
  try {
    const [pendingSnap, inProgressSnap, holdSnap] = await Promise.all([
      db.collection('lots').where('qcStatus', '==', 'PENDING').count().get(),
      db.collection('lots').where('qcStatus', '==', 'IN_PROGRESS').count().get(),
      db.collection('lots').where('qcStatus', '==', 'HOLD').count().get(),
    ]);
    
    // Calculate average days in QC (simplified - would need more complex query in production)
    const avgDaysInQc = 0; // TODO: Implement with proper time tracking
    
    return {
      success: true,
      data: {
        pending: pendingSnap.data().count,
        inProgress: inProgressSnap.data().count,
        hold: holdSnap.data().count,
        avgDaysInQc,
      },
    };
    
  } catch (error) {
    console.error('Error fetching QC statistics:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch QC statistics' 
    };
  }
}

/**
 * Get complete snapshot for Quality V2 Dashboard
 * Consolidates all data needed for the dashboard
 */
export async function getQualityV2Snapshot(): Promise<{
  lots: Lot[];
  plans: any[];
  parameters: any[];
  geminiAlerts: any[];
  protocols: any[];
  protocolRuns: any[];
  documents: any[];
}> {
  try {
    // Get all lots
    const lotsSnap = await db.collection('lots')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    const lots = lotsSnap.docs.map(d => d.data() as Lot);
    
    // 🔧 Enrich lots with SKU names for better UX
    const uniqueItemIds = [...new Set(lots.map(l => l.itemId))];
    const skusSnap = await db.collection('skus')
      .where('__name__', 'in', uniqueItemIds.slice(0, 30)) // Firestore limit
      .get();
    
    const skuMap = new Map(
      skusSnap.docs.map(d => [d.id, d.data().name || d.data().description || d.id])
    );
    
    // Add itemName to each lot
    const enrichedLots = lots.map(lot => ({
      ...lot,
      itemName: skuMap.get(lot.itemId) || lot.itemId
    }));
    
    // Get quality plans
    const plansSnap = await db.collection('qualityPlans')
      .where('isActive', '==', true)
      .get();
    const plans = plansSnap.docs.map(d => d.data());
    
    // Get analysis parameters
    const paramsSnap = await db.collection('analysisParameters')
      .where('status', '==', 'ACTIVE')
      .get();
    const parameters = paramsSnap.docs.map(d => d.data());
    
    // Get Gemini analyses (quality phase)
    const geminiSnap = await db.collection('geminiAnalyses')
      .where('phase', '==', 'QUALITY')
      .where('status', '==', 'OPEN')
      .orderBy('detectedAt', 'desc')
      .limit(20)
      .get();
    const geminiAlerts = geminiSnap.docs.map(d => d.data());
    
    // Get production protocols (APPCC)
    const protocolsSnap = await db.collection('productionProtocols')
      .where('status', '==', 'ACTIVE')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const protocols = protocolsSnap.docs.map(d => d.data());
    
    // Get protocol runs (last 100)
    const runsSnap = await db.collection('productionProtocolRuns')
      .orderBy('startedAt', 'desc')
      .limit(100)
      .get();
    const protocolRuns = runsSnap.docs.map(d => d.data());
    
    // Get documents
    const docsSnap = await db.collection('documents')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const documents = docsSnap.docs.map(d => d.data());
    
    // 🔧 Convertir Timestamps y Dates a strings para evitar errores de serialización
    const sanitize = (obj: any) => JSON.parse(
      JSON.stringify(obj, (_, v) => {
        if (v && typeof v === "object" && "_seconds" in v)
          return new Date(v._seconds * 1000).toISOString();
        if (v instanceof Date) return v.toISOString();
        return v;
      })
    );

    return {
      lots: sanitize(enrichedLots),
      plans: sanitize(plans),
      parameters: sanitize(parameters),
      geminiAlerts: sanitize(geminiAlerts),
      protocols: sanitize(protocols),
      protocolRuns: sanitize(protocolRuns),
      documents: sanitize(documents),
    };
    
  } catch (error) {
    console.error('Error fetching Quality V2 snapshot:', error);
    // Return empty data rather than throwing
    return {
      lots: [],
      plans: [],
      parameters: [],
      geminiAlerts: [],
      protocols: [],
      protocolRuns: [],
      documents: [],
    };
  }
}
