// src/server/workers/withdrawStockFromShipment.ts
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Shipment, StockMove, OnHandView } from '@/domain/ssot.v7';

interface WithdrawStockPayload {
  shipmentId: string;
}

export async function handleWithdrawStockFromShipment(payload: WithdrawStockPayload) {
  const { shipmentId } = payload;
  
  console.log('[Stock Worker] Withdrawing stock from shipment:', shipmentId);

  try {
    // 1. Obtener Shipment
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) {
      throw new Error(`Shipment not found: ${shipmentId}`);
    }
    const shipment = shipmentDoc.data() as Shipment;

    const stockMovesCreated: string[] = [];
    const onHandUpdated: string[] = [];

    // 2. Para cada línea del shipment
    for (const line of shipment.lines) {
      if (!line.lotNumber) {
        console.warn(`[Stock Worker] Line ${line.itemId} missing lotNumber, skipping...`);
        continue;
      }

      // 3. Crear StockMove (salida negativa)
      const stockMoveId = `sm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const stockMove: StockMove = {
        id: stockMoveId,
        itemId: line.itemId,
        lotNumber: line.lotNumber,
        qty: -line.qty, // NEGATIVO para salida
        uom: line.uom,
        reason: 'sale',
        fromLocationId: line.locationId || 'FG/MAIN',
        occurredAt: shipment.shippedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ref: {
          type: 'shipment',
          id: shipmentId,
          orderId: shipment.orderId,
        },
      };

      await db.collection('stockMoves').doc(stockMoveId).set(stockMove);
      stockMovesCreated.push(stockMoveId);
      
      console.log(`[Stock Worker] Created stock move: ${stockMoveId} (${line.itemId}, ${line.qty} units)`);

      // 4. Actualizar OnHand
      const onHandId = `${line.itemId}_${line.lotNumber}_${line.locationId || 'FG/MAIN'}`;
      const onHandDoc = await db.collection('onHand').doc(onHandId).get();

      if (onHandDoc.exists) {
        const onHand = onHandDoc.data() as OnHandView;
        const newQty = onHand.qty - line.qty;

        if (newQty < 0) {
          console.error(`[Stock Worker] WARNING: OnHand would go negative! ${onHandId}: ${onHand.qty} - ${line.qty} = ${newQty}`);
          // Continuar de todos modos pero registrar el error
        }

        await db.collection('onHand').doc(onHandId).update({
          qty: newQty,
          updatedAt: Timestamp.now().toDate().toISOString(),
        });

        onHandUpdated.push(onHandId);
        console.log(`[Stock Worker] Updated onHand: ${onHandId} (new qty: ${newQty})`);
      } else {
        console.error(`[Stock Worker] OnHand not found: ${onHandId}`);
        // No bloqueamos el proceso, pero registramos el error
      }

      // 5. Liberar reservations si existen
      const reservationsSnap = await db.collection('reservations')
        .where('itemId', '==', line.itemId)
        .where('lotNumber', '==', line.lotNumber)
        .where('locationId', '==', line.locationId || 'FG/MAIN')
        .get();

      for (const resDoc of reservationsSnap.docs) {
        await resDoc.ref.delete();
        console.log(`[Stock Worker] Deleted reservation: ${resDoc.id}`);
      }
    }

    // 6. Actualizar Shipment con metadata de stock withdrawal
    await db.collection('shipments').doc(shipmentId).update({
      stockWithdrawn: true,
      stockWithdrawnAt: Timestamp.now().toDate().toISOString(),
      stockMovesCreated,
      updatedAt: Timestamp.now().toDate().toISOString(),
    });

    console.log(`[Stock Worker] Stock withdrawal completed for shipment ${shipmentId}`);

    return {
      ok: true,
      shipmentId,
      stockMovesCreated: stockMovesCreated.length,
      onHandUpdated: onHandUpdated.length,
    };

  } catch (error: any) {
    console.error('[Stock Worker] Error withdrawing stock:', error);
    
    // Guardar error en dead_letters
    await db.collection('dead_letters').add({
      kind: 'WITHDRAW_STOCK_FROM_SHIPMENT',
      payload,
      error: error.message,
      stack: error.stack,
      createdAt: Timestamp.now(),
    });

    throw error;
  }
}
