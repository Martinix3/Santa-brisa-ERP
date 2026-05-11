// FILE: src/server/actions/quality-helpers.ts
// Quality Control - Helper Functions
// FASE 20 - Quality Module Implementation

"use server";

import { adminDb as db } from "@/server/firebase";
import type { TaskNew, Item, OnHandView } from "@/domain/ssot";

// Simple ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// TASK CREATION
// ============================================================================

/**
 * Creates a follow-up task when a lot is rejected
 * 
 * Business Logic:
 * - Creates a task assigned to QC manager
 * - High priority
 * - Due in 24 hours
 * - Linked to the lot and item
 * 
 * @param lotCode - Lot number that was rejected
 * @param itemId - Item ID
 * @param rejectionReason - Reason for rejection
 * @param reviewerId - User ID of the QC reviewer
 */
export async function createRejectionFollowupTask(
  lotCode: string,
  itemId: string,
  rejectionReason: string,
  reviewerId: string
): Promise<void> {
  try {
    // Get item name for task title
    const itemDoc = await db.collection('items').doc(itemId).get();
    const itemName = itemDoc.exists
      ? (itemDoc.data() as Item).name
      : itemId;

    const now = new Date();
    const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    const task: TaskNew = {
      id: generateId(),
      kind: 'GENERICA',
      title: `Seguimiento rechazo lote ${lotCode}`,
      desc: `Lote rechazado: ${itemName}\nMotivo: ${rejectionReason}\n\nAcciones requeridas:\n- Contactar proveedor\n- Gestionar devolución o destrucción\n- Documentar acciones correctivas`,
      status: 'BACKLOG',
      priority: 'HIGH',
      isPriority: true,
      priorityRank: 3,
      department: 'CALIDAD',
      source: 'AUTO_RULE',
      dueAt: dueDate.toISOString(),
      slaBucket: 'TODAY',
      assignedToId: reviewerId, // Assign to the reviewer initially
      createdById: 'system',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.collection('tasks').doc(task.id).set(task);

    console.log('[createRejectionFollowupTask] Task created:', task.id);
  } catch (error) {
    console.error('[createRejectionFollowupTask] Error:', error);
    // Don't throw - this is a non-critical post-transaction action
  }
}

// ============================================================================
// GEMINI INTELLIGENCE ALERTS
// ============================================================================

/**
 * Creates a Gemini Intelligence alert for QC events
 * 
 * Business Logic:
 * - Creates structured alert for Gemini to analyze
 * - Includes context: lot, item, decision, reason
 * - Gemini can detect patterns (supplier issues, recurring defects, etc.)
 * 
 * Alert Types:
 * - LOT_REJECTED: Lot failed QC
 * - LOT_APPROVED: Lot passed QC (for tracking)
 * - QC_HOLD: Lot placed on hold
 * - CONDITIONAL_APPROVAL: Lot approved with conditions
 * 
 * @param type - Type of alert
 * @param data - Alert data
 */
export async function createGeminiAlert(
  type: 'LOT_REJECTED' | 'LOT_APPROVED' | 'QC_HOLD' | 'CONDITIONAL_APPROVAL',
  data: {
    lotCode: string;
    itemId: string;
    decision: string;
    reason?: string;
    conditions?: string[];
  }
): Promise<void> {
  try {
    const now = new Date();

    // Get item details for context
    const itemDoc = await db.collection('items').doc(data.itemId).get();
    const item = itemDoc.exists ? (itemDoc.data() as Item) : null;

    // Get lot details
    const lotDoc = await db.collection('lots').doc(data.lotCode).get();
    const lot = lotDoc.exists ? lotDoc.data() : null;

    // Prepare alert payload for Gemini
    const alert = {
      id: generateId(),
      type: 'QUALITY_EVENT',
      subtype: type,
      severity: type === 'LOT_REJECTED' ? 'HIGH' : type === 'QC_HOLD' ? 'MEDIUM' : 'LOW',
      title: getAlertTitle(type, data.lotCode),
      description: getAlertDescription(type, data),
      context: {
        lotCode: data.lotCode,
        itemId: data.itemId,
        itemName: item?.name,
        itemCategory: item?.category,
        decision: data.decision,
        reason: data.reason,
        conditions: data.conditions,
        supplierId: lot?.supplierId,
        quantity: lot?.quantity,
        uom: lot?.uom,
      },
      metadata: {
        department: 'CALIDAD',
        requiresAction: type === 'LOT_REJECTED' || type === 'QC_HOLD',
        analysisPrompt: getGeminiAnalysisPrompt(type, data),
      },
      createdAt: now.toISOString(),
      analyzedAt: null,
      geminiInsights: null,
    };

    // Store alert for Gemini to process
    await db.collection('gemini_alerts').doc(alert.id).set(alert);

    console.log('[createGeminiAlert] Alert created:', alert.id, type);
  } catch (error) {
    console.error('[createGeminiAlert] Error:', error);
    // Don't throw - this is a non-critical post-transaction action
  }
}

function getAlertTitle(
  type: 'LOT_REJECTED' | 'LOT_APPROVED' | 'QC_HOLD' | 'CONDITIONAL_APPROVAL',
  lotCode: string
): string {
  switch (type) {
    case 'LOT_REJECTED':
      return `Lote ${lotCode} rechazado en QC`;
    case 'LOT_APPROVED':
      return `Lote ${lotCode} aprobado`;
    case 'QC_HOLD':
      return `Lote ${lotCode} en espera QC`;
    case 'CONDITIONAL_APPROVAL':
      return `Lote ${lotCode} aprobado con condiciones`;
  }
}

function getAlertDescription(
  type: 'LOT_REJECTED' | 'LOT_APPROVED' | 'QC_HOLD' | 'CONDITIONAL_APPROVAL',
  data: { reason?: string; conditions?: string[] }
): string {
  switch (type) {
    case 'LOT_REJECTED':
      return `Motivo: ${data.reason || 'No especificado'}`;
    case 'QC_HOLD':
      return `En espera de información adicional. ${data.reason || ''}`;
    case 'CONDITIONAL_APPROVAL':
      return `Condiciones: ${data.conditions?.join(', ') || 'No especificadas'}`;
    case 'LOT_APPROVED':
      return 'Lote liberado para uso/venta';
  }
}

function getGeminiAnalysisPrompt(
  type: 'LOT_REJECTED' | 'LOT_APPROVED' | 'QC_HOLD' | 'CONDITIONAL_APPROVAL',
  data: { lotCode: string; itemId: string; reason?: string }
): string {
  switch (type) {
    case 'LOT_REJECTED':
      return `Analiza el patrón de rechazos para este producto y proveedor. ¿Hay un problema recurrente? ¿Qué acciones correctivas sugieres?`;
    case 'QC_HOLD':
      return `¿Por qué este lote está en espera? ¿Hay información faltante recurrente?`;
    case 'CONDITIONAL_APPROVAL':
      return `Analiza las condiciones impuestas. ¿Son comunes para este producto? ¿Representan un riesgo?`;
    case 'LOT_APPROVED':
      return `Tracking para análisis de tendencias de calidad.`;
  }
}

// ============================================================================
// EMAIL QUEUE
// ============================================================================

/**
 * Queues an email notification for lot rejection
 * 
 * Business Logic:
 * - Sends email to QC manager and purchasing team
 * - Includes rejection details and next steps
 * - Uses email queue system for reliable delivery
 * 
 * @param lotCode - Lot number
 * @param itemId - Item ID
 * @param rejectionReason - Reason for rejection
 * @param reviewerName - Name of QC reviewer
 */
export async function queueRejectionEmail(
  lotCode: string,
  itemId: string,
  rejectionReason: string,
  reviewerName: string
): Promise<void> {
  try {
    // Get item details
    const itemDoc = await db.collection('items').doc(itemId).get();
    const itemName = itemDoc.exists
      ? (itemDoc.data() as Item).name
      : itemId;

    // Get lot details for supplier info
    const lotDoc = await db.collection('lots').doc(lotCode).get();
    const lot = lotDoc.exists ? lotDoc.data() : null;

    const emailPayload = {
      id: generateId(),
      type: 'LOT_REJECTION',
      priority: 'HIGH',
      to: [], // Will be populated by email service based on roles
      recipientRoles: ['QC_MANAGER', 'PURCHASING_MANAGER'],
      subject: `RECHAZO QC: Lote ${lotCode} - ${itemName}`,
      template: 'lot-rejection',
      data: {
        lotCode,
        itemId,
        itemName,
        rejectionReason,
        reviewerName,
        supplierId: lot?.supplierId,
        quantity: lot?.quantity,
        uom: lot?.uom,
        rejectedAt: new Date().toISOString(),
        nextSteps: [
          'Contactar con proveedor',
          'Gestionar devolución o destrucción',
          'Documentar acciones correctivas',
          'Revisar especificaciones si aplica',
        ],
      },
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      scheduledFor: new Date().toISOString(), // Send immediately
      attempts: 0,
      maxAttempts: 3,
    };

    await db.collection('email_queue').doc(emailPayload.id).set(emailPayload);

    console.log('[queueRejectionEmail] Email queued:', emailPayload.id);
  } catch (error) {
    console.error('[queueRejectionEmail] Error:', error);
    // Don't throw - this is a non-critical post-transaction action
  }
}

/**
 * Queues an email notification for lot approval
 * 
 * Business Logic:
 * - Sends email to warehouse and planning teams
 * - Notifies that lot is ready for use/sale
 * - Includes any conditions if CONDITIONAL approval
 * 
 * @param lotCode - Lot number
 * @param itemId - Item ID
 * @param reviewerName - Name of QC reviewer
 * @param conditions - Conditions if conditional approval
 */
export async function queueApprovalEmail(
  lotCode: string,
  itemId: string,
  reviewerName: string,
  conditions?: string[]
): Promise<void> {
  try {
    // Get item details
    const itemDoc = await db.collection('items').doc(itemId).get();
    const itemName = itemDoc.exists
      ? (itemDoc.data() as Item).name
      : itemId;

    // Get lot details
    const lotDoc = await db.collection('lots').doc(lotCode).get();
    const lot = lotDoc.exists ? lotDoc.data() : null;

    const isConditional = conditions && conditions.length > 0;

    const emailPayload = {
      id: generateId(),
      type: isConditional ? 'LOT_CONDITIONAL_APPROVAL' : 'LOT_APPROVAL',
      priority: isConditional ? 'MEDIUM' : 'LOW',
      to: [],
      recipientRoles: ['WAREHOUSE_MANAGER', 'PLANNING_MANAGER'],
      subject: isConditional
        ? `APROBACIÓN CONDICIONAL: Lote ${lotCode} - ${itemName}`
        : `APROBADO: Lote ${lotCode} - ${itemName}`,
      template: isConditional ? 'lot-conditional-approval' : 'lot-approval',
      data: {
        lotCode,
        itemId,
        itemName,
        reviewerName,
        quantity: lot?.quantity,
        uom: lot?.uom,
        approvedAt: new Date().toISOString(),
        conditions: conditions || [],
        message: isConditional
          ? 'Lote aprobado con condiciones especiales. Revisar condiciones antes de uso.'
          : 'Lote liberado para uso/venta sin restricciones.',
      },
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      scheduledFor: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
    };

    await db.collection('email_queue').doc(emailPayload.id).set(emailPayload);

    console.log('[queueApprovalEmail] Email queued:', emailPayload.id);
  } catch (error) {
    console.error('[queueApprovalEmail] Error:', error);
    // Don't throw - this is a non-critical post-transaction action
  }
}

// ============================================================================
// STOCK ALERTS
// ============================================================================

/**
 * Checks if lot approval triggers stock alerts
 * 
 * Business Logic:
 * - After lot approval, checks if this resolves low stock alerts
 * - Calculates new available quantity
 * - Creates alert if still below threshold
 * - Notifies planning team
 * 
 * @param itemId - Item ID
 * @param quantityReleased - Quantity of the approved lot
 */
export async function checkStockAlertsAfterApproval(
  itemId: string,
  quantityReleased: number
): Promise<void> {
  try {
    // Get item details
    const itemDoc = await db.collection('items').doc(itemId).get();
    if (!itemDoc.exists) {
      console.warn('[checkStockAlertsAfterApproval] Item not found:', itemId);
      return;
    }

    const item = itemDoc.data() as Item;

    // Get current available stock (PASSED lots only)
    const onHandSnapshot = await db
      .collection('onHand')
      .where('itemId', '==', itemId)
      .where('qcStatus', '==', 'PASSED')
      .get();

    let totalAvailable = 0;
    onHandSnapshot.forEach((doc) => {
      const onHand = doc.data() as OnHandView;
      totalAvailable += onHand.qty;
    });

    // Define low stock threshold (could be configurable)
    const LOW_STOCK_THRESHOLD = 50; // units
    const CRITICAL_STOCK_THRESHOLD = 20; // units

    // Check if we need to create/update alert
    if (totalAvailable <= CRITICAL_STOCK_THRESHOLD) {
      await createStockAlert(itemId, item.name, totalAvailable, 'CRITICAL');
    } else if (totalAvailable <= LOW_STOCK_THRESHOLD) {
      await createStockAlert(itemId, item.name, totalAvailable, 'WARNING');
    } else {
      // Stock is healthy, resolve any existing alerts
      await resolveStockAlert(itemId);
    }

    console.log('[checkStockAlertsAfterApproval] Stock check completed:', {
      itemId,
      totalAvailable,
      quantityReleased,
    });
  } catch (error) {
    console.error('[checkStockAlertsAfterApproval] Error:', error);
    // Don't throw - this is a non-critical post-transaction action
  }
}

async function createStockAlert(
  itemId: string,
  itemName: string,
  currentStock: number,
  severity: 'WARNING' | 'CRITICAL'
): Promise<void> {
  const alert = {
    id: `stock-alert-${itemId}`,
    type: 'STOCK_ALERT',
    severity,
    itemId,
    itemName,
    currentStock,
    threshold: severity === 'CRITICAL' ? 20 : 50,
    message: severity === 'CRITICAL'
      ? `Stock crítico: ${itemName} (${currentStock} unidades)`
      : `Stock bajo: ${itemName} (${currentStock} unidades)`,
    department: 'ALMACEN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('alerts').doc(alert.id).set(alert, { merge: true });
}

async function resolveStockAlert(itemId: string): Promise<void> {
  const alertId = `stock-alert-${itemId}`;
  const alertDoc = await db.collection('alerts').doc(alertId).get();

  if (alertDoc.exists) {
    await db.collection('alerts').doc(alertId).update({
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
