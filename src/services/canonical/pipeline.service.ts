// src/services/canonical/pipeline.service.ts
// Pipeline Service - SSOT V2 Compliant
// Manages sales pipeline operations through Account entities

import { adminDb } from '@/server/firebase';
import type { Account, Stage, ISODateString } from '@/domain/ssot';

/**
 * Pipeline Service
 * 
 * Manages sales pipeline through Account.stage field
 * SSOT V2 compliant - uses canonical Account collection
 */
export class PipelineService {
  private readonly COLLECTION = 'accounts';

  /**
   * Fetch all accounts with pipeline data
   */
  async fetchPipelineAccounts(): Promise<Account[]> {
    try {
      // Nota: muchos tenants aún no tienen 'stage' definido; traemos cuentas y filtramos en memoria
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .limit(1000)
        .get();

      const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

      // Excluir solo CERRADA y BAJA; incluir sin stage para que aparezcan como prospectos
      return accounts.filter(a => !a.stage || !['CERRADA', 'BAJA'].includes(a.stage));
    } catch (error) {
      console.error('[PipelineService] Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Fetch accounts by stage
   */
  async fetchAccountsByStage(stage: Stage): Promise<Account[]> {
    try {
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('stage', '==', stage)
        .orderBy('updatedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Account));
    } catch (error) {
      console.error(`[PipelineService] Error fetching accounts for stage ${stage}:`, error);
      throw error;
    }
  }

  /**
   * Update account stage (move in pipeline)
   */
  async updateAccountStage(
    accountId: string,
    newStage: Stage,
    userId?: string
  ): Promise<void> {
    try {
      const updateData: Partial<Account> = {
        stage: newStage,
        updatedAt: new Date().toISOString() as ISODateString,
        lastInteractionAt: new Date().toISOString()
      };

      await adminDb
        .collection(this.COLLECTION)
        .doc(accountId)
        .update(updateData);
      
      console.log(`[PipelineService] Account ${accountId} moved to stage ${newStage}`);
    } catch (error) {
      console.error('[PipelineService] Error updating account stage:', error);
      throw error;
    }
  }

  /**
   * Get accounts without recent interaction
   */
  async getStaleAccounts(daysThreshold: number = 30): Promise<Account[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
      
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('stage', 'in', ['ACTIVA', 'SEGUIMIENTO'])
        .where('lastInteractionAt', '<', cutoffDate.toISOString())
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Account));
    } catch (error) {
      console.error('[PipelineService] Error fetching stale accounts:', error);
      throw error;
    }
  }

  /**
   * Get target accounts (isTarget = true)
   */
  async getTargetAccounts(): Promise<Account[]> {
    try {
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('isTarget', '==', true)
        .orderBy('targetedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Account));
    } catch (error) {
      console.error('[PipelineService] Error fetching target accounts:', error);
      throw error;
    }
  }

  /**
   * Get accounts by owner (commercial)
   */
  async getAccountsByOwner(ownerId: string): Promise<Account[]> {
    try {
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('ownerId', '==', ownerId)
        .orderBy('updatedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Account));
    } catch (error) {
      console.error('[PipelineService] Error fetching accounts by owner:', error);
      throw error;
    }
  }

  /**
   * Get accounts by distributor
   */
  async getAccountsByDistributor(distributorPartyId: string): Promise<Account[]> {
    try {
      const snapshot = await adminDb
        .collection(this.COLLECTION)
        .where('distributorPartyId', '==', distributorPartyId)
        .orderBy('updatedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Account));
    } catch (error) {
      console.error('[PipelineService] Error fetching accounts by distributor:', error);
      throw error;
    }
  }

  /**
   * Mark account as target
   */
  async markAsTarget(
    accountId: string,
    userId: string,
    isTarget: boolean = true
  ): Promise<void> {
    try {
      const updateData: Partial<Account> = {
        isTarget,
        targetUserId: isTarget ? userId : undefined,
        targetedAt: isTarget ? (new Date().toISOString() as ISODateString) : undefined,
        updatedAt: new Date().toISOString() as ISODateString
      };

      await adminDb
        .collection(this.COLLECTION)
        .doc(accountId)
        .update(updateData);
      
      console.log(`[PipelineService] Account ${accountId} ${isTarget ? 'marked' : 'unmarked'} as target`);
    } catch (error) {
      console.error('[PipelineService] Error marking account as target:', error);
      throw error;
    }
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(): Promise<{
    byStage: Record<Stage, number>;
    total: number;
    targets: number;
    stale: number;
  }> {
    try {
      const accounts = await this.fetchPipelineAccounts();
      
      const byStage: Record<Stage, number> = {
        POTENCIAL: 0,
        ACTIVA: 0,
        SEGUIMIENTO: 0,
        FALLIDA: 0,
        CERRADA: 0,
        BAJA: 0
      };

      let targets = 0;
      let stale = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      accounts.forEach(account => {
        if (account.stage) {
          byStage[account.stage]++;
        }
        
        if (account.isTarget) {
          targets++;
        }
        
        if (account.lastInteractionAt && new Date(account.lastInteractionAt) < thirtyDaysAgo) {
          stale++;
        }
      });

      return {
        byStage,
        total: accounts.length,
        targets,
        stale
      };
    } catch (error) {
      console.error('[PipelineService] Error getting pipeline stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pipelineService = new PipelineService();
