// src/server/integrations/holded/createInvoice.worker.ts
import { adminDb } from '@/server/firebaseAdmin';
import type { OrderSellOut, Account } from '@/domain/ssot';

async function callHolded(path: string, method: string, body?: any) {
  const HOLDED_API_KEY = process.env.HOLDED_API_KEY!;
  const HOLDED_BASE = 'https://api.holded.com/api';

  const r = await fetch(`${HOLDED_BASE}${path}`, {
    method,
    headers: {
      'X-Api-Key': HOLDED_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!r.ok) {
    throw new Error(`Holded ${method} ${path} -> ${r.status} ${await r.text()}`);
  }
  return r.json();
}

export async function handleCreateHoldedInvoice({ orderId }: { orderId: string }) {
  const orderSnap = await adminDb.collection('ordersSellOut').doc(orderId).get();
  if (!orderSnap.exists) throw new Error(`Order ${orderId} not found`);
  const order = orderSnap.data() as OrderSellOut;

  if (order.external?.holdedInvoiceId) return; // idempotencia
  if (order.billingStatus === 'INVOICED') return;

  const accSnap = await adminDb.collection('accounts').doc(order.accountId).get();
  if (!accSnap.exists) throw new Error(`Account ${order.accountId} for order ${orderId} not found`);
  const acc = accSnap.data() as Account;

  let holdedContactId = acc.external?.holdedContactId;

  if (!holdedContactId) {
    const contact = await callHolded('/invoicing/v1/contacts', 'POST', {
      name: acc.name,
      vat: acc.external?.vat,
    });
    holdedContactId = contact.id;
    await adminDb.collection('accounts').doc(order.accountId).set({
      external: { ...(acc.external || {}), holdedContactId }
    }, { merge: true });
  }

  const lines = (order.lines || []).map((it: any) => ({
    name: it.sku,
    units: it.qty,
    price: it.priceUnit ?? 0,
    // Aquí iría la lógica para mapear impuestos
  }));

  const invoice = await callHolded('/invoicing/v1/documents/invoice', 'POST', {
    contactId: holdedContactId,
    items: lines,
    currency: order.currency || 'EUR',
    date: new Date(order.createdAt).getTime() / 1000,
  });

  await orderSnap.ref.set({
    billingStatus: 'INVOICED',
    external: { ...(order.external || {}), holdedInvoiceId: invoice.id }
  }, { merge: true });
}
