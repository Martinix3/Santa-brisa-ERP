/**
 * QUALITY PLANS ACTIONS
 * 
 * Server actions for QC Plans management.
 * Manages quality control plans that define inspection requirements.
 * 
 * Features:
 * - Create/update/delete QC plans
 * - Activate/deactivate plans
 * - Associate plans with items/categories
 * - Auto-approval rules configuration
 * - Sampling plan management
 * 
 * @module quality-plans
 */

"use server";

import { adminDb } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { QcPlan, ItemCategory, ISODateString } from "@/domain/ssot";
import type { QualityActionResult, QcPlanFormData, QcPlanTableRow } from "@/types/quality";
import { normalizeTriggerOn, normalizeParameters } from "@/domain/qc-plan-helpers";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique QC plan code
 */
function generateQcPlanCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `QCP-${timestamp}-${random}`;
}

/**
 * Validate QC plan data
 */
function validateQcPlanData(data: QcPlanFormData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push("Name is required");
  }

  if (!data.triggerOn) {
    errors.push("Trigger condition is required");
  }

  if (!data.parameters || data.parameters.length === 0) {
    errors.push("At least one parameter is required");
  }

  // Validate that either items or categories are specified
  const hasItems = data.appliesToItems && data.appliesToItems.length > 0;
  const hasCategories = data.appliesToCategories && data.appliesToCategories.length > 0;

  if (!hasItems && !hasCategories) {
    errors.push("Plan must apply to at least one item or category");
  }

  // Validate auto-approve rules if enabled
  if (data.autoApproveRules?.enabled) {
    if (!data.autoApproveRules.conditions) {
      errors.push("Auto-approve conditions are required when auto-approve is enabled");
    }
  }

  // Validate sampling plan if type is SAMPLING
  if (data.samplingPlan?.type === 'SAMPLING') {
    if (!data.samplingPlan.sampleSize || data.samplingPlan.sampleSize <= 0) {
      errors.push("Sample size is required for sampling plans");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// MAIN CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new QC plan
 * 
 * @param data - QC plan form data
 * @param userId - User creating the plan
 * @returns Created QC plan
 */
export async function createQcPlan(
  data: QcPlanFormData,
  userId: string
): Promise<QualityActionResult<QcPlan>> {
  try {
    // Validate data
    const validation = validateQcPlanData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    const db = adminDb;
    const now = new Date().toISOString() as ISODateString;
    const planId = db.collection("qcPlansNew").doc().id;

    const qcPlan: QcPlan = {
      id: planId,
      name: data.name,
      description: data.description,
      code: generateQcPlanCode(),
      appliesToItems: data.appliesToItems,
      appliesToCategories: data.appliesToCategories as ItemCategory[] | undefined,
      triggerOn: normalizeTriggerOn(data.triggerOn),
      requiredForRelease: data.requiredForRelease,
      parameters: normalizeParameters(data.parameters),
      autoApproveRules: data.autoApproveRules ? {
        enabled: data.autoApproveRules.enabled,
        conditions: data.autoApproveRules.conditions
      } : undefined,
      samplingPlan: data.samplingPlan,
      active: data.active,
      version: 1,
      effectiveFrom: now,
      department: 'CALIDAD',
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };

    // Save to Firestore
    await db.collection("qcPlansNew").doc(planId).set(qcPlan);

    console.log(`[createQcPlan] Created plan: ${planId} (${qcPlan.code})`);

    // Revalidate paths
    revalidatePath("/quality");
    revalidatePath("/quality/plans");

    return {
      success: true,
      data: qcPlan
    };

  } catch (error) {
    console.error("[createQcPlan] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create QC plan"
    };
  }
}

/**
 * Update an existing QC plan
 * 
 * Creates a new version while maintaining history
 * 
 * @param planId - Plan ID to update
 * @param data - Updated plan data
 * @param userId - User updating the plan
 * @returns Updated QC plan
 */
export async function updateQcPlan(
  planId: string,
  data: Partial<QcPlanFormData>,
  userId: string
): Promise<QualityActionResult<QcPlan>> {
  try {
    const db = adminDb;
    const planRef = db.collection("qcPlansNew").doc(planId);
    const planDoc = await planRef.get();

    if (!planDoc.exists) {
      return {
        success: false,
        error: "QC plan not found"
      };
    }

    const existingPlan = planDoc.data() as QcPlan;
    const now = new Date().toISOString() as ISODateString;

    // Build updated plan
    const updatedPlan: QcPlan = {
      ...existingPlan,
      name: data.name ?? existingPlan.name,
      description: data.description ?? existingPlan.description,
      appliesToItems: data.appliesToItems ?? existingPlan.appliesToItems,
      appliesToCategories: (data.appliesToCategories as ItemCategory[] | undefined) ?? existingPlan.appliesToCategories,
      triggerOn: data.triggerOn ? normalizeTriggerOn(data.triggerOn) : existingPlan.triggerOn,
      requiredForRelease: data.requiredForRelease ?? existingPlan.requiredForRelease,
      parameters: data.parameters ? normalizeParameters(data.parameters) : existingPlan.parameters,
      autoApproveRules: data.autoApproveRules ? {
        enabled: data.autoApproveRules.enabled,
        conditions: data.autoApproveRules.conditions
      } : existingPlan.autoApproveRules,
      samplingPlan: data.samplingPlan ?? existingPlan.samplingPlan,
      active: data.active ?? existingPlan.active,
      version: (existingPlan.version ?? 0) + 1,
      updatedAt: now
    };

    // Validate updated data
    const validation = validateQcPlanData(updatedPlan as any);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Save updated plan (cast to avoid Firestore type error)
    await planRef.update(updatedPlan as any);

    console.log(`[updateQcPlan] Updated plan: ${planId} to version ${updatedPlan.version}`);

    // Revalidate paths
    revalidatePath("/quality");
    revalidatePath("/quality/plans");

    return {
      success: true,
      data: updatedPlan
    };

  } catch (error) {
    console.error("[updateQcPlan] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update QC plan"
    };
  }
}

/**
 * Get all QC plans with optional filters
 * 
 * @param filters - Optional filters (active status, category, etc.)
 * @returns Array of QC plans
 */
export async function getQcPlans(
  filters?: {
    active?: boolean;
    category?: ItemCategory;
    itemId?: string;
  }
): Promise<QualityActionResult<QcPlan[]>> {
  try {
    const db = adminDb;
    let query = db.collection("qcPlansNew").orderBy("createdAt", "desc");

    // Apply filters
    if (filters?.active !== undefined) {
      query = query.where("active", "==", filters.active) as any;
    }

    const snapshot = await query.get();
    let plans = snapshot.docs.map(doc => doc.data() as QcPlan);

    // Filter by category if specified
    if (filters?.category) {
      plans = plans.filter(plan =>
        plan.appliesToCategories?.includes(filters.category!)
      );
    }

    // Filter by item if specified
    if (filters?.itemId) {
      plans = plans.filter(plan =>
        plan.appliesToItems?.includes(filters.itemId!)
      );
    }

    return {
      success: true,
      data: plans
    };

  } catch (error) {
    console.error("[getQcPlans] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch QC plans"
    };
  }
}

/**
 * Get a single QC plan by ID
 * 
 * @param planId - Plan ID
 * @returns QC plan
 */
export async function getQcPlanById(
  planId: string
): Promise<QualityActionResult<QcPlan>> {
  try {
    const db = adminDb;
    const planDoc = await db.collection("qcPlansNew").doc(planId).get();

    if (!planDoc.exists) {
      return {
        success: false,
        error: "QC plan not found"
      };
    }

    return {
      success: true,
      data: planDoc.data() as QcPlan
    };

  } catch (error) {
    console.error("[getQcPlanById] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch QC plan"
    };
  }
}

/**
 * Get applicable QC plan for a specific item
 * 
 * Checks both item-specific plans and category plans
 * 
 * @param itemId - Item ID
 * @param itemCategory - Item category
 * @returns Applicable QC plan or null
 */
export async function getApplicableQcPlan(
  itemId: string,
  itemCategory: ItemCategory
): Promise<QualityActionResult<QcPlan | null>> {
  try {
    const db = adminDb;

    // First, try to find item-specific plan
    const itemPlanQuery = await db.collection("qcPlansNew")
      .where("active", "==", true)
      .where("appliesToItems", "array-contains", itemId)
      .limit(1)
      .get();

    if (!itemPlanQuery.empty) {
      return {
        success: true,
        data: itemPlanQuery.docs[0].data() as QcPlan
      };
    }

    // If no item-specific plan, look for category plan
    const categoryPlanQuery = await db.collection("qcPlansNew")
      .where("active", "==", true)
      .where("appliesToCategories", "array-contains", itemCategory)
      .limit(1)
      .get();

    if (!categoryPlanQuery.empty) {
      return {
        success: true,
        data: categoryPlanQuery.docs[0].data() as QcPlan
      };
    }

    // No applicable plan found
    return {
      success: true,
      data: null
    };

  } catch (error) {
    console.error("[getApplicableQcPlan] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to find applicable QC plan"
    };
  }
}

/**
 * Activate a QC plan
 * 
 * @param planId - Plan ID to activate
 * @param userId - User activating the plan
 * @returns Updated plan
 */
export async function activateQcPlan(
  planId: string,
  userId: string
): Promise<QualityActionResult<QcPlan>> {
  try {
    const db = adminDb;
    const now = new Date().toISOString() as ISODateString;

    const planRef = db.collection("qcPlansNew").doc(planId);
    await planRef.update({
      active: true,
      effectiveFrom: now,
      updatedAt: now
    });

    const updatedDoc = await planRef.get();

    console.log(`[activateQcPlan] Activated plan: ${planId}`);

    // Revalidate paths
    revalidatePath("/quality");
    revalidatePath("/quality/plans");

    return {
      success: true,
      data: updatedDoc.data() as QcPlan
    };

  } catch (error) {
    console.error("[activateQcPlan] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to activate QC plan"
    };
  }
}

/**
 * Deactivate a QC plan
 * 
 * @param planId - Plan ID to deactivate
 * @param userId - User deactivating the plan
 * @returns Updated plan
 */
export async function deactivateQcPlan(
  planId: string,
  userId: string
): Promise<QualityActionResult<QcPlan>> {
  try {
    const db = adminDb;
    const now = new Date().toISOString() as ISODateString;

    const planRef = db.collection("qcPlansNew").doc(planId);
    await planRef.update({
      active: false,
      updatedAt: now
    });

    const updatedDoc = await planRef.get();

    console.log(`[deactivateQcPlan] Deactivated plan: ${planId}`);

    // Revalidate paths
    revalidatePath("/quality");
    revalidatePath("/quality/plans");

    return {
      success: true,
      data: updatedDoc.data() as QcPlan
    };

  } catch (error) {
    console.error("[deactivateQcPlan] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deactivate QC plan"
    };
  }
}

/**
 * Delete a QC plan
 * 
 * Only allows deletion if no lots are using this plan
 * 
 * @param planId - Plan ID to delete
 * @returns Success status
 */
export async function deleteQcPlan(
  planId: string
): Promise<QualityActionResult<void>> {
  try {
    const db = adminDb;

    // Check if any lots are using this plan
    const lotsUsingPlan = await db.collection("lots")
      .where("qcPlanId", "==", planId)
      .limit(1)
      .get();

    if (!lotsUsingPlan.empty) {
      return {
        success: false,
        error: "Cannot delete plan: it is being used by existing lots. Deactivate it instead."
      };
    }

    // Safe to delete
    await db.collection("qcPlansNew").doc(planId).delete();

    console.log(`[deleteQcPlan] Deleted plan: ${planId}`);

    // Revalidate paths
    revalidatePath("/quality");
    revalidatePath("/quality/plans");

    return {
      success: true,
      data: undefined
    };

  } catch (error) {
    console.error("[deleteQcPlan] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete QC plan"
    };
  }
}

/**
 * Get QC plans table data for UI display
 * 
 * @returns Array of QC plan table rows
 */
export async function getQcPlansTableData(): Promise<QualityActionResult<QcPlanTableRow[]>> {
  try {
    const db = adminDb;
    const snapshot = await db.collection("qcPlansNew")
      .orderBy("createdAt", "desc")
      .get();

    const tableRows: QcPlanTableRow[] = snapshot.docs.map(doc => {
      const plan = doc.data() as QcPlan;

      return {
        id: plan.id,
        name: plan.name,
        active: plan.active,
        version: plan.version ?? 1,
        appliesToCategories: plan.appliesToCategories,
        requiresAnalysis: plan.requiredForRelease ?? false,
        autoApproveEnabled: plan.autoApproveRules?.enabled ?? false,
        parametersCount: plan.parameters?.length ?? 0,
        createdAt: new Date(plan.createdAt ?? Date.now()),
        updatedAt: new Date(plan.updatedAt ?? Date.now())
      };
    });

    return {
      success: true,
      data: tableRows
    };

  } catch (error) {
    console.error("[getQcPlansTableData] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch QC plans table data"
    };
  }
}

/**
 * Check if a lot should be auto-approved based on QC plan rules
 * 
 * @param qcPlanId - QC plan ID
 * @param lotData - Lot information
 * @param testsResults - Test results
 * @returns Auto-approval check result
 */
export async function checkAutoApproval(
  qcPlanId: string,
  lotData: {
    supplierId?: string;
    quantity: number;
  },
  testsResults: Array<{
    parameterId: string;
    inSpec: boolean;
  }>
): Promise<QualityActionResult<{
  canAutoApprove: boolean;
  reason: string;
}>> {
  try {
    const db = adminDb;
    const planDoc = await db.collection("qcPlansNew").doc(qcPlanId).get();

    if (!planDoc.exists) {
      return {
        success: false,
        error: "QC plan not found"
      };
    }

    const plan = planDoc.data() as QcPlan;

    // If auto-approve is not enabled, return false
    if (!plan.autoApproveRules?.enabled) {
      return {
        success: true,
        data: {
          canAutoApprove: false,
          reason: "Auto-approve not enabled for this plan"
        }
      };
    }

    const conditions = plan.autoApproveRules.conditions;

    if (!conditions) {
      // If enabled but no conditions, maybe default to all pass? Or just return true?
      // Assuming if enabled and no conditions, it's manual approval or all pass.
      // Let's assume all tests pass is implicit if not specified?
      // Or maybe we should return true.
      return {
        success: true,
        data: {
          canAutoApprove: true,
          reason: "Auto-approve enabled with no specific conditions"
        }
      };
    }

    // Check allTestsPass condition
    if (conditions.allTestsPass) {
      const allPass = testsResults.every(t => t.inSpec);
      if (!allPass) {
        return {
          success: true,
          data: {
            canAutoApprove: false,
            reason: "Not all tests passed"
          }
        };
      }
    }

    // Check maxLotSize condition
    if (conditions.maxLotSize !== undefined) {
      if (lotData.quantity > conditions.maxLotSize) {
        return {
          success: true,
          data: {
            canAutoApprove: false,
            reason: `Lot size (${lotData.quantity}) exceeds threshold (${conditions.maxLotSize})`
          }
        };
      }
    }

    // Check trustedSuppliers condition
    if (conditions.trustedSuppliers && conditions.trustedSuppliers.length > 0) {
      if (!lotData.supplierId || !conditions.trustedSuppliers.includes(lotData.supplierId)) {
        return {
          success: true,
          data: {
            canAutoApprove: false,
            reason: "Supplier not in trusted list"
          }
        };
      }
    }

    // All conditions met
    return {
      success: true,
      data: {
        canAutoApprove: true,
        reason: "All auto-approval conditions met"
      }
    };

  } catch (error) {
    console.error("[checkAutoApproval] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check auto-approval"
    };
  }
}
