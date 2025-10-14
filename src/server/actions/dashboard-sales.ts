"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { FORMULAS, ALERT_RULES } from "@/config/dashboard-config";

/**
 * Server actions para el Dashboard de Ventas
 * Obtiene KPIs, cuentas, visitas, pedidos y tareas del usuario
 */

export interface SalesDashboardData {
  salesKpis: {
    monthlyTarget: number;
    currentSales: number;
    progress: number;
    visits: number;
    orders: number;
    conversion: number;
  };
  accountsByStage: Record<string, number>;
  upcomingVisits: Array<{
    id: string;
    accountId: string;
    accountName: string;
    timestamp: Date;
    notes?: string;
  }>;
  inactiveAccounts: Array<{
    id: string;
    name: string;
    lastActivity: Date;
    daysSince: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: Date;
    priority: string;
    status: string;
  }>;
}

/**
 * Obtener datos del dashboard de ventas para el usuario actual
 */
export async function getSalesDashboardData() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "No autorizado"
      };
    }

    // 1. Obtener usuario actual
    const userDoc = await db.collection("teamMembers").doc(userId).get();
    const user = userDoc.data();
    
    if (!user) {
      return {
        success: false,
        error: "Usuario no encontrado"
      };
    }

    // 2. Calcular fechas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 3. Queries en paralelo para optimizar
    const [accountsSnapshot, ordersSnapshot, interactionsSnapshot, tasksSnapshot] = await Promise.all([
      // Cuentas del usuario
      db
        .collection("accounts")
        .where("ownerId", "==", userId)
        .get(),
      
      // Pedidos del mes
      db
        .collection("ordersSellOut")
        .where("createdBy", "==", userId)
        .where("createdAt", ">=", startOfMonth)
        .where("createdAt", "<=", endOfMonth)
        .get(),
      
      // Interacciones del mes (visitas)
      db
        .collection("interactions")
        .where("createdBy", "==", userId)
        .where("timestamp", ">=", startOfMonth)
        .where("timestamp", "<=", endOfMonth)
        .get(),
      
      // Tareas pendientes
      db
        .collection("tasks")
        .where("assignedTo", "==", userId)
        .where("status", "in", ["PENDING", "IN_PROGRESS"])
        .orderBy("dueDate", "asc")
        .limit(20)
        .get()
    ]);

    // 4. Procesar cuentas
    const accounts = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 5. Procesar pedidos
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 6. Procesar interacciones
    const interactions = interactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar solo visitas
    const visits = interactions.filter(i => i.type === "visit");

    // 7. Calcular KPIs usando fórmulas centralizadas
    const monthlyTarget = user.salesTarget || 50000;
    const currentSales = orders.reduce((sum, order) => {
      const amount = order.totalAmount || 0;
      return sum + amount;
    }, 0);
    
    const progress = FORMULAS.targetProgress(currentSales, monthlyTarget);
    const conversion = FORMULAS.conversionRate(orders.length, visits.length);

    const salesKpis = {
      monthlyTarget,
      currentSales,
      progress,
      visits: visits.length,
      orders: orders.length,
      conversion
    };

    // 8. Agrupar cuentas por stage
    const accountsByStage = accounts.reduce((acc, account: any) => {
      const stage = account.stagePreview || "POTENCIAL";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 9. Próximas visitas (interactions futuras de tipo visit)
    const upcomingVisitsSnapshot = await db
      .collection("interactions")
      .where("createdBy", "==", userId)
      .where("type", "==", "visit")
      .where("timestamp", ">=", now)
      .orderBy("timestamp", "asc")
      .limit(5)
      .get();

    const upcomingVisits = await Promise.all(
      upcomingVisitsSnapshot.docs.map(async (doc) => {
        const interaction = doc.data();
        let accountName = "Sin nombre";
        
        if (interaction.accountId) {
          const accountDoc = await db.collection("accounts").doc(interaction.accountId).get();
          accountName = accountDoc.data()?.name || "Sin nombre";
        }
        
        return {
          id: doc.id,
          accountId: interaction.accountId || "",
          accountName,
          timestamp: interaction.timestamp?.toDate() || new Date(),
          notes: interaction.notes
        };
      })
    );

    // 10. Cuentas inactivas usando regla de alerta centralizada
    const inactiveAccounts = accounts
      .filter((account: any) => {
        const lastActivity = account.lastInteractionDate?.toDate() || new Date(0);
        return ALERT_RULES.isAccountInactive(lastActivity);
      })
      .map((account: any) => {
        const lastActivity = account.lastInteractionDate?.toDate() || new Date(0);
        return {
          id: account.id,
          name: account.name || "Sin nombre",
          lastActivity,
          daysSince: FORMULAS.daysSinceLastActivity(lastActivity)
        };
      })
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5);

    // 11. Actividad reciente (últimas 10 interacciones)
    const recentActivitySnapshot = await db
      .collection("interactions")
      .where("createdBy", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const recentActivity = recentActivitySnapshot.docs.map(doc => {
      const interaction = doc.data();
      return {
        id: doc.id,
        type: interaction.type || "unknown",
        description: interaction.notes || `${interaction.type} realizada`,
        timestamp: interaction.timestamp?.toDate() || new Date()
      };
    });

    // 12. Procesar tareas
    const tasks = tasksSnapshot.docs.map(doc => {
      const task = doc.data();
      return {
        id: doc.id,
        title: task.title || "Sin título",
        dueDate: task.dueDate?.toDate() || new Date(),
        priority: task.priority || "MEDIUM",
        status: task.status || "PENDING"
      };
    });

    return {
      success: true,
      data: {
        salesKpis,
        accountsByStage,
        upcomingVisits,
        inactiveAccounts,
        recentActivity,
        tasks
      } as SalesDashboardData
    };

  } catch (error: any) {
    console.error("[getSalesDashboardData] Error:", error);
    return {
      success: false,
      error: error.message || "Error al obtener datos del dashboard"
    };
  }
}

/**
 * Obtener resumen rápido de KPIs (versión ligera para widgets)
 */
export async function getSalesKpisSummary() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "No autorizado" };
    }

    const userDoc = await db.collection("teamMembers").doc(userId).get();
    const user = userDoc.data();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Solo pedidos del mes
    const ordersSnapshot = await db
      .collection("ordersSellOut")
      .where("createdBy", "==", userId)
      .where("createdAt", ">=", startOfMonth)
      .get();

    const monthlyTarget = user?.salesTarget || 50000;
    const currentSales = ordersSnapshot.docs.reduce((sum, doc) => {
      const order = doc.data();
      return sum + (order.totalAmount || 0);
    }, 0);

    return {
      success: true,
      data: {
        monthlyTarget,
        currentSales,
        progress: FORMULAS.targetProgress(currentSales, monthlyTarget),
        ordersCount: ordersSnapshot.size
      }
    };

  } catch (error: any) {
    console.error("[getSalesKpisSummary] Error:", error);
    return {
      success: false,
      error: error.message || "Error al obtener KPIs"
    };
  }
}
