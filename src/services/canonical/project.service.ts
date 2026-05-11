// FILE: src/services/canonical/project.service.ts
// ============================================================================
// PROJECT SERVICE - Servicio Canónico para Gestión de Proyectos
// ============================================================================
// Centraliza toda la lógica de negocio relacionada con proyectos:
// - CRUD completo
// - Gestión de KPIs y progreso
// - Conversión de tareas a proyectos
// - Integración con Gemini Intelligence
// ============================================================================

import { adminDb as db } from '@/server/firebase';
import type { 
  Project,
  Task,
  ProjectHealthType,
  PriorityType,
  ProjectStatusType,
} from '@/domain/projects-tasks-unified';
import {
  computeProjectHealth,
  computeProjectProgress,
  computeProjectNextAt,
  generateTasksFromTemplate,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from '@/domain/projects-tasks-unified';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateProjectOptions {
  fromTemplate?: string;        // ID de plantilla a usar
  fromTasks?: string[];         // IDs de tareas a agrupar
  autoGenerateTasks?: boolean;  // Generar tareas desde plantilla
  skipGeminiAnalysis?: boolean; // Saltar análisis de Gemini
}

export interface ProjectFilters {
  status?: ProjectStatusType | ProjectStatusType[];
  priority?: PriorityType | PriorityType[];
  ownerId?: string;
  memberIds?: string[];
  accountId?: string;
  campaignId?: string;
  health?: ProjectHealthType | ProjectHealthType[];
  archived?: boolean;
  visibility?: 'PRIVATE' | 'TEAM' | 'PUBLIC';
}

export interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
  health: ProjectHealthType;
  progressPct: number;
  nextAt?: string;
}

// ============================================================================
// PROJECT SERVICE CLASS
// ============================================================================

export class ProjectService {
  
  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------
  
  /**
   * Crea un nuevo proyecto con opciones avanzadas
   */
  static async createProject(
    data: Partial<Project>,
    options: CreateProjectOptions = {}
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const now = new Date().toISOString();
      const projectRef = db.collection('projects').doc();
      
      // Validaciones básicas
      if (!data.title || !data.ownerId) {
        return { 
          success: false, 
          error: 'Faltan campos requeridos: title, ownerId' 
        };
      }

      // Obtener plantilla si se especificó
      let template: ProjectTemplate | undefined;
      if (options.fromTemplate && PROJECT_TEMPLATES[options.fromTemplate]) {
        template = PROJECT_TEMPLATES[options.fromTemplate];
      }

      // Construir proyecto completo
      const project: Project = {
        id: projectRef.id,
        title: data.title,
        description: data.description || template?.description,
        status: data.status || 'ACTIVE',
        stage: data.stage,
        priority: data.priority || template?.defaultPriority || 'P2',
        ownerId: data.ownerId,
        memberIds: data.memberIds || [],
        
        // Vínculos
        accountId: data.accountId,
        campaignId: data.campaignId,
        eventId: data.eventId,
        department: data.department,
        
        // Timeline
        startAt: data.startAt || now,
        dueAt: data.dueAt,
        nextAt: data.nextAt,
        
        // Métricas
        progressPct: 0,
        health: 'GREEN',
        kpis: data.kpis || template?.kpis.map(k => ({ ...k, current: 0 })) || [],
        
        // Metadata
        notes: data.notes,
        tags: data.tags || [],
        archived: false,
        visibility: data.visibility || 'TEAM',
        
        // Auditoría
        createdAt: now,
        updatedAt: now,
        createdById: data.ownerId,
      };

      // Guardar proyecto
      await projectRef.set(project);

      // Generar tareas desde plantilla si se solicitó
      if (options.autoGenerateTasks && template) {
        const startDate = new Date(project.startAt!);
        const tasksToCreate = generateTasksFromTemplate(template, startDate, project.id);
        
        const batch = db.batch();
        tasksToCreate.forEach(taskData => {
          const taskRef = db.collection('tasks').doc();
          batch.set(taskRef, {
            ...taskData,
            id: taskRef.id,
            createdAt: now,
            updatedAt: now,
          });
        });
        await batch.commit();
      }

      // Vincular tareas existentes si se especificaron
      if (options.fromTasks && options.fromTasks.length > 0) {
        const batch = db.batch();
        options.fromTasks.forEach(taskId => {
          const taskRef = db.collection('tasks').doc(taskId);
          batch.update(taskRef, {
            projectId: project.id,
            updatedAt: now,
          });
        });
        await batch.commit();
      }

      // Análisis de Gemini (async, no bloqueante)
      if (!options.skipGeminiAnalysis) {
        this.analyzeProjectWithGemini(project).catch(err => 
          console.error('[ProjectService] Gemini analysis failed:', err)
        );
      }

      return { success: true, projectId: project.id };
      
    } catch (error: any) {
      console.error('[ProjectService] Error creating project:', error);
      return { 
        success: false, 
        error: error.message || 'Error al crear proyecto' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // READ
  // --------------------------------------------------------------------------
  
  /**
   * Obtiene un proyecto por ID
   */
  static async getProject(projectId: string): Promise<Project | null> {
    try {
      const doc = await db.collection('projects').doc(projectId).get();
      return doc.exists ? (doc.data() as Project) : null;
    } catch (error) {
      console.error('[ProjectService] Error getting project:', error);
      return null;
    }
  }

  /**
   * Obtiene un proyecto con sus tareas
   */
  static async getProjectWithTasks(projectId: string): Promise<ProjectWithTasks | null> {
    try {
      const project = await this.getProject(projectId);
      if (!project) return null;

      // Obtener tareas del proyecto
      const tasksSnap = await db.collection('tasks')
        .where('projectId', '==', projectId)
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'asc')
        .get();
      
      const tasks = tasksSnap.docs.map((doc: any) => doc.data() as Task);

      // Calcular métricas
      const health = computeProjectHealth({ tasks });
      const progressPct = computeProjectProgress(tasks);
      const nextAt = computeProjectNextAt({ tasks, dueAt: project.dueAt });

      return {
        project,
        tasks,
        health,
        progressPct,
        nextAt,
      };
      
    } catch (error) {
      console.error('[ProjectService] Error getting project with tasks:', error);
      return null;
    }
  }

  /**
   * Obtiene proyectos con filtros
   */
  static async getProjects(filters: ProjectFilters = {}): Promise<Project[]> {
    try {
      let query: any = db.collection('projects');

      // Aplicar filtros
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.where('status', 'in', statuses);
      }

      if (filters.ownerId) {
        query = query.where('ownerId', '==', filters.ownerId);
      }

      if (filters.accountId) {
        query = query.where('accountId', '==', filters.accountId);
      }

      if (filters.campaignId) {
        query = query.where('campaignId', '==', filters.campaignId);
      }

      if (filters.archived !== undefined) {
        query = query.where('archived', '==', filters.archived);
      }

      if (filters.visibility) {
        query = query.where('visibility', '==', filters.visibility);
      }

      // Ordenar
      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      let projects = snapshot.docs.map((doc: any) => doc.data() as Project);

      // Filtros post-query
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        projects = projects.filter((p: Project) => priorities.includes(p.priority));
      }

      if (filters.health) {
        const healths = Array.isArray(filters.health) ? filters.health : [filters.health];
        projects = projects.filter((p: Project) => healths.includes(p.health));
      }

      if (filters.memberIds && filters.memberIds.length > 0) {
        projects = projects.filter((p: Project) => 
          filters.memberIds!.some(memberId => p.memberIds.includes(memberId))
        );
      }

      return projects;
      
    } catch (error) {
      console.error('[ProjectService] Error getting projects:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------
  
  /**
   * Actualiza un proyecto
   */
  static async updateProject(
    projectId: string,
    updates: Partial<Project>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const projectRef = db.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      
      if (!projectDoc.exists) {
        return { success: false, error: 'Proyecto no encontrado' };
      }

      await projectRef.update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[ProjectService] Error updating project:', error);
      return { 
        success: false, 
        error: error.message || 'Error al actualizar proyecto' 
      };
    }
  }

  /**
   * Recalcula las métricas de un proyecto
   */
  static async recomputeProject(projectId: string): Promise<{ 
    success: boolean; 
    metrics?: { progressPct: number; health: ProjectHealthType; nextAt?: string };
    error?: string;
  }> {
    try {
      // Obtener tareas del proyecto
      const tasksSnap = await db.collection('tasks')
        .where('projectId', '==', projectId)
        .get();
      
      const tasks = tasksSnap.docs.map((doc: any) => doc.data() as Task);

      // Calcular métricas
      const progressPct = computeProjectProgress(tasks);
      const health = computeProjectHealth({ tasks });
      
      const project = await this.getProject(projectId);
      const nextAt = computeProjectNextAt({ tasks, dueAt: project?.dueAt });

      // Actualizar proyecto
      await db.collection('projects').doc(projectId).update({
        progressPct,
        health,
        nextAt,
        updatedAt: new Date().toISOString(),
      });

      return { 
        success: true, 
        metrics: { progressPct, health, nextAt } 
      };
      
    } catch (error: any) {
      console.error('[ProjectService] Error recomputing project:', error);
      return { 
        success: false, 
        error: error.message || 'Error al recalcular proyecto' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------
  
  /**
   * Archiva un proyecto (soft delete)
   */
  static async archiveProject(
    projectId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.collection('projects').doc(projectId).update({
        archived: true,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[ProjectService] Error archiving project:', error);
      return { 
        success: false, 
        error: error.message || 'Error al archivar proyecto' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // TASKS MANAGEMENT
  // --------------------------------------------------------------------------
  
  /**
   * Añade una tarea a un proyecto
   */
  static async addTaskToProject(
    projectId: string,
    taskData: Partial<Task>
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const now = new Date().toISOString();
      const taskRef = db.collection('tasks').doc();
      
      const task: Task = {
        id: taskRef.id,
        title: taskData.title!,
        description: taskData.description,
        status: taskData.status || 'BACKLOG',
        priority: taskData.priority || 'P2',
        projectId,
        accountId: taskData.accountId,
        interactionId: taskData.interactionId,
        eventId: taskData.eventId,
        campaignId: taskData.campaignId,
        alertId: taskData.alertId,
        assignedToId: taskData.assignedToId,
        watcherIds: taskData.watcherIds || [],
        dueAt: taskData.dueAt,
        nextAt: taskData.nextAt,
        estimateMins: taskData.estimateMins,
        effortPts: taskData.effortPts,
        blockedByIds: taskData.blockedByIds || [],
        blocksIds: taskData.blocksIds || [],
        checklist: taskData.checklist || [],
        tags: taskData.tags || [],
        result: taskData.result,
        context: taskData.context,
        createdById: taskData.createdById,
        createdAt: now,
        updatedAt: now,
      };

      await taskRef.set(task);

      // Recalcular métricas del proyecto
      await this.recomputeProject(projectId);

      return { success: true, taskId: task.id };
      
    } catch (error: any) {
      console.error('[ProjectService] Error adding task to project:', error);
      return { 
        success: false, 
        error: error.message || 'Error al añadir tarea al proyecto' 
      };
    }
  }

  /**
   * Convierte múltiples tareas en un proyecto
   */
  static async convertTasksToProject(
    taskIds: string[],
    projectData: Partial<Project>
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      if (taskIds.length === 0) {
        return { success: false, error: 'No se especificaron tareas' };
      }

      // Crear proyecto
      const result = await this.createProject(projectData, { fromTasks: taskIds });
      
      return result;
      
    } catch (error: any) {
      console.error('[ProjectService] Error converting tasks to project:', error);
      return { 
        success: false, 
        error: error.message || 'Error al convertir tareas en proyecto' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // KPIs
  // --------------------------------------------------------------------------
  
  /**
   * Actualiza un KPI del proyecto
   */
  static async updateKPI(
    projectId: string,
    kpiName: string,
    current: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }

      const updatedKPIs = project.kpis.map(kpi => 
        kpi.name === kpiName ? { ...kpi, current } : kpi
      );

      await db.collection('projects').doc(projectId).update({
        kpis: updatedKPIs,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[ProjectService] Error updating KPI:', error);
      return { 
        success: false, 
        error: error.message || 'Error al actualizar KPI' 
      };
    }
  }

  /**
   * Obtiene KPIs de un proyecto
   */
  static async getProjectKPIs(projectId: string): Promise<{
    success: boolean;
    kpis?: Array<{ name: string; target: number; current: number; progress: number }>;
    error?: string;
  }> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }

      const kpis = project.kpis.map(kpi => ({
        ...kpi,
        progress: kpi.target > 0 ? Math.round((kpi.current / kpi.target) * 100) : 0,
      }));

      return { success: true, kpis };
      
    } catch (error: any) {
      console.error('[ProjectService] Error getting project KPIs:', error);
      return { 
        success: false, 
        error: error.message || 'Error al obtener KPIs' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // TEAM MANAGEMENT
  // --------------------------------------------------------------------------
  
  /**
   * Añade un miembro al proyecto
   */
  static async addMember(
    projectId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }

      if (project.memberIds.includes(userId)) {
        return { success: false, error: 'El usuario ya es miembro del proyecto' };
      }

      await db.collection('projects').doc(projectId).update({
        memberIds: [...project.memberIds, userId],
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[ProjectService] Error adding member:', error);
      return { 
        success: false, 
        error: error.message || 'Error al añadir miembro' 
      };
    }
  }

  /**
   * Elimina un miembro del proyecto
   */
  static async removeMember(
    projectId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }

      await db.collection('projects').doc(projectId).update({
        memberIds: project.memberIds.filter(id => id !== userId),
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[ProjectService] Error removing member:', error);
      return { 
        success: false, 
        error: error.message || 'Error al eliminar miembro' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------
  
  /**
   * Analiza un proyecto con Gemini para sugerencias
   */
  private static async analyzeProjectWithGemini(project: Project): Promise<void> {
    // TODO: Integrar con Gemini Intelligence Hub
    // - Sugerir recursos necesarios
    // - Detectar riesgos
    // - Proponer optimizaciones
    // - Sugerir tareas faltantes
  }
}
