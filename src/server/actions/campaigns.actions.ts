// src/server/actions/campaigns.actions.ts
'use server';

import { adminDb } from '@/server/firebase';
import type { 
  Campaign, 
  CampaignStatus, 
  DailyQuota,
  QuotaStatus 
} from '@/domain/campaigns';
import { Timestamp } from 'firebase-admin/firestore';

type ServerActionResult<T = void> = 
  | { ok: true; data: T }
  | { ok: false; message: string };

// ===== CAMPAIGNS =====

export async function createCampaign(
  data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServerActionResult<string>> {
  try {
    const docRef = await adminDb.collection('campaigns').add({
      ...data,
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return { ok: true, data: docRef.id };
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return { ok: false, message: error.message };
  }
}

export async function getCampaigns(
  status?: CampaignStatus
): Promise<ServerActionResult<Campaign[]>> {
  try {
    let query = adminDb.collection('campaigns').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status) as any;
    }
    
    const snapshot = await query.get();
    const campaigns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Campaign;
    });
    
    return { ok: true, data: campaigns };
  } catch (error: any) {
    console.error('Error getting campaigns:', error);
    return { ok: false, message: error.message };
  }
}

export async function getCampaign(
  campaignId: string
): Promise<ServerActionResult<Campaign>> {
  try {
    const doc = await adminDb.collection('campaigns').doc(campaignId).get();
    
    if (!doc.exists) {
      return { ok: false, message: 'Campaign not found' };
    }
    
    const data = doc.data()!;
    const campaign: Campaign = {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Campaign;
    
    return { ok: true, data: campaign };
  } catch (error: any) {
    console.error('Error getting campaign:', error);
    return { ok: false, message: error.message };
  }
}

export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<ServerActionResult> {
  try {
    await adminDb.collection('campaigns').doc(campaignId).update({
      status,
      updatedAt: Timestamp.now(),
    });
    
    return { ok: true, data: undefined };
  } catch (error: any) {
    console.error('Error updating campaign status:', error);
    return { ok: false, message: error.message };
  }
}

export async function updateCampaignProgress(
  campaignId: string,
  repId: string,
  increment: number
): Promise<ServerActionResult> {
  try {
    const campaignRef = adminDb.collection('campaigns').doc(campaignId);
    const doc = await campaignRef.get();
    
    if (!doc.exists) {
      return { ok: false, message: 'Campaign not found' };
    }
    
    const campaign = doc.data() as Campaign;
    
    // Actualizar progress del rep
    const updatedProgress = campaign.progress.map(p => 
      p.repId === repId 
        ? { ...p, current: p.current + increment } 
        : p
    );
    
    // Si el rep no existe, añadirlo
    if (!campaign.progress.some(p => p.repId === repId)) {
      updatedProgress.push({
        repId,
        current: increment,
        target: 0, // Se puede calcular según goals
      });
    }
    
    await campaignRef.update({
      progress: updatedProgress,
      updatedAt: Timestamp.now(),
    });
    
    return { ok: true, data: undefined };
  } catch (error: any) {
    console.error('Error updating campaign progress:', error);
    return { ok: false, message: error.message };
  }
}

export async function deleteCampaign(
  campaignId: string
): Promise<ServerActionResult> {
  try {
    await adminDb.collection('campaigns').doc(campaignId).delete();
    return { ok: true, data: undefined };
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return { ok: false, message: error.message };
  }
}

// ===== DAILY QUOTAS =====

export async function getDailyQuotas(
  repId: string,
  date: string
): Promise<ServerActionResult<DailyQuota>> {
  try {
    const docId = `${repId}_${date}`;
    const doc = await adminDb.collection('dailyQuotas').doc(docId).get();
    
    if (!doc.exists) {
      // Crear quotas default
      const defaultQuotas: DailyQuota = {
        repId,
        date,
        quotas: {
          visits: { target: 5, current: 0 },
          calls: { target: 10, current: 0 },
          orders: { target: 3, current: 0 },
        },
        status: 'ON_TRACK',
        lastUpdated: new Date(),
      };
      
      await adminDb.collection('dailyQuotas').doc(docId).set({
        ...defaultQuotas,
        lastUpdated: Timestamp.now(),
      });
      
      return { ok: true, data: defaultQuotas };
    }
    
    const data = doc.data()!;
    const quotas: DailyQuota = {
      ...data,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
    } as DailyQuota;
    
    return { ok: true, data: quotas };
  } catch (error: any) {
    console.error('Error getting daily quotas:', error);
    return { ok: false, message: error.message };
  }
}

export async function incrementQuota(
  repId: string,
  date: string,
  type: 'visits' | 'calls' | 'orders'
): Promise<ServerActionResult<DailyQuota>> {
  try {
    const docId = `${repId}_${date}`;
    const docRef = adminDb.collection('dailyQuotas').doc(docId);
    const doc = await docRef.get();
    
    let quotas: DailyQuota;
    
    if (!doc.exists) {
      // Crear con valor inicial
      quotas = {
        repId,
        date,
        quotas: {
          visits: { target: 5, current: type === 'visits' ? 1 : 0 },
          calls: { target: 10, current: type === 'calls' ? 1 : 0 },
          orders: { target: 3, current: type === 'orders' ? 1 : 0 },
        },
        status: 'ON_TRACK',
        lastUpdated: new Date(),
      };
    } else {
      const data = doc.data() as DailyQuota;
      quotas = {
        ...data,
        quotas: {
          ...data.quotas,
          [type]: {
            ...data.quotas[type],
            current: data.quotas[type].current + 1,
          },
        },
        lastUpdated: new Date(),
      };
    }
    
    // Recalcular status
    quotas.status = calculateQuotaStatus(quotas.quotas);
    
    await docRef.set({
      ...quotas,
      lastUpdated: Timestamp.now(),
    });
    
    return { ok: true, data: quotas };
  } catch (error: any) {
    console.error('Error incrementing quota:', error);
    return { ok: false, message: error.message };
  }
}

export async function setDailyQuotaTargets(
  repId: string,
  date: string,
  targets: { visits?: number; calls?: number; orders?: number }
): Promise<ServerActionResult> {
  try {
    const docId = `${repId}_${date}`;
    const docRef = adminDb.collection('dailyQuotas').doc(docId);
    const doc = await docRef.get();
    
    const currentData = doc.exists ? doc.data() as DailyQuota : null;
    
    const quotas: DailyQuota = {
      repId,
      date,
      quotas: {
        visits: {
          target: targets.visits ?? currentData?.quotas.visits.target ?? 5,
          current: currentData?.quotas.visits.current ?? 0,
        },
        calls: {
          target: targets.calls ?? currentData?.quotas.calls.target ?? 10,
          current: currentData?.quotas.calls.current ?? 0,
        },
        orders: {
          target: targets.orders ?? currentData?.quotas.orders.target ?? 3,
          current: currentData?.quotas.orders.current ?? 0,
        },
      },
      status: calculateQuotaStatus(currentData?.quotas ?? {
        visits: { target: 5, current: 0 },
        calls: { target: 10, current: 0 },
        orders: { target: 3, current: 0 },
      }),
      lastUpdated: new Date(),
    };
    
    await docRef.set({
      ...quotas,
      lastUpdated: Timestamp.now(),
    });
    
    return { ok: true, data: undefined };
  } catch (error: any) {
    console.error('Error setting quota targets:', error);
    return { ok: false, message: error.message };
  }
}

// ===== HELPERS =====

function calculateQuotaStatus(quotas: DailyQuota['quotas']): QuotaStatus {
  const hour = new Date().getHours();
  const expectedProgress = hour / 24; // % del día transcurrido
  
  // Calcular progreso real
  const visitsProgress = quotas.visits.target > 0 
    ? quotas.visits.current / quotas.visits.target 
    : 0;
  const ordersProgress = quotas.orders.target > 0
    ? quotas.orders.current / quotas.orders.target 
    : 0;
  
  const avgProgress = (visitsProgress + ordersProgress) / 2;
  
  // Comparar con progreso esperado
  if (avgProgress >= expectedProgress * 0.8) return 'ON_TRACK';
  if (avgProgress >= expectedProgress * 0.5) return 'AT_RISK';
  return 'BEHIND';
}
