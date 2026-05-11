import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../firebase-admin";
import { getISOWeek, addDays, daysBetween } from "../utils/dateHelpers";

/**
 * Cloud Function programada que revisa cuentas inactivas
 * y genera tareas automáticas para el equipo de ventas
 * 
 * Ejecuta diariamente a las 9 AM
 */
export const checkInactiveAccounts = onSchedule(
  {
    schedule: "0 9 * * *", // Diario a las 9 AM
    timeZone: "Europe/Madrid",
    memory: "512MiB",
  },
  async (event) => {
    console.log("🤖 [checkInactiveAccounts] Iniciando revisión de cuentas inactivas...");

    try {
      // 1. Obtener configuración del sistema
      const configSnap = await db.collection("systemConfig").doc("default").get();
      const config = configSnap.data();
      
      const DAYS_WITHOUT_ORDER = config?.businessRules?.alerts?.daysWithoutOrder || 45;
      const DAYS_WITHOUT_VISIT = config?.businessRules?.alerts?.daysWithoutVisit || 30;
      const DAYS_CRITICAL = config?.businessRules?.alerts?.daysSinPedidoCritical || 60;

      console.log(`📊 Thresholds: ${DAYS_WITHOUT_ORDER}d sin pedido, ${DAYS_WITHOUT_VISIT}d sin visita`);

      const now = new Date();
      const weekKey = getISOWeek(now); // Para deduplicación semanal

      // 2. Obtener cuentas activas (CUSTOMER)
      const accountsSnap = await db
        .collection("contacts")
        .where("roles", "array-contains", "CUSTOMER")
        .get();

      console.log(`📋 Revisando ${accountsSnap.size} cuentas...`);

      let tasksCreated = 0;
      let tasksUpdated = 0;

      // 3. Revisar cada cuenta
      for (const accountDoc of accountsSnap.docs) {
        const account = accountDoc.data();
        
        // Skip si no tiene owner
        if (!account.customer?.ownerId) {
          continue;
        }

        // A. Check último pedido
        const lastOrderSnap = await db
          .collection("ordersSellOut")
          .where("accountId", "==", account.id)
          .orderBy("orderDate", "desc")
          .limit(1)
          .get();

        const lastOrder = lastOrderSnap.docs[0]?.data();
        const daysSinceOrder = lastOrder
          ? daysBetween(new Date(lastOrder.orderDate), now)
          : 999;

        if (daysSinceOrder >= DAYS_WITHOUT_ORDER) {
          const priority = daysSinceOrder >= DAYS_CRITICAL ? "HIGH" : "MEDIUM";
          const dedupeKey = `no-order-${account.id}-week-${weekKey}`;
          
          const result = await upsertAutoTask({
            dedupeKey,
            accountId: account.id,
            title: `Visitar: ${account.displayName} (${daysSinceOrder}d sin pedido)`,
            desc: `Último pedido: ${lastOrder?.orderDate ? new Date(lastOrder.orderDate).toLocaleDateString() : "nunca"}`,
            kind: "VISITA",
            department: "VENTAS",
            source: "AUTO_RULE",
            assignedToId: account.customer.ownerId,
            status: "BACKLOG",
            priority,
            dueAt: addDays(now, 2).toISOString(),
          });

          if (result.created) tasksCreated++;
          else tasksUpdated++;
        }

        // B. Check última visita
        const lastVisitSnap = await db
          .collection("interactions")
          .where("accountId", "==", account.id)
          .where("kind", "==", "VISITA")
          .where("status", "==", "done")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        const lastVisit = lastVisitSnap.docs[0]?.data();
        const daysSinceVisit = lastVisit
          ? daysBetween(new Date(lastVisit.createdAt), now)
          : 999;

        if (daysSinceVisit >= DAYS_WITHOUT_VISIT) {
          const dedupeKey = `no-visit-${account.id}-week-${weekKey}`;
          
          const result = await upsertAutoTask({
            dedupeKey,
            accountId: account.id,
            title: `Contactar: ${account.displayName} (${daysSinceVisit}d sin visita)`,
            desc: `Última visita: ${lastVisit?.createdAt ? new Date(lastVisit.createdAt).toLocaleDateString() : "nunca"}`,
            kind: "VISITA",
            department: "VENTAS",
            source: "AUTO_RULE",
            assignedToId: account.customer.ownerId,
            status: "BACKLOG",
            priority: "MEDIUM",
            dueAt: addDays(now, 3).toISOString(),
          });

          if (result.created) tasksCreated++;
          else tasksUpdated++;
        }
      }

      console.log(`✅ [checkInactiveAccounts] Completado: ${tasksCreated} creadas, ${tasksUpdated} actualizadas`);

      return {
        success: true,
        accountsReviewed: accountsSnap.size,
        tasksCreated,
        tasksUpdated,
      };
    } catch (error: any) {
      console.error("❌ [checkInactiveAccounts] Error:", error);
      throw error;
    }
  }
);

/**
 * Crea o actualiza una tarea automática con deduplicación
 */
async function upsertAutoTask(
  data: {
    dedupeKey: string;
    accountId: string;
    title: string;
    desc?: string;
    kind: string;
    department: string;
    source: string;
    assignedToId: string;
    status: string;
    priority: string;
    dueAt: string;
  }
): Promise<{ created: boolean; updated: boolean; taskId: string }> {
  const { dedupeKey, ...taskData } = data;

  // Buscar tarea existente para esta cuenta en estado activo
  const existingSnap = await db
    .collection("tasks")
    .where("source", "==", "AUTO_RULE")
    .where("accountId", "==", taskData.accountId)
    .where("status", "in", ["BACKLOG", "IN_PROGRESS", "PROGRAMADA"])
    .where("kind", "==", taskData.kind)
    .limit(1)
    .get();

  const now = new Date().toISOString();

  if (!existingSnap.empty) {
    // Actualizar tarea existente
    const taskRef = existingSnap.docs[0].ref;
    await taskRef.update({
      title: taskData.title,
      desc: taskData.desc,
      priority: taskData.priority,
      dueAt: taskData.dueAt,
      updatedAt: now,
    });

    return {
      created: false,
      updated: true,
      taskId: existingSnap.docs[0].id,
    };
  } else {
    // Crear nueva tarea
    const ref = db.collection("tasks").doc();
    await ref.set({
      id: ref.id,
      ...taskData,
      isPriority: false,
      priorityRank: taskData.priority === "HIGH" ? 1 : 0,
      slaBucket: "LATER",
      progress: 0,
      createdById: "system",
      createdAt: now,
      updatedAt: now,
    });

    return {
      created: true,
      updated: false,
      taskId: ref.id,
    };
  }
}
