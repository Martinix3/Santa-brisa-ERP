"use server";

import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Server action para obtener métricas del Dashboard Sales (Comercial)
 */
export async function getSalesDashboardData(userId: string) {
  try {
    const data = {
      salesKpis: {
        monthlyTarget: 50000,
        currentSales: 0,
        visits: 0,
        orders: 0,
        conversion: 0
      },
      accounts: {
        byStage: [],
        inactive: []
      },
      upcomingVisits: [],
      recentActivity: []
    };

    // TODO: Implementar queries reales
    // const orders = await db.collection('ordersSellOut')
    //   .where('createdById', '==', userId)
    //   .where('createdAt', '>=', startOfMonth)
    //   .get();

    return { success: true, data };
  } catch (error) {
    console.error('[getSalesDashboardData] Error:', error);
    return { success: false, error: 'Error al cargar datos de ventas' };
  }
}

export async function getMyAccounts(userId: string) {
  try {
    // const snapshot = await db.collection('contacts')
    //   .where('customer.ownerId', '==', userId)
    //   .get();

    return { success: true, data: [] };
  } catch (error) {
    console.error('[getMyAccounts] Error:', error);
    return { success: false, error: 'Error al cargar cuentas' };
  }
}

export async function getUpcomingVisits(userId: string) {
  try {
    const today = new Date();
    
    // const snapshot = await db.collection('interactions')
    //   .where('userId', '==', userId)
    //   .where('kind', '==', 'VISITA')
    //   .where('plannedFor', '>=', today.toISOString())
    //   .orderBy('plannedFor', 'asc')
    //   .limit(5)
    //   .get();

    return { success: true, data: [] };
  } catch (error) {
    console.error('[getUpcomingVisits] Error:', error);
    return { success: false, error: 'Error al cargar visitas' };
  }
}
