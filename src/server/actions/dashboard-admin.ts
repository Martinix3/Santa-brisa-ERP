"use server";

import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Server action para obtener métricas del Dashboard Admin
 */
export async function getAdminDashboardData() {
  try {
    const data = {
      financialKpis: {
        salesTotal: 0,
        salesGrowth: 0,
        collected: 0,
        pending: 0,
        margin: 0
      },
      topAccounts: [],
      productionSummary: {
        activeLots: 0,
        pendingQC: 0,
        completedOrders: 0,
        oee: 0
      },
      criticalAlerts: []
    };

    // TODO: Implementar queries reales
    // const orders = await db.collection('ordersSellOut')
    //   .where('createdAt', '>=', startOfYear)
    //   .get();

    return { success: true, data };
  } catch (error) {
    console.error('[getAdminDashboardData] Error:', error);
    return { success: false, error: 'Error al cargar datos admin' };
  }
}

export async function getFinancialMetrics() {
  try {
    // TODO: Calcular métricas financieras
    return { success: true, data: {} };
  } catch (error) {
    console.error('[getFinancialMetrics] Error:', error);
    return { success: false, error: 'Error al cargar métricas financieras' };
  }
}
