/**
 * PIPELINE MAPPERS - Conversión entre tipos antiguos y TaskNew
 * 
 * Facilita la migración gradual del sistema de pipeline
 */

import type { TaskNew, TaskKind, TaskStatusNew, TaskPriority } from '@/domain/ssot';

// =================================================================
// STATUS MAPPERS
// =================================================================

export function mapPipelineStatusToTaskNew(status: string): TaskStatusNew {
  const map: Record<string, TaskStatusNew> = {
    'todo': 'BACKLOG',
    'doing': 'IN_PROGRESS',
    'snoozed': 'SNOOZED',
    'done': 'DONE',
    'cancelled': 'CANCELLED',
  };
  return map[status] || 'BACKLOG';
}

export function mapTaskNewStatusToPipeline(status: TaskStatusNew): string {
  const map: Record<TaskStatusNew, string> = {
    'BACKLOG': 'todo',
    'DRAFT': 'todo',
    'IN_PROGRESS': 'doing',
    'BLOCKED': 'doing',
    'DONE': 'done',
    'CANCELLED': 'cancelled',
    'PROGRAMADA': 'todo',
    'SNOOZED': 'snoozed',
  };
  return map[status] || 'todo';
}

// =================================================================
// KIND MAPPERS
// =================================================================

export function mapPipelineKindToTaskNew(kind: string): TaskKind {
  const map: Record<string, TaskKind> = {
    'interaction': 'INTERACTION',
    'order_prep': 'ORDER_PREP',
    'pos': 'POS',
    'event': 'EVENT',
    'admin': 'ADMIN',
  };
  return map[kind] || 'GENERICA';
}

export function mapTaskNewKindToPipeline(kind: TaskKind): string {
  const map: Record<string, string> = {
    'INTERACTION': 'interaction',
    'ORDER_PREP': 'order_prep',
    'POS': 'pos',
    'EVENT': 'event',
    'ADMIN': 'admin',
    'GENERICA': 'interaction',
    'VISITA': 'interaction',
    'COBRO': 'interaction',
    'PEDIDO': 'order_prep',
    'MARKETING': 'event',
  };
  return map[kind] || 'interaction';
}

// =================================================================
// PRIORITY MAPPERS
// =================================================================

export function mapPipelinePriorityToTaskNew(priority: string): TaskPriority {
  const map: Record<string, TaskPriority> = {
    'low': 'LOW',
    'med': 'MEDIUM',
    'high': 'HIGH',
    'critical': 'URGENT',
  };
  return map[priority] || 'MEDIUM';
}

export function mapTaskNewPriorityToPipeline(priority?: TaskPriority): string {
  if (!priority) return 'med';
  const map: Record<TaskPriority, string> = {
    'LOW': 'low',
    'MEDIUM': 'med',
    'HIGH': 'high',
    'URGENT': 'critical',
  };
  return map[priority] || 'med';
}

// =================================================================
// FULL TASK CONVERSION
// =================================================================

export function convertPipelineTaskToTaskNew(pipelineTask: any): TaskNew {
  return {
    id: pipelineTask.id,
    kind: mapPipelineKindToTaskNew(pipelineTask.kind),
    title: pipelineTask.title,
    desc: pipelineTask.desc,
    status: mapPipelineStatusToTaskNew(pipelineTask.status),
    priority: pipelineTask.priority ? mapPipelinePriorityToTaskNew(pipelineTask.priority) : undefined,
    department: 'VENTAS', // Pipeline tasks son siempre ventas
    source: 'MANUAL',
    dueAt: pipelineTask.dueAt,
    assignedToId: pipelineTask.assigneeId,
    createdById: pipelineTask.assigneeId, // Fallback
    accountId: pipelineTask.accountId,
    orderId: pipelineTask.orderId,
    distributorId: pipelineTask.distributorId,
    snoozeUntil: pipelineTask.snoozeUntil,
    recurrence: pipelineTask.recurrence,
    createdAt: pipelineTask.createdAt,
    updatedAt: pipelineTask.updatedAt || pipelineTask.createdAt,
  };
}
