'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

export type AccountDetail = {
  id: string;
  name: string;
  tradeName?: string | null;
  stage: 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'INACTIVA';
  segment?: string | null;
  accountChannel: 'DIRECTA' | 'COLOCACION' | 'ONLINE' | 'OTRO';
  distributorId?: string | null;
  distributorName?: string | null;
  fiscalId?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  addr?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  ownerId?: string | null;
};

export type AccountStats = {
  year: number;
  salesTotal: number;
  pendingToCollect: number;
  onAccount: number;
  invoicesPending: number;
  monthly: { m: string; v: number }[];
};

export type OpenOpportunity = {
  id: string;
  title: string;
  value: number;
  stage: string;
};

export type RecentActivity = {
  id: string;
  when: string;
  kind: string;
  summary: string;
};

export async function getAccount(id: string): Promise<AccountDetail | null> {
  // Try parties first (new unified collection)
  let doc = await db.collection('parties').doc(id).get();
  
  // Fallback to accounts (legacy)
  if (!doc.exists) {
    doc = await db.collection('contacts').doc(id).get();
  }
  
  if (!doc.exists) return null;

  const data = doc.data() as any;
  return {
    id: doc.id,
    name: data.name,
    tradeName: data.tradeName ?? null,
    stage: data.stage ?? 'POTENCIAL',
    segment: data.segment ?? null,
    accountChannel: data.accountChannel ?? 'DIRECTA',
    distributorId: data.distributorId ?? null,
    distributorName: data.distributorName ?? null,
    fiscalId: data.fiscalId ?? data.vat ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    mobile: data.mobile ?? null,
    addr: data.billingAddress ?? {},
    ownerId: data.ownerId ?? null,
  };
}

export async function getAccountStats(
  accountId: string,
  year: number
): Promise<AccountStats> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  // Query pagos del año
  const paySnap = await db
    .collection('cashflow_payments')
    .where('accountId', '==', accountId)
    .where('date', '>=', start.toISOString())
    .where('date', '<', end.toISOString())
    .get();

  // Query pedidos del año
  const ordSnap = await db
    .collection('orders')
    .where('accountId', '==', accountId)
    .where('date', '>=', start.toISOString())
    .where('date', '<', end.toISOString())
    .get();

  // Inicializar meses
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    m: `${i + 1}`.padStart(2, '0'),
    v: 0,
  }));

  let salesTotal = 0;
  let pendingToCollect = 0;
  let onAccount = 0;

  // Procesar pagos
  for (const doc of paySnap.docs) {
    const payment = doc.data() as any;
    const amt = Number(payment.amount || 0);
    if (amt > 0) {
      salesTotal += amt;
    }
    if (payment.kind === 'advance') {
      onAccount += amt;
    }
    const dt = new Date(payment.date);
    const monthIndex = dt.getUTCMonth();
    if (monthIndex >= 0 && monthIndex < 12 && amt > 0) {
      monthly[monthIndex].v += amt;
    }
  }

  // Procesar pedidos pendientes
  for (const doc of ordSnap.docs) {
    const order = doc.data() as any;
    const total = Number(order.total || order.amount || 0);
    const collected = Number(order.collected || 0);
    pendingToCollect += Math.max(total - collected, 0);
  }

  return {
    year,
    salesTotal,
    pendingToCollect,
    onAccount,
    invoicesPending: 0,
    monthly,
  };
}

export async function listOpenOpportunities(
  accountId: string
): Promise<OpenOpportunity[]> {
  const q = await db
    .collection('opportunities')
    .where('accountId', '==', accountId)
    .where('status', 'in', ['OPEN', 'PENDING', 'DRAFT'])
    .limit(5)
    .get();

  return q.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      title: data.title,
      value: data.value ?? 0,
      stage: data.stage ?? '—',
    };
  });
}

export async function listRecentActivity(
  accountId: string
): Promise<RecentActivity[]> {
  const q = await db
    .collection('interactions')
    .where('accountId', '==', accountId)
    .orderBy('when', 'desc')
    .limit(10)
    .get();

  return q.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      when: data.when,
      kind: data.kind,
      summary: data.summary ?? '',
    };
  });
}

// ============================================================================
// UPDATE ACTIONS
// ============================================================================

export async function updateAccount(
  id: string,
  data: {
    name?: string;
    tradeName?: string;
    stage?: 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'INACTIVA';
    segment?: string;
    fiscalId?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    addr?: {
      street?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    };
  }
) {
  // Try parties first
  let docRef = db.collection('parties').doc(id);
  let doc = await docRef.get();
  
  if (!doc.exists) {
    docRef = db.collection('contacts').doc(id);
    doc = await docRef.get();
  }
  
  if (!doc.exists) {
    throw new Error('Account not found');
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.tradeName !== undefined) updateData.tradeName = data.tradeName;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.segment !== undefined) updateData.segment = data.segment;
  if (data.fiscalId !== undefined) updateData.vat = data.fiscalId;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.mobile !== undefined) updateData.mobile = data.mobile;
  if (data.addr !== undefined) updateData.billingAddress = data.addr;
  
  updateData.updatedAt = new Date().toISOString();

  await docRef.update(updateData);
  return { success: true };
}

// ============================================================================
// ACTIVITIES / INTERACTIONS
// ============================================================================

export type ActivityKind = 
  | 'CALL' 
  | 'EMAIL' 
  | 'MEETING' 
  | 'NOTE' 
  | 'TASK' 
  | 'OTHER';

export async function createActivity(data: {
  accountId: string;
  kind: ActivityKind;
  title: string;
  summary?: string;
  when?: string; // ISO date
  dueDate?: string; // ISO date
  completed?: boolean;
}) {
  const now = new Date().toISOString();
  const activityData = {
    accountId: data.accountId,
    kind: data.kind,
    title: data.title,
    summary: data.summary || '',
    when: data.when || now,
    dueDate: data.dueDate || null,
    completed: data.completed || false,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('interactions').add(activityData);
  return { success: true, id: docRef.id };
}

export async function updateActivity(
  id: string,
  data: {
    title?: string;
    summary?: string;
    completed?: boolean;
    when?: string;
    dueDate?: string;
  }
) {
  const updateData: any = { ...data, updatedAt: new Date().toISOString() };
  await db.collection('interactions').doc(id).update(updateData);
  return { success: true };
}

export async function deleteActivity(id: string) {
  await db.collection('interactions').doc(id).delete();
  return { success: true };
}

// ============================================================================
// NOTES
// ============================================================================

export type Note = {
  id: string;
  accountId: string;
  content: string;
  createdAt: string;
  createdBy?: string;
};

export async function listNotes(accountId: string): Promise<Note[]> {
  const q = await db
    .collection('notes')
    .where('accountId', '==', accountId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return q.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      accountId: data.accountId,
      content: data.content || '',
      createdAt: data.createdAt,
      createdBy: data.createdBy,
    };
  });
}

export async function createNote(data: {
  accountId: string;
  content: string;
  createdBy?: string;
}) {
  const now = new Date().toISOString();
  const noteData = {
    accountId: data.accountId,
    content: data.content,
    createdBy: data.createdBy || null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('notes').add(noteData);
  return { success: true, id: docRef.id };
}

export async function updateNote(id: string, content: string) {
  await db.collection('notes').doc(id).update({
    content,
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

export async function deleteNote(id: string) {
  await db.collection('notes').doc(id).delete();
  return { success: true };
}

// ============================================================================
// CONTACT PERSONS
// ============================================================================

export type ContactPerson = {
  id: string;
  accountId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
};

export async function listContactPersons(accountId: string): Promise<ContactPerson[]> {
  const q = await db
    .collection('contactPersons')
    .where('accountId', '==', accountId)
    .orderBy('isPrimary', 'desc')
    .orderBy('name', 'asc')
    .get();

  return q.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      accountId: data.accountId,
      name: data.name || '',
      role: data.role,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      isPrimary: data.isPrimary || false,
    };
  });
}

export async function createContactPerson(data: {
  accountId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
}) {
  const now = new Date().toISOString();
  const personData = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('contactPersons').add(personData);
  return { success: true, id: docRef.id };
}

export async function updateContactPerson(
  id: string,
  data: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    isPrimary?: boolean;
  }
) {
  const updateData: any = { ...data, updatedAt: new Date().toISOString() };
  await db.collection('contactPersons').doc(id).update(updateData);
  return { success: true };
}

export async function deleteContactPerson(id: string) {
  await db.collection('contactPersons').doc(id).delete();
  return { success: true };
}

// ============================================================================
// BUSINESS ALERTS
// ============================================================================

export type BusinessAlert = {
  type: 'NO_VISIT' | 'NO_ORDER' | 'PENDING_PAYMENT' | 'LOW_ACTIVITY' | 'STAGE_STALE';
  severity: 'warning' | 'critical' | 'info';
  days?: number;
  amount?: number;
  message: string;
  action: string;
  actionType: 'CREATE_VISIT' | 'CREATE_ORDER' | 'MANAGE_PAYMENT' | 'UPDATE_STAGE';
};

/**
 * Get business alerts for an account based on system configuration
 */
export async function getBusinessAlerts(accountId: string): Promise<BusinessAlert[]> {
  try {
    // Get system config
    const configDoc = await db.collection('systemConfig').doc('default').get();
    const config = configDoc.exists ? configDoc.data() : null;
    
    const thresholds = {
      daysWithoutVisit: config?.alerts?.daysWithoutVisit || 30,
      daysWithoutOrder: config?.alerts?.daysWithoutOrder || 45,
      daysSinPedidoCritical: config?.alerts?.daysSinPedidoCritical || 60,
      daysInStageNoAction: config?.alerts?.daysInStageNoAction || 30,
    };

    const alerts: BusinessAlert[] = [];
    const now = new Date();

    // Get last visit
    const lastVisitSnap = await db
      .collection('interactions')
      .where('accountId', '==', accountId)
      .where('kind', '==', 'VISITA')
      .orderBy('when', 'desc')
      .limit(1)
      .get();

    if (!lastVisitSnap.empty) {
      const lastVisit = lastVisitSnap.docs[0].data();
      const lastVisitDate = new Date(lastVisit.when);
      const daysSinceVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceVisit > thresholds.daysWithoutVisit) {
        alerts.push({
          type: 'NO_VISIT',
          severity: daysSinceVisit > (thresholds.daysWithoutVisit * 2) ? 'critical' : 'warning',
          days: daysSinceVisit,
          message: `${daysSinceVisit} días sin visita`,
          action: 'Programar visita',
          actionType: 'CREATE_VISIT',
        });
      }
    } else {
      // No visits at all
      alerts.push({
        type: 'NO_VISIT',
        severity: 'critical',
        message: 'Sin visitas registradas',
        action: 'Programar primera visita',
        actionType: 'CREATE_VISIT',
      });
    }

    // Get last order
    const lastOrderSnap = await db
      .collection('ordersSellOut')
      .where('accountId', '==', accountId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!lastOrderSnap.empty) {
      const lastOrder = lastOrderSnap.docs[0].data();
      const lastOrderDate = new Date(lastOrder.createdAt);
      const daysSinceOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceOrder > thresholds.daysWithoutOrder) {
        alerts.push({
          type: 'NO_ORDER',
          severity: daysSinceOrder > thresholds.daysSinPedidoCritical ? 'critical' : 'warning',
          days: daysSinceOrder,
          message: `${daysSinceOrder} días sin pedido`,
          action: 'Crear pedido',
          actionType: 'CREATE_ORDER',
        });
      }
    } else {
      // No orders at all
      alerts.push({
        type: 'NO_ORDER',
        severity: 'warning',
        message: 'Sin pedidos registrados',
        action: 'Crear primer pedido',
        actionType: 'CREATE_ORDER',
      });
    }

    // Check pending payments
    const currentYear = new Date().getFullYear();
    const stats = await getAccountStats(accountId, currentYear);
    
    if (stats.pendingToCollect > 1000) {
      alerts.push({
        type: 'PENDING_PAYMENT',
        severity: stats.pendingToCollect > 5000 ? 'critical' : 'warning',
        amount: stats.pendingToCollect,
        message: `${stats.pendingToCollect.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} pendiente de cobro`,
        action: 'Gestionar cobro',
        actionType: 'MANAGE_PAYMENT',
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error getting business alerts:', error);
    return [];
  }
}

// ============================================================================
// QUICK CREATE ACTIONS
// ============================================================================

export async function createQuickVisit(data: {
  accountId: string;
  scheduledFor: string;
  notes?: string;
  userId?: string;
}) {
  const now = new Date().toISOString();
  const visitData = {
    accountId: data.accountId,
    kind: 'VISITA',
    title: 'Visita programada',
    summary: data.notes || '',
    when: data.scheduledFor,
    plannedFor: data.scheduledFor,
    status: 'open',
    userId: data.userId || '',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('interactions').add(visitData);
  return { success: true, id: docRef.id };
}

export async function createQuickOrder(data: {
  accountId: string;
  items: Array<{ itemId: string; qty: number; price: number }>;
  notes?: string;
}) {
  const now = new Date().toISOString();
  const total = data.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  
  const orderData = {
    accountId: data.accountId,
    status: 'open',
    billingStatus: 'pending',
    lines: data.items.map(item => ({
      itemId: item.itemId,
      qty: item.qty,
      uom: 'unit',
      priceUnit: item.price,
    })),
    totalAmount: total,
    currency: 'EUR',
    source: 'CRM',
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('ordersSellOut').add(orderData);
  return { success: true, id: docRef.id };
}

export async function createMarketingEvent(data: {
  accountId?: string;
  title: string;
  startAt: string;
  endAt?: string;
  kind: 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO';
  notes?: string;
}) {
  const now = new Date().toISOString();
  const eventData = {
    ...data,
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('marketingEvents').add(eventData);
  return { success: true, id: docRef.id };
}

export async function createQuickPosTactic(data: {
  accountId: string;
  description: string;
  estCost: number;
  qtyPlanned?: number;
}) {
  const now = new Date().toISOString();
  const tacticData = {
    accountId: data.accountId,
    description: data.description,
    customDesc: data.description,
    qtyPlanned: data.qtyPlanned || 1,
    estCost: data.estCost,
    actualCost: 0,
    executionScore: 0,
    status: 'planned',
    createdAt: now,
    createdById: '',
    updatedAt: now,
  };

  const docRef = await db.collection('posTactics').add(tacticData);
  return { success: true, id: docRef.id };
}
