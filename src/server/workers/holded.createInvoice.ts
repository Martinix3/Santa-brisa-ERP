// src/server/workers/holded.createInvoice.ts
import { adminDb } from '@/server/firebaseAdmin';
import { callHoldedApi } from '../integrations/holded/client';
import type { OrderSellOut, Account } from '@/domain/ssot';

export async function handleCreateHoldedInvoice({ orderId }: { orderId: string }) {
  const orderSnap = await adminDb.collection('ordersSellOut').doc(orderId).get();
  if (!orderSnap.exists) throw new Error(`Order ${orderId} not found for Holded invoice creation.`);
  const order = orderSnap.data() as OrderSellOut;

  // Idempotency checks
  if (order.external?.holdedInvoiceId) return { message: `Order ${orderId} already has a Holded invoice.` };
  if (order.billingStatus === 'INVOICED') return { message: `Order ${orderId} is already marked as invoiced.` };

  const accSnap = await adminDb.collection('accounts').doc(order.accountId).get();
  if (!accSnap.exists) throw new Error(`Account ${order.accountId} for order ${orderId} not found.`);
  const acc = accSnap.data() as Account;

  let holdedContactId = acc.external?.holdedContactId;

  // Create contact in Holded if it doesn't exist
  if (!holdedContactId) {
    const contact = await callHoldedApi('/invoicing/v1/contacts', 'POST', {
      name: acc.name,
      code: acc.external?.vat, // Assumes VAT/CIF is stored here
    });
    holdedContactId = contact.id;
    await adminDb.collection('accounts').doc(order.accountId).set({
      external: { ...(acc.external || {}), holdedContactId }
    }, { merge: true });
  }

  const invoiceItems = (order.lines || []).map((line) => ({
    name: line.sku,
    units: line.qty,
    price: line.priceUnit,
    // Note: Tax mapping would be required here for a real implementation
  }));

  const invoice = await callHoldedApi('/invoicing/v1/documents/invoice', 'POST', {
    contactId: holdedContactId,
    items: invoiceItems,
    currency: order.currency || 'EUR',
    date: Math.floor(new Date(order.createdAt).getTime() / 1000),
  });

  await orderSnap.ref.update({
    billingStatus: 'INVOICED',
    'external.holdedInvoiceId': invoice.id,
  });

  return { holdedInvoiceId: invoice.id };
}
