"use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { adminDb as db } from "@/server/firebase";
import { CreateTaskSchema, UpdateTaskSchema, computePriorityRank, computeSlaBucket } from "@/domain/zod/task";
import type { TaskNew } from "@/domain/ssot";

const nowISO = () => new Date().toISOString();

/**
 * Lista las tareas asignadas a un usuario específico
 */
export async function listMyTasks(userId: string): Promise<TaskNew[]> {
  if (!userId) return [];

  try {
    const snap = await db
      .collection("tasks")
      .where("assignedToId", "==", userId)
      .orderBy("status")
      .orderBy("dueAt")
      .limit(100)
      .get();

    return snap.docs.map((d) => d.data() as TaskNew);
  } catch (error) {
    console.error("[listMyTasks] Error:", error);
    return [];
  }
}

/**
 * Crea una nueva tarea
 * Calcula automáticamente priorityRank y slaBucket
 */
export async function createTask(data: any): Promise<{ ok: boolean; task?: TaskNew; error?: string }> {
  try {
    const parsed = CreateTaskSchema.parse(data);
    const ref = db.collection("tasks").doc();

    // Calcular campos derivados
    const priorityRank = computePriorityRank(parsed.priority, parsed.isPriority);
    const slaBucket = computeSlaBucket(parsed.dueAt);

    const payload: TaskNew = {
      ...parsed,
      id: ref.id,
      kind: parsed.kind || 'GENERICA', // Default to GENERICA if not specified
      priorityRank,
      slaBucket,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await ref.set(payload);

    return { ok: true, task: payload };
  } catch (error: any) {
    console.error("[createTask] Error:", error);
    return { ok: false, error: error.message || "Error creando tarea" };
  }
}

/**
 * Actualiza una tarea existente
 */
export async function updateTask(data: any): Promise<{ ok: boolean; task?: TaskNew; error?: string }> {
  try {
    const parsed = UpdateTaskSchema.parse(data);
    const { id, ...updates } = parsed;

    if (!id) {
      return { ok: false, error: "ID de tarea requerido" };
    }

    const ref = db.collection("tasks").doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return { ok: false, error: "Tarea no encontrada" };
    }

    const payload = {
      ...updates,
      updatedAt: nowISO(),
    };

    await ref.update(payload);

    const updated = await ref.get();
    return { ok: true, task: updated.data() as TaskNew };
  } catch (error: any) {
    console.error("[updateTask] Error:", error);
    return { ok: false, error: error.message || "Error actualizando tarea" };
  }
}

/**
 * Elimina una tarea
 */
export async function deleteTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!taskId) {
      return { ok: false, error: "ID de tarea requerido" };
    }

    const ref = db.collection("tasks").doc(taskId);
    await ref.delete();

    return { ok: true };
  } catch (error: any) {
    console.error("[deleteTask] Error:", error);
    return { ok: false, error: error.message || "Error eliminando tarea" };
  }
}

/**
 * Lista tareas de un proyecto específico
 */
export async function listProjectTasks(projectId: string): Promise<TaskNew[]> {
  if (!projectId) {
    console.log("[listProjectTasks] No projectId provided");
    return [];
  }

  try {
    console.log("[listProjectTasks] Loading tasks for project:", projectId);
    const snap = await db
      .collection("tasks")
      .where("projectId", "==", projectId)
      .orderBy("status")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const tasks = snap.docs.map((d) => d.data() as TaskNew);
    console.log("[listProjectTasks] Found", tasks.length, "tasks for project", projectId);
    console.log("[listProjectTasks] Tasks:", tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
    return tasks;
  } catch (error) {
    console.error("[listProjectTasks] Error:", error);
    return [];
  }
}

/**
 * Lista todas las tareas (solo admin)
 */
export async function listAllTasks(): Promise<TaskNew[]> {
  try {
    const snap = await db
      .collection("tasks")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    return snap.docs.map((d) => d.data() as TaskNew);
  } catch (error) {
    console.error("[listAllTasks] Error:", error);
    return [];
  }
}

/**
 * Lista tareas prioritarias del usuario (priorityRank >= 1)
 */
export async function listPriorityTasks(userId: string): Promise<TaskNew[]> {
  if (!userId) return [];

  try {
    const snap = await db
      .collection("tasks")
      .where("assignedToId", "==", userId)
      .where("priorityRank", ">=", 1)
      .orderBy("priorityRank", "desc")
      .orderBy("dueAt", "asc")
      .limit(50)
      .get();

    return snap.docs.map((d) => d.data() as TaskNew);
  } catch (error) {
    console.error("[listPriorityTasks] Error:", error);
    return [];
  }
}

/**
 * Lista tareas vencidas del usuario (slaBucket=OVERDUE y status activo)
 */
export async function listOverdueTasks(userId: string): Promise<TaskNew[]> {
  if (!userId) return [];

  try {
    const activeStatuses = ["BACKLOG", "IN_PROGRESS", "DRAFT", "BLOCKED"];
    
    const snap = await db
      .collection("tasks")
      .where("assignedToId", "==", userId)
      .where("slaBucket", "==", "OVERDUE")
      .where("status", "in", activeStatuses)
      .orderBy("dueAt", "asc")
      .limit(50)
      .get();

    return snap.docs.map((d) => d.data() as TaskNew);
  } catch (error) {
    console.error("[listOverdueTasks] Error:", error);
    return [];
  }
}

/**
 * Toggle isPriority de una tarea (recalcula priorityRank automáticamente)
 */
export async function togglePriorityTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!taskId) {
      return { ok: false, error: "ID de tarea requerido" };
    }

    return await db.runTransaction(async (tx) => {
      const ref = db.collection("tasks").doc(taskId);
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error("Tarea no encontrada");
      }

      const task = snap.data() as TaskNew;
      const newIsPriority = !Boolean(task.isPriority);
      const newPriorityRank = computePriorityRank(task.priority, newIsPriority);

      await tx.update(ref, {
        isPriority: newIsPriority,
        priorityRank: newPriorityRank,
        updatedAt: nowISO(),
      });

      return { ok: true };
    });
  } catch (error: any) {
    console.error("[togglePriorityTask] Error:", error);
    return { ok: false, error: error.message || "Error toggling priority" };
  }
}

/**
 * Marca una tarea como DONE rápidamente
 */
export async function markDoneTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!taskId) {
      return { ok: false, error: "ID de tarea requerido" };
    }

    const ref = db.collection("tasks").doc(taskId);
    await ref.update({
      status: "DONE",
      updatedAt: nowISO(),
    });

    return { ok: true };
  } catch (error: any) {
    console.error("[markDoneTask] Error:", error);
    return { ok: false, error: error.message || "Error marking task as done" };
  }
}

/**
 * Crea un evento de calendario desde una tarea y vincula ambos
 */
export async function createEventFromTask(data: {
  taskId: string;
  startAt: string;
  durationMinutes: number;
  notes?: string;
  createdById: string;
}): Promise<{ ok: boolean; event?: any; error?: string }> {
  try {
    const { taskId, startAt, durationMinutes, notes, createdById } = data;

    return await db.runTransaction(async (tx) => {
      // 1. Obtener la tarea
      const taskRef = db.collection("tasks").doc(taskId);
      const taskSnap = await tx.get(taskRef);

      if (!taskSnap.exists) {
        throw new Error("Tarea no encontrada");
      }

      const task = taskSnap.data() as TaskNew;

      // 2. Calcular endAt
      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      // 3. Crear evento
      const eventRef = db.collection("events").doc();
      const event = {
        id: eventRef.id,
        title: `Visita: ${task.title}`,
        kind: "DEMO",
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        department: task.department,
        accountId: task.accountId,
        notes: notes || task.desc,
        createdById,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await tx.set(eventRef, event);

      // 4. Actualizar tarea con eventId y cambiar a PROGRAMADA
      await tx.update(taskRef, {
        eventId: event.id,
        status: "PROGRAMADA",
        updatedAt: new Date().toISOString(),
      });

      return { ok: true, event };
    });
  } catch (error: any) {
    console.error("[createEventFromTask] Error:", error);
    return { ok: false, error: error.message || "Error creando evento" };
  }
}

// ============================================================================
// DnD SUPPORT FUNCTIONS
// ============================================================================

/**
 * Crea un nuevo proyecto
 */
export async function createProject(input: {
  name: string;
  department: string;
  ownerId: string;
  memberIds?: string[];
  dueAt?: string;
}) {
  const ref = db.collection("projects").doc();
  const payload = {
    id: ref.id,
    title: input.name,
    department: input.department,
    status: "ACTIVE",
    progress: 0,
    teamMemberIds: input.memberIds || [],
    createdById: input.ownerId,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await ref.set(payload);
  return payload;
}

/**
 * Asigna una idea a una tarea (crea tarea desde idea)
 */
export async function assignIdeaToTask(params: {
  ideaId: string;
  projectId: string;
  title: string;
  dueAt?: string;
  assignedToId?: string;
  createdById: string;
}) {
  const ideaRef = db.collection("projectIdeas").doc(params.ideaId);
  const taskRef = db.collection("tasks").doc();

  await db.runTransaction(async (tx) => {
    const idea = (await tx.get(ideaRef)).data();
    if (!idea) throw new Error("Idea not found");

    // Obtener el departamento del proyecto
    const projectSnap = await db.collection("projects").doc(params.projectId).get();
    const department = projectSnap.data()?.department || "PERSONAL";

    tx.set(taskRef, {
      id: taskRef.id,
      title: params.title,
      status: "BACKLOG",
      department,
      kind: "GENERICA",
      projectId: params.projectId,
      ideaId: params.ideaId,
      dueAt: params.dueAt,
      assignedToId: params.assignedToId,
      source: "MANUAL",
      createdById: params.createdById,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });

    tx.update(ideaRef, { convertedToTaskId: taskRef.id, updatedAt: nowISO() });
  });

  return { ok: true };
}

/**
 * Get tasks with calculated KPIs for the Calendario page
 * Optimized server-side data fetching and calculation
 */
export async function getTasksWithKPIs(userId: string): Promise<{
  tasks: import("@/types/tasks").TaskWithKPIs[];
  kpis: import("@/types/tasks").TasksKPIs;
}> {
  if (!userId) {
    return {
      tasks: [],
      kpis: {
        total: 0,
        today: 0,
        thisWeek: 0,
        overdue: 0,
        priority: 0,
        byStatus: { BACKLOG: 0, IN_PROGRESS: 0, DONE: 0 },
      },
    };
  }

  try {
    // Fetch all tasks for user
    const snap = await db
      .collection("tasks")
      .where("assignedToId", "==", userId)
      .orderBy("status")
      .orderBy("dueAt")
      .limit(200)
      .get();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Calculate KPIs and enrich tasks
    const kpis = {
      total: 0,
      today: 0,
      thisWeek: 0,
      overdue: 0,
      priority: 0,
      byStatus: { BACKLOG: 0, IN_PROGRESS: 0, DONE: 0 },
    };

    const enrichedTasks = snap.docs.map((doc) => {
      const task = doc.data() as TaskNew;
      
      // Calculate daysUntilDue and isOverdue
      let daysUntilDue: number | undefined;
      let isOverdue = false;
      
      if (task.dueAt) {
        const dueDate = new Date(task.dueAt);
        const diffTime = dueDate.getTime() - now.getTime();
        daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = diffTime < 0 && task.status !== "DONE";
      }

      // Calculate priority score (higher = more important)
      const priorityScore = (task.priorityRank || 0) * 100 + 
                           (isOverdue ? 50 : 0) + 
                           (task.status === "IN_PROGRESS" ? 25 : 0);

      // Count KPIs
      kpis.total++;
      
      if (task.isPriority) {
        kpis.priority++;
      }

      if (isOverdue) {
        kpis.overdue++;
      }

      if (task.dueAt) {
        const dueDate = new Date(task.dueAt);
        if (dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
          kpis.today++;
        }
        if (dueDate >= today && dueDate < weekFromNow) {
          kpis.thisWeek++;
        }
      }

      // Count by status
      if (task.status === "BACKLOG") kpis.byStatus.BACKLOG++;
      else if (task.status === "IN_PROGRESS") kpis.byStatus.IN_PROGRESS++;
      else if (task.status === "DONE") kpis.byStatus.DONE++;

      return {
        ...task,
        daysUntilDue,
        isOverdue,
        priorityScore,
      };
    });

    // Sort by priorityScore DESC, then by dueAt ASC
    enrichedTasks.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return a.dueAt.localeCompare(b.dueAt);
    });

    return { tasks: enrichedTasks, kpis };
  } catch (error) {
    console.error("[getTasksWithKPIs] Error:", error);
    return {
      tasks: [],
      kpis: {
        total: 0,
        today: 0,
        thisWeek: 0,
        overdue: 0,
        priority: 0,
        byStatus: { BACKLOG: 0, IN_PROGRESS: 0, DONE: 0 },
      },
    };
  }
}

/**
 * Promociona una idea a proyecto
 */
export async function promoteIdeaToProject(params: {
  ideaId: string;
  name: string;
  department: string;
  ownerId: string;
}) {
  const ideaRef = db.collection("projectIdeas").doc(params.ideaId);
  const projRef = db.collection("projects").doc();

  await db.runTransaction(async (tx) => {
    const idea = (await tx.get(ideaRef)).data();
    if (!idea) throw new Error("Idea not found");

    const payload = {
      id: projRef.id,
      title: params.name,
      department: params.department,
      createdById: params.ownerId,
      teamMemberIds: [],
      status: "ACTIVE",
      progress: 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    tx.set(projRef, payload);
    tx.update(ideaRef, { convertedToProjectId: projRef.id, updatedAt: nowISO() });
  });

  return { ok: true };
}
