// FILE: src/server/actions/campaigns.actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { createAlert } from './alerts.actions';
import { executeRulesForTrigger } from '@/server/automation/automation-engine';
import type { Campaign as SsotCampaign, Department } from '@/domain/ssot';
import type { Campaign as BrainCampaign } from '@/domain/campaigns';

/**
 * 📢 CAMPAIGNS SERVER ACTIONS
 * 
 * Sistema de campañas con automatización de alertas y tareas.
 * 
 * FASE FINAL.4 - Integración con Campañas
 * 
 * Funcionalidades:
 * - Crear campañas con alertas automáticas
 * - Vincular eventos a campañas
 * - Alertas al inicio/fin de campaña
 * - Recordatorios periódicos
 */

// =================================================================
// CREATE CAMPAIGN WITH AUTOMATION
// =================================================================

export interface CreateCampaignParams {
  title: string;
  kind: 'COLLAB' | 'ADS' | 'POS' | 'EVENT_SERIES' | 'OTHER';
  department: Department;
  startAt?: string;
  endAt?: string;
  kpiTarget?: number;
  budget?: number;
  notes?: string;

  // Automatización
  automationRules?: {
    alertOnStart?: boolean;
    alertBeforeEnd?: number;      // Días antes del fin
    taskOnMilestone?: boolean;
    reminderFrequency?: 'DAILY' | 'WEEKLY' | 'NONE';
  };

  // Eventos a vincular
  eventIds?: string[];
}

/**
 * Crear campaña con alertas automáticas
 */
export async function createCampaignWithAutomation(
  params: CreateCampaignParams,
  userId: string
): Promise<{ success: boolean; campaignId?: string; alertsCreated?: number }> {

  try {
    console.log('[Campaigns] 🚀 Creating campaign:', params.title);

    // 1. Crear la campaña
    const campaign: Omit<SsotCampaign, 'id'> = {
      title: params.title,
      kind: params.kind,
      department: params.department,
      startAt: params.startAt,
      endAt: params.endAt,
      kpiTarget: params.kpiTarget,
      notes: params.notes,
      budget: params.budget,
      spent: 0,
      eventIds: params.eventIds || [],
      taskIds: [],
      alertIds: [],
      automationRules: params.automationRules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('campaigns').add(campaign);
    const campaignId = docRef.id;

    console.log('[Campaigns] ✅ Campaign created:', campaignId);

    // 2. Crear alertas automáticas según configuración
    const alertIds: string[] = [];

    // Alerta al iniciar campaña
    if (params.automationRules?.alertOnStart && params.startAt) {
      const alert = await createAlert({
        type: 'CAMPAIGN_START',
        severity: 'MEDIUM',
        title: `🚀 Campaña iniciada: ${params.title}`,
        message: `La campaña "${params.title}" ha comenzado`,
        userId,
        department: params.department,
        entityType: 'CAMPAIGN',
        entityId: campaignId,
        campaignId,
        actionable: true,
        suggestedActions: [
          {
            label: 'Ver campaña',
            action: 'CUSTOM',
            params: { route: `/marketing/campaigns/${campaignId}` },
          },
        ],
        metadata: {
          source: 'CAMPAIGN',
          campaignTitle: params.title,
        },
      });

      if (alert.success && alert.alertId) {
        alertIds.push(alert.alertId);
        console.log('[Campaigns] ✅ Alert created for campaign start');
      }
    }

    // Alerta antes del fin de campaña
    if (params.automationRules?.alertBeforeEnd && params.endAt) {
      const daysBeforeEnd = params.automationRules.alertBeforeEnd;
      const endDate = new Date(params.endAt);
      const alertDate = new Date(endDate);
      alertDate.setDate(alertDate.getDate() - daysBeforeEnd);

      // Crear alerta programada
      const alert = await createAlert({
        type: 'CUSTOM',
        severity: 'MEDIUM',
        title: `⏰ Campaña termina en ${daysBeforeEnd} días: ${params.title}`,
        message: `La campaña "${params.title}" finaliza el ${endDate.toLocaleDateString()}`,
        userId,
        department: params.department,
        entityType: 'CAMPAIGN',
        entityId: campaignId,
        campaignId,
        actionable: true,
        metadata: {
          source: 'CAMPAIGN',
          campaignTitle: params.title,
          daysBeforeEnd,
        },
        // Programar para la fecha calculada
        expiresAt: endDate.toISOString(),
      });

      if (alert.success && alert.alertId) {
        alertIds.push(alert.alertId);
        console.log('[Campaigns] ✅ Alert scheduled for campaign end');
      }
    }

    // 3. Actualizar campaña con IDs de alertas
    if (alertIds.length > 0) {
      await db.collection('campaigns').doc(campaignId).update({
        alertIds,
        updatedAt: new Date().toISOString(),
      });
    }

    // 4. Vincular eventos si se proporcionaron
    if (params.eventIds && params.eventIds.length > 0) {
      for (const eventId of params.eventIds) {
        await linkEventToCampaign(campaignId, eventId);
      }
    }

    // 5. Disparar trigger de automation engine
    await executeRulesForTrigger('CAMPAIGN_START', {
      triggerType: 'CAMPAIGN_START',
      triggerData: {
        campaignId,
        campaignTitle: params.title,
        department: params.department,
        startAt: params.startAt,
      },
      entityType: 'CAMPAIGN',
      entityId: campaignId,
      userId,
      triggeredAt: new Date().toISOString(),
    });

    return {
      success: true,
      campaignId,
      alertsCreated: alertIds.length,
    };

  } catch (error) {
    console.error('[Campaigns] Error creating campaign:', error);
    return { success: false };
  }
}

// =================================================================
// LINK EVENT TO CAMPAIGN
// =================================================================

/**
 * Vincular evento a campaña (bidireccional)
 */
export async function linkEventToCampaign(
  campaignId: string,
  eventId: string
): Promise<{ success: boolean }> {

  try {
    // 1. Obtener campaña
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (!campaignDoc.exists) {
      return { success: false };
    }

    const campaign = campaignDoc.data() as SsotCampaign;
    const eventIds = campaign.eventIds || [];

    // 2. Añadir eventId si no existe
    if (!eventIds.includes(eventId)) {
      eventIds.push(eventId);
      await campaignRef.update({
        eventIds,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Actualizar evento con link a campaña
    await db.collection('events').doc(eventId).update({
      campaignId,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Campaigns] ✅ Linked event to campaign:', eventId, '→', campaignId);

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error linking event:', error);
    return { success: false };
  }
}

/**
 * Desvincular evento de campaña
 */
export async function unlinkEventFromCampaign(
  campaignId: string,
  eventId: string
): Promise<{ success: boolean }> {

  try {
    // 1. Remover de campaña
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (campaignDoc.exists) {
      const campaign = campaignDoc.data() as SsotCampaign;
      const eventIds = (campaign.eventIds || []).filter(id => id !== eventId);

      await campaignRef.update({
        eventIds,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Remover de evento
    await db.collection('events').doc(eventId).update({
      campaignId: null,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Campaigns] ✅ Unlinked event from campaign');

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error unlinking event:', error);
    return { success: false };
  }
}

// =================================================================
// CAMPAIGN LIFECYCLE
// =================================================================

/**
 * Iniciar campaña manualmente
 */
export async function startCampaign(
  campaignId: string,
  userId: string
): Promise<{ success: boolean }> {

  try {
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      return { success: false };
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as SsotCampaign;

    // Actualizar startAt si no está definido
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (!campaign.startAt) {
      updates.startAt = new Date().toISOString();
    }

    await db.collection('campaigns').doc(campaignId).update(updates);

    // Disparar trigger CAMPAIGN_START
    await executeRulesForTrigger('CAMPAIGN_START', {
      triggerType: 'CAMPAIGN_START',
      triggerData: {
        campaignId,
        campaignTitle: campaign.title,
        department: campaign.department,
        startAt: updates.startAt || campaign.startAt,
      },
      entityType: 'CAMPAIGN',
      entityId: campaignId,
      userId,
      triggeredAt: new Date().toISOString(),
    });

    console.log('[Campaigns] ✅ Campaign started:', campaignId);

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error starting campaign:', error);
    return { success: false };
  }
}

/**
 * Finalizar campaña
 */
export async function endCampaign(
  campaignId: string,
  userId: string
): Promise<{ success: boolean }> {

  try {
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      return { success: false };
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as SsotCampaign;

    // Actualizar endAt
    const endAt = new Date().toISOString();

    await db.collection('campaigns').doc(campaignId).update({
      endAt,
      updatedAt: endAt,
    });

    // Disparar trigger CAMPAIGN_END
    await executeRulesForTrigger('CAMPAIGN_END', {
      triggerType: 'CAMPAIGN_END',
      triggerData: {
        campaignId,
        campaignTitle: campaign.title,
        department: campaign.department,
        endAt,
        budget: campaign.budget,
        spent: campaign.spent,
      },
      entityType: 'CAMPAIGN',
      entityId: campaignId,
      userId,
      triggeredAt: endAt,
    });

    console.log('[Campaigns] ✅ Campaign ended:', campaignId);

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error ending campaign:', error);
    return { success: false };
  }
}

// =================================================================
// CAMPAIGN TASKS
// =================================================================

/**
 * Añadir tarea a campaña
 */
export async function addTaskToCampaign(
  campaignId: string,
  taskId: string
): Promise<{ success: boolean }> {

  try {
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (!campaignDoc.exists) {
      return { success: false };
    }

    const campaign = campaignDoc.data() as SsotCampaign;
    const taskIds = campaign.taskIds || [];

    if (!taskIds.includes(taskId)) {
      taskIds.push(taskId);
      await campaignRef.update({
        taskIds,
        updatedAt: new Date().toISOString(),
      });

      // También actualizar la tarea con campaignId
      await db.collection('tasks').doc(taskId).update({
        campaignId,
        updatedAt: new Date().toISOString(),
      });
    }

    console.log('[Campaigns] ✅ Task added to campaign');

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error adding task:', error);
    return { success: false };
  }
}

// =================================================================
// GET CAMPAIGNS
// =================================================================

/**
 * Obtener campañas activas
 */
export async function getActiveCampaigns(): Promise<SsotCampaign[]> {
  try {
    const now = new Date().toISOString();

    const snapshot = await db.collection('campaigns')
      .where('startAt', '<=', now)
      .orderBy('startAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as SsotCampaign[];

  } catch (error) {
    console.error('[Campaigns] Error getting active campaigns:', error);
    return [];
  }
}

/**
 * Obtener campañas por departamento
 */
export async function getCampaignsByDepartment(
  department: Department
): Promise<SsotCampaign[]> {
  try {
    const snapshot = await db.collection('campaigns')
      .where('department', '==', department)
      .orderBy('startAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as SsotCampaign[];

  } catch (error) {
    console.error('[Campaigns] Error getting campaigns:', error);
    return [];
  }
}

/**
 * Obtener campaña con detalles completos
 */
export async function getCampaignWithDetails(
  campaignId: string
): Promise<{
  campaign: SsotCampaign | null;
  events: any[];
  tasks: any[];
  alerts: any[];
}> {

  try {
    // 1. Obtener campaña
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      return { campaign: null, events: [], tasks: [], alerts: [] };
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as SsotCampaign;

    // 2. Obtener eventos vinculados
    const events: any[] = [];
    if (campaign.eventIds && campaign.eventIds.length > 0) {
      for (const eventId of campaign.eventIds) {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
          events.push({ id: eventDoc.id, ...eventDoc.data() });
        }
      }
    }

    // 3. Obtener tareas vinculadas
    const tasks: any[] = [];
    if (campaign.taskIds && campaign.taskIds.length > 0) {
      for (const taskId of campaign.taskIds) {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        if (taskDoc.exists) {
          tasks.push({ id: taskDoc.id, ...taskDoc.data() });
        }
      }
    }

    // 4. Obtener alertas vinculadas
    const alerts: any[] = [];
    if (campaign.alertIds && campaign.alertIds.length > 0) {
      for (const alertId of campaign.alertIds) {
        const alertDoc = await db.collection('alerts').doc(alertId).get();
        if (alertDoc.exists) {
          alerts.push({ id: alertDoc.id, ...alertDoc.data() });
        }
      }
    }

    return { campaign, events, tasks, alerts };

  } catch (error) {
    console.error('[Campaigns] Error getting campaign details:', error);
    return { campaign: null, events: [], tasks: [], alerts: [] };
  }
}

// =================================================================
// CAMPAIGN ANALYTICS
// =================================================================

export interface CampaignStats {
  totalCampaigns: number;
  active: number;
  completed: number;
  totalBudget: number;
  totalSpent: number;
  budgetUtilization: number;
  eventsLinked: number;
  tasksCreated: number;
  alertsGenerated: number;
}

/**
 * Obtener estadísticas de campañas
 */
export async function getCampaignStats(
  department?: Department
): Promise<CampaignStats> {

  try {
    let query: any = db.collection('campaigns');

    if (department) {
      query = query.where('department', '==', department);
    }

    const snapshot = await query.get();
    const campaigns = snapshot.docs.map((doc: any) => doc.data() as SsotCampaign);

    const now = new Date().toISOString();

    const stats: CampaignStats = {
      totalCampaigns: campaigns.length,
      active: campaigns.filter((c: SsotCampaign) => c.startAt && c.startAt <= now && (!c.endAt || c.endAt >= now)).length,
      completed: campaigns.filter((c: SsotCampaign) => c.endAt && c.endAt < now).length,
      totalBudget: campaigns.reduce((sum: number, c: SsotCampaign) => sum + (c.budget || 0), 0),
      totalSpent: campaigns.reduce((sum: number, c: SsotCampaign) => sum + (c.spent || 0), 0),
      budgetUtilization: 0,
      eventsLinked: campaigns.reduce((sum: number, c: SsotCampaign) => sum + (c.eventIds?.length || 0), 0),
      tasksCreated: campaigns.reduce((sum: number, c: SsotCampaign) => sum + (c.taskIds?.length || 0), 0),
      alertsGenerated: campaigns.reduce((sum: number, c: SsotCampaign) => sum + (c.alertIds?.length || 0), 0),
    };

    stats.budgetUtilization = stats.totalBudget > 0
      ? (stats.totalSpent / stats.totalBudget) * 100
      : 0;

    return stats;

  } catch (error) {
    console.error('[Campaigns] Error getting stats:', error);
    return {
      totalCampaigns: 0,
      active: 0,
      completed: 0,
      totalBudget: 0,
      totalSpent: 0,
      budgetUtilization: 0,
      eventsLinked: 0,
      tasksCreated: 0,
      alertsGenerated: 0,
    };
  }
}

// =================================================================
// UPDATE CAMPAIGN
// =================================================================

/**
 * Actualizar presupuesto gastado de campaña
 */
export async function updateCampaignSpent(
  campaignId: string,
  spent: number
): Promise<{ success: boolean }> {

  try {
    await db.collection('campaigns').doc(campaignId).update({
      spent,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Campaigns] ✅ Updated campaign spent:', campaignId, spent);

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error updating spent:', error);
    return { success: false };
  }
}

/**
 * Actualizar reglas de automatización de campaña
 */
export async function updateCampaignAutomationRules(
  campaignId: string,
  automationRules: SsotCampaign['automationRules']
): Promise<{ success: boolean }> {

  try {
    await db.collection('campaigns').doc(campaignId).update({
      automationRules,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Campaigns] ✅ Updated automation rules:', campaignId);

    return { success: true };

  } catch (error) {
    console.error('[Campaigns] Error updating automation rules:', error);
    return { success: false };
  }
}

// =================================================================
// Santa Brain (domain/campaigns) – minimal actions for BrainPanel
// =================================================================

type BrainResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** List campaigns for BrainPanel */
export async function getCampaigns(): Promise<BrainResult<BrainCampaign[]>> {
  try {
    const snap = await db.collection('brainCampaigns').orderBy('createdAt', 'desc').limit(100).get();
    const data: BrainCampaign[] = snap.docs.map((d: any) => {
      const x = d.data();
      return {
        id: d.id,
        type: x.type,
        name: x.name,
        description: x.description,
        status: x.status,
        startDate: x.startDate ? new Date(x.startDate) : new Date(),
        endDate: x.endDate ? new Date(x.endDate) : new Date(),
        targetAccounts: x.targetAccounts || [],
        targetStages: x.targetStages || [],
        targetReps: x.targetReps || [],
        goals: x.goals || [],
        actions: x.actions || {},
        progress: x.progress || [],
        createdBy: x.createdBy || 'system',
        createdAt: x.createdAt ? new Date(x.createdAt) : new Date(),
        updatedAt: x.updatedAt ? new Date(x.updatedAt) : new Date(),
      } as BrainCampaign;
    });
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Error al cargar campañas' };
  }
}

/** Create campaign for BrainPanel */
export async function createCampaign(payload: Omit<BrainCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<BrainResult<{ id: string }>> {
  try {
    const now = new Date().toISOString();
    const doc = {
      ...payload,
      startDate: payload.startDate?.toISOString?.() || new Date(payload.startDate as any).toISOString(),
      endDate: payload.endDate?.toISOString?.() || new Date(payload.endDate as any).toISOString(),
      createdAt: now,
      updatedAt: now,
    } as any;
    const ref = await db.collection('brainCampaigns').add(doc);
    return { ok: true, data: { id: ref.id } };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Error al crear campaña' };
  }
}

/** Update status for BrainPanel */
export async function updateCampaignStatus(id: string, status: BrainCampaign['status']): Promise<BrainResult<true>> {
  try {
    await db.collection('brainCampaigns').doc(id).update({ status, updatedAt: new Date().toISOString() });
    return { ok: true, data: true };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Error al actualizar campaña' };
  }
}
