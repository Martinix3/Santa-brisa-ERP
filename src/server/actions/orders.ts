"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { OrderStatus, StatusHistoryEntry, OrderWithAccount } from "@/types/orders";
import { isValidTransition } from "@/types/orders";
import type { OrderSellOut, Account } from "@/domain/ssot";

type UpdateOrderStatusResult = {
  success: boolean;
  message: string;
  newStatus?: OrderStatus;
};

/**
 * Update order status with validation and history tracking
 * Phase 1 - Orders Intelligence
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  userName: string,
  note?: string
): Promise<UpdateOrderStatusResult> {
  try {
    const orderRef = db.collection("ordersSellOut").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return {
        success: false,
        message: "Pedido no encontrado"
      };
    }

    const orderData = orderDoc.data();
    const currentStatus = orderData?.status as OrderStatus;

    // Validate transition
    if (!isValidTransition(currentStatus, newStatus)) {
      return {
        success: false,
        message: `Transición inválida de ${currentStatus} a ${newStatus}`
      };
    }

    // Create history entry
    const historyEntry: StatusHistoryEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      note,
      metadata: {
        previousStatus: currentStatus,
        triggeredBy: "manual"
      }
    };

    // Get existing history or initialize
    const existingHistory = orderData?.workflowMetadata?.statusHistory || [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Update order
    await orderRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
      "workflowMetadata.currentStatus": newStatus,
      "workflowMetadata.statusHistory": updatedHistory,
      "workflowMetadata.lastStatusChange": historyEntry.timestamp,
      "workflowMetadata.lastStatusChangeBy": userId
    });

    // Log interaction for audit
    await logOrderStatusChange(orderId, currentStatus, newStatus, userId, userName, note);

    // AI Hook - placeholder for Gemini integration (Phase 6)
    if (newStatus === 'APPROVED') {
      await logAIContext('order:approved', { orderId, userId });
    }

    // Auto-actions based on status
    if (newStatus === 'APPROVED' && orderData?.flow === 'DIRECT') {
      // Trigger shipment creation (Phase 1.4)
      await createShipmentFromOrder(orderId);
    }

    // Revalidate relevant paths
    revalidatePath('/ventas/pedidos');
    revalidatePath(`/ventas/pedidos/${orderId}`);

    return {
      success: true,
      message: `Estado actualizado a ${newStatus}`,
      newStatus
    };

  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Log order status change in interactions collection
 * For audit trail and analytics
 */
async function logOrderStatusChange(
  orderId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  userId: string,
  userName: string,
  note?: string
): Promise<void> {
  try {
    await db.collection("interactions").add({
      kind: "ORDER_STATUS_CHANGE",
      entityType: "order",
      entityId: orderId,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      metadata: {
        fromStatus,
        toStatus,
        note
      }
    });
  } catch (error) {
    console.error('Error logging interaction:', error);
    // Don't throw - logging shouldn't block the main action
  }
}

/**
 * AI Context Logger - Placeholder for Gemini integration
 * Phase 6 - Gemini Intelligence
 */
async function logAIContext(
  event: string,
  context: Record<string, any>
): Promise<void> {
  try {
    // Placeholder - will integrate with Gemini in Phase 6
    await db.collection("ai_context_log").add({
      event,
      context,
      timestamp: new Date().toISOString(),
      processed: false
    });
  } catch (error) {
    console.error('Error logging AI context:', error);
    // Don't throw - logging shouldn't block the main action
  }
}

/**
 * Create shipment from approved order
 * Placeholder for Phase 1.4 - Auto-generation
 */
async function createShipmentFromOrder(orderId: string): Promise<void> {
  try {
    const orderDoc = await db.collection("ordersSellOut").doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new Error("Order not found");
    }

    const orderData = orderDoc.data();

    // Create shipment document
    const shipmentData = {
      id: `SHIP-${Date.now()}`,
      status: "PENDING",
      sourceOrderId: orderId,
      accountId: orderData?.accountId,
      lines: orderData?.lines || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        autoGenerated: true,
        triggeredBy: "order_approval"
      }
    };

    await db.collection("shipments").add(shipmentData);

    console.log(`Shipment created for order ${orderId}`);
  } catch (error) {
    console.error('Error creating shipment:', error);
    // Don't throw - shipment creation failure shouldn't block status change
  }
}

/**
 * Get order status history
 */
export async function getOrderStatusHistory(
  orderId: string
): Promise<StatusHistoryEntry[]> {
  try {
    const orderDoc = await db.collection("ordersSellOut").doc(orderId).get();
    
    if (!orderDoc.exists) {
      return [];
    }

    const orderData = orderDoc.data();
    return orderData?.workflowMetadata?.statusHistory || [];
  } catch (error) {
    console.error('Error getting status history:', error);
    return [];
  }
}

/**
 * Create a new order
 * SSOT V2.1 compliant
 */
export async function createOrder(
  orderData: Partial<OrderSellOut>
): Promise<{
  success: boolean;
  orderId?: string;
  message: string;
}> {
  try {
    // Generate order number if not provided
    const docNumber = orderData.docNumber || `SB-${new Date().getFullYear()}-${Date.now()}`;
    
    // Prepare order document
    const newOrder: any = {
      ...orderData,
      docNumber,
      status: orderData.status || 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderDate: orderData.orderDate || new Date().toISOString(),
      // Initialize workflow metadata
      workflowMetadata: {
        currentStatus: orderData.status || 'open',
        statusHistory: [{
          status: orderData.status || 'open',
          timestamp: new Date().toISOString(),
          userId: 'system',
          userName: 'Sistema',
          metadata: {
            triggeredBy: 'manual_creation'
          }
        }],
        lastStatusChange: new Date().toISOString(),
        lastStatusChangeBy: 'system'
      }
    };

    // Create order in Firestore
    const orderRef = await db.collection("ordersSellOut").add(newOrder);

    // Stage escalation: any created order should promote the account to ACTIVA
    if (newOrder.accountId) {
      const accountRef = db.collection('accounts').doc(newOrder.accountId);
      try {
        const snap = await accountRef.get();
        if (snap.exists) {
          const acc = snap.data() as Account | undefined;
          const current = (acc?.stage as any) || 'POTENCIAL';
          const rank: Record<string, number> = { POTENCIAL: 1, SEGUIMIENTO: 2, ACTIVA: 3, FALLIDA: 0, CERRADA: 0, BAJA: 0 };
          if ((rank[current] ?? 0) < rank['ACTIVA']) {
            await accountRef.update({ stage: 'ACTIVA', updatedAt: new Date().toISOString(), lastInteractionAt: new Date().toISOString() });
          } else {
            await accountRef.update({ lastInteractionAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          }
        }
      } catch (e) {
        console.error('[createOrder] Failed to escalate account stage:', e);
      }
    }

    // Log creation
    await db.collection("interactions").add({
      kind: "ORDER_CREATED",
      entityType: "order",
      entityId: orderRef.id,
      userId: 'system',
      userName: 'Sistema',
      timestamp: new Date().toISOString(),
      metadata: {
        docNumber,
        channel: orderData.channel,
        flow: orderData.flow,
        totalAmount: orderData.totalAmount
      }
    });

    // Revalidate paths
    revalidatePath('/ventas/pedidos');

    return {
      success: true,
      orderId: orderRef.id,
      message: `Pedido ${docNumber} creado exitosamente`
    };

  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al crear el pedido'
    };
  }
}

/**
 * Get all orders with populated account data
 * For display in orders list page
 */
export async function getOrdersWithAccounts(): Promise<{
  success: boolean;
  data?: OrderWithAccount[];
  error?: string;
}> {
  try {
    // Fetch all orders
    const ordersSnapshot = await db.collection("ordersSellOut").get();
    
    if (ordersSnapshot.empty) {
      return {
        success: true,
        data: []
      };
    }

    // Extract orders
    const orders: OrderSellOut[] = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<OrderSellOut, 'id'>
    }));

    // Get unique account IDs
    const accountIds = [...new Set(
      orders
        .map(o => o.accountId)
        .filter((id): id is string => !!id)
    )];

    // Fetch all accounts in parallel
    const accountsMap = new Map<string, Account>();
    
    if (accountIds.length > 0) {
      const accountPromises = accountIds.map(id =>
        db.collection("accounts").doc(id).get()
      );
      
      const accountDocs = await Promise.all(accountPromises);
      
      accountDocs.forEach(doc => {
        if (doc.exists) {
          accountsMap.set(doc.id, {
            id: doc.id,
            ...doc.data() as Omit<Account, 'id'>
          });
        }
      });
    }

    // Populate orders with account data
    const ordersWithAccounts: OrderWithAccount[] = orders.map(order => ({
      ...order,
      account: order.accountId ? accountsMap.get(order.accountId) : undefined
    }));

    return {
      success: true,
      data: ordersWithAccounts
    };

  } catch (error) {
    console.error('Error fetching orders with accounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
