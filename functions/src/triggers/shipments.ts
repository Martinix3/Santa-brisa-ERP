import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Firestore Triggers for Shipments Collection
 * 
 * Provides automatic reactions to shipment changes:
 * - Status change notifications
 * - Automatic alerts for critical states
 * - Audit trail
 * - Cross-collection synchronization
 */

const db = admin.firestore();

/**
 * Trigger: onShipmentWrite
 * Fires on any write operation (create, update, delete) to shipments collection
 */
export const onShipmentWrite = functions.firestore
  .document('shipments/{shipmentId}')
  .onWrite(async (change, context) => {
    const shipmentId = context.params.shipmentId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    
    // Document deleted
    if (!after) {
      console.log(`Shipment ${shipmentId} deleted`);
      return null;
    }
    
    // Document created
    if (!before) {
      console.log(`Shipment ${shipmentId} created`);
      await handleShipmentCreated(shipmentId, after);
      return null;
    }
    
    // Document updated - check for status changes
    if (before.status !== after.status) {
      console.log(`Shipment ${shipmentId} status: ${before.status} → ${after.status}`);
      await handleStatusChange(shipmentId, before, after);
    }
    
    // Check for payment status changes
    if (before.paymentStatus !== after.paymentStatus) {
      console.log(`Shipment ${shipmentId} payment: ${before.paymentStatus} → ${after.paymentStatus}`);
      await handlePaymentStatusChange(shipmentId, before, after);
    }
    
    return null;
  });

/**
 * Handle new shipment creation
 */
async function handleShipmentCreated(shipmentId: string, data: any) {
  try {
    // Create initial notification for assigned users
    if (data.assignedTo && data.assignedTo.length > 0) {
      const notificationsRef = db.collection('notifications');
      
      for (const userId of data.assignedTo) {
        await notificationsRef.add({
          userId,
          type: 'shipment_assigned',
          title: 'Nuevo envío asignado',
          message: `Se te ha asignado el envío ${data.shipmentNumber || shipmentId}`,
          shipmentId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    
    // Log to Gemini context
    await db.collection('gemini_context').add({
      eventType: 'shipment_tracking_assigned',
      module: 'logistics',
      data: {
        shipmentId,
        orderId: data.orderId,
        assignedTo: data.assignedTo,
        priority: data.priority,
      },
      timestamp: new Date().toISOString(),
      processed: false,
    });
  } catch (error) {
    console.error('Error in handleShipmentCreated:', error);
  }
}

/**
 * Handle shipment status changes
 */
async function handleStatusChange(shipmentId: string, before: any, after: any) {
  try {
    const oldStatus = before.status;
    const newStatus = after.status;
    
    // Create audit log entry
    await db.collection('audit_logs').add({
      collection: 'shipments',
      documentId: shipmentId,
      action: 'status_change',
      before: { status: oldStatus },
      after: { status: newStatus },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: after.updatedBy || 'system',
    });
    
    // Create alert for critical status changes
    if (isCriticalStatus(newStatus)) {
      await createAlert({
        shipmentId,
        type: 'status_change',
        severity: getSeverity(newStatus),
        title: `Envío en estado ${newStatus}`,
        message: `El envío ${after.shipmentNumber || shipmentId} ha cambiado a estado ${newStatus}`,
        data: {
          oldStatus,
          newStatus,
          trackingNumber: after.trackingNumber,
        },
      });
    }
    
    // Notify assigned users
    if (after.assignedTo && after.assignedTo.length > 0) {
      for (const userId of after.assignedTo) {
        await db.collection('notifications').add({
          userId,
          type: 'shipment_status_changed',
          title: 'Cambio de estado de envío',
          message: `El envío ${after.shipmentNumber || shipmentId} cambió de ${oldStatus} a ${newStatus}`,
          shipmentId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    
    // Log to Gemini context
    await db.collection('gemini_context').add({
      eventType: 'shipment_status_change',
      module: 'logistics',
      data: {
        shipmentId,
        oldStatus,
        newStatus,
        trackingNumber: after.trackingNumber,
        carrier: after.carrier,
        isCritical: isCriticalStatus(newStatus),
      },
      timestamp: new Date().toISOString(),
      processed: false,
    });
    
    // If delivered, update related order
    if (newStatus === 'DELIVERED' && after.orderId) {
      await updateOrderDeliveryStatus(after.orderId, shipmentId);
    }
    
  } catch (error) {
    console.error('Error in handleStatusChange:', error);
  }
}

/**
 * Handle payment status changes
 */
async function handlePaymentStatusChange(shipmentId: string, before: any, after: any) {
  try {
    const oldStatus = before.paymentStatus;
    const newStatus = after.paymentStatus;
    
    // Create alert for overdue payments
    if (newStatus === 'OVERDUE') {
      await createAlert({
        shipmentId,
        type: 'payment_overdue',
        severity: 'high',
        title: 'Pago vencido',
        message: `El envío ${after.shipmentNumber || shipmentId} tiene un pago vencido`,
        data: {
          invoiceId: after.holdedInvoiceId,
          dueDate: after.dueDate,
          amount: after.total,
        },
      });
      
      // Log to Gemini context
      await db.collection('gemini_context').add({
        eventType: 'invoice_overdue',
        module: 'finance',
        data: {
          shipmentId,
          invoiceId: after.holdedInvoiceId,
          amount: after.total,
          dueDate: after.dueDate,
          daysPastDue: calculateDaysPastDue(after.dueDate),
        },
        timestamp: new Date().toISOString(),
        processed: false,
      });
    }
    
    // Notify finance team
    if (newStatus === 'PAID' || newStatus === 'OVERDUE') {
      const financeUsers = await getFinanceTeamUsers();
      for (const userId of financeUsers) {
        await db.collection('notifications').add({
          userId,
          type: 'payment_status_changed',
          title: newStatus === 'PAID' ? 'Pago recibido' : 'Pago vencido',
          message: `El envío ${after.shipmentNumber || shipmentId} cambió a ${newStatus}`,
          shipmentId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    
  } catch (error) {
    console.error('Error in handlePaymentStatusChange:', error);
  }
}

/**
 * Helper: Create alert in alerts collection
 */
async function createAlert(alert: {
  shipmentId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
}) {
  await db.collection('alerts').add({
    ...alert,
    resolved: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Helper: Check if status is critical
 */
function isCriticalStatus(status: string): boolean {
  const criticalStatuses = ['FAILED', 'RETURNED', 'CANCELLED', 'EXCEPTION'];
  return criticalStatuses.includes(status);
}

/**
 * Helper: Get severity based on status
 */
function getSeverity(status: string): 'low' | 'medium' | 'high' | 'critical' {
  if (status === 'FAILED' || status === 'EXCEPTION') return 'critical';
  if (status === 'RETURNED') return 'high';
  if (status === 'CANCELLED') return 'medium';
  return 'low';
}

/**
 * Helper: Calculate days past due
 */
function calculateDaysPastDue(dueDate: any): number {
  if (!dueDate) return 0;
  const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Helper: Get finance team user IDs
 */
async function getFinanceTeamUsers(): Promise<string[]> {
  try {
    const snap = await db.collection('users')
      .where('role', '==', 'FINANCE')
      .get();
    return snap.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error getting finance team:', error);
    return [];
  }
}

/**
 * Helper: Update order delivery status when shipment is delivered
 */
async function updateOrderDeliveryStatus(orderId: string, shipmentId: string) {
  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      console.warn(`Order ${orderId} not found`);
      return;
    }
    
    // Check if all shipments for this order are delivered
    const shipmentsSnap = await db.collection('shipments')
      .where('orderId', '==', orderId)
      .get();
    
    const allDelivered = shipmentsSnap.docs.every(doc => {
      const data = doc.data();
      return data.status === 'DELIVERED';
    });
    
    if (allDelivered) {
      await orderRef.update({
        deliveryStatus: 'DELIVERED',
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`Order ${orderId} marked as fully delivered`);
    }
  } catch (error) {
    console.error('Error updating order delivery status:', error);
  }
}
