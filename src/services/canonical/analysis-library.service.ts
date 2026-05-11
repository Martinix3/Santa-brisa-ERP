// src/services/canonical/analysis-library.service.ts
// SSOT V2+ Analysis Library Service - Methods & Parameters Management
// Greenfield Implementation

import { adminDb as db } from '@/server/firebase';
import {
  AnalysisMethod,
  AnalysisParameter,
  assertSchema,
  AnalysisMethodSchema,
  AnalysisParameterSchema,
} from '@/domain/ssot-v2-plus-schemas';
import { AuditService } from './audit.service';

export class AnalysisLibraryService {
  /**
   * Create a new analysis method
   */
  static async createMethod(
    input: Omit<
      AnalysisMethod,
      'id' | 'schemaVersion' | 'createdAt' | 'updatedAt' | 'status' | 'version'
    >
  ): Promise<string> {
    const ref = db.collection('analysisMethods').doc();
    
    const method: AnalysisMethod = {
      ...input,
      id: ref.id,
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1,
    };
    
    // Validate with schema
    assertSchema(AnalysisMethodSchema, method, 'AnalysisMethod');
    
    await ref.set(method);
    
    // Audit log
    await AuditService.append({
      entity: { type: 'lot', id: ref.id }, // Using 'lot' as proxy since 'method' isn't in the enum
      action: 'CREATE',
      by: method.createdBy,
      diff: { after: method },
    });
    
    return ref.id;
  }

  /**
   * Create a new analysis parameter
   */
  static async createParameter(
    input: Omit<
      AnalysisParameter,
      'id' | 'schemaVersion' | 'createdAt' | 'updatedAt' | 'status' | 'version'
    > & { isCritical: boolean }
  ): Promise<string> {
    const ref = db.collection('analysisParameters').doc();
    
    const parameter: AnalysisParameter = {
      ...input,
      id: ref.id,
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1,
    };
    
    // Validate with schema
    assertSchema(AnalysisParameterSchema, parameter, 'AnalysisParameter');
    
    await ref.set(parameter);
    
    // Audit log
    await AuditService.append({
      entity: { type: 'lot', id: ref.id }, // Using 'lot' as proxy
      action: 'CREATE',
      by: parameter.createdBy,
      diff: { after: parameter },
    });
    
    return ref.id;
  }

  /**
   * Retire a method and optionally supersede it
   */
  static async retireMethod(
    methodId: string,
    reason: string,
    supersededById?: string,
    by?: string
  ): Promise<void> {
    const ref = db.doc(`analysisMethods/${methodId}`);
    const snap = await ref.get();
    
    if (!snap.exists) {
      throw new Error(`Method not found: ${methodId}`);
    }
    
    const method = snap.data() as AnalysisMethod;
    
    if (method.status === 'RETIRED') {
      throw new Error('Method already retired');
    }
    
    // If supersededBy is provided, validate it exists
    if (supersededById) {
      const supersededSnap = await db.doc(`analysisMethods/${supersededById}`).get();
      if (!supersededSnap.exists) {
        throw new Error(`Superseding method not found: ${supersededById}`);
      }
    }
    
    await ref.update({
      status: 'RETIRED',
      retiredReason: reason,
      supersededBy: supersededById,
      updatedAt: new Date(),
      updatedBy: by,
    });
    
    // Audit log
    await AuditService.append({
      entity: { type: 'lot', id: methodId },
      action: 'RETIRE',
      by: by || 'SYSTEM',
      diff: {
        after: {
          status: 'RETIRED',
          retiredReason: reason,
          supersededBy: supersededById,
        },
      },
    });
  }

  /**
   * Retire a parameter and optionally supersede it
   */
  static async retireParameter(
    parameterId: string,
    reason: string,
    supersededById?: string,
    by?: string
  ): Promise<void> {
    const ref = db.doc(`analysisParameters/${parameterId}`);
    const snap = await ref.get();
    
    if (!snap.exists) {
      throw new Error(`Parameter not found: ${parameterId}`);
    }
    
    const parameter = snap.data() as AnalysisParameter;
    
    if (parameter.status === 'RETIRED') {
      throw new Error('Parameter already retired');
    }
    
    // If supersededBy is provided, validate it exists
    if (supersededById) {
      const supersededSnap = await db.doc(`analysisParameters/${supersededById}`).get();
      if (!supersededSnap.exists) {
        throw new Error(`Superseding parameter not found: ${supersededById}`);
      }
    }
    
    await ref.update({
      status: 'RETIRED',
      retiredReason: reason,
      supersededBy: supersededById,
      updatedAt: new Date(),
      updatedBy: by,
    });
    
    // Audit log
    await AuditService.append({
      entity: { type: 'lot', id: parameterId },
      action: 'RETIRE',
      by: by || 'SYSTEM',
      diff: {
        after: {
          status: 'RETIRED',
          retiredReason: reason,
          supersededBy: supersededById,
        },
      },
    });
  }

  /**
   * Get active parameters for a specific scope
   */
  static async getParametersForScope(
    scope: 'RAW' | 'FG' | 'PACK' | 'INTERMEDIATE'
  ): Promise<AnalysisParameter[]> {
    const snap = await db
      .collection('analysisParameters')
      .where('status', '==', 'ACTIVE')
      .where('appliesToScopes', 'array-contains', scope)
      .get();
    
    return snap.docs.map(doc => doc.data() as AnalysisParameter);
  }

  /**
   * Get all active methods
   */
  static async getActiveMethods(): Promise<AnalysisMethod[]> {
    const snap = await db
      .collection('analysisMethods')
      .where('status', '==', 'ACTIVE')
      .get();
    
    return snap.docs.map(doc => doc.data() as AnalysisMethod);
  }

  /**
   * Get parameters for a specific method
   */
  static async getParametersForMethod(methodId: string): Promise<AnalysisParameter[]> {
    const snap = await db
      .collection('analysisParameters')
      .where('methodId', '==', methodId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    return snap.docs.map(doc => doc.data() as AnalysisParameter);
  }

  /**
   * Check if parameter is used in any active quality plans
   */
  static async isParameterInUse(parameterId: string): Promise<{
    inUse: boolean;
    planIds: string[];
  }> {
    const plansSnap = await db
      .collection('qualityPlans')
      .where('isActive', '==', true)
      .get();
    
    const planIds: string[] = [];
    
    for (const doc of plansSnap.docs) {
      const plan = doc.data();
      const hasParameter = plan.parameters?.some(
        (p: any) => p.parameterId === parameterId
      );
      if (hasParameter) {
        planIds.push(doc.id);
      }
    }
    
    return {
      inUse: planIds.length > 0,
      planIds,
    };
  }

  /**
   * Update method status (e.g., UNDER_REVIEW)
   */
  static async updateMethodStatus(
    methodId: string,
    status: 'ACTIVE' | 'UNDER_REVIEW' | 'RETIRED',
    by: string
  ): Promise<void> {
    const ref = db.doc(`analysisMethods/${methodId}`);
    const snap = await ref.get();
    
    if (!snap.exists) {
      throw new Error(`Method not found: ${methodId}`);
    }
    
    await ref.update({
      status,
      updatedAt: new Date(),
      updatedBy: by,
    });
    
    // Audit log
    await AuditService.append({
      entity: { type: 'lot', id: methodId },
      action: 'UPDATE',
      by,
      diff: {
        after: { status },
      },
    });
  }
}
