/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/domain/campaigns.ts
/**
 * Types para el sistema de Campañas (Santa Brain Fase 2)
 */

export type CampaignType = 'PRODUCT_LAUNCH' | 'SKU_PUSH' | 'EVENT' | 'QUOTA_SPRINT';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type GoalType = 'VISITS' | 'ORDERS' | 'REVENUE' | 'SKU_PLACEMENT';
export type GoalUnit = 'units' | 'EUR' | 'visits';

export type AssignmentStrategy = 'ACCOUNT_OWNER' | 'ROUND_ROBIN' | 'CUSTOM';

export interface CampaignGoal {
  type: GoalType;
  target: number;
  unit: GoalUnit;
  perRep?: boolean;
}

export interface CampaignActions {
  createTasks?: {
    template: string;
    priority: 'low' | 'med' | 'high' | 'critical';
    dueInDays: number;
    assignmentStrategy: AssignmentStrategy;
  };
  sendNotification?: {
    channel: 'INAPP' | 'EMAIL';
    message: string;
  };
}

export interface CampaignProgress {
  repId: string;
  current: number;
  target: number;
}

export interface Campaign {
  id: string;
  type: CampaignType;
  name: string;
  description?: string;
  status: CampaignStatus;
  
  // Timing
  startDate: Date;
  endDate: Date;
  
  // Target
  targetAccounts?: string[]; // accountIds
  targetStages?: string[];   // ['ACTIVA', 'POTENCIAL']
  targetReps?: string[];     // teamMemberIds
  
  // Goals
  goals: CampaignGoal[];
  
  // Actions
  actions: CampaignActions;
  
  // Tracking
  progress: CampaignProgress[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== DAILY QUOTAS =====

export type QuotaStatus = 'ON_TRACK' | 'AT_RISK' | 'BEHIND';

export interface QuotaItem {
  target: number;
  current: number;
}

export interface DailyQuota {
  repId: string;
  date: string; // YYYY-MM-DD
  quotas: {
    visits: QuotaItem;
    calls: QuotaItem;
    orders: QuotaItem;
  };
  status: QuotaStatus;
  lastUpdated: Date;
}

// ===== HELPERS =====

export function calculateProgress(campaign: Campaign, goalType: GoalType): number {
  const goal = campaign.goals.find(g => g.type === goalType);
  if (!goal) return 0;
  
  return campaign.progress.reduce((sum, p) => sum + p.current, 0);
}

export function calculatePercentage(campaign: Campaign, goalType: GoalType): number {
  const goal = campaign.goals.find(g => g.type === goalType);
  if (!goal) return 0;
  
  const current = calculateProgress(campaign, goalType);
  return Math.min(100, Math.round((current / goal.target) * 100));
}

export function daysRemaining(endDate: Date): number {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { 
    day: '2-digit', 
    month: 'short' 
  }).format(date);
}

export function getCampaignIcon(type: CampaignType): string {
  switch (type) {
    case 'PRODUCT_LAUNCH': return '🎉';
    case 'SKU_PUSH': return '📦';
    case 'EVENT': return '🎪';
    case 'QUOTA_SPRINT': return '🎯';
  }
}

export function getStatusColor(status: CampaignStatus): string {
  switch (status) {
    case 'ACTIVE': return 'sb-badge--success';
    case 'PAUSED': return 'sb-badge';
    case 'DRAFT': return 'sb-badge--primary';
    case 'COMPLETED': return 'sb-badge';
  }
}
