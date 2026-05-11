// FILE: src/server/actions/alerts.actions.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import type { Alert, AlertType, AlertSeverity, AlertStatus, Department } from '@/domain/ssot';

/**
 * 🔔 ALERTS SERVER ACTIONS
 * 
 * Sistema completo de gestión de alertas con IA.
 * 
 * Parte de FASE FINAL - Gemini Intelligence Integration
 */

// =================================================================
// CREATE ALERT
// =================================================================

export interface CreateAlertParams {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  userId: string;
  department: Department;

  // Opcional: relaciones con entidades
  entityType?: Alert['entityType'];
  entityId?: string;
  accountId?: string;
  projectId?: string;
  emailId?: string;
  campaignId?: string;

  // Opcional: comportamiento
  actionable?: boolean;
  suggestedActions?: Alert['suggestedActions'];
  metadata?: Record<string, any>;
  expiresAt?: string;           // ISO date
}

/**
 * Crear una nueva alerta
 */
export async function createAlert(
  params: CreateAlertParams
): Promise<{ success: boolean; alertId?: string; error?: string }> {
  try {
    const alert: Omit<Alert, 'id'> = {
      // Clasificación
      type: params.type,
      severity: params.severity,
      source: 'SYSTEM',  // Por defecto, puede sobrescribirse via metadata

      // Contenido
      title: params.title,
      message: params.message,
      description: params.metadata?.description,

      // Asignación
      userId: params.userId,
      department: params.department,

      // Relaciones
      entityType: params.entityType,
      entityId: params.entityId,
      accountId: params.accountId,
      projectId: params.projectId,
      emailId: params.emailId,
      campaignId: params.campaignId,

      // Estado
      status: 'ACTIVE',
      actionable: params.actionable ?? true,

      // Acciones sugeridas
      suggestedActions: params.suggestedActions,

      // Metadata
      metadata: params.metadata,

      // Auditoría
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
    };

    // Guardar en Firestore
    const docRef = await db.collection('alerts').add(alert);

    console.log('[Alerts] ✅ Created alert:', docRef.id, params.type);

    return { success: true, alertId: docRef.id };

  } catch (error) {
    console.error('[Alerts] ❌ Error creating alert:', error);
    return { success: false, error: String(error) };
  }
}

// =================================================================
// GET ALERTS
// =================================================================

export interface GetAlertsOptions {
  status?: AlertStatus;
  severity?: AlertSeverity;
  department?: Department;
  type?: AlertType;
  limit?: number;
  activeOnly?: boolean;         // Solo alertas activas (no dismissed/resolved)
}

/**
 * Obtener alertas de un usuario
 */
export async function getUserAlerts(
  userId: string,
  options?: GetAlertsOptions
): Promise<Alert[]> {
  try {
    let query: any = db.collection('alerts')
      .where('userId', '==', userId);

    // Filtros opcionales
    if (options?.status) {
      query = query.where('status', '==', options.status);
    }

    if (options?.severity) {
      query = query.where('severity', '==', options.severity);
    }

    if (options?.department) {
      query = query.where('department', '==', options.department);
    }

    if (options?.type) {
      query = query.where('type', '==', options.type);
    }

    // Por defecto, solo alertas activas
    if (options?.activeOnly !== false) {
      query = query.where('status', '==', 'ACTIVE');
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.orderBy('createdAt', 'desc');

    // Límite
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    const alerts = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Alert[];

    console.log(`[Alerts] Loaded ${alerts.length} alerts for user ${userId}`);

    return alerts;

  } catch (error) {
    console.error('[Alerts] Error getting alerts:', error);
    return [];
  }
}

/**
 * Obtener alertas por departamento
 */
export async function getAlertsByDepartment(
  department: Department,
  options?: { limit?: number; activeOnly?: boolean }
): Promise<Alert[]> {
  try {
    let query: any = db.collection('alerts')
      .where('department', '==', department);

    if (options?.activeOnly !== false) {
      query = query.where('status', '==', 'ACTIVE');
    }

    query = query.orderBy('createdAt', 'desc');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Alert[];

  } catch (error) {
    console.error('[Alerts] Error getting alerts by department:', error);
    return [];
  }
}

/**
 * Obtener alertas críticas del sistema
 */
export async function getCriticalAlerts(
  limit: number = 10
): Promise<Alert[]> {
  try {
    const snapshot = await db.collection('alerts')
      .where('severity', '==', 'CRITICAL')
      .where('status', '==', 'ACTIVE')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Alert[];

  } catch (error) {
    console.error('[Alerts] Error getting critical alerts:', error);
    return [];
  }
}

// =================================================================
// UPDATE ALERT STATUS
// =================================================================

/**
 * Descartar alerta
 */
export async function dismissAlert(
  alertId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('alerts').doc(alertId).update({
      status: 'DISMISSED',
      dismissedAt: new Date().toISOString(),
      dismissedBy: userId,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Alerts] ✅ Dismissed alert:', alertId);

    return { success: true };

  } catch (error) {
    console.error('[Alerts] ❌ Error dismissing alert:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Resolver alerta
 */
export async function resolveAlert(
  alertId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('alerts').doc(alertId).update({
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Alerts] ✅ Resolved alert:', alertId);

    return { success: true };

  } catch (error) {
    console.error('[Alerts] ❌ Error resolving alert:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Posponer alerta (snooze)
 */
export async function snoozeAlert(
  alertId: string,
  snoozedUntil: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('alerts').doc(alertId).update({
      status: 'SNOOZED',
      snoozedUntil,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Alerts] ✅ Snoozed alert:', alertId, 'until', snoozedUntil);

    return { success: true };

  } catch (error) {
    console.error('[Alerts] ❌ Error snoozing alert:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Reactivar alertas que ya pasaron su snooze time
 */
export async function reactivateSnoozedAlerts(): Promise<{ reactivated: number }> {
  try {
    const now = new Date().toISOString();

    const snapshot = await db.collection('alerts')
      .where('status', '==', 'SNOOZED')
      .where('snoozedUntil', '<=', now)
      .get();

    if (snapshot.empty) {
      return { reactivated: 0 };
    }

    const batch = db.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'ACTIVE',
        snoozedUntil: null,
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();

    console.log(`[Alerts] ✅ Reactivated ${snapshot.size} snoozed alerts`);

    return { reactivated: snapshot.size };

  } catch (error) {
    console.error('[Alerts] Error reactivating snoozed alerts:', error);
    return { reactivated: 0 };
  }
}

// =================================================================
// CONVERT ALERT TO TASK
// =================================================================

/**
 * Convertir alerta en tarea
 * 
 * Crea una tarea basada en la alerta y marca la alerta como resuelta.
 * Mantiene el vínculo bidireccional: Alert.taskId y Task.alertId
 */
export async function convertAlertToTask(
  alertId: string,
  userId: string,
  customParams?: {
    title?: string;
    desc?: string;
    dueAt?: string;
  }
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    // 1. Obtener la alerta
    const alertDoc = await db.collection('alerts').doc(alertId).get();

    if (!alertDoc.exists) {
      return { success: false, error: 'Alert not found' };
    }

    const alert = { id: alertDoc.id, ...alertDoc.data() } as Alert;

    // 2. Crear tarea basada en la alerta
    const task = {
      kind: 'GENERICA',
      title: customParams?.title || alert.title,
      desc: customParams?.desc || alert.message,
      status: 'BACKLOG',
      priority: mapSeverityToPriority(alert.severity),
      department: alert.department,
      source: 'AUTO_RULE' as const,
      assignedToId: alert.userId,
      createdById: userId,

      // Links desde la alerta
      accountId: alert.accountId,
      projectId: alert.projectId,
      campaignId: alert.campaignId,
      alertId: alertId,        // ◄── Link back to alert

      // Fecha de vencimiento
      dueAt: customParams?.dueAt || calculateDefaultDueDate(alert.severity),

      // Auditoría
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Guardar tarea
    const taskRef = await db.collection('tasks').add(task);

    // 4. Actualizar alerta con link a tarea
    await db.collection('alerts').doc(alertId).update({
      taskId: taskRef.id,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Alerts] ✅ Converted alert to task:', alertId, '→', taskRef.id);

    return { success: true, taskId: taskRef.id };

  } catch (error) {
    console.error('[Alerts] ❌ Error converting alert to task:', error);
    return { success: false, error: String(error) };
  }
}

// =================================================================
// CLEANUP & MAINTENANCE
// =================================================================

/**
 * Eliminar alertas antiguas expiradas
 */
export async function cleanupExpiredAlerts(): Promise<{ deleted: number }> {
  try {
    const now = new Date().toISOString();

    // Buscar alertas expiradas que ya no están activas
    const snapshot = await db.collection('alerts')
      .where('expiresAt', '<=', now)
      .where('status', 'in', ['DISMISSED', 'RESOLVED'])
      .get();

    if (snapshot.empty) {
      return { deleted: 0 };
    }

    // Eliminar en batch
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();

    console.log(`[Alerts] ✅ Cleanup: deleted ${snapshot.size} expired alerts`);

    return { deleted: snapshot.size };

  } catch (error) {
    console.error('[Alerts] Error cleaning up expired alerts:', error);
    return { deleted: 0 };
  }
}

/**
 * Eliminar todas las alertas de un usuario (útil para testing)
 */
export async function deleteAllUserAlerts(
  userId: string
): Promise<{ deleted: number }> {
  try {
    const snapshot = await db.collection('alerts')
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) {
      return { deleted: 0 };
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();

    console.log(`[Alerts] ✅ Deleted ${snapshot.size} alerts for user ${userId}`);

    return { deleted: snapshot.size };

  } catch (error) {
    console.error('[Alerts] Error deleting user alerts:', error);
    return { deleted: 0 };
  }
}

// =================================================================
// ANALYTICS & STATS
// =================================================================

export interface AlertsStats {
  total: number;
  active: number;
  bySeverity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  byDepartment: Record<Department, number>;
  actionable: number;
  converted: number;          // Convertidas a tareas
}

/**
 * Obtener estadísticas de alertas de un usuario
 */
export async function getUserAlertsStats(
  userId: string
): Promise<AlertsStats> {
  try {
    const snapshot = await db.collection('alerts')
      .where('userId', '==', userId)
      .get();

    const alerts = snapshot.docs.map((doc: any) => doc.data() as Alert);

    const stats: AlertsStats = {
      total: alerts.length,
      active: alerts.filter((a: Alert) => a.status === 'ACTIVE').length,
      bySeverity: {
        CRITICAL: alerts.filter((a: Alert) => a.severity === 'CRITICAL').length,
        HIGH: alerts.filter((a: Alert) => a.severity === 'HIGH').length,
        MEDIUM: alerts.filter((a: Alert) => a.severity === 'MEDIUM').length,
        LOW: alerts.filter((a: Alert) => a.severity === 'LOW').length,
      },
      byDepartment: {} as Record<Department, number>,
      actionable: alerts.filter((a: Alert) => a.actionable).length,
      converted: alerts.filter((a: Alert) => a.taskId).length,
    };

    // Contar por departamento
    const departments: Department[] = ['VENTAS', 'MARKETING', 'PRODUCCION', 'ALMACEN', 'FINANZAS', 'CALIDAD', 'PERSONAL', 'OPS'];
    departments.forEach(dept => {
      stats.byDepartment[dept] = alerts.filter((a: Alert) => a.department === dept).length;
    });

    return stats;

  } catch (error) {
    console.error('[Alerts] Error getting stats:', error);
    return {
      total: 0,
      active: 0,
      bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      byDepartment: {} as Record<Department, number>,
      actionable: 0,
      converted: 0,
    };
  }
}

// =================================================================
// HELPERS
// =================================================================

/**
 * Mapear severidad de alerta a prioridad de tarea
 */
function mapSeverityToPriority(severity: AlertSeverity): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  switch (severity) {
    case 'CRITICAL': return 'URGENT';
    case 'HIGH': return 'HIGH';
    case 'LOW': return 'LOW';
    default: return 'MEDIUM';
  }
}

/**
 * Calcular fecha de vencimiento por defecto según severidad
 */
function calculateDefaultDueDate(severity: AlertSeverity): string {
  const now = new Date();

  switch (severity) {
    case 'CRITICAL':
      // 1 hora
      now.setHours(now.getHours() + 1);
      break;
    case 'HIGH':
      // 24 horas
      now.setDate(now.getDate() + 1);
      break;
    case 'MEDIUM':
      // 3 días
      now.setDate(now.getDate() + 3);
      break;
    case 'LOW':
      // 1 semana
      now.setDate(now.getDate() + 7);
      break;
  }

  return now.toISOString();
}

// =================================================================
// BULK OPERATIONS
// =================================================================

/**
 * Marcar múltiples alertas como leídas/resueltas
 */
export async function bulkResolveAlerts(
  alertIds: string[],
  userId: string
): Promise<{ success: boolean; resolved: number }> {
  try {
    if (alertIds.length === 0) {
      return { success: true, resolved: 0 };
    }

    const batch = db.batch();
    const now = new Date().toISOString();

    alertIds.forEach(id => {
      const ref = db.collection('alerts').doc(id);
      batch.update(ref, {
        status: 'RESOLVED',
        resolvedAt: now,
        resolvedBy: userId,
        updatedAt: now,
      });
    });

    await batch.commit();

    console.log(`[Alerts] ✅ Bulk resolved ${alertIds.length} alerts`);

    return { success: true, resolved: alertIds.length };

  } catch (error) {
    console.error('[Alerts] Error bulk resolving alerts:', error);
    return { success: false, resolved: 0 };
  }
}

/**
 * Marcar múltiples alertas como descartadas
 */
export async function bulkDismissAlerts(
  alertIds: string[],
  userId: string
): Promise<{ success: boolean; dismissed: number }> {
  try {
    if (alertIds.length === 0) {
      return { success: true, dismissed: 0 };
    }

    const batch = db.batch();
    const now = new Date().toISOString();

    alertIds.forEach(id => {
      const ref = db.collection('alerts').doc(id);
      batch.update(ref, {
        status: 'DISMISSED',
        dismissedAt: now,
        dismissedBy: userId,
        updatedAt: now,
      });
    });

    await batch.commit();

    console.log(`[Alerts] ✅ Bulk dismissed ${alertIds.length} alerts`);

    return { success: true, dismissed: alertIds.length };

  } catch (error) {
    console.error('[Alerts] Error bulk dismissing alerts:', error);
    return { success: false, dismissed: 0 };
  }
}
