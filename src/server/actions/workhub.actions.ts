// FILE: src/server/actions/workhub.actions.ts
// ============================================================================
// WORKHUB SERVER ACTIONS - SSOT V2 Plus Integration
// ============================================================================
// Server actions para el WorkHub unificado de Tasks y Projects
// Integra con servicios canónicos y Gemini Intelligence
// ============================================================================

'use server';

import { WorkItemService } from '@/services/canonical/workitem.service';
import { TaskService } from '@/services/canonical/task.service';
import { ProjectService } from '@/services/canonical/project.service';
import type { WorkItem } from '@/domain/workitem';
import type { Task, Project } from '@/domain/projects-tasks-unified';
import type { TaskNew } from '@/domain/ssot';

// ============================================================================
// WORKITEMS - GET
// ============================================================================

/**
 * Obtiene WorkItems unificados (Tasks + Projects) para un usuario
 */
export async function getWorkItems(params: {
  userId?: string;
  type?: 'task' | 'project' | 'all';
  status?: string[];
  priority?: string[];
  department?: string;
}): Promise<{ success: boolean; data?: WorkItem[]; error?: string }> {
  try {
    const items = await WorkItemService.getWorkItems(params);
    return { success: true, data: items };
  } catch (error: any) {
    console.error('[workhub.actions] getWorkItems error:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener work items',
    };
  }
}

/**
 * Obtiene el Focus del Día para un usuario
 */
export async function getDailyFocus(userId: string): Promise<{
  success: boolean;
  data?: {
    topTasks: Array<{ taskId: string; reason: string; urgency: number }>;
    quickWins: Array<{ taskId: string; estimatedMins: number }>;
    blockers: Array<{ taskId: string; blocker: string }>;
  };
  error?: string;
}> {
  try {
    const focus = await WorkItemService.getDailyFocus(userId);
    return { success: true, data: focus };
  } catch (error: any) {
    console.error('[workhub.actions] getDailyFocus error:', error);
    return {
      success: false,
      error: error.message || 'Error al generar focus del día',
    };
  }
}

// ============================================================================
// TASKS - CRUD
// ============================================================================

// Helper para mapear prioridad legacy a nueva
function mapPriority(p?: string): any {
  if (p === 'P0') return 'URGENT';
  if (p === 'P1') return 'HIGH';
  if (p === 'P2') return 'MEDIUM';
  if (p === 'P3') return 'LOW';
  return p;
}

/**
 * Crea una nueva tarea
 */
export async function createTask(
  data: Partial<Task>
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const payload: Partial<TaskNew> = {
      ...data,
      priority: mapPriority(data.priority),
      status: data.status as any, // Cast status to compatible type
    };
    return await TaskService.createTask(payload);
  } catch (error: any) {
    console.error('[workhub.actions] createTask error:', error);
    return {
      success: false,
      error: error.message || 'Error al crear tarea',
    };
  }
}

/**
 * Actualiza una tarea
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Partial<TaskNew> = {
      ...updates,
      priority: mapPriority(updates.priority),
      status: updates.status as any, // Cast status
    };
    return await TaskService.updateTask(taskId, payload, userId);
  } catch (error: any) {
    console.error('[workhub.actions] updateTask error:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar tarea',
    };
  }
}

/**
 * Elimina una tarea (soft delete)
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await TaskService.deleteTask(taskId, userId);
  } catch (error: any) {
    console.error('[workhub.actions] deleteTask error:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar tarea',
    };
  }
}

// ============================================================================
// PROJECTS - CRUD
// ============================================================================

/**
 * Crea un nuevo proyecto
 */
export async function createProject(
  data: Partial<Project>
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    return await ProjectService.createProject(data);
  } catch (error: any) {
    console.error('[workhub.actions] createProject error:', error);
    return {
      success: false,
      error: error.message || 'Error al crear proyecto',
    };
  }
}

/** Obtiene un proyecto por ID */
export async function getProjectById(
  projectId: string
): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const data = await ProjectService.getProject(projectId);
    if (!data) return { success: false, error: 'Proyecto no encontrado' };
    return { success: true, data };
  } catch (error: any) {
    console.error('[workhub.actions] getProjectById error:', error);
    return { success: false, error: error.message || 'Error al obtener proyecto' };
  }
}

/** Lista proyectos (básico) */
export async function listProjects(
  filters: Partial<{ ownerId: string; archived: boolean }> = {}
): Promise<{ success: boolean; data: Project[]; error?: string }> {
  try {
    const data = await ProjectService.getProjects({
      ownerId: filters.ownerId,
      archived: filters.archived,
    } as any);
    return { success: true, data };
  } catch (error: any) {
    console.error('[workhub.actions] listProjects error:', error);
    return { success: false, data: [], error: error.message || 'Error al listar proyectos' };
  }
}

/**
 * Crea un proyecto y sus tareas asociadas
 */
export async function createProjectWithTasks(
  data: Partial<Project>,
  tasks: Array<Partial<TaskNew>> = []
): Promise<{ success: boolean; projectId?: string; createdTasks?: number; errors?: string[]; error?: string }> {
  try {
    const result = await ProjectService.createProject(data);
    if (!result.success || !result.projectId) return { success: false, error: result.error || 'No se pudo crear el proyecto' };

    let created = 0;
    const errors: string[] = [];
    for (const t of tasks) {
      // Completar campos mínimos y vincular al proyecto
      const payload: Partial<TaskNew> = {
        title: t.title,
        desc: t.desc || (t as any).description,
        status: (t.status as any) || 'BACKLOG',
        priority: (() => {
          const p = t.priority as any;
          if (p === 'P0') return 'URGENT';
          if (p === 'P1') return 'HIGH';
          if (p === 'P2') return 'MEDIUM';
          if (p === 'P3') return 'LOW';
          return 'MEDIUM';
        })(),
        department: (t.department as any) || (data.department as any) || 'VENTAS',
        assignedToId: t.assignedToId || data.ownerId || 'demo-user',
        createdById: t.createdById || data.ownerId || t.assignedToId || 'demo-user',
        dueAt: t.dueAt,
        projectId: result.projectId,
        source: t.source || 'MANUAL',
      };

      const res = await TaskService.createTask(payload);
      if (res.success) created += 1; else errors.push(res.error || 'Error al crear tarea');
    }

    return { success: true, projectId: result.projectId, createdTasks: created, errors: errors.length ? errors : undefined };
  } catch (error: any) {
    console.error('[workhub.actions] createProjectWithTasks error:', error);
    return {
      success: false,
      error: error.message || 'Error al crear proyecto con tareas',
    };
  }
}

/** Añade tareas a un proyecto existente */
export async function addTasksToProject(
  projectId: string,
  tasks: Array<Partial<TaskNew>>
): Promise<{ success: boolean; createdTasks?: number; errors?: string[]; error?: string }> {
  try {
    let created = 0;
    const errors: string[] = [];

    for (const t of tasks) {
      const payload: Partial<TaskNew> = {
        title: t.title,
        desc: t.desc || (t as any).description,
        status: (t.status as any) || 'BACKLOG',
        priority: (t.priority as any) || 'MEDIUM',
        department: (t.department as any) || 'VENTAS',
        assignedToId: t.assignedToId || (t as any).ownerId || 'demo-user',
        createdById: t.createdById || t.assignedToId || 'demo-user',
        dueAt: t.dueAt,
        projectId,
        source: t.source || 'MANUAL',
      };
      const res = await TaskService.createTask(payload);
      if (res.success) created += 1; else errors.push(res.error || 'Error al crear tarea');
    }

    return { success: true, createdTasks: created, errors: errors.length ? errors : undefined };
  } catch (error: any) {
    console.error('[workhub.actions] addTasksToProject error:', error);
    return {
      success: false,
      error: error.message || 'Error al añadir tareas al proyecto',
    };
  }
}

/**
 * Actualiza un proyecto
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<{ success: boolean; error?: string }> {
  try {
    return await ProjectService.updateProject(projectId, updates);
  } catch (error: any) {
    console.error('[workhub.actions] updateProject error:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar proyecto',
    };
  }
}

/**
 * Archiva un proyecto (soft delete)
 */
export async function archiveProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await ProjectService.archiveProject(projectId);
  } catch (error: any) {
    console.error('[workhub.actions] archiveProject error:', error);
    return {
      success: false,
      error: error.message || 'Error al archivar proyecto',
    };
  }
}

// ============================================================================
// KANBAN - MOVE
// ============================================================================

/**
 * Mueve un WorkItem entre columnas del Kanban
 */
export async function moveWorkItem(params: {
  itemId: string;
  itemType: 'task' | 'project';
  from: WorkItem['status'];
  to: WorkItem['status'];
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { itemId, itemType, to, userId } = params;

    if (itemType === 'task') {
      // Mapear WorkItem status a TaskStatus
      const taskStatus = (() => {
        if (to === 'DONE') return 'DONE';
        if (to === 'IN_PROGRESS') return 'IN_PROGRESS';
        if ((to as string) === 'CANCELLED') return 'CANCELLED'; // Added CANCELED status mapping
        return 'BACKLOG';
      })();

      return await TaskService.updateTask(itemId, { status: taskStatus }, userId);
    } else {
      // Mapear WorkItem status a ProjectStatus
      const projectStatus = (() => {
        if (to === 'DONE') return 'COMPLETED';
        if (to === 'IN_PROGRESS') return 'ACTIVE';
        return 'DRAFT';
      })();

      return await ProjectService.updateProject(itemId, { status: projectStatus });
    }
  } catch (error: any) {
    console.error('[workhub.actions] moveWorkItem error:', error);
    return {
      success: false,
      error: error.message || 'Error al mover item',
    };
  }
}

// ============================================================================
// GEMINI INTELLIGENCE
// ============================================================================

/**
 * Detecta duplicados de una tarea
 */
export async function detectTaskDuplicates(
  taskId: string
): Promise<{
  success: boolean;
  data?: { duplicates: Array<{ taskId: string; similarity: number; reason: string }>; shouldMerge: boolean };
  error?: string;
}> {
  try {
    const result = await WorkItemService.detectDuplicates(taskId);
    return result;
  } catch (error: any) {
    console.error('[workhub.actions] detectTaskDuplicates error:', error);
    return {
      success: false,
      error: error.message || 'Error al detectar duplicados',
    };
  }
}

/**
 * Sugiere agrupación de tareas en proyecto
 */
export async function suggestTaskGrouping(
  taskIds: string[]
): Promise<{
  success: boolean;
  data?: {
    shouldGroup: boolean;
    reason: string;
    suggestedProject?: {
      title: string;
      description: string;
      priority: string;
      taskIds: string[];
    };
  };
  error?: string;
}> {
  try {
    const result = await WorkItemService.suggestGrouping(taskIds);
    return result;
  } catch (error: any) {
    console.error('[workhub.actions] suggestTaskGrouping error:', error);
    return {
      success: false,
      error: error.message || 'Error al sugerir agrupación',
    };
  }
}

/**
 * Analiza riesgos de un proyecto
 */
export async function analyzeProjectRisks(
  projectId: string
): Promise<{
  success: boolean;
  data?: {
    riskScore: number;
    risks: Array<{
      type: string;
      severity: string;
      description: string;
      mitigation?: string;
    }>;
    healthPrediction: string;
  };
  error?: string;
}> {
  try {
    const result = await WorkItemService.analyzeProject(projectId);
    return result;
  } catch (error: any) {
    console.error('[workhub.actions] analyzeProjectRisks error:', error);
    return {
      success: false,
      error: error.message || 'Error al analizar riesgos',
    };
  }
}

/**
 * Convierte tareas en proyecto
 */
export async function convertTasksToProject(
  taskIds: string[],
  projectData: Partial<Project>
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    return await WorkItemService.convertTasksToProject(taskIds, projectData);
  } catch (error: any) {
    console.error('[workhub.actions] convertTasksToProject error:', error);
    return {
      success: false,
      error: error.message || 'Error al convertir tareas en proyecto',
    };
  }
}
