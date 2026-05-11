// src/server/actions/compliance.actions.ts
// SSOT V2+ Compliance Actions - Server Actions Layer
// Greenfield Implementation

'use server';

import { adminDb as db } from '@/server/firebase';
import { z } from 'zod';
import { ProtocolService } from '@/services/canonical/protocol.service';
import { ComplianceService } from '@/services/canonical/compliance.service';
import {
  type ProductionProtocol,
  type ProductionProtocolRun,
  type ComplianceSchedule,
} from '@/domain/ssot-v2-plus-schemas';
import { revalidatePath } from 'next/cache';

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const StartProtocolRunInputSchema = z.object({
  protocolId: z.string().min(1),
  orderId: z.string().optional(),
});

const SubmitCheckInputSchema = z.object({
  runId: z.string().min(1),
  stepId: z.string().min(1),
  value: z.union([z.boolean(), z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  photoIds: z.array(z.string()).optional(),
  signature: z.object({
    role: z.string(),
    signatureHash: z.string().optional(),
    comment: z.string().optional(),
  }).optional(),
  passed: z.boolean(),
  notes: z.string().optional(),
  overrideReason: z.string().optional(),
});

// ============================================================================
// RESULT TYPES
// ============================================================================

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// PROTOCOL ACTIONS
// ============================================================================

/**
 * Start a protocol run
 * 
 * @param input - Protocol run start data
 * @param userId - User starting the run
 */
export async function startProtocolRun(
  input: z.infer<typeof StartProtocolRunInputSchema>,
  userId: string
): Promise<ActionResult<{ runId: string }>> {
  try {
    const validated = StartProtocolRunInputSchema.parse(input);
    
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const runId = await db.runTransaction(async (tx) => {
      return await ProtocolService.startRun(tx, {
        ...validated,
        startedBy: userId,
      });
    });
    
    revalidatePath('/compliance/protocols');
    revalidatePath(`/compliance/protocols/${validated.protocolId}`);
    
    return { success: true, data: { runId } };
    
  } catch (error) {
    console.error('Error starting protocol run:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start protocol run' 
    };
  }
}

/**
 * Submit a check for a protocol step
 * 
 * @param input - Check submission data
 * @param userId - User submitting the check
 */
export async function submitProtocolCheck(
  input: z.infer<typeof SubmitCheckInputSchema>,
  userId: string
): Promise<ActionResult<void>> {
  try {
    const validated = SubmitCheckInputSchema.parse(input);
    
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    await db.runTransaction(async (tx) => {
      await ProtocolService.submitCheck(tx, {
        ...validated,
        by: userId,
        signature: validated.signature ? {
          ...validated.signature,
          by: userId,
        } : undefined,
      });
    });
    
    revalidatePath('/compliance/protocols');
    revalidatePath(`/compliance/runs/${validated.runId}`);
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error submitting protocol check:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit protocol check' 
    };
  }
}

/**
 * Complete a protocol run
 * 
 * @param runId - Protocol run ID
 * @param userId - User completing the run
 */
export async function completeProtocolRun(
  runId: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    if (!runId || !userId) {
      return { success: false, error: 'Run ID and user ID required' };
    }
    
    await db.runTransaction(async (tx) => {
      await ProtocolService.completeRun(tx, { runId, by: userId });
    });
    
    revalidatePath('/compliance/protocols');
    revalidatePath(`/compliance/runs/${runId}`);
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error completing protocol run:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to complete protocol run' 
    };
  }
}

/**
 * Block a protocol run
 * 
 * @param runId - Protocol run ID
 * @param reason - Block reason
 * @param userId - User blocking the run
 */
export async function blockProtocolRun(
  runId: string,
  reason: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    if (!runId || !reason || !userId) {
      return { success: false, error: 'Run ID, reason, and user ID required' };
    }
    
    await db.runTransaction(async (tx) => {
      await ProtocolService.blockRun(tx, { runId, reason, by: userId });
    });
    
    revalidatePath('/compliance/protocols');
    revalidatePath(`/compliance/runs/${runId}`);
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error blocking protocol run:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to block protocol run' 
    };
  }
}

// ============================================================================
// COMPLIANCE SCHEDULE ACTIONS
// ============================================================================

/**
 * Schedule a protocol for compliance tracking
 * 
 * @param protocolId - Protocol ID
 */
export async function scheduleProtocol(
  protocolId: string
): Promise<ActionResult<{ scheduleId: string }>> {
  try {
    if (!protocolId) {
      return { success: false, error: 'Protocol ID required' };
    }
    
    const scheduleId = await ComplianceService.scheduleProtocol(protocolId);
    
    revalidatePath('/compliance/schedule');
    revalidatePath('/compliance/dashboard');
    
    return { success: true, data: { scheduleId } };
    
  } catch (error) {
    console.error('Error scheduling protocol:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to schedule protocol' 
    };
  }
}

/**
 * Get compliance schedule (due/overdue protocols)
 * 
 * @param filters - Optional filters
 */
export async function getComplianceSchedule(filters?: {
  status?: 'SCHEDULED' | 'DUE' | 'OVERDUE' | 'PAUSED';
  category?: string;
}): Promise<ActionResult<ComplianceSchedule[]>> {
  try {
    let query = db.collection('complianceSchedule');
    
    if (filters?.status) {
      query = query.where('status', '==', filters.status) as any;
    }
    
    if (filters?.category) {
      query = query.where('category', '==', filters.category) as any;
    }
    
    const snapshot = await query
      .orderBy('nextDueDate', 'asc')
      .limit(100)
      .get();
    
    const schedules = snapshot.docs.map(doc => doc.data() as ComplianceSchedule);
    
    return { success: true, data: schedules };
    
  } catch (error) {
    console.error('Error fetching compliance schedule:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch compliance schedule' 
    };
  }
}

/**
 * Get overdue protocols count by category
 */
export async function getOverdueByCategory(): Promise<ActionResult<Record<string, number>>> {
  try {
    const counts = await ComplianceService.getOverdueByCategory();
    return { success: true, data: counts };
    
  } catch (error) {
    console.error('Error fetching overdue by category:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch overdue by category' 
    };
  }
}

/**
 * Pause a compliance schedule
 * 
 * @param scheduleId - Schedule ID
 * @param reason - Pause reason
 */
export async function pauseSchedule(
  scheduleId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    if (!scheduleId || !reason) {
      return { success: false, error: 'Schedule ID and reason required' };
    }
    
    await ComplianceService.pauseSchedule(scheduleId, reason);
    
    revalidatePath('/compliance/schedule');
    revalidatePath('/compliance/dashboard');
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error pausing schedule:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to pause schedule' 
    };
  }
}

/**
 * Resume a paused compliance schedule
 * 
 * @param scheduleId - Schedule ID
 */
export async function resumeSchedule(
  scheduleId: string
): Promise<ActionResult<void>> {
  try {
    if (!scheduleId) {
      return { success: false, error: 'Schedule ID required' };
    }
    
    await ComplianceService.resumeSchedule(scheduleId);
    
    revalidatePath('/compliance/schedule');
    revalidatePath('/compliance/dashboard');
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error resuming schedule:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to resume schedule' 
    };
  }
}

// ============================================================================
// QUERY ACTIONS
// ============================================================================

/**
 * Get active protocols
 */
export async function getActiveProtocols(): Promise<ActionResult<ProductionProtocol[]>> {
  try {
    const snapshot = await db.collection('productionProtocols')
      .where('status', '==', 'ACTIVE')
      .orderBy('category')
      .orderBy('code')
      .get();
    
    const protocols = snapshot.docs.map(doc => doc.data() as ProductionProtocol);
    
    return { success: true, data: protocols };
    
  } catch (error) {
    console.error('Error fetching active protocols:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch active protocols' 
    };
  }
}

/**
 * Get protocol runs for a protocol
 * 
 * @param protocolId - Protocol ID
 * @param limit - Max number of runs to return
 */
export async function getProtocolRuns(
  protocolId: string,
  limit: number = 50
): Promise<ActionResult<ProductionProtocolRun[]>> {
  try {
    if (!protocolId) {
      return { success: false, error: 'Protocol ID required' };
    }
    
    const snapshot = await db.collection('productionProtocolRuns')
      .where('protocolId', '==', protocolId)
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();
    
    const runs = snapshot.docs.map(doc => doc.data() as ProductionProtocolRun);
    
    return { success: true, data: runs };
    
  } catch (error) {
    console.error('Error fetching protocol runs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch protocol runs' 
    };
  }
}

/**
 * Get compliance statistics for dashboard
 */
export async function getComplianceStatistics(): Promise<ActionResult<{
  dueToday: number;
  overdue: number;
  completed30Days: number;
  complianceRate: number;
}>> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [dueSnap, overdueSnap, completedSnap] = await Promise.all([
      db.collection('complianceSchedule').where('status', '==', 'DUE').count().get(),
      db.collection('complianceSchedule').where('status', '==', 'OVERDUE').count().get(),
      db.collection('productionProtocolRuns')
        .where('status', '==', 'COMPLETED')
        .where('completedAt', '>=', thirtyDaysAgo)
        .count()
        .get(),
    ]);
    
    const dueToday = dueSnap.data().count;
    const overdue = overdueSnap.data().count;
    const completed30Days = completedSnap.data().count;
    
    // Simplified compliance rate calculation
    const complianceRate = overdue > 0 ? 
      Math.max(0, 100 - (overdue / (dueToday + overdue + 1)) * 100) : 
      100;
    
    return {
      success: true,
      data: {
        dueToday,
        overdue,
        completed30Days,
        complianceRate: Math.round(complianceRate),
      },
    };
    
  } catch (error) {
    console.error('Error fetching compliance statistics:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch compliance statistics' 
    };
  }
}
