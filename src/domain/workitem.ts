/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

export interface WorkItem {
  id: string;
  type: 'task' | 'project' | 'campaign' | 'event' | 'visit';
  title: string;
  desc?: string;
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE';
  priority?: 'low' | 'medium' | 'high';
  dueAt?: string;
  kpis?: Record<string, number>;
  trend?: 'up' | 'down' | 'flat';
  department?: string;
  linkedAlerts?: string[];
  linkedEntity?: string; // projectId, campaignId, etc.
  isOverdue?: boolean;
  daysUntilDue?: number;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  participants?: string[];
  metadata?: Record<string, any>;
}
