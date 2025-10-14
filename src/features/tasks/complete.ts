"use server";

import { adminDb as db } from "@/server/firebase";
import { TaskKindEnum, TaskOutcomeEnum } from "@/domain/zod/task";
import type { TaskNew, TaskKind, TaskOutcome } from "@/domain/ssot";

const nowISO = () => new Date().toISOString();

/**
 * Completa una tarea VISITA con validación de negocio
 * VISITA solo puede cerrarse con:
 * - NEXT_VISIT (requiere nextEventId)
 * - ORDER_PLACED (requiere orderId)
 */
export async function completeVisitTask(
  taskId: string,
  payload: {
    outcome: "NEXT_VISIT" | "ORDER_PLACED";
    nextEventId?: string;
    orderId?: string;
    closedById: string;
  }
): Promise<{ ok: boolean; task?: TaskNew; error?: string }> {
  try {
    return await db.runTransaction(async (tx) => {
      const taskRef = db.collection("tasks").doc(taskId);
      const snap = await tx.get(taskRef);

      if (!snap.exists) {
        throw new Error("Tarea no encontrada");
      }

      const task = snap.data() as TaskNew;

      // Validar que es una VISITA
      if (task.kind !== "VISITA") {
        throw new Error("Esta acción solo es válida para tareas tipo VISITA");
      }

      // Validar estado actual
      if (!["PROGRAMADA", "IN_PROGRESS"].includes(task.status)) {
        throw new Error("Solo se pueden cerrar visitas programadas o en progreso");
      }

      // Validar según outcome
      if (payload.outcome === "NEXT_VISIT") {
        if (!payload.nextEventId) {
          throw new Error("nextEventId es obligatorio cuando outcome=NEXT_VISIT");
        }

        // Verificar que el evento existe
        const evRef = db.collection("events").doc(payload.nextEventId);
        const evSnap = await tx.get(evRef);
        if (!evSnap.exists) {
          throw new Error("El evento de próxima visita no existe");
        }
      } else if (payload.outcome === "ORDER_PLACED") {
        if (!payload.orderId) {
          throw new Error("orderId es obligatorio cuando outcome=ORDER_PLACED");
        }

        // Verificar que el pedido existe
        const orderRef = db.collection("ordersSellOut").doc(payload.orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) {
          throw new Error("El pedido no existe");
        }

        const order = orderSnap.data();
        // Validar que el pedido corresponde a la misma cuenta
        if (task.accountId && order?.accountId && order.accountId !== task.accountId) {
          throw new Error("El pedido no corresponde a la cuenta de la visita");
        }
      } else {
        throw new Error("Una VISITA solo puede cerrarse con outcome NEXT_VISIT u ORDER_PLACED");
      }

      // Actualizar tarea
      const updated: Partial<TaskNew> = {
        status: "DONE",
        outcome: payload.outcome,
        nextEventId: payload.nextEventId,
        orderId: payload.orderId ?? task.orderId,
        closedAt: nowISO(),
        closedById: payload.closedById,
        updatedAt: nowISO(),
      };

      await tx.update(taskRef, updated);

      return {
        ok: true,
        task: { ...task, ...updated } as TaskNew,
      };
    });
  } catch (error: any) {
    console.error("[completeVisitTask] Error:", error);
    return {
      ok: false,
      error: error.message || "Error al completar la visita",
    };
  }
}

/**
 * Completa una tarea genérica (no VISITA)
 */
export async function completeGenericTask(
  taskId: string,
  closedById: string,
  outcome: TaskOutcome = "COMPLETED"
): Promise<{ ok: boolean; task?: TaskNew; error?: string }> {
  try {
    return await db.runTransaction(async (tx) => {
      const taskRef = db.collection("tasks").doc(taskId);
      const snap = await tx.get(taskRef);

      if (!snap.exists) {
        throw new Error("Tarea no encontrada");
      }

      const task = snap.data() as TaskNew;

      // No permitir para VISITA
      if (task.kind === "VISITA") {
        throw new Error("Use completeVisitTask para tareas tipo VISITA");
      }

      // Actualizar tarea
      const updated: Partial<TaskNew> = {
        status: "DONE",
        outcome,
        closedAt: nowISO(),
        closedById,
        updatedAt: nowISO(),
      };

      await tx.update(taskRef, updated);

      return {
        ok: true,
        task: { ...task, ...updated } as TaskNew,
      };
    });
  } catch (error: any) {
    console.error("[completeGenericTask] Error:", error);
    return {
      ok: false,
      error: error.message || "Error al completar la tarea",
    };
  }
}

/**
 * Cancela una tarea con razón
 */
export async function cancelTask(
  taskId: string,
  closedById: string,
  reason?: string
): Promise<{ ok: boolean; task?: TaskNew; error?: string }> {
  try {
    const taskRef = db.collection("tasks").doc(taskId);
    const snap = await taskRef.get();

    if (!snap.exists) {
      return { ok: false, error: "Tarea no encontrada" };
    }

    const task = snap.data() as TaskNew;

    const updated: Partial<TaskNew> = {
      status: "CANCELLED",
      outcome: "CANCELLED",
      closedAt: nowISO(),
      closedById,
      updatedAt: nowISO(),
      ...(reason && { desc: `${task.desc || ""}\n\nMotivo de cancelación: ${reason}`.trim() }),
    };

    await taskRef.update(updated);

    return {
      ok: true,
      task: { ...task, ...updated } as TaskNew,
    };
  } catch (error: any) {
    console.error("[cancelTask] Error:", error);
    return {
      ok: false,
      error: error.message || "Error al cancelar la tarea",
    };
  }
}

/**
 * Helper para validar si una tarea puede ser completada
 */
export async function canCompleteTask(
  taskId: string
): Promise<{ canComplete: boolean; reason?: string; kind?: TaskKind }> {
  try {
    const taskRef = db.collection("tasks").doc(taskId);
    const snap = await taskRef.get();

    if (!snap.exists) {
      return { canComplete: false, reason: "Tarea no encontrada" };
    }

    const task = snap.data() as TaskNew;

    // Ya completada o cancelada
    if (["DONE", "CANCELLED"].includes(task.status)) {
      return { canComplete: false, reason: "La tarea ya está cerrada", kind: task.kind };
    }

    return { canComplete: true, kind: task.kind };
  } catch (error: any) {
    console.error("[canCompleteTask] Error:", error);
    return { canComplete: false, reason: "Error verificando tarea" };
  }
}
