// FILE: src/services/canonical/task.service.ts
// ============================================================================
// TASK SERVICE - Servicio Canónico para Gestión de Tareas
// ============================================================================
// Centraliza toda la lógica de negocio relacionada con tareas:
// - CRUD completo
// - Conversiones (Alert → Task, Email → Task)
// - Vinculación automática con entidades
// - Integración con Gemini Intelligence
// ============================================================================

import { adminDb as db } from '@/server/firebase';
import type { 
  TaskNew, 
  TaskSubtask, 
  TaskActivity, 
  Alert,
  TaskPriority,
  TaskStatusNew,
  Department,
  ISODateString,
  TaskKind,
  TaskSource,
} from '@/domain/ssot';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateTaskOptions {
  fromAlert?: string;           // ID de alerta origen
  fromEmail?: string;           // ID de email origen
  autoLink?: boolean;           // Auto-vincular con entidades relacionadas
  skipGeminiAnalysis?: boolean; // Saltar análisis de Gemini
}

export interface TaskFilters {
  status?: TaskStatusNew | TaskStatusNew[];
  priority?: TaskPriority | TaskPriority[];
  department?: Department | Department[];
  assignedToId?: string;
  createdById?: string;
  accountId?: string;
  projectId?: string;
  campaignId?: string;
  dueAtBefore?: ISODateString;
  dueAtAfter?: ISODateString;
  isOverdue?: boolean;
  isPriority?: boolean;
}

export interface TaskTimeline {
  task: TaskNew;
  activities: TaskActivity[];
  subtasks: TaskSubtask[];
  linkedEntities: {
    alert?: Alert;
    account?: any;
    project?: any;
    campaign?: any;
    event?: any;
  };
}

// ============================================================================
// TASK SERVICE CLASS
// ============================================================================

export class TaskService {
  
  // --------------------------------------------------------------------------
  // CREATE
  // --------------------------------------------------------------------------
  
  /**
   * Crea una nueva tarea con opciones avanzadas
   */
  static async createTask(
    data: Partial<TaskNew>,
    options: CreateTaskOptions = {}
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const now = new Date().toISOString();
      const taskRef = db.collection('tasks').doc();
      
      // Validaciones básicas
      if (!data.title || !data.assignedToId || !data.department) {
        return { 
          success: false, 
          error: 'Faltan campos requeridos: title, assignedToId, department' 
        };
      }

      // Construir tarea completa
      const task: TaskNew = {
        id: taskRef.id,
        kind: data.kind || 'GENERICA',
        title: data.title,
        desc: data.desc,
        status: data.status || 'BACKLOG',
        priority: data.priority || 'MEDIUM',
        isPriority: data.isPriority || false,
        priorityRank: this.calculatePriorityRank(data.priority, data.isPriority),
        department: data.department,
        source: data.source || 'MANUAL',
        assignedToId: data.assignedToId,
        createdById: data.createdById || data.assignedToId,
        
        // Fechas
        dueAt: data.dueAt,
        snoozeUntil: data.snoozeUntil,
        
        // Vínculos
        accountId: data.accountId,
        orderId: data.orderId,
        eventId: data.eventId,
        campaignId: data.campaignId,
        projectId: data.projectId,
        alertId: options.fromAlert || data.alertId,
        distributorPartyId: data.distributorPartyId,
        
        // Recurrencia
        recurrence: data.recurrence,
        
        // Auditoría
        createdAt: now,
        updatedAt: now,
      };

      // Calcular SLA bucket si hay dueAt
      if (task.dueAt) {
        task.slaBucket = this.calculateSLABucket(task.dueAt);
      }

      // Auto-vinculación si está habilitada
      if (options.autoLink) {
        await this.autoLinkTask(task);
      }

      // Guardar tarea
      await taskRef.set(task);

      // Crear actividad inicial
      await this.createActivity({
        taskId: task.id,
        kind: 'CREATED',
        userId: task.createdById,
        createdAt: now,
      });

      // Si viene de una alerta, actualizar la alerta
      if (options.fromAlert) {
        await db.collection('alerts').doc(options.fromAlert).update({
          taskId: task.id,
          status: 'RESOLVED',
          resolvedAt: now,
          resolvedBy: task.createdById,
          updatedAt: now,
        });
      }

      // Análisis de Gemini (async, no bloqueante)
      if (!options.skipGeminiAnalysis) {
        this.analyzeTaskWithGemini(task).catch(err => 
          console.error('[TaskService] Gemini analysis failed:', err)
        );
      }

      return { success: true, taskId: task.id };
      
    } catch (error: any) {
      console.error('[TaskService] Error creating task:', error);
      return { 
        success: false, 
        error: error.message || 'Error al crear tarea' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // READ
  // --------------------------------------------------------------------------
  
  /**
   * Obtiene una tarea por ID
   */
  static async getTask(taskId: string): Promise<TaskNew | null> {
    try {
      const doc = await db.collection('tasks').doc(taskId).get();
      return doc.exists ? (doc.data() as TaskNew) : null;
    } catch (error) {
      console.error('[TaskService] Error getting task:', error);
      return null;
    }
  }

  /**
   * Obtiene tareas con filtros
   */
  static async getTasks(filters: TaskFilters = {}): Promise<TaskNew[]> {
    try {
      let query: any = db.collection('tasks');

      // Aplicar filtros
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.where('status', 'in', statuses);
      }

      if (filters.assignedToId) {
        query = query.where('assignedToId', '==', filters.assignedToId);
      }

      if (filters.department) {
        const depts = Array.isArray(filters.department) ? filters.department : [filters.department];
        query = query.where('department', 'in', depts);
      }

      if (filters.accountId) {
        query = query.where('accountId', '==', filters.accountId);
      }

      if (filters.projectId) {
        query = query.where('projectId', '==', filters.projectId);
      }

      if (filters.campaignId) {
        query = query.where('campaignId', '==', filters.campaignId);
      }

      if (filters.isPriority !== undefined) {
        query = query.where('isPriority', '==', filters.isPriority);
      }

      // Ordenar por prioridad y fecha
      query = query.orderBy('priorityRank', 'desc').orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      let tasks = snapshot.docs.map((doc: any) => doc.data() as TaskNew);

      // Filtros post-query (no soportados por Firestore)
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        tasks = tasks.filter((t: TaskNew) => t.priority && priorities.includes(t.priority));
      }

      if (filters.isOverdue) {
        const now = new Date().toISOString();
        tasks = tasks.filter((t: TaskNew) => 
          t.dueAt && t.dueAt < now && t.status !== 'DONE' && t.status !== 'CANCELLED'
        );
      }

      if (filters.dueAtBefore) {
        tasks = tasks.filter((t: TaskNew) => t.dueAt && t.dueAt < filters.dueAtBefore!);
      }

      if (filters.dueAtAfter) {
        tasks = tasks.filter((t: TaskNew) => t.dueAt && t.dueAt > filters.dueAtAfter!);
      }

      return tasks;
      
    } catch (error) {
      console.error('[TaskService] Error getting tasks:', error);
      return [];
    }
  }

  /**
   * Obtiene el timeline completo de una tarea
   */
  static async getTaskTimeline(taskId: string): Promise<TaskTimeline | null> {
    try {
      const task = await this.getTask(taskId);
      if (!task) return null;

      // Obtener actividades
      const activitiesSnap = await db.collection('taskActivities')
        .where('taskId', '==', taskId)
        .orderBy('createdAt', 'desc')
        .get();
      const activities = activitiesSnap.docs.map((doc) => doc.data() as TaskActivity);

      // Obtener subtareas
      const subtasksSnap = await db.collection('taskSubtasks')
        .where('taskId', '==', taskId)
        .orderBy('order', 'asc')
        .get();
      const subtasks = subtasksSnap.docs.map((doc) => doc.data() as TaskSubtask);

      // Obtener entidades vinculadas
      const linkedEntities: any = {};
      
      if (task.alertId) {
        const alertDoc = await db.collection('alerts').doc(task.alertId).get();
        if (alertDoc.exists) linkedEntities.alert = alertDoc.data();
      }

      if (task.accountId) {
        const accountDoc = await db.collection('accounts').doc(task.accountId).get();
        if (accountDoc.exists) linkedEntities.account = accountDoc.data();
      }

      if (task.projectId) {
        const projectDoc = await db.collection('projects').doc(task.projectId).get();
        if (projectDoc.exists) linkedEntities.project = projectDoc.data();
      }

      if (task.campaignId) {
        const campaignDoc = await db.collection('campaigns').doc(task.campaignId).get();
        if (campaignDoc.exists) linkedEntities.campaign = campaignDoc.data();
      }

      if (task.eventId) {
        const eventDoc = await db.collection('calendarEvents').doc(task.eventId).get();
        if (eventDoc.exists) linkedEntities.event = eventDoc.data();
      }

      return {
        task,
        activities,
        subtasks,
        linkedEntities,
      };
      
    } catch (error) {
      console.error('[TaskService] Error getting task timeline:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------
  
  /**
   * Actualiza una tarea
   */
  static async updateTask(
    taskId: string,
    updates: Partial<TaskNew>,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const taskRef = db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();
      
      if (!taskDoc.exists) {
        return { success: false, error: 'Tarea no encontrada' };
      }

      const currentTask = taskDoc.data() as TaskNew;
      const now = new Date().toISOString();

      // Preparar actualizaciones
      const taskUpdates: any = {
        ...updates,
        updatedAt: now,
      };

      // Recalcular priorityRank si cambia priority o isPriority
      if (updates.priority !== undefined || updates.isPriority !== undefined) {
        taskUpdates.priorityRank = this.calculatePriorityRank(
          updates.priority || currentTask.priority,
          updates.isPriority !== undefined ? updates.isPriority : currentTask.isPriority
        );
      }

      // Recalcular SLA bucket si cambia dueAt
      if (updates.dueAt !== undefined) {
        taskUpdates.slaBucket = updates.dueAt ? this.calculateSLABucket(updates.dueAt) : undefined;
      }

      // Actualizar tarea
      await taskRef.update(taskUpdates);

      // Crear actividades para cambios importantes
      if (updates.status && updates.status !== currentTask.status) {
        await this.createActivity({
          taskId,
          kind: 'STATUS_CHANGE',
          userId,
          metadata: {
            from: currentTask.status,
            to: updates.status,
            fieldName: 'status',
          },
          createdAt: now,
        });
      }

      if (updates.assignedToId && updates.assignedToId !== currentTask.assignedToId) {
        await this.createActivity({
          taskId,
          kind: 'ASSIGNMENT_CHANGE',
          userId,
          metadata: {
            from: currentTask.assignedToId,
            to: updates.assignedToId,
            fieldName: 'assignedToId',
          },
          createdAt: now,
        });
      }

      if (updates.priority && updates.priority !== currentTask.priority) {
        await this.createActivity({
          taskId,
          kind: 'PRIORITY_CHANGE',
          userId,
          metadata: {
            from: currentTask.priority,
            to: updates.priority,
            fieldName: 'priority',
          },
          createdAt: now,
        });
      }

      if (updates.dueAt && updates.dueAt !== currentTask.dueAt) {
        await this.createActivity({
          taskId,
          kind: 'DUE_DATE_CHANGE',
          userId,
          metadata: {
            from: currentTask.dueAt,
            to: updates.dueAt,
            fieldName: 'dueAt',
          },
          createdAt: now,
        });
      }

      return { success: true };
      
    } catch (error: any) {
      console.error('[TaskService] Error updating task:', error);
      return { 
        success: false, 
        error: error.message || 'Error al actualizar tarea' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------
  
  /**
   * Elimina una tarea (soft delete)
   */
  static async deleteTask(
    taskId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const taskRef = db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();
      
      if (!taskDoc.exists) {
        return { success: false, error: 'Tarea no encontrada' };
      }

      // Soft delete: cambiar status a CANCELLED
      await taskRef.update({
        status: 'CANCELLED',
        updatedAt: new Date().toISOString(),
      });

      // Crear actividad
      await this.createActivity({
        taskId,
        kind: 'STATUS_CHANGE',
        userId,
        metadata: {
          from: (taskDoc.data() as TaskNew).status,
          to: 'CANCELLED',
          fieldName: 'status',
        },
        createdAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[TaskService] Error deleting task:', error);
      return { 
        success: false, 
        error: error.message || 'Error al eliminar tarea' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // CONVERSIONS
  // --------------------------------------------------------------------------
  
  /**
   * Convierte una alerta en tarea
   */
  static async convertAlertToTask(
    alertId: string,
    taskData: Partial<TaskNew>
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const alertDoc = await db.collection('alerts').doc(alertId).get();
      
      if (!alertDoc.exists) {
        return { success: false, error: 'Alerta no encontrada' };
      }

      const alert = alertDoc.data() as Alert;

      // Construir tarea desde alerta
      const task: Partial<TaskNew> = {
        title: taskData.title || alert.title,
        desc: taskData.desc || alert.message,
        priority: this.mapAlertSeverityToPriority(alert.severity),
        department: alert.department,
        assignedToId: taskData.assignedToId || alert.userId,
        createdById: alert.userId,
        source: 'AUTO_RULE',
        accountId: alert.accountId,
        alertId: alertId,
        ...taskData,
      };

      return await this.createTask(task, { fromAlert: alertId });
      
    } catch (error: any) {
      console.error('[TaskService] Error converting alert to task:', error);
      return { 
        success: false, 
        error: error.message || 'Error al convertir alerta' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // LINKING
  // --------------------------------------------------------------------------
  
  /**
   * Vincula una tarea con una entidad
   */
  static async linkTaskToEntity(
    taskId: string,
    entityType: 'account' | 'project' | 'campaign' | 'event' | 'order',
    entityId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: any = {};
      
      switch (entityType) {
        case 'account':
          updates.accountId = entityId;
          break;
        case 'project':
          updates.projectId = entityId;
          break;
        case 'campaign':
          updates.campaignId = entityId;
          break;
        case 'event':
          updates.eventId = entityId;
          break;
        case 'order':
          updates.orderId = entityId;
          break;
      }

      await db.collection('tasks').doc(taskId).update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
      
    } catch (error: any) {
      console.error('[TaskService] Error linking task:', error);
      return { 
        success: false, 
        error: error.message || 'Error al vincular tarea' 
      };
    }
  }

  // --------------------------------------------------------------------------
  // SUBTASKS
  // --------------------------------------------------------------------------
  
  /**
   * Crea una subtarea
   */
  static async createSubtask(
    subtask: Omit<TaskSubtask, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; subtaskId?: string; error?: string }> {
    try {
      const now = new Date().toISOString();
      const subtaskRef = db.collection('taskSubtasks').doc();
      
      const newSubtask: TaskSubtask = {
        id: subtaskRef.id,
        ...subtask,
        createdAt: now,
        updatedAt: now,
      };

      await subtaskRef.set(newSubtask);

      // Crear actividad
      await this.createActivity({
        taskId: subtask.taskId,
        kind: 'SUBTASK_ADDED',
        userId: '', // TODO: pasar userId
        createdAt: now,
      });

      // Actualizar progreso de la tarea
      await this.updateTaskProgress(subtask.taskId);

      return { success: true, subtaskId: newSubtask.id };
      
    } catch (error: any) {
      console.error('[TaskService] Error creating subtask:', error);
      return { 
        success: false, 
        error: error.message || 'Error al crear subtarea' 
      };
    }
  }

  /**
   * Actualiza el progreso de una tarea basado en subtareas
   */
  static async updateTaskProgress(taskId: string): Promise<void> {
    try {
      const subtasksSnap = await db.collection('taskSubtasks')
        .where('taskId', '==', taskId)
        .get();

      if (subtasksSnap.empty) {
        await db.collection('tasks').doc(taskId).update({
          progress: 0,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const subtasks = subtasksSnap.docs.map((doc) => doc.data() as TaskSubtask);
      const completed = subtasks.filter((st: TaskSubtask) => st.completed).length;
      const progress = Math.round((completed / subtasks.length) * 100);

      await db.collection('tasks').doc(taskId).update({
        progress,
        updatedAt: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('[TaskService] Error updating task progress:', error);
    }
  }

  // --------------------------------------------------------------------------
  // ACTIVITIES
  // --------------------------------------------------------------------------
  
  /**
   * Crea una actividad en una tarea
   */
  static async createActivity(
    activity: Omit<TaskActivity, 'id'>
  ): Promise<void> {
    try {
      const activityRef = db.collection('taskActivities').doc();
      
      await activityRef.set({
        id: activityRef.id,
        ...activity,
      });
      
    } catch (error) {
      console.error('[TaskService] Error creating activity:', error);
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------
  
  /**
   * Calcula el ranking de prioridad (0-3)
   */
  private static calculatePriorityRank(
    priority?: TaskPriority,
    isPriority?: boolean
  ): number {
    let rank = 0;
    
    if (priority === 'URGENT') rank = 3;
    else if (priority === 'HIGH') rank = 2;
    else if (priority === 'MEDIUM') rank = 1;
    else rank = 0;
    
    // Boost si está marcada como prioritaria
    if (isPriority) rank += 0.5;
    
    return rank;
  }

  /**
   * Calcula el bucket SLA basado en fecha de vencimiento
   */
  private static calculateSLABucket(
    dueAt: ISODateString
  ): 'OVERDUE' | 'TODAY' | 'WEEK' | 'LATER' | 'NONE' {
    const now = new Date();
    const due = new Date(dueAt);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'OVERDUE';
    if (diffDays === 0) return 'TODAY';
    if (diffDays <= 7) return 'WEEK';
    return 'LATER';
  }

  /**
   * Mapea severidad de alerta a prioridad de tarea
   */
  private static mapAlertSeverityToPriority(
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): TaskPriority {
    switch (severity) {
      case 'CRITICAL': return 'URGENT';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }

  /**
   * Auto-vincula una tarea con entidades relacionadas
   */
  private static async autoLinkTask(task: TaskNew): Promise<void> {
    // TODO: Implementar lógica de auto-vinculación inteligente
    // Por ejemplo, si la tarea menciona un cliente, vincularla automáticamente
  }

  /**
   * Analiza una tarea con Gemini para sugerencias
   */
  private static async analyzeTaskWithGemini(task: TaskNew): Promise<void> {
    // TODO: Integrar con Gemini Intelligence Hub
    // - Sugerir prioridad basada en contexto
    // - Sugerir vínculos con otras entidades
    // - Detectar duplicados
    // - Sugerir subtareas
  }
}
