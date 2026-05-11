'use server';

import { adminDb } from '@/server/firebase';
import { pipelineService } from '@/services/canonical/pipeline.service';
import type { Stage, Account } from '@/domain/ssot';
import type { StageKey } from '@/components/pipeline/types';

/**
 * Server action to update pipeline stage for an account
 * SSOT V2 compliant - uses canonical pipeline service
 */
export async function updatePipelineStage(
  accountId: string,
  newStage: StageKey
): Promise<{ success: boolean; error?: string }> {
  try {
    // Map StageKey to Stage type
    const stage = newStage as Stage;
    
    await pipelineService.updateAccountStage(accountId, stage);
    
    return { success: true };
  } catch (error) {
    console.error('[Pipeline] Error updating stage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Server action to fetch pipeline data from SSOT v2.1-plus
 * Uses canonical Account collection
 */
export async function fetchPipelineData(): Promise<{
  success: boolean;
  data?: Account[];
  error?: string;
}> {
  try {
    const accountsSnap = await adminDb.collection('accounts').get();
    const accounts = accountsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Account[];

    // Calcular stage basándose en interacciones y pedidos
    const accountsWithCalculatedStage = await Promise.all(
      accounts.map(async (account) => {
        // Contar interacciones
        const interactionsSnap = await adminDb
          .collection('interactions')
          .where('accountId', '==', account.id)
          .limit(1)
          .get();
        
        const hasInteractions = !interactionsSnap.empty;

        // Contar pedidos
        const ordersSnap = await adminDb
          .collection('ordersSellOut')
          .where('accountId', '==', account.id)
          .limit(1)
          .get();
        
        const hasOrders = !ordersSnap.empty;

        // Calcular stage:
        // - Tiene pedidos → ACTIVA
        // - Tiene interacciones pero no pedidos → SEGUIMIENTO
        // - No tiene nada → POTENCIAL
        let calculatedStage: 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' = 'POTENCIAL';
        
        if (hasOrders) {
          calculatedStage = 'ACTIVA';
        } else if (hasInteractions) {
          calculatedStage = 'SEGUIMIENTO';
        }

        return {
          ...account,
          stage: calculatedStage,  // Override con stage calculado
        };
      })
    );

    return { success: true, data: accountsWithCalculatedStage };
  } catch (error) {
    console.error('[fetchPipelineData] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Server action to fetch pipeline statistics
 */
export async function fetchPipelineStats() {
  try {
    const stats = await pipelineService.getPipelineStats();
    
    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('[Pipeline] Error fetching stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Server action to mark account as target
 */
export async function markAccountAsTarget(
  accountId: string,
  userId: string,
  isTarget: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    await pipelineService.markAsTarget(accountId, userId, isTarget);
    
    return { success: true };
  } catch (error) {
    console.error('[Pipeline] Error marking account as target:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
