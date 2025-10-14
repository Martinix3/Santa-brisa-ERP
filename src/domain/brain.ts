// src/domain/brain.ts
/**
 * SANTA BRAIN - Types for Control Panel
 */

// =================================================================
// SYSTEM CONFIG
// =================================================================

export interface BrainConfig {
  schedules: {
    dailyMorningHour: number; // 9
    dailyEveningHour: number; // 19
    visitFollowupHours: number; // 3
  };
  thresholds: {
    noTouchDays30: number;
    noTouchDays60: number;
    noOrderDays45: number;
    noOrderDays90: number;
  };
  strictCanonWrites: boolean;
}

// =================================================================
// RULES
// =================================================================

export type RuleScope = 'DAILY' | 'WEEKLY' | 'EVENT_DRIVEN';
export type RuleSeverity = 'INFO' | 'WARN' | 'CRIT';
export type RuleConditionKind = 'ACCOUNT' | 'TASK' | 'QUICKLOG';

export interface RuleCondition {
  kind: RuleConditionKind;
  stageIn?: string[]; // ['ACTIVA', 'SEGUIMIENTO']
  commercialFlowIn?: ('DIRECT' | 'PLACEMENT')[]; 
  segmentIn?: string[]; // ['HORECA', 'RETAIL']
  minDaysSinceLastInteraction?: number;
  minDaysSinceLastOrder?: number;
  hasOpenTasks?: boolean;
}

export interface RuleAction {
  createTask?: {
    title: string; // puede incluir {{account.name}}
    dueInDays: number;
    priority: 'low' | 'med' | 'high' | 'critical';
    assignTo: 'ACCOUNT_OWNER' | 'SPECIFIC_USER' | 'DISTRIBUTOR';
    reason?: string; // NO_TOUCH_30, NO_ORDER_45
    tags?: string[];
  };
  sendAlert?: {
    channel: 'INAPP' | 'EMAIL';
    message: string; // puede incluir {{account.name}}, {{count}}
  };
  proposeVisit?: {
    when: 'THIS_WEEK' | 'NEXT_WEEK';
  };
}

export interface BrainRule {
  id: string;
  enabled: boolean;
  scope: RuleScope;
  name: string;
  description?: string;
  severity: RuleSeverity;
  dedupeHours: number; // 24, 48, etc.
  condition: RuleCondition;
  action: RuleAction;
}

// =================================================================
// LOGS (for dedupe)
// =================================================================

export interface BrainLogEntry {
  at: string; // ISO timestamp
  ruleId?: string;
  campaignId?: string;
  accountId?: string;
  userId?: string;
  action: 'createTask' | 'sendAlert' | 'proposeVisit';
  payloadHash: string; // for dedupe
}

// =================================================================
// SIMULATION RESULTS
// =================================================================

export interface SimulationResult {
  totalActions: number;
  byUser: Record<string, number>; // userId -> count
  accounts: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  preview: string; // human-readable summary
}
