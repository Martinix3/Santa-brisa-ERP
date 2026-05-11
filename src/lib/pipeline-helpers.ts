/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/lib/pipeline-helpers.ts
// Pipeline Helper Functions
// Transforms Account data to PipelineItem format

import type { Account } from '@/domain/ssot';
import type { PipelineItem, StageKey } from '@/components/pipeline/types';
import { normalizeStageToPipeline } from '@/lib/stage-utils';

/**
 * Transform Account to PipelineItem
 */
export function accountToPipelineItem(account: Account): PipelineItem {
  // Calculate days since last interaction
  const lastInteractionDays = account.lastInteractionAt
    ? Math.floor((Date.now() - new Date(account.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  // Calculate days since last order (would need to query orders - placeholder for now)
  const lastOrderDays = undefined; // TODO: Calculate from OrderSellOut collection

  return {
    id: account.id,
    name: account.name,
    stage: normalizeStageToPipeline(account.stage) as StageKey,
    city: account.location?.address?.split(',')[0] || 'N/A',
    zone: 'N/A', // TODO: Map from location or add zone field to Account
    lastInteractionDays,
    lastInteractionDate: account.lastInteractionAt ? new Date(account.lastInteractionAt) : undefined,
    lastOrderDays,
    posInstalled: false, // TODO: Add to Account schema or derive from data
    estValueEUR: 0, // TODO: Calculate from historical orders
    isTarget: account.isTarget || false,
    hasAlerts: false, // TODO: Check if account has active alerts
    noConsumption: false, // TODO: Derive from order history
    commercialId: account.ownerId,
    distributorPartyId: account.distributorPartyId,
  };
}

/**
 * Transform multiple Accounts to PipelineItems
 */
export function accountsToPipelineItems(accounts: Account[]): PipelineItem[] {
  return accounts.map(accountToPipelineItem);
}

/**
 * Calculate pipeline metrics from accounts
 */
export function calculatePipelineMetrics(accounts: Account[]) {
  const byStage: Record<StageKey, number> = {
    POTENCIAL: 0,
    SEGUIMIENTO: 0,
    ACTIVA: 0,
    FALLIDA: 0,
  };

  let totalValue = 0;
  let targetsCount = 0;
  let withAlertsCount = 0;

  accounts.forEach(account => {
    if (account.stage && account.stage in byStage) {
      byStage[account.stage as StageKey]++;
    }

    if (account.isTarget) {
      targetsCount++;
    }

    // TODO: Add value calculation when available
    // TODO: Add alerts check when available
  });

  return {
    byStage,
    total: accounts.length,
    totalValue,
    targets: targetsCount,
    withAlerts: withAlertsCount,
  };
}
