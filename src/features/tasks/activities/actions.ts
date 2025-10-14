"use server";

import { adminDb as db } from "@/server/firebase";
import { CreateActivitySchema } from "@/domain/zod/activity";
import type { TaskActivity } from "@/domain/ssot";

const nowISO = () => new Date().toISOString();

/**
 * Lista las actividades de una tarea (ordenadas por fecha desc)
 */
export async function listActivities(taskId: string): Promise<TaskActivity[]> {
  if (!taskId) return [];

  try {
    const snap = await db
      .collection("tasks")
      .doc(taskId)
      .collection("activities")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return snap.docs.map((d) => d.data() as TaskActivity);
  } catch (error) {
    console.error("[listActivities] Error:", error);
    return [];
  }
}

/**
 * Crea una nueva actividad/comentario
 */
export async function createActivity(data: any): Promise<{ ok: boolean; activity?: TaskActivity; error?: string }> {
  try {
    const parsed = CreateActivitySchema.parse(data);
    const ref = db
      .collection("tasks")
      .doc(parsed.taskId)
      .collection("activities")
      .doc();

    const payload: TaskActivity = {
      ...parsed,
      id: ref.id,
      createdAt: nowISO(),
    };

    await ref.set(payload);

    return { ok: true, activity: payload };
  } catch (error: any) {
    console.error("[createActivity] Error:", error);
    return { ok: false, error: error.message || "Error creando actividad" };
  }
}

/**
 * Helper para registrar automáticamente cambios en una tarea
 */
export async function logTaskChange(
  taskId: string,
  userId: string,
  userName: string,
  kind: TaskActivity["kind"],
  metadata?: TaskActivity["metadata"]
): Promise<void> {
  try {
    await createActivity({
      taskId,
      userId,
      userName,
      kind,
      metadata,
    });
  } catch (error) {
    console.error("[logTaskChange] Error:", error);
  }
}

/**
 * Crea un comentario en una tarea
 */
export async function addComment(
  taskId: string,
  userId: string,
  userName: string,
  comment: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!comment.trim()) {
      return { ok: false, error: "El comentario no puede estar vacío" };
    }

    const result = await createActivity({
      taskId,
      userId,
      userName,
      kind: "COMMENT",
      comment: comment.trim(),
    });

    return result;
  } catch (error: any) {
    console.error("[addComment] Error:", error);
    return { ok: false, error: error.message || "Error añadiendo comentario" };
  }
}
