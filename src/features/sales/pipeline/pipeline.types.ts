// src/features/sales/pipeline/pipeline.types.ts

/**
 * PIPELINE DE VENTAS INTELIGENTE - Types
 * 
 * Sistema unificado con Tasks para 70+ cuentas por stage
 * Mobile-first, filtrado inteligente, priorización automática
 */

import type { Stage, ISODateString, Segment } from '@/domain/ssot';

// =================================================================
// TASKS (Única colección para todo)
// =================================================================

export type TaskKind = 'interaction' | 'order_prep' | 'pos' | 'event' | 'admin';
export type TaskStatus = 'todo' | 'doing' | 'snoozed' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'med' | 'high' | 'critical';

export interface Recurrence {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  byWeekday?: number[]; // 0=Monday, 6=Sunday
}

export interface Task {
  id: string;
  kind: TaskKind;
  title: string;
  desc?: string;
  
  // Relaciones
  accountId?: string;
  distributorId?: string;
  orderId?: string;
  
  // Asignación
  assigneeId: string;
  teamId?: string;
  
  // Planificación
  dueAt?: ISODateString;
  snoozeUntil?: ISODateString;
  recurrence?: Recurrence;
  
  // Metadatos
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[];
  objective?: boolean;
  zone?: string;
  channel?: 'HORECA' | 'RETAIL' | 'FINAL' | 'OTRO';
  
  // Integración
  origin?: {
    provider: string;
    eventId?: string;
    eventType?: string;
  };
  externalIds?: {
    holded?: string;
    shopify?: string;
    gcal?: string;
  };
  
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  doneAt?: ISODateString;
}

// =================================================================
// PIPELINE ACCOUNT VIEW (Denormalizado)
// =================================================================

export interface PipelineAccountView {
  // Identity
  id: string;
  name: string;
  tradeName?: string;
  
  // Classification
  stage: Stage;
  segment: Segment;
  
  // Location
  city?: string;
  province?: string;
  
  // Ownership
  salesRepId: string;
  salesRepName: string;
  distributorId?: string;
  distributorName?: string;
  
  // Activity metrics (últimos 30d)
  totalOrders30d: number;
  totalRevenue30d: number;
  lastOrderDate?: ISODateString;
  lastInteractionDate?: ISODateString;
  lastInteractionKind?: string;
  
  // Tasks
  openTasksCount: number;
  nextTaskDueAt?: ISODateString;
  nextTaskTitle?: string;
  
  // Flags
  isObjective: boolean;
  isTargeted: boolean;
  
  // Intelligence
  priorityScore: number; // 0-100
  alerts: PipelineAlert[];
  
  // Quick stats
  orderCount90d: number;
  interactionCount30d: number;
  daysSinceLastContact: number;
  daysSinceLastOrder: number;
  
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PipelineAlert {
  type: 'no_contact' | 'no_order' | 'pending_action' | 'opportunity' | 'risk';
  severity: 'low' | 'medium' | 'high';
  message: string;
  daysCount?: number;
  actionable?: boolean;
}

// =================================================================
// FILTROS
// =================================================================

export interface PipelineFilters {
  salesRepIds?: string[];
  showOnlyMine?: boolean;
  
  segments?: Segment[];
  stages?: Stage[];
  
  cities?: string[];
  provinces?: string[];
  
  onlyObjectives?: boolean;
  onlyTargeted?: boolean;
  
  distributorIds?: string[];
  distributionFlow?: 'DIRECT' | 'PLACEMENT';
  
  hasRecentContact?: boolean;
  hasRecentOrder?: boolean;
  
  alertTypes?: PipelineAlert['type'][];
  
  searchQuery?: string;
  
  sortBy?: 'name' | 'lastContact' | 'lastOrder' | 'priority' | 'revenue';
  sortOrder?: 'asc' | 'desc';
}

// =================================================================
// STATS
// =================================================================

export interface PipelineStats {
  byStage: Record<Stage, {
    count: number;
    totalRevenue30d: number;
    avgPriority: number;
    withRecentContact: number;
    withAlerts: number;
  }>;
  
  totalAccounts: number;
  totalRevenue30d: number;
  totalRevenue90d: number;
  accountsWithoutContact30d: number;
  accountsWithoutOrder60d: number;
  objectivesCount: number;
  targetsCount: number;
  
  topAccountsByRevenue: Array<{ id: string; name: string; revenue: number }>;
  topAccountsByActivity: Array<{ id: string; name: string; interactions: number }>;
}

// =================================================================
// QUICK ACTIONS
// =================================================================

export type QuickActionType = 
  | 'call'
  | 'note'
  | 'order'
  | 'visit'
  | 'pos'
  | 'event'
  | 'objective'
  | 'target';

export interface QuickActionPayload {
  accountId: string;
  type: QuickActionType;
  title?: string;
  dueAt?: ISODateString;
  priority?: TaskPriority;
  tags?: string[];
}

// =================================================================
// SANTABRAIN SUGGESTIONS
// =================================================================

export interface PipelineSuggestion {
  id: string;
  type: 'follow_up' | 'promotion' | 'visit' | 'order_opportunity' | 'risk_alert';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionLabel?: string;
  
  reasoning: string;
  confidence: number; // 0-1
  expiresAt?: ISODateString;
  
  accountId?: string;
}

// =================================================================
// DRAG & DROP
// =================================================================

export interface DragDropPayload {
  accountId: string;
  fromStage: Stage;
  toStage: Stage;
  userId: string;
}

// =================================================================
// CALENDAR VIEW
// =================================================================

export interface CalendarDay {
  date: ISODateString; // YYYY-MM-DD
  tasks: Task[];
  overdue: number;
  today: number;
  upcoming: number;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}
