"use server";

import { adminDb as db } from "@/server/firebase";
import { computePriorityRank, computeSlaBucket, TaskPriorityEnum } from "@/domain/zod/task";
import type { z } from "zod";

const nowISO = () => new Date().toISOString();

/**
 * Toggle el estado de isPriority de una tarea
 * Si se marca como prioritaria y no tiene fecha, auto-asigna dueAt=hoy
 */
export async function togglePriority(taskId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = db.collection("tasks").doc(taskId);
    
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      
      if (!snap.exists) {
        throw new Error("Task not found");
      }
      
      const task = snap.data()!;
      
      // Verificar permisos
      if (task.assignedToId !== userId) {
        throw new Error("Forbidden: You can only modify your own tasks");
      }
      
      const newIsPriority = !Boolean(task.isPriority);
      const priorityRank = computePriorityRank(task.priority, newIsPriority);
      
      const updates: Record<string, any> = {
        isPriority: newIsPriority,
        priorityRank,
        updatedAt: nowISO(),
      };
      
      // Si se marca como prioritaria y no tiene fecha, asignar hoy
      if (newIsPriority && !task.dueAt) {
        const today = new Date().toISOString().split("T")[0];
        updates.dueAt = today;
        updates.slaBucket = "TODAY";
      }
      
      tx.update(ref, updates);
      return { ok: true };
    });
    
    return result;
  } catch (error: any) {
    console.error("[togglePriority] Error:", error);
    return { ok: false, error: error.message || "Error al cambiar prioridad" };
  }
}

/**
 * Establece el nivel de prioridad de una tarea
 */
export async function setPriorityLevel(
  taskId: string,
  userId: string,
  level: z.infer<typeof TaskPriorityEnum>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = db.collection("tasks").doc(taskId);
    
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      
      if (!snap.exists) {
        throw new Error("Task not found");
      }
      
      const task = snap.data()!;
      
      // Verificar permisos
      if (task.assignedToId !== userId) {
        throw new Error("Forbidden: You can only modify your own tasks");
      }
      
      const priorityRank = computePriorityRank(level, task.isPriority);
      
      tx.update(ref, {
        priority: level,
        priorityRank,
        updatedAt: nowISO(),
      });
      
      return { ok: true };
    });
    
    return result;
  } catch (error: any) {
    console.error("[setPriorityLevel] Error:", error);
    return { ok: false, error: error.message || "Error al establecer prioridad" };
  }
}

/**
 * Actualiza la fecha de vencimiento y recalcula slaBucket
 */
export async function updateDueAt(
  taskId: string,
  userId: string,
  dueAt?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ref = db.collection("tasks").doc(taskId);
    
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      
      if (!snap.exists) {
        throw new Error("Task not found");
      }
      
      const task = snap.data()!;
      
      // Verificar permisos
      if (task.assignedToId !== userId) {
        throw new Error("Forbidden: You can only modify your own tasks");
      }
      
      const slaBucket = computeSlaBucket(dueAt);
      
      tx.update(ref, {
        dueAt: dueAt || null,
        slaBucket,
        updatedAt: nowISO(),
      });
      
      return { ok: true };
    });
    
    return result;
  } catch (error: any) {
    console.error("[updateDueAt] Error:", error);
    return { ok: false, error: error.message || "Error al actualizar fecha" };
  }
}
