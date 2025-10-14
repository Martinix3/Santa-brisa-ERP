"use server";

import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Server action para obtener métricas del Dashboard Distributor
 */
export async function getDistributorDashboardData(distributorPartyId: string) {
  try {
    const data = {
      ordersSummary: {
        pending: 0,
        inTransit: 0,
        delivered: 0,
        otif: 0
      },
      myOrders: [],
      stockSummary: {
        totalValue: 0,
        skus: 0,
        rotation: 0,
        coverage: 0
      },
      sellOutData: [],
      creditInfo: {
        limit: 0,
        used: 0,
        available: 0
      }
    };

    // TODO: Implementar queries reales filtradas por distributorPartyId
    // const orders = await db.collection('ordersSellOut')
    //   .where('distributorId', '==', distributorPartyId)
    //   .get();

    return { success: true, data };
  } catch (error) {
    console.error('[getDistributorDashboardData] Error:', error);
    return { success: false, error: 'Error al cargar datos del distribuidor' };
  }
}

export async function uploadSellOutData(distributorId: string, data: any[]) {
  try {
    // TODO: Procesar y guardar datos de sell-out desde CSV
    // Validar formato, crear registros en ordersSellOut con isSellOutReported=true
    
    return { success: true, count: data.length };
  } catch (error) {
    console.error('[uploadSellOutData] Error:', error);
    return { success: false, error: 'Error al subir datos de sell-out' };
  }
}

export async function requestPlvMaterial(distributorId: string, materialId: string, qty: number) {
  try {
    // TODO: Crear solicitud de material PLV
    
    return { success: true };
  } catch (error) {
    console.error('[requestPlvMaterial] Error:', error);
    return { success: false, error: 'Error al solicitar material PLV' };
  }
}
