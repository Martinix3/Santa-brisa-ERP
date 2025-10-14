"use server";

import { db } from "@/lib/firebase-admin";
import type { Account, Order, TaskNew, Interaction, Stage } from "@/domain/ssot";

// ============================================================================
// TYPES
// ============================================================================

export type TimelineEvent = {
  id: string;
  type: 'ORDER' | 'INTERACTION' | 'TASK' | 'VISIT' | 'EMAIL' | 'NOTE' | 'PROJECT';
  date: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  relatedId?: string;
};

export type AccountKPIs = {
  revenue: {
    total: number;
    ytd: number;
    lastOrder: string | null;
    avgOrder: number;
    trend: 'up' | 'down' | 'stable';
  };
  engagement: {
    interactionCount: number;
    lastInteraction: string | null;
    averageFrequency: number;
    score: number;
  };
  pipeline: {
    value: number;
    dealCount: number;
    conversionRate: number;
  };
  health: {
    status: 'excellent' | 'good' | 'at_risk' | 'critical';
    motivos: string[];
    indicators: string[];
    recommendations: string[];
  };
  signals: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
};

// ============================================================================
// HELPER: Calculate Health Status
// ============================================================================

function calculateHealthStatus(
  engagementScore: number,
  daysSinceLastOrder: number,
  daysSinceLastInteraction: number
): {
  status: 'excellent' | 'good' | 'at_risk' | 'critical';
  motivos: string[];
  indicators: string[];
  recommendations: string[];
} {
  const motivos: string[] = [];
  const indicators: string[] = [];
  const recommendations: string[] = [];

  // Analyze engagement
  if (engagementScore < 20) {
    motivos.push('Engagement muy bajo (<20)');
    indicators.push('🔴 Engagement crítico');
  } else if (engagementScore < 40) {
    motivos.push('Engagement bajo (<40)');
    indicators.push('🟠 Engagement bajo');
  }

  // Analyze orders
  if (daysSinceLastOrder > 180) {
    motivos.push('>180 días sin pedido');
    indicators.push('🔴 Sin pedidos >6 meses');
    recommendations.push('Contactar urgente - riesgo de pérdida');
  } else if (daysSinceLastOrder > 90) {
    motivos.push('>90 días sin pedido');
    indicators.push('🟠 Sin pedidos >3 meses');
    recommendations.push('Programar visita comercial');
  }

  // Analyze interactions
  if (daysSinceLastInteraction > 60) {
    motivos.push('>60 días sin interacción');
    indicators.push('🟡 Baja frecuencia de contacto');
    recommendations.push('Enviar email de seguimiento');
  }

  // Determine status
  let status: 'excellent' | 'good' | 'at_risk' | 'critical';
  if (engagementScore > 80 && daysSinceLastOrder <= 30) {
    status = 'excellent';
    indicators.push('🟢 Excelente salud');
    recommendations.push('Mantener relación actual');
  } else if (engagementScore > 60 && daysSinceLastOrder <= 90) {
    status = 'good';
    indicators.push('🟢 Buena salud');
    recommendations.push('Seguimiento regular');
  } else if (engagementScore < 40 || daysSinceLastOrder > 90) {
    status = 'at_risk';
    if (!recommendations.length) {
      recommendations.push('Reactivar relación comercial');
    }
  } else {
    status = 'critical';
    if (!recommendations.length) {
      recommendations.push('Acción inmediata requerida');
    }
  }

  return { status, motivos, indicators, recommendations };
}

// ============================================================================
// HELPER: Generate Signals for AI
// ============================================================================

function generateSignals(
  engagementScore: number,
  daysSinceLastOrder: number,
  daysSinceLastInteraction: number,
  orderCount: number
): AccountKPIs['signals'] {
  const signals: AccountKPIs['signals'] = [];
  const now = new Date().toISOString();

  if (daysSinceLastOrder > 90) {
    signals.push({
      type: 'no_orders_90d',
      severity: daysSinceLastOrder > 180 ? 'high' : 'medium',
      timestamp: now,
      metadata: { daysSinceLastOrder }
    });
  }

  if (engagementScore < 40) {
    signals.push({
      type: 'low_engagement',
      severity: engagementScore < 20 ? 'high' : 'medium',
      timestamp: now,
      metadata: { engagementScore }
    });
  }

  if (daysSinceLastInteraction > 60) {
    signals.push({
      type: 'low_interaction_frequency',
      severity: daysSinceLastInteraction > 120 ? 'high' : 'medium',
      timestamp: now,
      metadata: { daysSinceLastInteraction }
    });
  }

  if (orderCount === 0) {
    signals.push({
      type: 'no_orders_ever',
      severity: 'low',
      timestamp: now
    });
  }

  return signals;
}

// ============================================================================
// MAIN: Get Account KPIs
// ============================================================================

export async function getAccountKPIs(accountId: string): Promise<{
  success: boolean;
  data?: AccountKPIs;
  error?: string;
}> {
  try {
    const now = Date.now();
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();

    // Parallel queries
    const [ordersSnap, interactionsSnap, tasksSnap] = await Promise.all([
      db.collection('orders').where('accountId', '==', accountId).get(),
      db.collection('interactions').where('accountId', '==', accountId).get(),
      db.collection('tasks').where('accountId', '==', accountId).get()
    ]);

    const orders = ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
    const interactions = interactionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Interaction[];
    const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TaskNew[];

    // Revenue calculations
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const ytdRevenue = orders
      .filter(order => new Date(order.createdAt).getTime() >= startOfYear)
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    const sortedOrders = orders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const lastOrder = sortedOrders[0];
    const lastOrderDate = lastOrder?.createdAt || null;

    // Calculate trend (compare YTD with previous year same period)
    const lastYearStart = new Date(new Date().getFullYear() - 1, 0, 1).getTime();
    const lastYearEnd = new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()).getTime();
    const lastYearRevenue = orders
      .filter(order => {
        const orderTime = new Date(order.createdAt).getTime();
        return orderTime >= lastYearStart && orderTime <= lastYearEnd;
      })
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const trend: 'up' | 'down' | 'stable' = 
      ytdRevenue > lastYearRevenue * 1.1 ? 'up' :
      ytdRevenue < lastYearRevenue * 0.9 ? 'down' : 'stable';

    // Engagement calculations (filter out system-generated interactions)
    const interactionCount = interactions.filter(i => 
      i.kind !== 'OTRO' || (i.note && !i.note.includes('AUTO:'))
    ).length;

    const sortedInteractions = interactions
      .filter(i => i.kind !== 'OTRO' || (i.note && !i.note.includes('AUTO:')))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const lastInteraction = sortedInteractions[0];
    const lastInteractionDate = lastInteraction?.createdAt || null;

    // Calculate interaction frequency (days between interactions)
    let averageFrequency = 0;
    if (sortedInteractions.length > 1) {
      const intervals: number[] = [];
      for (let i = 0; i < sortedInteractions.length - 1; i++) {
        const days = Math.abs(
          (new Date(sortedInteractions[i].createdAt).getTime() - 
           new Date(sortedInteractions[i + 1].createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        intervals.push(days);
      }
      averageFrequency = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
    }

    // Engagement score (0-100)
    const interactionFrequencyScore = Math.min(100, (interactionCount / Math.max(1, averageFrequency)) * 40);
    const recentOrdersScore = Math.min(30, (orders.filter(o => 
      new Date(o.createdAt).getTime() > now - 90 * 24 * 60 * 60 * 1000
    ).length / 10) * 30);
    const completedTasksScore = tasks.length > 0 
      ? (tasks.filter(t => t.status === 'DONE').length / tasks.length) * 20 
      : 0;
    const engagementScore = Math.round(
      interactionFrequencyScore + recentOrdersScore + completedTasksScore
    );

    // Days calculations
    const daysSinceLastOrder = lastOrderDate 
      ? Math.floor((now - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const daysSinceLastInteraction = lastInteractionDate
      ? Math.floor((now - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Pipeline (simplified - can be expanded)
    const pipelineValue = 0; // TODO: Calculate from opportunities/quotes
    const dealCount = 0;
    const conversionRate = orderCount > 0 ? (orderCount / (orderCount + dealCount)) * 100 : 0;

    // Health status
    const health = calculateHealthStatus(
      engagementScore,
      daysSinceLastOrder,
      daysSinceLastInteraction
    );

    // Generate signals for AI
    const signals = generateSignals(
      engagementScore,
      daysSinceLastOrder,
      daysSinceLastInteraction,
      orderCount
    );

    return {
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          ytd: ytdRevenue,
          lastOrder: lastOrderDate,
          avgOrder: avgOrderValue,
          trend
        },
        engagement: {
          interactionCount,
          lastInteraction: lastInteractionDate,
          averageFrequency,
          score: engagementScore
        },
        pipeline: {
          value: pipelineValue,
          dealCount,
          conversionRate
        },
        health,
        signals
      }
    };
  } catch (error) {
    console.error('[getAccountKPIs] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Get Account Timeline
// ============================================================================

export async function getAccountTimeline(
  accountId: string,
  options?: { 
    limit?: number; 
    offset?: number; 
    types?: TimelineEvent['type'][];
  }
): Promise<{
  success: boolean;
  data?: TimelineEvent[];
  total?: number;
  hasMore?: boolean;
  error?: string;
}> {
  try {
    const events: TimelineEvent[] = [];
    const seenRelatedIds = new Set<string>();

    // Parallel queries
    const [ordersSnap, interactionsSnap, tasksSnap] = await Promise.all([
      db.collection('orders').where('accountId', '==', accountId).get(),
      db.collection('interactions').where('accountId', '==', accountId).get(),
      db.collection('tasks').where('accountId', '==', accountId).get()
    ]);

    // Process orders
    if (!options?.types || options.types.includes('ORDER')) {
      ordersSnap.docs.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() } as Order;
        if (!seenRelatedIds.has(order.id)) {
          events.push({
            id: `order-${order.id}`,
            type: 'ORDER',
            date: order.createdAt,
            title: `Pedido #${order.docNumber || order.id.slice(0, 8)}`,
            description: `Total: €${order.totalAmount?.toLocaleString() || 0}`,
            metadata: { 
              total: order.totalAmount, 
              status: order.status,
              flow: order.distributorId ? 'PLACEMENT' : 'DIRECT'
            },
            relatedId: order.id
          });
          seenRelatedIds.add(order.id);
        }
      });
    }

    // Process interactions
    if (!options?.types || options.types.includes('INTERACTION')) {
      interactionsSnap.docs.forEach((doc) => {
        const interaction = { id: doc.id, ...doc.data() } as Interaction;
        // Skip auto-generated interactions
        if (interaction.kind === 'OTRO' && interaction.note?.includes('AUTO:')) {
          return;
        }
        if (!seenRelatedIds.has(interaction.id)) {
          events.push({
            id: `interaction-${interaction.id}`,
            type: 'INTERACTION',
            date: interaction.createdAt,
            title: `${interaction.kind === 'VISITA' ? '👥 Visita' : '📞 ' + interaction.kind}`,
            description: interaction.note || '',
            metadata: { kind: interaction.kind },
            createdBy: interaction.userId,
            relatedId: interaction.id
          });
          seenRelatedIds.add(interaction.id);
        }
      });
    }

    // Process tasks
    if (!options?.types || options.types.includes('TASK')) {
      tasksSnap.docs.forEach((doc) => {
        const task = { id: doc.id, ...doc.data() } as TaskNew;
        if (!seenRelatedIds.has(task.id)) {
          events.push({
            id: `task-${task.id}`,
            type: 'TASK',
            date: task.createdAt,
            title: `✅ ${task.title}`,
            description: task.desc || '',
            metadata: { 
              status: task.status,
              priority: task.priority 
            },
            createdBy: task.createdById,
            relatedId: task.id
          });
          seenRelatedIds.add(task.id);
        }
      });
    }

    // Sort by date desc
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const start = options?.offset || 0;
    const limit = options?.limit || 20;
    const paginatedEvents = events.slice(start, start + limit);

    return {
      success: true,
      data: paginatedEvents,
      total: events.length,
      hasMore: start + limit < events.length
    };
  } catch (error) {
    console.error('[getAccountTimeline] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Get Account Orders
// ============================================================================

export async function getAccountOrders(
  accountId: string,
  filters?: { 
    status?: string; 
    dateFrom?: string; 
    dateTo?: string;
    flow?: 'DIRECT' | 'PLACEMENT';
  }
): Promise<{
  success: boolean;
  data?: Order[];
  error?: string;
}> {
  try {
    let query = db.collection('orders').where('accountId', '==', accountId);

    const snapshot = await query.get();
    let orders = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Order[];

    // Apply filters
    if (filters?.status) {
      orders = orders.filter(o => o.status === filters.status);
    }

    if (filters?.dateFrom) {
      orders = orders.filter(o => o.createdAt >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      orders = orders.filter(o => o.createdAt <= filters.dateTo!);
    }

    if (filters?.flow) {
      if (filters.flow === 'DIRECT') {
        orders = orders.filter(o => !o.distributorId);
      } else {
        orders = orders.filter(o => !!o.distributorId);
      }
    }

    // Sort by date desc
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      data: orders
    };
  } catch (error) {
    console.error('[getAccountOrders] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Get Account Tasks
// ============================================================================

export async function getAccountTasks(
  accountId: string,
  filters?: { 
    status?: string; 
    assignedTo?: string;
  }
): Promise<{
  success: boolean;
  data?: TaskNew[];
  error?: string;
}> {
  try {
    let query = db.collection('tasks').where('accountId', '==', accountId);

    if (filters?.assignedTo) {
      query = query.where('assignedTo', '==', filters.assignedTo);
    }

    const snapshot = await query.get();
    let tasks = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as TaskNew[];

    // Apply status filter
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    // Sort by dueAt
    tasks.sort((a, b) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return aTime - bTime;
    });

    return {
      success: true,
      data: tasks
    };
  } catch (error) {
    console.error('[getAccountTasks] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Search Accounts (for non-Algolia fallback)
// ============================================================================

export async function searchAccounts(filters: {
  query?: string;
  flow?: 'DIRECT' | 'PLACEMENT';
  territory?: string;
  segment?: string;
  stage?: Stage;
  ownerId?: string;
}): Promise<{
  success: boolean;
  data?: Account[];
  error?: string;
}> {
  try {
    let query = db.collection('accounts') as any;

    // Apply filters
    if (filters.flow) {
      query = query.where('flow', '==', filters.flow);
    }

    if (filters.territory) {
      query = query.where('territory', '==', filters.territory);
    }

    if (filters.segment) {
      query = query.where('segment', '==', filters.segment);
    }

    if (filters.stage) {
      query = query.where('stage', '==', filters.stage);
    }

    if (filters.ownerId) {
      query = query.where('ownerId', '==', filters.ownerId);
    }

    const snapshot = await query.get();
    let accounts = snapshot.docs.map((doc) => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Account[];

    // Text search (if query provided)
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      accounts = accounts.filter(acc => 
        acc.name.toLowerCase().includes(searchTerm)
      );
    }

    return {
      success: true,
      data: accounts
    };
  } catch (error) {
    console.error('[searchAccounts] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
