// FILE: src/services/canonical/workitem.service.ts
// ============================================================================
// WORKITEM SERVICE - Facade Unificado para Tasks y Projects
// ============================================================================
// Proporciona una API unificada que combina TaskService, ProjectService
// y WorkItemAnalyzer para el frontend
// ============================================================================

import { TaskService } from './task.service';
import { ProjectService } from './project.service';
import { workItemAnalyzer } from '@/server/gemini/analyzers/workitem-analyzer';
import type { TaskNew, Project as SsotProject, Department as SsotDepartment } from '@/domain/ssot';
import type { Task, Project } from '@/domain/projects-tasks-unified';
import type { WorkItem } from '@/domain/workitem';

// ============================================================================
// WORKITEM SERVICE CLASS
// ============================================================================

export class WorkItemService {
  
  /**
   * Obtiene el "Focus del Día" para un usuario
   */
  static async getDailyFocus(userId: string) {
    const tasks = await TaskService.getTasks({ 
      assignedToId: userId,
      // SSOT v2+: estados válidos
      status: ['BACKLOG', 'DRAFT', 'IN_PROGRESS', 'BLOCKED', 'SNOOZED', 'PROGRAMADA'] as any,
    });
    
    const projects = await ProjectService.getProjects({ 
      ownerId: userId,
      archived: false,
    });
    
    // Adaptar Projects (unified) → SSOT Project esperado por el analyzer
    const ssotProjects: SsotProject[] = projects.map((p) => ({
      id: p.id,
      title: p.title,
      department: (p.department as SsotDepartment) || 'VENTAS',
      startAt: p.startAt,
      endAt: p.dueAt,
      deadline: p.dueAt,
      status: this.mapUnifiedToSsotProjectStatus(p.status),
      priority: undefined,
      impactScore: undefined,
      teamMemberIds: p.memberIds || [],
      resourceAllocation: [],
      budget: undefined,
      actualCost: undefined,
      estimatedHours: undefined,
      lastProgressUpdate: undefined,
      statusChangedAt: undefined,
      milestones: [],
      createdById: p.createdById || p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    
    return workItemAnalyzer.generateDailyFocus(userId, tasks, ssotProjects);
  }

  /**
   * Analiza riesgos de un proyecto
   */
  static async analyzeProject(projectId: string) {
    const projectWithTasks = await ProjectService.getProjectWithTasks(projectId);
    if (!projectWithTasks) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const p = projectWithTasks.project;
    const ssotProject: SsotProject = {
      id: p.id,
      title: p.title,
      department: (p.department as SsotDepartment) || 'VENTAS',
      startAt: p.startAt,
      endAt: p.dueAt,
      deadline: p.dueAt,
      status: this.mapUnifiedToSsotProjectStatus(p.status),
      teamMemberIds: p.memberIds || [],
      createdById: p.createdById || p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    } as SsotProject;
    
    const analysis = await workItemAnalyzer.analyzeProjectRisks(
      ssotProject,
      projectWithTasks.tasks as any
    );
    
    return { success: true, data: analysis };
  }

  /**
   * Detecta duplicados de una tarea
   */
  static async detectDuplicates(taskId: string) {
    const task = await TaskService.getTask(taskId);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }
    
    const existingTasks = await TaskService.getTasks({
      status: ['BACKLOG', 'DRAFT', 'IN_PROGRESS'] as any,
    });
    
    const duplicates = await workItemAnalyzer.detectDuplicates(task, existingTasks);
    
    return { success: true, data: duplicates };
  }

  /**
   * Sugiere agrupar tareas en proyecto
   */
  static async suggestGrouping(taskIds: string[]) {
    const tasks = await Promise.all(
      taskIds.map(id => TaskService.getTask(id))
    );
    
    const validTasks = tasks.filter((t): t is TaskNew => t !== null);
    
    if (validTasks.length < 3) {
      return {
        success: false,
        error: 'Se necesitan al menos 3 tareas para sugerir agrupación',
      };
    }
    
    const suggestion = await workItemAnalyzer.suggestProjectGrouping(validTasks);
    
    return { success: true, data: suggestion };
  }

  /**
   * Convierte tareas en proyecto (ejecuta la sugerencia)
   */
  static async convertTasksToProject(
    taskIds: string[],
    projectData: Partial<Project>
  ) {
    return ProjectService.convertTasksToProject(taskIds, projectData);
  }

  /**
   * Obtiene vista unificada de WorkItems (Tasks + Projects)
   */
  static async getWorkItems(filters: {
    userId?: string;
    type?: 'task' | 'project' | 'all';
    status?: string[];
    priority?: string[];
    department?: string;
  }): Promise<WorkItem[]> {
    const workItems: WorkItem[] = [];
    
    // Obtener tareas si se solicitan
    if (!filters.type || filters.type === 'task' || filters.type === 'all') {
      const tasks = await TaskService.getTasks({
        assignedToId: filters.userId,
        status: filters.status as any,
        priority: filters.priority as any,
        department: filters.department as any,
      });
      
      // Convertir a WorkItem
      workItems.push(...tasks.map(t => this.taskToWorkItem(t)));
    }
    
    // Obtener proyectos si se solicitan
    if (!filters.type || filters.type === 'project' || filters.type === 'all') {
      const projects = await ProjectService.getProjects({
        ownerId: filters.userId,
        status: filters.status as any,
        priority: filters.priority as any,
      });
      
      // Convertir a WorkItem
      workItems.push(...projects.map(p => this.projectToWorkItem(p)));
    }
    
    // Ordenar por prioridad y fecha
    return workItems.sort((a, b) => {
      // Primero por prioridad
      const priorityOrder = { P0: 4, P1: 3, P2: 2, P3: 1, low: 1, medium: 2, high: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Luego por fecha de vencimiento
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      
      return 0;
    });
  }

  /**
   * Convierte TaskNew a WorkItem
   */
  private static taskToWorkItem(task: TaskNew): WorkItem {
    const now = new Date();
    const dueDate = task.dueAt ? new Date(task.dueAt) : undefined;
    const isOverdue = dueDate ? dueDate < now && task.status !== 'DONE' && task.status !== 'CANCELLED' : false;
    
    return {
      id: task.id,
      type: 'task',
      title: task.title,
      desc: task.desc,
      status: this.mapTaskStatus(task.status),
      priority: this.mapPriority(task.priority),
      dueAt: task.dueAt,
      department: task.accountId, // TODO: mapear correctamente
      linkedEntity: task.projectId,
      linkedAlerts: task.alertId ? [task.alertId] : undefined,
      isOverdue,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      ownerId: task.assignedToId,
      participants: [],
      metadata: {
        accountId: task.accountId,
        projectId: task.projectId,
        campaignId: task.campaignId,
        eventId: task.eventId,
        kind: task.kind,
        source: task.source,
      },
    };
  }

  /**
   * Convierte Project a WorkItem
   */
  private static projectToWorkItem(project: Project): WorkItem {
    const now = new Date();
    const dueDate = project.dueAt ? new Date(project.dueAt) : undefined;
    const isOverdue = dueDate ? dueDate < now && project.status !== 'COMPLETED' : false;
    
    return {
      id: project.id,
      type: 'project',
      title: project.title,
      desc: project.description,
      status: this.mapProjectStatus(project.status),
      priority: this.mapPriority(project.priority),
      dueAt: project.dueAt,
      department: project.department,
      kpis: project.kpis.reduce((acc, kpi) => {
        acc[kpi.name] = kpi.current;
        return acc;
      }, {} as Record<string, number>),
      trend: project.health === 'GREEN' ? 'up' : project.health === 'RED' ? 'down' : 'flat',
      isOverdue,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ownerId: project.ownerId,
      participants: project.memberIds,
      metadata: {
        accountId: project.accountId,
        campaignId: project.campaignId,
        eventId: project.eventId,
        progressPct: project.progressPct,
        health: project.health,
      },
    };
  }

  /**
   * Mapea TaskStatus a WorkItem status
   */
  private static mapTaskStatus(status: string): 'BACKLOG' | 'IN_PROGRESS' | 'DONE' {
    if (status === 'DONE') return 'DONE';
    if (status === 'IN_PROGRESS' || status === 'REVIEW' || status === 'BLOCKED') return 'IN_PROGRESS';
    return 'BACKLOG';
  }

  /**
   * Mapea ProjectStatus a WorkItem status
   */
  private static mapProjectStatus(status: string): 'BACKLOG' | 'IN_PROGRESS' | 'DONE' {
    if (status === 'COMPLETED') return 'DONE';
    if (status === 'ACTIVE' || status === 'HOLD') return 'IN_PROGRESS';
    return 'BACKLOG';
  }

  /** Mapear estado de proyecto (unified) → SSOT ProjectStatus */
  private static mapUnifiedToSsotProjectStatus(status: string): 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'REVIEW' | 'COMPLETED' | 'ARCHIVED' {
    switch (status) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'HOLD':
        return 'ON_HOLD';
      case 'COMPLETED':
        return 'COMPLETED';
      case 'CANCELED':
        return 'ARCHIVED';
      case 'DRAFT':
      default:
        return 'PLANNING';
    }
  }

  /**
   * Mapea Priority (P0-P3) a WorkItem priority (low/medium/high)
   */
  private static mapPriority(priority?: string): 'low' | 'medium' | 'high' {
    if (priority === 'P0' || priority === 'P1') return 'high';
    if (priority === 'P2') return 'medium';
    return 'low';
  }
}
