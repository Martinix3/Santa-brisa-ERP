"use server";

import { adminDb as db } from "@/server/firebase";
import { FORMULAS, ALERT_RULES } from "@/config/dashboard-config";
import { DashboardAdapters } from "@/lib/dashboard-adapters";
import type { UpcomingVisitUI, InactiveAccountUI, RecentActivityUI, TaskAlertUI } from "@/lib/dashboard-adapters";

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
  upcomingVisits: UpcomingVisitUI[];
  inactiveAccounts: InactiveAccountUI[];
  recentActivity: RecentActivityUI[];
  tasks: TaskAlertUI[];
}

/**
 * Obtener datos del dashboard de ventas
 * @param userId - Opcional. Si se pasa, filtra por usuario (dashboard personal). Si no, muestra todo el equipo (dashboard departamental).
 */
export async function getSalesDashboardData(userId?: string) {
  try {
    // 1. Calcular fechas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 2. Construir queries base
    let accountsQuery: any = db.collection("accounts");
    let ordersQuery: any = db.collection("ordersSellOut")
      .where("createdAt", ">=", startOfMonth.toISOString())
      .where("createdAt", "<=", endOfMonth.toISOString());
    let interactionsQuery: any = db.collection("interactions")
      .where("createdAt", ">=", startOfMonth.toISOString())
      .where("createdAt", "<=", endOfMonth.toISOString());
    let tasksQuery: any = db.collection("tasks")
      .where("status", "in", ["PENDING", "IN_PROGRESS"])
      .limit(20);

    // Si hay userId, filtrar por ese usuario (dashboard personal)
    if (userId) {
      accountsQuery = accountsQuery.where("ownerId", "==", userId);
      ordersQuery = ordersQuery.where("createdById", "==", userId);
      interactionsQuery = interactionsQuery.where("userId", "==", userId);
      tasksQuery = tasksQuery.where("assignedToId", "==", userId);
    }

    // 3. Queries en paralelo para optimizar
    const [accountsSnapshot, ordersSnapshot, interactionsSnapshot, tasksSnapshot] = await Promise.all([
      accountsQuery.get(),
      ordersQuery.get(),
      interactionsQuery.get(),
      tasksQuery.get()
    ]);

    // 4. Procesar cuentas
    const accounts = accountsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // 5. Procesar pedidos
    const orders = ordersSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // 6. Procesar interacciones
    const interactions = interactionsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar solo visitas
    const visits = interactions.filter((i: any) => i.kind === "VISITA");

    // 7. Calcular KPIs usando fórmulas centralizadas
    const monthlyTarget = 50000; // TODO: Obtener de configuración del equipo
    const currentSales = orders.reduce((sum: number, order: any) => {
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
    const accountsByStage = accounts.reduce((acc: any, account: any) => {
      const stage = account.stagePreview || "POTENCIAL";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 9. Próximas visitas - TODO: Requiere índice Firestore
    // Temporalmente devolvemos array vacío para que el dashboard funcione
    // Crear índice en: https://console.firebase.google.com/project/santa-brisa-erp/firestore/indexes
    const upcomingVisits: UpcomingVisitUI[] = [];
    
    // CÓDIGO COMENTADO (requiere índice compuesto en Firestore):
    /*
    let upcomingVisitsQuery: any = db
      .collection("interactions")
      .where("kind", "==", "VISITA")
      .where("plannedFor", ">=", now.toISOString())
      .orderBy("plannedFor", "asc")
      .limit(5);
    
    if (userId) {
      upcomingVisitsQuery = upcomingVisitsQuery.where("userId", "==", userId);
    }
    
    const upcomingVisitsSnapshot = await upcomingVisitsQuery.get();
    const upcomingVisits = await Promise.all(...);
    */

    // 10. Cuentas inactivas - USAR ADAPTER
    const inactiveAccounts: InactiveAccountUI[] = accounts
      .filter((account: any) => {
        const lastActivity = account.lastInteractionDate?.toDate() || new Date(0);
        return ALERT_RULES.isAccountInactive(lastActivity);
      })
      .map((account: any) => DashboardAdapters.adaptInactiveAccount(account))
      .sort((a: any, b: any) => b.daysSince - a.daysSince)
      .slice(0, 5);

    // 11. Actividad reciente - USAR ADAPTER
    let recentActivityQuery: any = db
      .collection("interactions")
      .orderBy("createdAt", "desc")
      .limit(10);
    
    if (userId) {
      recentActivityQuery = recentActivityQuery.where("userId", "==", userId);
    }
    
    const recentActivitySnapshot = await recentActivityQuery.get();

    const recentActivity: RecentActivityUI[] = recentActivitySnapshot.docs.map((doc: any) => {
      const interaction = { id: doc.id, ...doc.data() };
      return DashboardAdapters.adaptRecentActivity(interaction);
    });

    // 12. Procesar tareas - USAR ADAPTER
    const tasks: TaskAlertUI[] = tasksSnapshot.docs
      .map((doc: any) => {
        const task = { id: doc.id, ...doc.data() };
        return DashboardAdapters.adaptTaskToAlert(task);
      })
      .slice(0, 3); // Solo 3 tareas más importantes

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
    const userDoc = await db.collection("teamMembers").doc("current-user").get();
    const user = userDoc.data();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Solo pedidos del mes
    const ordersSnapshot = await db
      .collection("ordersSellOut")
      .where("createdBy", "==", "current-user")
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
