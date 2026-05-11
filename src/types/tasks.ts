/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import type { TaskNew } from "@/domain/ssot";

/**
 * Task with calculated KPIs for display
 */
export interface TaskWithKPIs extends TaskNew {
  daysUntilDue?: number;
  isOverdue: boolean;
  priorityScore: number;
}

/**
 * Global KPIs for tasks overview
 */
export interface TasksKPIs {
  total: number;
  today: number;
  thisWeek: number;
  overdue: number;
  priority: number;
  byStatus: {
    BACKLOG: number;
    IN_PROGRESS: number;
    DONE: number;
  };
}
