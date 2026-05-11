"use server";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { adminDb as db } from "@/server/firebase";
import { CreateSubtaskSchema, UpdateSubtaskSchema } from "@/domain/zod/subtask";
import type { TaskSubtask } from "@/domain/ssot";

const nowISO = () => new Date().toISOString();

/**
 * Lista las subtareas de una tarea
 */
export async function listSubtasks(taskId: string): Promise<TaskSubtask[]> {
  if (!taskId) return [];

  try {
    const snap = await db
      .collection("tasks")
      .doc(taskId)
      .collection("subtasks")
      .orderBy("order", "asc")
      .get();

    return snap.docs.map((d) => d.data() as TaskSubtask);
  } catch (error) {
    console.error("[listSubtasks] Error:", error);
    return [];
  }
}

/**
 * Crea una nueva subtarea
 */
export async function createSubtask(data: any): Promise<{ ok: boolean; subtask?: TaskSubtask; error?: string }> {
  try {
    const parsed = CreateSubtaskSchema.parse(data);
    const ref = db
      .collection("tasks")
      .doc(parsed.taskId)
      .collection("subtasks")
      .doc();

    const payload: TaskSubtask = {
      ...parsed,
      id: ref.id,
      completed: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await ref.set(payload);

    // Recalcular progreso de la tarea
    await recalculateTaskProgress(parsed.taskId);

    return { ok: true, subtask: payload };
  } catch (error: any) {
    console.error("[createSubtask] Error:", error);
    return { ok: false, error: error.message || "Error creando subtarea" };
  }
}

/**
 * Actualiza una subtarea (principalmente para marcar como completada)
 */
export async function updateSubtask(data: any, userId: string): Promise<{ ok: boolean; subtask?: TaskSubtask; error?: string }> {
  try {
    const parsed = UpdateSubtaskSchema.parse(data);
    const { id, taskId, ...updates } = parsed;

    if (!id || !taskId) {
      return { ok: false, error: "ID de subtarea y taskId requeridos" };
    }

    const ref = db
      .collection("tasks")
      .doc(taskId)
      .collection("subtasks")
      .doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return { ok: false, error: "Subtarea no encontrada" };
    }

    const payload: any = {
      ...updates,
      updatedAt: nowISO(),
    };

    // Si se marca como completada, registrar cuándo y quién
    if (updates.completed === true && !doc.data()?.completed) {
      payload.completedAt = nowISO();
      payload.completedBy = userId;
    } else if (updates.completed === false) {
      payload.completedAt = null;
      payload.completedBy = null;
    }

    await ref.update(payload);

    // Recalcular progreso de la tarea
    await recalculateTaskProgress(taskId);

    const updated = await ref.get();
    return { ok: true, subtask: updated.data() as TaskSubtask };
  } catch (error: any) {
    console.error("[updateSubtask] Error:", error);
    return { ok: false, error: error.message || "Error actualizando subtarea" };
  }
}

/**
 * Elimina una subtarea
 */
export async function deleteSubtask(taskId: string, subtaskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!taskId || !subtaskId) {
      return { ok: false, error: "IDs requeridos" };
    }

    const ref = db
      .collection("tasks")
      .doc(taskId)
      .collection("subtasks")
      .doc(subtaskId);

    await ref.delete();

    // Recalcular progreso de la tarea
    await recalculateTaskProgress(taskId);

    return { ok: true };
  } catch (error: any) {
    console.error("[deleteSubtask] Error:", error);
    return { ok: false, error: error.message || "Error eliminando subtarea" };
  }
}

/**
 * Recalcula el progreso de una tarea basado en sus subtareas
 */
async function recalculateTaskProgress(taskId: string): Promise<void> {
  try {
    const subtasks = await listSubtasks(taskId);
    
    if (subtasks.length === 0) {
      // Si no hay subtareas, dejar progress como está
      return;
    }

    const completed = subtasks.filter((s) => s.completed).length;
    const progress = Math.round((completed / subtasks.length) * 100);

    await db.collection("tasks").doc(taskId).update({
      progress,
      updatedAt: nowISO(),
    });
  } catch (error) {
    console.error("[recalculateTaskProgress] Error:", error);
  }
}
