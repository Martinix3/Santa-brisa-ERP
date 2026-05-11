/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/domain/projects-tasks-unified.ts
// ============================================================================
// UNIFIED PROJECTS + TASKS DOMAIN - Gemini Intelligence Integration
// ============================================================================
// Sistema consolidado que unifica gestión de proyectos y tareas bajo
// el marco de Gemini Intelligence con vínculos directos a todo el ecosistema
// ============================================================================

import { z } from 'zod';
import type { Department, ISODateString } from './ssot';

// ============================================================================
// ENUMS Y TIPOS
// ============================================================================

export const Priority = z.enum(['P0', 'P1', 'P2', 'P3']);
export type PriorityType = z.infer<typeof Priority>;

export const TaskStatus = z.enum([
  'BACKLOG',
  'READY',
  'IN_PROGRESS',
  'BLOCKED',
  'REVIEW',
  'DONE',
  'CANCELLED'
]);
export type TaskStatusType = z.infer<typeof TaskStatus>;

export const ProjectStatus = z.enum([
  'DRAFT',
  'ACTIVE',
  'HOLD',
  'COMPLETED',
  'CANCELED'
]);
export type ProjectStatusType = z.infer<typeof ProjectStatus>;

export const ProjectHealth = z.enum(['GREEN', 'AMBER', 'RED']);
export type ProjectHealthType = z.infer<typeof ProjectHealth>;

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const ProjectKPISchema = z.object({
  name: z.string(),
  target: z.number(),
  current: z.number().default(0),
  unit: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  description: z.string().optional(),

  // Estado y prioridad
  status: ProjectStatus.default('ACTIVE'),
  stage: z.string().optional(), // Para workflow custom
  priority: Priority.default('P2'),

  // Equipo
  ownerId: z.string(),
  memberIds: z.array(z.string()).default([]),

  // Vínculos con entidades
  accountId: z.string().optional(),
  campaignId: z.string().optional(),
  eventId: z.string().optional(),
  department: z.string().optional(),

  // Timeline
  startAt: z.string().optional(), // ISODateString
  dueAt: z.string().optional(),   // ISODateString
  nextAt: z.string().optional(),  // Próxima fecha relevante (calculada)

  // Métricas
  progressPct: z.number().min(0).max(100).default(0),
  health: ProjectHealth.default('GREEN'),
  kpis: z.array(ProjectKPISchema).default([]),

  // Metadata
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  archived: z.boolean().default(false),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).default('TEAM'),

  // Auditoría
  createdAt: z.string(), // ISODateString
  updatedAt: z.string(), // ISODateString
  createdById: z.string().optional(),
});

export const TaskChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean().default(false),
  doneAt: z.string().optional(),
  doneBy: z.string().optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  description: z.string().optional(),

  // Estado y prioridad
  status: TaskStatus.default('BACKLOG'),
  priority: Priority.default('P2'),

  // Vínculos con entidades
  projectId: z.string().optional(),
  accountId: z.string().optional(),
  interactionId: z.string().optional(),
  eventId: z.string().optional(),
  campaignId: z.string().optional(),
  alertId: z.string().optional(),

  // Asignación
  assignedToId: z.string().optional(),
  watcherIds: z.array(z.string()).default([]),

  // Timeline
  dueAt: z.string().optional(),    // ISODateString
  nextAt: z.string().optional(),   // Próxima acción sugerida

  // Estimación
  estimateMins: z.number().optional(),
  effortPts: z.number().optional(), // Story points o similar

  // Dependencias
  blockedByIds: z.array(z.string()).default([]),
  blocksIds: z.array(z.string()).default([]),

  // Checklist
  checklist: z.array(TaskChecklistItemSchema).default([]),

  // Metadata
  tags: z.array(z.string()).default([]),
  result: z.string().optional(),    // Resultado al completar
  context: z.record(z.any()).optional(), // Contexto adicional

  // Auditoría
  createdById: z.string().optional(),
  createdAt: z.string(), // ISODateString
  updatedAt: z.string(), // ISODateString
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
});

export const LinkSchema = z.object({
  id: z.string(),
  kind: z.enum(['PROJECT', 'TASK']),
  srcId: z.string(),
  refKind: z.enum(['ACCOUNT', 'EVENT', 'CAMPAIGN', 'INTERACTION', 'ORDER', 'ALERT']),
  refId: z.string(),
  createdAt: z.string(),
  createdBy: z.string().optional(),
});

export const GeminiAnalysisSchema = z.object({
  id: z.string(),
  kind: z.enum(['PROJECT', 'TASK']),
  targetId: z.string(),

  // Insights generados
  insights: z.array(z.object({
    type: z.enum(['RISK', 'OPPORTUNITY', 'BLOCKER', 'SUGGESTION', 'DUPLICATE']),
    text: z.string(),
    weight: z.number().min(0).max(1), // Confianza 0-1
    actionable: z.boolean().default(false),
  })).default([]),

  // Acciones propuestas
  proposedActions: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    priority: Priority,
  })).default([]),

  // Métricas
  riskScore: z.number().min(0).max(1).default(0),
  duplicatesOf: z.array(z.string()).default([]),

  // Auditoría
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// TYPES (inferidos de schemas)
// ============================================================================

export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskChecklistItem = z.infer<typeof TaskChecklistItemSchema>;
export type ProjectKPI = z.infer<typeof ProjectKPISchema>;
export type Link = z.infer<typeof LinkSchema>;
export type GeminiAnalysis = z.infer<typeof GeminiAnalysisSchema>;

// ============================================================================
// PLANTILLAS DE PROYECTOS
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'SALES' | 'MARKETING' | 'PRODUCTION' | 'QUALITY' | 'CUSTOM';
  defaultPriority: PriorityType;
  defaultDurationDays: number;

  // KPIs predefinidos
  kpis: Array<{
    name: string;
    target: number;
    unit: string;
  }>;

  // Tareas plantilla
  tasks: Array<{
    title: string;
    description?: string;
    priority: PriorityType;
    estimateMins?: number;
    offsetDays: number; // Días desde inicio del proyecto
    checklist?: string[];
  }>;
}

// Plantillas predefinidas
export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  VISITA_CLIENTE: {
    id: 'VISITA_CLIENTE',
    name: 'Visita a Cliente',
    description: 'Flujo completo de visita comercial',
    category: 'SALES',
    defaultPriority: 'P1',
    defaultDurationDays: 14,
    kpis: [
      { name: 'Pedidos generados', target: 1, unit: 'pedidos' },
      { name: 'Valor pedidos', target: 1000, unit: 'EUR' },
    ],
    tasks: [
      {
        title: 'Planificar visita',
        description: 'Revisar historial, preparar agenda',
        priority: 'P1',
        estimateMins: 30,
        offsetDays: 0,
        checklist: ['Revisar últimos pedidos', 'Preparar muestras', 'Confirmar cita'],
      },
      {
        title: 'Realizar visita',
        priority: 'P0',
        estimateMins: 120,
        offsetDays: 7,
      },
      {
        title: 'Follow-up post-visita',
        description: 'Enviar resumen y próximos pasos',
        priority: 'P1',
        estimateMins: 20,
        offsetDays: 8,
        checklist: ['Enviar email resumen', 'Registrar pedido si aplica', 'Programar próxima visita'],
      },
      {
        title: 'Cerrar proyecto',
        priority: 'P2',
        estimateMins: 15,
        offsetDays: 14,
      },
    ],
  },

  CAMPAÑA_MARKETING: {
    id: 'CAMPAÑA_MARKETING',
    name: 'Campaña de Marketing',
    description: 'Lanzamiento de campaña completa',
    category: 'MARKETING',
    defaultPriority: 'P1',
    defaultDurationDays: 30,
    kpis: [
      { name: 'Alcance', target: 10000, unit: 'personas' },
      { name: 'Conversiones', target: 100, unit: 'leads' },
      { name: 'ROI', target: 3, unit: 'x' },
    ],
    tasks: [
      {
        title: 'Briefing y objetivos',
        priority: 'P0',
        estimateMins: 120,
        offsetDays: 0,
      },
      {
        title: 'Crear assets creativos',
        priority: 'P1',
        estimateMins: 480,
        offsetDays: 3,
      },
      {
        title: 'Plan de medios',
        priority: 'P1',
        estimateMins: 180,
        offsetDays: 7,
      },
      {
        title: 'Lanzamiento',
        priority: 'P0',
        estimateMins: 60,
        offsetDays: 14,
      },
      {
        title: 'Medición y optimización',
        priority: 'P1',
        estimateMins: 120,
        offsetDays: 21,
      },
      {
        title: 'Informe final',
        priority: 'P2',
        estimateMins: 90,
        offsetDays: 30,
      },
    ],
  },

  PROYECTO_PRODUCCION: {
    id: 'PROYECTO_PRODUCCION',
    name: 'Proyecto de Producción',
    description: 'Ciclo completo de producción',
    category: 'PRODUCTION',
    defaultPriority: 'P1',
    defaultDurationDays: 21,
    kpis: [
      { name: 'Unidades producidas', target: 1000, unit: 'units' },
      { name: 'Eficiencia', target: 95, unit: '%' },
      { name: 'Calidad', target: 99, unit: '%' },
    ],
    tasks: [
      {
        title: 'Kick-off y planificación',
        priority: 'P0',
        estimateMins: 90,
        offsetDays: 0,
      },
      {
        title: 'Verificar stock y compras',
        priority: 'P1',
        estimateMins: 60,
        offsetDays: 1,
      },
      {
        title: 'Ejecución producción',
        priority: 'P0',
        estimateMins: 480,
        offsetDays: 7,
      },
      {
        title: 'Control de calidad',
        priority: 'P0',
        estimateMins: 120,
        offsetDays: 14,
      },
      {
        title: 'Cierre y documentación',
        priority: 'P2',
        estimateMins: 60,
        offsetDays: 21,
      },
    ],
  },
};

// ============================================================================
// REGLAS DE NEGOCIO
// ============================================================================

/**
 * Calcula la salud de un proyecto basado en tareas y métricas
 */
export function computeProjectHealth(params: {
  tasks: Task[];
  plan?: {
    plannedVsActualPct: number;
  };
}): ProjectHealthType {
  const { tasks, plan } = params;
  const now = new Date();

  // Tareas vencidas
  const overdue = tasks.filter(t =>
    t.dueAt &&
    t.status !== 'DONE' &&
    t.status !== 'CANCELLED' &&
    new Date(t.dueAt) < now
  );

  // Tareas P0 bloqueadas > 48h
  const criticalBlocked = tasks.some(t => {
    if (t.priority !== 'P0' || t.status !== 'BLOCKED') return false;
    const hoursSince = (now.getTime() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
    return hoursSince > 48;
  });

  // Desviación del plan
  const drift = plan?.plannedVsActualPct ?? 0;

  // Determinar salud
  if (criticalBlocked || overdue.length > 3) return 'RED';
  if (overdue.length > 0 || drift > 20) return 'AMBER';
  return 'GREEN';
}

/**
 * Calcula el progreso de un proyecto basado en sus tareas
 */
export function computeProjectProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const done = tasks.filter(t => t.status === 'DONE').length;
  return Math.round((done / tasks.length) * 100);
}

/**
 * Calcula la próxima fecha relevante de un proyecto
 */
export function computeProjectNextAt(params: {
  tasks: Task[];
  dueAt?: string;
}): string | undefined {
  const { tasks, dueAt } = params;
  const now = new Date();

  // Buscar próxima tarea con fecha
  const upcomingTasks = tasks
    .filter(t =>
      t.dueAt &&
      t.status !== 'DONE' &&
      t.status !== 'CANCELLED' &&
      new Date(t.dueAt) >= now
    )
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

  if (upcomingTasks.length > 0) {
    return upcomingTasks[0].dueAt;
  }

  return dueAt;
}

/**
 * Genera tareas desde una plantilla
 */
export function generateTasksFromTemplate(
  template: ProjectTemplate,
  projectStartDate: Date,
  projectId: string
): Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] {
  return template.tasks.map((taskTemplate, index) => {
    const dueDate = new Date(projectStartDate);
    dueDate.setDate(dueDate.getDate() + taskTemplate.offsetDays);

    return {
      title: taskTemplate.title,
      description: taskTemplate.description,
      status: 'BACKLOG' as TaskStatusType,
      priority: taskTemplate.priority,
      projectId,
      estimateMins: taskTemplate.estimateMins,
      dueAt: dueDate.toISOString(),
      checklist: (taskTemplate.checklist || []).map((text, idx) => ({
        id: `${index}-${idx}`,
        text,
        done: false,
      })),
      tags: [],
      watcherIds: [],
      blockedByIds: [],
      blocksIds: [],
    };
  });
}

// ============================================================================
// METADATA Y CONSTANTES
// ============================================================================

export const PRIORITY_META: Record<PriorityType, {
  label: string;
  className: string;
  weight: number;
}> = {
  P0: { label: 'Crítica', className: 'sb-badge--destructive', weight: 4 },
  P1: { label: 'Alta', className: 'sb-badge--warning', weight: 3 },
  P2: { label: 'Media', className: 'sb-badge--info', weight: 2 },
  P3: { label: 'Baja', className: 'sb-badge--default', weight: 1 },
};

export const TASK_STATUS_META: Record<TaskStatusType, {
  label: string;
  className: string;
  icon: string;
}> = {
  BACKLOG: { label: 'Backlog', className: 'sb-badge--default', icon: '📋' },
  READY: { label: 'Lista', className: 'sb-badge--info', icon: '✅' },
  IN_PROGRESS: { label: 'En Progreso', className: 'sb-badge--primary', icon: '🔄' },
  BLOCKED: { label: 'Bloqueada', className: 'sb-badge--destructive', icon: '🚫' },
  REVIEW: { label: 'En Revisión', className: 'sb-badge--warning', icon: '👀' },
  DONE: { label: 'Completada', className: 'sb-badge--success', icon: '✓' },
  CANCELLED: { label: 'Cancelada', className: 'sb-badge--default', icon: '✗' },
};

export const PROJECT_STATUS_META: Record<ProjectStatusType, {
  label: string;
  className: string;
  icon: string;
}> = {
  DRAFT: { label: 'Borrador', className: 'sb-badge--default', icon: '📝' },
  ACTIVE: { label: 'Activo', className: 'sb-badge--primary', icon: '🚀' },
  HOLD: { label: 'En Pausa', className: 'sb-badge--warning', icon: '⏸️' },
  COMPLETED: { label: 'Completado', className: 'sb-badge--success', icon: '✓' },
  CANCELED: { label: 'Cancelado', className: 'sb-badge--default', icon: '✗' },
};

export const PROJECT_HEALTH_META: Record<ProjectHealthType, {
  label: string;
  className: string;
  icon: string;
}> = {
  GREEN: { label: 'Saludable', className: 'text-success', icon: '🟢' },
  AMBER: { label: 'Atención', className: 'text-warning', icon: '🟡' },
  RED: { label: 'Crítico', className: 'text-destructive', icon: '🔴' },
};

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================

/**
 * Valida que una tarea pueda ser marcada como DONE
 */
export function canCompleteTask(task: Task): {
  canComplete: boolean;
  reason?: string;
} {
  // Verificar checklist
  const incompleteChecklist = task.checklist.filter(item => !item.done);
  if (incompleteChecklist.length > 0) {
    return {
      canComplete: false,
      reason: `Quedan ${incompleteChecklist.length} items pendientes en el checklist`,
    };
  }

  // Verificar dependencias
  if (task.blockedByIds.length > 0) {
    return {
      canComplete: false,
      reason: 'La tarea está bloqueada por otras tareas',
    };
  }

  return { canComplete: true };
}

/**
 * Valida que un proyecto pueda ser marcado como COMPLETED
 */
export function canCompleteProject(project: Project, tasks: Task[]): {
  canComplete: boolean;
  reason?: string;
} {
  const incompleteTasks = tasks.filter(t =>
    t.status !== 'DONE' && t.status !== 'CANCELLED'
  );

  if (incompleteTasks.length > 0) {
    return {
      canComplete: false,
      reason: `Quedan ${incompleteTasks.length} tareas pendientes`,
    };
  }

  return { canComplete: true };
}
