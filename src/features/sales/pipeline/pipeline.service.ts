// src/features/sales/pipeline/pipeline.service.ts

/**
 * PIPELINE SERVICE - Computa vista denormalizada del pipeline
 * 
 * Genera PipelineAccountView agregando datos de:
 * - accounts
 * - orders (últimos 30/90 días)
 * - interactions (última actividad)
 * - tasks (conteo de pendientes, próxima tarea)
 * 
 * Calcula:
 * - Métricas de actividad
 * - Priority score
 * - Alertas automáticas
 */

import { adminDb as db } from '@/server/firebase';
import type { 
  PipelineAccountView, 
  PipelineFilters,
  PipelineStats,
  PipelineAlert,
  Task,
} from './pipeline.types';
import type { Account, OrderSellOut, Interaction, Stage } from '@/domain/ssot';

// =================================================================
// COMPUTE PIPELINE VIEW
// =================================================================

export async function computePipelineView(
  filters: PipelineFilters = {}
): Promise<PipelineAccountView[]> {
  
  // 1. Fetch accounts con filtros básicos
  let accountsQuery = db.collection('contacts') as any;
  
  if (filters.salesRepIds && filters.salesRepIds.length > 0) {
    accountsQuery = accountsQuery.where('ownerId', 'in', filters.salesRepIds);
  }
  
  if (filters.stages && filters.stages.length > 0) {
    accountsQuery = accountsQuery.where('stage', 'in', filters.stages);
  }
  
  if (filters.segments && filters.segments.length > 0) {
    accountsQuery = accountsQuery.where('segment', 'in', filters.segments);
  }
  
  if (filters.cities && filters.cities.length > 0) {
    accountsQuery = accountsQuery.where('billingAddress.city', 'in', filters.cities);
  }
  
  if (filters.onlyObjectives) {
    accountsQuery = accountsQuery.where('isObjective', '==', true);
  }
  
  const accountsSnap = await accountsQuery.get();
  const accounts: Account[] = accountsSnap.docs.map((doc: any) => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
  
  if (accounts.length === 0) {
    return [];
  }
  
  const accountIds = accounts.map(a => a.id);
  
  // 2. Fetch orders (últimos 90 días para metrics)
  const now = new Date();
  const date30dAgo = new Date(now.getTime() - 30 * 24 * 3600e3).toISOString();
  const date90dAgo = new Date(now.getTime() - 90 * 24 * 3600e3).toISOString();
  
  const ordersSnap = await db.collection('orders')
    .where('accountId', 'in', accountIds.slice(0, 10)) // Firestore limit 10
    .where('createdAt', '>=', date90dAgo)
    .get();
  
  const orders: OrderSellOut[] = ordersSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // 3. Fetch interactions (última por cuenta)
  const interactionsSnap = await db.collection('interactions')
    .where('accountId', 'in', accountIds.slice(0, 10))
    .orderBy('date', 'desc')
    .limit(accountIds.length)
    .get();
  
  const interactions: Interaction[] = interactionsSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // 4. Fetch tasks (open + next por cuenta)
  const tasksSnap = await db.collection('tasks')
    .where('accountId', 'in', accountIds.slice(0, 10))
    .where('status', 'in', ['todo', 'doing'])
    .get();
  
  const tasks: Task[] = tasksSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // 5. Compute view por cada account
  const views: PipelineAccountView[] = accounts.map(account => {
    const accountOrders = orders.filter(o => o.accountId === account.id);
    const accountInteractions = interactions.filter(i => i.accountId === account.id);
    const accountTasks = tasks.filter(t => t.accountId === account.id);
    
    // Orders metrics
    const orders30d = accountOrders.filter(o => o.createdAt >= date30dAgo);
    const totalOrders30d = orders30d.length;
    const totalRevenue30d = orders30d.reduce((sum, o) => sum + ((o as any).total || 0), 0);
    
    const orderCount90d = accountOrders.length;
    const lastOrder = accountOrders.sort((a, b) => 
      (b.createdAt || '').localeCompare(a.createdAt || '')
    )[0];
    
    // Interactions metrics
    const lastInteraction = accountInteractions[0];
    const interactionCount30d = accountInteractions.filter(i => 
      (i as any).date >= date30dAgo
    ).length;
    
    // Tasks metrics
    const openTasksCount = accountTasks.length;
    const nextTask = accountTasks
      .filter(t => t.dueAt)
      .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''))[0];
    
    // Days since metrics
    const daysSinceLastContact = (lastInteraction as any)?.date 
      ? Math.floor((now.getTime() - new Date((lastInteraction as any).date).getTime()) / 86400000)
      : 999;
    
    const daysSinceLastOrder = lastOrder?.createdAt
      ? Math.floor((now.getTime() - new Date(lastOrder.createdAt).getTime()) / 86400000)
      : 999;
    
    // Alerts
    const alerts: PipelineAlert[] = [];
    
    if (daysSinceLastContact > 30) {
      alerts.push({
        type: 'no_contact',
        severity: daysSinceLastContact > 60 ? 'high' : 'medium',
        message: `Sin contacto ${daysSinceLastContact} días`,
        daysCount: daysSinceLastContact,
        actionable: true,
      });
    }
    
    if (daysSinceLastOrder > 60 && orderCount90d > 0) {
      alerts.push({
        type: 'no_order',
        severity: 'medium',
        message: `Sin pedido ${daysSinceLastOrder} días`,
        daysCount: daysSinceLastOrder,
        actionable: true,
      });
    }
    
    if (openTasksCount > 0) {
      const overdueTasks = accountTasks.filter(t => 
        t.dueAt && t.dueAt < now.toISOString()
      );
      
      if (overdueTasks.length > 0) {
        alerts.push({
          type: 'pending_action',
          severity: 'high',
          message: `${overdueTasks.length} tareas vencidas`,
          actionable: true,
        });
      }
    }
    
    // Priority score
    const priorityScore = computePriorityScore({
      isObjective: (account as any).isObjective || false,
      daysSinceLastContact,
      daysSinceLastOrder,
      openTasksCount,
      totalRevenue30d,
      alertsCount: alerts.length,
    });
    
    return {
      // Identity
      id: account.id,
      name: account.name,
      tradeName: account.tradeName,
      
      // Classification
      stage: account.stage,
      segment: account.segment,
      
      // Location
      city: account.billingAddress?.city,
      province: account.billingAddress?.province,
      
      // Ownership
      salesRepId: account.ownerId,
      salesRepName: 'TODO: lookup', // TODO: join con users
      distributorId: account.distributorId,
      distributorName: undefined, // TODO: join con accounts
      
      // Activity
      totalOrders30d,
      totalRevenue30d,
      lastOrderDate: lastOrder?.createdAt,
      lastInteractionDate: (lastInteraction as any)?.date,
      lastInteractionKind: (lastInteraction as any)?.kind,
      
      // Tasks
      openTasksCount,
      nextTaskDueAt: nextTask?.dueAt,
      nextTaskTitle: nextTask?.title,
      
      // Flags
      isObjective: (account as any).isObjective || false,
      isTargeted: false, // TODO: implement targeted logic
      
      // Intelligence
      priorityScore,
      alerts,
      
      // Stats
      orderCount90d,
      interactionCount30d,
      daysSinceLastContact,
      daysSinceLastOrder,
      
      createdAt: account.createdAt,
      updatedAt: account.updatedAt || account.createdAt,
    };
  });
  
  // 6. Apply post-filters (client-side)
  let filtered = views;
  
  if (filters.hasRecentContact) {
    filtered = filtered.filter(v => v.daysSinceLastContact < 30);
  }
  
  if (filters.hasRecentOrder) {
    filtered = filtered.filter(v => v.daysSinceLastOrder < 60);
  }
  
  if (filters.alertTypes && filters.alertTypes.length > 0) {
    filtered = filtered.filter(v => 
      v.alerts.some(a => filters.alertTypes!.includes(a.type))
    );
  }
  
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q)
    );
  }
  
  // 7. Sort
  if (filters.sortBy) {
    filtered = sortPipelineView(filtered, filters.sortBy, filters.sortOrder);
  }
  
  return filtered;
}

// =================================================================
// PRIORITY SCORE
// =================================================================

function computePriorityScore(params: {
  isObjective: boolean;
  daysSinceLastContact: number;
  daysSinceLastOrder: number;
  openTasksCount: number;
  totalRevenue30d: number;
  alertsCount: number;
}): number {
  let score = 0;
  
  // Target mensual (30 puntos)
  if (params.isObjective) score += 30;
  
  // Sin contacto (hasta 35 puntos)
  if (params.daysSinceLastContact > 60) score += 35;
  else if (params.daysSinceLastContact > 30) score += 25;
  
  // Tareas pendientes (15 puntos)
  if (params.openTasksCount > 0) score += 15;
  
  // Cliente activo reciente (10 puntos)
  if (params.daysSinceLastOrder < 7) score += 10;
  
  // Valor pipeline (hasta 10 puntos)
  score += Math.min(params.totalRevenue30d / 1000, 10);
  
  // Alertas (5 puntos cada una)
  score += params.alertsCount * 5;
  
  return Math.min(Math.round(score), 100);
}

// =================================================================
// SORT
// =================================================================

function sortPipelineView(
  views: PipelineAccountView[],
  sortBy: PipelineFilters['sortBy'],
  order: PipelineFilters['sortOrder'] = 'desc'
): PipelineAccountView[] {
  const sorted = [...views];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'lastContact':
        comparison = (a.lastInteractionDate || '').localeCompare(b.lastInteractionDate || '');
        break;
      case 'lastOrder':
        comparison = (a.lastOrderDate || '').localeCompare(b.lastOrderDate || '');
        break;
      case 'priority':
        comparison = a.priorityScore - b.priorityScore;
        break;
      case 'revenue':
        comparison = a.totalRevenue30d - b.totalRevenue30d;
        break;
      default:
        comparison = 0;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

// =================================================================
// STATS GLOBALES
// =================================================================

export async function computePipelineStats(
  filters: PipelineFilters = {}
): Promise<PipelineStats> {
  const views = await computePipelineView(filters);
  
  // By stage
  const byStage: PipelineStats['byStage'] = {} as any;
  
  const stages: Stage[] = ['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'];
  
  for (const stage of stages) {
    const stageViews = views.filter(v => v.stage === stage);
    
    byStage[stage] = {
      count: stageViews.length,
      totalRevenue30d: stageViews.reduce((sum, v) => sum + v.totalRevenue30d, 0),
      avgPriority: stageViews.length > 0
        ? stageViews.reduce((sum, v) => sum + v.priorityScore, 0) / stageViews.length
        : 0,
      withRecentContact: stageViews.filter(v => v.daysSinceLastContact < 30).length,
      withAlerts: stageViews.filter(v => v.alerts.length > 0).length,
    };
  }
  
  // Globales
  const totalRevenue30d = views.reduce((sum, v) => sum + v.totalRevenue30d, 0);
  const totalRevenue90d = totalRevenue30d * 3; // Aproximación
  
  // Top accounts
  const topByRevenue = [...views]
    .sort((a, b) => b.totalRevenue30d - a.totalRevenue30d)
    .slice(0, 10)
    .map(v => ({
      id: v.id,
      name: v.name,
      revenue: v.totalRevenue30d,
    }));
  
  const topByActivity = [...views]
    .sort((a, b) => b.interactionCount30d - a.interactionCount30d)
    .slice(0, 10)
    .map(v => ({
      id: v.id,
      name: v.name,
      interactions: v.interactionCount30d,
    }));
  
  return {
    byStage,
    totalAccounts: views.length,
    totalRevenue30d,
    totalRevenue90d,
    accountsWithoutContact30d: views.filter(v => v.daysSinceLastContact > 30).length,
    accountsWithoutOrder60d: views.filter(v => v.daysSinceLastOrder > 60).length,
    objectivesCount: views.filter(v => v.isObjective).length,
    targetsCount: views.filter(v => v.isTargeted).length,
    topAccountsByRevenue: topByRevenue,
    topAccountsByActivity: topByActivity,
  };
}
