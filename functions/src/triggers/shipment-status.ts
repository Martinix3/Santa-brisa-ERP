// functions/src/triggers/shipment-status.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Firestore trigger: onWrite(shipments)
 * Ejecuta lógica reactiva cuando cambia un shipment:
 * 1. Detecta cambios de estado
 * 2. Crea alertas de inventario si es necesario
 * 3. Log eventos para Gemini
 */
export const onShipmentStatusChange = functions.firestore
  .document('shipments/{shipmentId}')
  .onWrite(async (change, context) => {
    const shipmentId = context.params.shipmentId;
    
    // Si es borrado, skip
    if (!change.after.exists) {
      console.log('[onShipmentStatusChange] Shipment deleted:', shipmentId);
      return null;
    }
    
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.data();
    
    if (!after) return null;
    
    // Detectar cambio de estado
    const statusChanged = before?.status !== after.status;
    
    if (statusChanged) {
      console.log('[onShipmentStatusChange] Status changed:', {
        shipmentId,
        from: before?.status,
        to: after.status
      });
      
      // 1. Log para Gemini
      await logGeminiEvent('shipment_status_change', {
        shipmentId,
        fromStatus: before?.status || 'none',
        toStatus: after.status,
        timestamp: new Date().toISOString()
      });
      
      // 2. Si se shipped/delivered → check inventory alerts
      if (after.status === 'shipped' || after.status === 'delivered') {
        await checkInventoryAlerts(shipmentId, after);
      }
    }
    
    return null;
  });

/**
 * Check if shipment causes low stock alerts
 */
async function checkInventoryAlerts(shipmentId: string, shipment: any) {
  try {
    const lines = shipment.lines || [];
    
    for (const line of lines) {
      const itemId = line.itemId || line.sku;
      if (!itemId) continue;
      
      // Get current onHand for this item
      const onHandSnap = await db.collection('onHand')
        .where('sku', '==', itemId)
        .get();
      
      if (onHandSnap.empty) continue;
      
      // Sum total stock
      let totalStock = 0;
      onHandSnap.docs.forEach(doc => {
        const data = doc.data();
        totalStock += (data.qty || 0) - (data.reserved || 0);
      });
      
      // Get item details for min stock
      const itemDoc = await db.collection('items').doc(itemId).get();
      const item = itemDoc.exists ? itemDoc.data() : null;
      const minStock = item?.minStock || 10;
      
      // Create alert if below threshold
      if (totalStock < minStock) {
        await db.collection('alerts').add({
          type: 'low_stock',
          severity: totalStock === 0 ? 'critical' : 'warning',
          itemId,
          itemName: item?.name || itemId,
          currentStock: totalStock,
          minStock,
          triggeredBy: 'shipment',
          triggeredById: shipmentId,
          status: 'open',
          createdAt: new Date().toISOString(),
          assignedTo: 'OPS'
        });
        
        console.log('[checkInventoryAlerts] Low stock alert created:', {
          itemId,
          currentStock: totalStock,
          minStock
        });
      }
    }
  } catch (error) {
    console.error('[checkInventoryAlerts] Error:', error);
  }
}

/**
 * Log event for Gemini analysis
 */
async function logGeminiEvent(eventType: string, data: any) {
  try {
    await db.collection('gemini_context').add({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      module: 'logistics',
      processed: false
    });
  } catch (error) {
    console.error('[logGeminiEvent] Error:', error);
  }
}
