// src/server/actions/analysis-library.actions.ts
// SSOT V2+ Analysis Library Actions - Server Actions Layer
// Greenfield Implementation

'use server';

import { adminDb as db } from '@/server/firebase';
import { z } from 'zod';
import { AnalysisLibraryService } from '@/services/canonical/analysis-library.service';
import {
  type AnalysisMethod,
  type AnalysisParameter,
} from '@/domain/ssot-v2-plus-schemas';
import { revalidatePath } from 'next/cache';

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const CreateMethodInputSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  equipment: z.string().optional(),
  equipmentId: z.string().optional(),
  procedure: z.string().optional(),
  reference: z.string().optional(),
  documentId: z.string().optional(),
  unit: z.string().optional(),
  limitsTemplate: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    target: z.number().optional(),
  }).optional(),
  isCriticalByDefault: z.boolean(),
});

const CreateParameterInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  methodId: z.string().min(1),
  unit: z.string().optional(),
  limits: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    target: z.number().optional(),
  }).optional(),
  isCritical: z.boolean(),
  appliesToScopes: z.array(z.enum(['RAW', 'FG', 'PACK', 'INTERMEDIATE'])).optional(),
});

// ============================================================================
// RESULT TYPES
// ============================================================================

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// METHOD ACTIONS
// ============================================================================

/**
 * Create a new analysis method
 * 
 * @param input - Method creation data
 * @param userId - User creating the method
 */
export async function createAnalysisMethod(
  input: z.infer<typeof CreateMethodInputSchema>,
  userId: string
): Promise<ActionResult<{ methodId: string }>> {
  try {
    const validated = CreateMethodInputSchema.parse(input);
    
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const methodId = await AnalysisLibraryService.createMethod({
      ...validated,
      createdBy: userId,
      updatedBy: userId,
    });
    
    revalidatePath('/quality-v2/library');
    revalidatePath('/quality-v2/library/methods');
    
    return { success: true, data: { methodId } };
    
  } catch (error) {
    console.error('Error creating analysis method:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create analysis method' 
    };
  }
}

/**
 * Retire an analysis method
 * 
 * @param methodId - Method ID
 * @param reason - Retirement reason
 * @param supersededById - Optional ID of superseding method
 * @param userId - User retiring the method
 */
export async function retireAnalysisMethod(
  methodId: string,
  reason: string,
  userId: string,
  supersededById?: string
): Promise<ActionResult<void>> {
  try {
    if (!methodId || !reason || !userId) {
      return { success: false, error: 'Method ID, reason, and user ID required' };
    }
    
    await AnalysisLibraryService.retireMethod(methodId, reason, supersededById, userId);
    
    revalidatePath('/quality-v2/library');
    revalidatePath('/quality-v2/library/methods');
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error retiring analysis method:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retire analysis method' 
    };
  }
}

/**
 * Update analysis method status
 * 
 * @param methodId - Method ID
 * @param status - New status
 * @param userId - User updating the status
 */
export async function updateMethodStatus(
  methodId: string,
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'RETIRED',
  userId: string
): Promise<ActionResult<void>> {
  try {
    if (!methodId || !status || !userId) {
      return { success: false, error: 'Method ID, status, and user ID required' };
    }
    
    await AnalysisLibraryService.updateMethodStatus(methodId, status, userId);
    
    revalidatePath('/quality-v2/library');
    revalidatePath('/quality-v2/library/methods');
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error updating method status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update method status' 
    };
  }
}

/**
 * Get active analysis methods
 */
export async function getActiveMethods(): Promise<ActionResult<AnalysisMethod[]>> {
  try {
    const methods = await AnalysisLibraryService.getActiveMethods();
    return { success: true, data: methods };
    
  } catch (error) {
    console.error('Error fetching active methods:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch active methods' 
    };
  }
}

// ============================================================================
// PARAMETER ACTIONS
// ============================================================================

/**
 * Create a new analysis parameter
 * 
 * @param input - Parameter creation data
 * @param userId - User creating the parameter
 */
export async function createAnalysisParameter(
  input: z.infer<typeof CreateParameterInputSchema>,
  userId: string
): Promise<ActionResult<{ parameterId: string }>> {
  try {
    const validated = CreateParameterInputSchema.parse(input);
    
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const parameterId = await AnalysisLibraryService.createParameter({
      ...validated,
      createdBy: userId,
      updatedBy: userId,
    });
    
    revalidatePath('/quality-v2/library');
    revalidatePath('/quality-v2/library/parameters');
    
    return { success: true, data: { parameterId } };
    
  } catch (error) {
    console.error('Error creating analysis parameter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create analysis parameter' 
    };
  }
}

/**
 * Retire an analysis parameter
 * 
 * @param parameterId - Parameter ID
 * @param reason - Retirement reason
 * @param supersededById - Optional ID of superseding parameter
 * @param userId - User retiring the parameter
 */
export async function retireAnalysisParameter(
  parameterId: string,
  reason: string,
  userId: string,
  supersededById?: string
): Promise<ActionResult<void>> {
  try {
    if (!parameterId || !reason || !userId) {
      return { success: false, error: 'Parameter ID, reason, and user ID required' };
    }
    
    await AnalysisLibraryService.retireParameter(parameterId, reason, supersededById, userId);
    
    revalidatePath('/quality-v2/library');
    revalidatePath('/quality-v2/library/parameters');
    
    return { success: true, data: undefined };
    
  } catch (error) {
    console.error('Error retiring analysis parameter:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retire analysis parameter' 
    };
  }
}

/**
 * Get parameters for a specific scope
 * 
 * @param scope - Scope to filter by
 */
export async function getParametersForScope(
  scope: 'RAW' | 'FG' | 'PACK' | 'INTERMEDIATE'
): Promise<ActionResult<AnalysisParameter[]>> {
  try {
    if (!scope) {
      return { success: false, error: 'Scope required' };
    }
    
    const parameters = await AnalysisLibraryService.getParametersForScope(scope);
    return { success: true, data: parameters };
    
  } catch (error) {
    console.error('Error fetching parameters for scope:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch parameters for scope' 
    };
  }
}

/**
 * Get parameters for a specific method
 * 
 * @param methodId - Method ID
 */
export async function getParametersForMethod(
  methodId: string
): Promise<ActionResult<AnalysisParameter[]>> {
  try {
    if (!methodId) {
      return { success: false, error: 'Method ID required' };
    }
    
    const parameters = await AnalysisLibraryService.getParametersForMethod(methodId);
    return { success: true, data: parameters };
    
  } catch (error) {
    console.error('Error fetching parameters for method:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch parameters for method' 
    };
  }
}

/**
 * Check if parameter is used in any active quality plans
 * 
 * @param parameterId - Parameter ID
 */
export async function isParameterInUse(
  parameterId: string
): Promise<ActionResult<{ inUse: boolean; planIds: string[] }>> {
  try {
    if (!parameterId) {
      return { success: false, error: 'Parameter ID required' };
    }
    
    const result = await AnalysisLibraryService.isParameterInUse(parameterId);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('Error checking parameter usage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to check parameter usage' 
    };
  }
}
