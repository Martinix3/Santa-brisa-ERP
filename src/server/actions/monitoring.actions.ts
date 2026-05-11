// src/server/actions/monitoring.actions.ts
'use server';

import { adminDb } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';

type ServerActionResult<T = void> = 
  | { ok: true; data: T }
  | { ok: false; message: string };

export interface BrainMetrics {
  totalRules: number;
  activeRules: number;
  totalCampaigns: number;
  activeCampaigns: number;
  tasksCreatedToday: number;
  tasksCreatedWeek: number;
  avgTasksPerDay: number;
  topPerformer: {
    userId: string;
    userName: string;
    tasksCompleted: number;
  } | null;
}

export interface ActivityLogEntry {
  id: string;
  type: 'RULE_EXECUTED' | 'CAMPAIGN_STARTED' | 'CAMPAIGN_COMPLETED' | 'QUOTA_ACHIEVED' | 'TASK_CREATED';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export async function getBrainMetrics(): Promise<ServerActionResult<BrainMetrics>> {
  try {
    // Obtener reglas
    const rulesSnapshot = await adminDb.collection('rules').get();
    const rules = rulesSnapshot.docs.map(doc => doc.data());
    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.enabled).length;
    
    // Obtener campañas
    const campaignsSnapshot = await adminDb.collection('campaigns').get();
    const campaigns = campaignsSnapshot.docs.map(doc => doc.data());
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    
    // Calcular tareas creadas hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('createdAt', '>=', todayTimestamp)
      .where('origin', '==', 'brain')
      .get();
    
    const tasksCreatedToday = tasksSnapshot.size;
    
    // Calcular tareas creadas esta semana
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const weekTimestamp = Timestamp.fromDate(weekAgo);
    
    const weekTasksSnapshot = await adminDb
      .collection('tasks')
      .where('createdAt', '>=', weekTimestamp)
      .where('origin', '==', 'brain')
      .get();
    
    const tasksCreatedWeek = weekTasksSnapshot.size;
    const avgTasksPerDay = Math.round(tasksCreatedWeek / 7);
    
    // Top performer (usuario con más tareas completadas esta semana)
    const completedTasksSnapshot = await adminDb
      .collection('tasks')
      .where('status', '==', 'completed')
      .where('completedAt', '>=', weekTimestamp)
      .get();
    
    const userTaskCounts: Record<string, number> = {};
    completedTasksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.assignedTo || 'unknown';
      userTaskCounts[userId] = (userTaskCounts[userId] || 0) + 1;
    });
    
    let topPerformer = null;
    if (Object.keys(userTaskCounts).length > 0) {
      const topUserId = Object.entries(userTaskCounts)
        .sort(([, a], [, b]) => b - a)[0][0];
      
      topPerformer = {
        userId: topUserId,
        userName: topUserId, // TODO: Buscar nombre real
        tasksCompleted: userTaskCounts[topUserId],
      };
    }
    
    return {
      ok: true,
      data: {
        totalRules,
        activeRules,
        totalCampaigns,
        activeCampaigns,
        tasksCreatedToday,
        tasksCreatedWeek,
        avgTasksPerDay,
        topPerformer,
      },
    };
  } catch (error: any) {
    console.error('Error getting brain metrics:', error);
    return { ok: false, message: error.message };
  }
}

export async function getActivityLog(limit = 10): Promise<ServerActionResult<ActivityLogEntry[]>> {
  try {
    const activities: ActivityLogEntry[] = [];
    
    // Obtener últimos logs de Brain
    const logsSnapshot = await adminDb
      .collection('brain')
      .doc('logs')
      .collection('entries')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    logsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        type: data.type || 'RULE_EXECUTED',
        title: data.title || 'Actividad',
        description: data.description || '',
        timestamp: data.timestamp?.toDate() || new Date(),
        metadata: data.metadata,
      });
    });
    
    // Si no hay logs, crear algunos de ejemplo basados en datos reales
    if (activities.length === 0) {
      // Obtener última campaña creada
      const campaignsSnapshot = await adminDb
        .collection('campaigns')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!campaignsSnapshot.empty) {
        const campaign = campaignsSnapshot.docs[0].data();
        activities.push({
          id: 'campaign-1',
          type: 'CAMPAIGN_STARTED',
          title: 'Campaña iniciada',
          description: campaign.name,
          timestamp: campaign.createdAt?.toDate() || new Date(),
        });
      }
      
      // Obtener últimas tareas creadas por Brain
      const tasksSnapshot = await adminDb
        .collection('tasks')
        .where('origin', '==', 'brain')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();
      
      tasksSnapshot.docs.forEach((doc, i: number) => {
        const task = doc.data();
        activities.push({
          id: `task-${i}`,
          type: 'TASK_CREATED',
          title: 'Tarea creada automáticamente',
          description: task.title || 'Nueva tarea',
          timestamp: task.createdAt?.toDate() || new Date(),
        });
      });
    }
    
    return {
      ok: true,
      data: activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    };
  } catch (error: any) {
    console.error('Error getting activity log:', error);
    return { ok: false, message: error.message };
  }
}

export async function logBrainActivity(
  type: ActivityLogEntry['type'],
  title: string,
  description: string,
  metadata?: Record<string, any>
): Promise<ServerActionResult> {
  try {
    await adminDb
      .collection('brain')
      .doc('logs')
      .collection('entries')
      .add({
        type,
        title,
        description,
        metadata,
        timestamp: Timestamp.now(),
      });
    
    return { ok: true, data: undefined };
  } catch (error: any) {
    console.error('Error logging brain activity:', error);
    return { ok: false, message: error.message };
  }
}

export async function getQuotasOverview(): Promise<ServerActionResult<{
  totalReps: number;
  onTrack: number;
  atRisk: number;
  behind: number;
}>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const quotasSnapshot = await adminDb
      .collection('dailyQuotas')
      .where('date', '==', today)
      .get();
    
    let onTrack = 0;
    let atRisk = 0;
    let behind = 0;
    
    quotasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      switch (data.status) {
        case 'ON_TRACK': onTrack++; break;
        case 'AT_RISK': atRisk++; break;
        case 'BEHIND': behind++; break;
      }
    });
    
    return {
      ok: true,
      data: {
        totalReps: quotasSnapshot.size,
        onTrack,
        atRisk,
        behind,
      },
    };
  } catch (error: any) {
    console.error('Error getting quotas overview:', error);
    return { ok: false, message: error.message };
  }
}
