// src/server/integrations/holded/createInvoiceFromShipment.worker.ts
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { callHoldedApi } from './client';
import { ensureHoldedContact } from './pushContact';
import type { Shipment, OrderSellOut, Party, Item } from '@/domain/ssot.v7';

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
    if (order.external?.holdedInvoiceId) {
      console.log('[Holded Worker] Order already has invoice:', order.external.holdedInvoiceId);
      return {
        ok: true,
        message: 'Order already invoiced',
        invoiceId: order.external.holdedInvoiceId,
      };
    }

    // 4. Obtener Party
    const partyDoc = await db.collection('parties').doc(order.partyId!).get();
    if (!partyDoc.exists) {
      throw new Error(`Party not found: ${order.partyId}`);
    }
    const party = partyDoc.data() as Party;

    // 5. Asegurar que Party tiene holdedContactId
    let holdedContactId = party.external?.holdedContactId;
    if (!holdedContactId) {
      console.log('[Holded Worker] Party missing holdedContactId, creating contact...');
      const result = await ensureHoldedContact(party);
      holdedContactId = result.id;
      
      // Actualizar Party con holdedContactId
      await db.collection('parties').doc(party.id).update({
        'external.holdedContactId': holdedContactId,
        updatedAt: Timestamp.now().toDate().toISOString(),
      });
    }

    // 6. Preparar líneas de factura
    const invoiceLines = await Promise.all(
      shipment.lines.map(async (line) => {
        // Obtener info del item para precio
        const itemDoc = await db.collection('items').doc(line.itemId).get();
        const item = itemDoc.exists ? (itemDoc.data() as Item) : null;
        
        const priceUnit = item?.priceUnit || item?.priceBase || 0;
        
        return {
          sku: line.itemId,
          name: line.name,
          units: line.qty,
          price: priceUnit,
          tax: 21, // IVA España por defecto
          discount: 0,
        };
      })
    );

    // 7. Crear Invoice en Holded
    console.log('[Holded Worker] Creating invoice in Holded for contact:', holdedContactId);
    
    const invoicePayload = {
      contactId: holdedContactId,
      contactName: party.name,
      date: shipment.shippedAt || new Date().toISOString(),
      items: invoiceLines,
      notes: `Albarán: ${shipment.shipmentNumber || shipmentId}\n${shipment.notes || ''}`,
      numSerie: 'A', // Serie por defecto, ajustar según tu config
      // Opcional: delivery note reference
      ...(shipment.deliveryNoteId && { deliveryNoteId: shipment.deliveryNoteId }),
    };

    const invoice = await callHoldedApi('/documents/invoice', 'POST', invoicePayload);
    
    console.log('[Holded Worker] Invoice created:', invoice.id);

    // 8. Guardar holdedInvoiceId en Order
    await db.collection('ordersSellOut').doc(order.id).update({
      'external.holdedInvoiceId': invoice.id,
      billingStatus: 'invoiced',
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
