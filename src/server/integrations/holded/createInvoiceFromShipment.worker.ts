// src/server/integrations/holded/createInvoiceFromShipment.worker.ts
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { callHoldedApi } from './client';
import { ensureHoldedContact } from './pushContact';
import type { Shipment, OrderSellOut, Item } from '@/domain/ssot';

interface CreateInvoicePayload {
  shipmentId: string;
}

export async function handleCreateInvoiceFromShipment(payload: CreateInvoicePayload) {
  const { shipmentId } = payload;
  
  console.log('[Holded Worker] Creating invoice from shipment:', shipmentId);

  try {
    // 1. Obtener Shipment
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) {
      throw new Error(`Shipment not found: ${shipmentId}`);
    }
    const shipment = shipmentDoc.data() as Shipment;

    // 2. Obtener Order vinculada
    const orderDoc = await db.collection('ordersSellOut').doc(shipment.orderId).get();
    if (!orderDoc.exists) {
      throw new Error(`Order not found: ${shipment.orderId}`);
    }
    const order = orderDoc.data() as OrderSellOut;

    // 3. Verificar si ya tiene factura
    if ((order as any).holded?.documentId) {
      console.log('[Holded Worker] Order already has invoice:', (order as any).holded.documentId);
      return {
        ok: true,
        message: 'Order already invoiced',
        invoiceId: (order as any).holded.documentId,
      };
    }

    // 4. Obtener Account (v7: sin Party)
    const accountDoc = await db.collection('accounts').doc(String(order.accountId)).get();
    if (!accountDoc.exists) {
      throw new Error(`Account not found: ${order.accountId}`);
    }
    const account = accountDoc.data();

    // 5. Asegurar que Account tiene holdedContactId
    let holdedContactId = (account as any).external?.holdedContactId;
    if (!holdedContactId) {
      console.log('[Holded Worker] Account missing holdedContactId, creating contact...');
      // v7: ensureHoldedContact espera Account, no Party
      const result = await ensureHoldedContact(account as any);
      holdedContactId = result.id;
      
      // Actualizar Account con holdedContactId
      await db.collection('accounts').doc(String(order.accountId)).update({
        'external.holdedContactId': holdedContactId,
        updatedAt: Timestamp.now().toDate().toISOString(),
      });
    }

    // 6. Preparar líneas de factura
    const invoiceLines = await Promise.all(
      shipment.lines.map(async (line) => {
        // v7: Shipment.lines usa 'sku' + 'qty'
        const itemDoc = await db.collection('items').where('sku', '==', line.sku).limit(1).get();
        const item = itemDoc.empty ? null : (itemDoc.docs[0].data() as Item);
        
        return {
          sku: line.sku,
          name: item?.name || line.sku,
          units: line.qty,
          price: item?.price || 0,
          tax: 21,
          discount: 0,
        };
      })
    );

    // 7. Crear Invoice en Holded
    console.log('[Holded Worker] Creating invoice in Holded for contact:', holdedContactId);
    
    const invoicePayload = {
      contactId: holdedContactId,
      contactName: account?.name || 'Unknown',
      date: (shipment as any).shippedOn || new Date().toISOString(),
      items: invoiceLines,
      notes: `Albarán: ${shipment.id}\n${(shipment as any).meta?.notes || ''}`,
      numSerie: 'A', // Serie por defecto, ajustar según tu config
    };

    const invoice = await callHoldedApi('/documents/invoice', 'POST', invoicePayload);
    
    console.log('[Holded Worker] Invoice created:', invoice.id);

    // 8. Guardar holdedInvoiceId en Order (v7: holded.documentId)
    await db.collection('ordersSellOut').doc(order.id).update({
      'holded.documentId': invoice.id,
      billingStatus: 'INVOICED',
      updatedAt: Timestamp.now().toDate().toISOString(),
    });

    // 9. Guardar holdedInvoiceId en Shipment también
    await db.collection('shipments').doc(shipmentId).update({
      holdedInvoiceId: invoice.id,
      updatedAt: Timestamp.now().toDate().toISOString(),
    });

    // 10. Encolar worker para retirar stock
    await db.collection('jobs').add({
      kind: 'WITHDRAW_STOCK_FROM_SHIPMENT',
      payload: { shipmentId },
      status: 'PENDING',
      createdAt: Timestamp.now(),
      attempts: 0,
    });

    console.log('[Holded Worker] Stock withdrawal job enqueued');

    return {
      ok: true,
      invoiceId: invoice.id,
      shipmentId,
      orderId: order.id,
    };

  } catch (error: any) {
    console.error('[Holded Worker] Error creating invoice:', error);
    
    // Guardar error en dead_letters
    await db.collection('dead_letters').add({
      kind: 'CREATE_HOLDED_INVOICE_FROM_SHIPMENT',
      payload,
      error: error.message,
      stack: error.stack,
      createdAt: Timestamp.now(),
    });

    throw error;
  }
}
