// src/server/integrations/holded/createInvoice.worker.ts
import { adminDb as db } from '@/server/firebase';
import type { OrderSellOut, Item } from '@/domain/ssot';
import { callHoldedApi } from './client';
import { Timestamp } from 'firebase-admin/firestore';


export async function handleCreateHoldedInvoice({ orderId }: { orderId: string }) {
  const orderRef = db.collection('ordersSellOut').doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw new Error(`Order ${orderId} not found`);
  const order = snap.data() as OrderSellOut;

  // This worker should only run for DIRECT sales, which have invoices.
  // A check in the queue trigger or here would be wise.

  const accountSnap = await db.collection('accounts').doc(String(order.accountId)).get();
  const account = accountSnap.data();
  if (!account || (account as any).flow === 'COLOCACION') {
    console.log(`Order ${orderId} belongs to a PLACEMENT account. Skipping Holded invoice creation.`);
    return;
  }
  if ((order as any).holded?.documentId) return;

  await orderRef.set({ billingStatus: 'INVOICING', updatedAt: Timestamp.now() }, { merge: true });

  // v7: sin Party. Usamos contactId directo desde Account.external
  let contactId = (account as any).external?.holdedContactId;
  if (!contactId) {
    const created: any = await callHoldedApi('/contacts', 'POST', {
      name: account.name || 'Unknown Name',
      code: (account as any).taxId,
      email: (account as any).email,
      address: (account as any).billingAddress?.street,
      city: (account as any).billingAddress?.city,
      postalCode: (account as any).billingAddress?.postalCode,
      country: (account as any).billingAddress?.countryCode || 'ES',
      type: 'client',
    });
    contactId = created.id;
    
    await db.collection('accounts').doc(String(order.accountId)).set({
      external: { ...(account.external||{}), holdedContactId: contactId },
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  // 3) Líneas con impuestos
  const skus = (order.lines || []).map(l => l.sku);
  const itemsSnap = skus.length ? await db.collection('items').where('sku', 'in', skus).get() : { docs: [] };
  const itemsById = new Map(itemsSnap.docs.map(doc => [doc.id, doc.data() as Item]));

  const items = (order.lines || []).map(l => {
    const itemData = itemsById.get(l.sku);
    return {
      name: itemData?.name,
      sku: l.sku,
      units: l.qty,
      price: l.unitPrice ?? itemData?.price ?? 0,
      tax: (l as any).taxRate ?? 21,
      discount: 0,
    };
  });

  // 4) Fecha a epoch segundos
  const issuedAtSec = Math.floor((typeof order.createdAt === 'number' ? order.createdAt : new Date(order.createdAt).getTime()) / 1000);

  // 5) Crear factura (idempotencia: customId)
  const invoice: any = await callHoldedApi('/documents/invoice', 'POST', {
    contactId,
    items,
    currency: 'EUR',
    date: issuedAtSec,
    customId: orderId, // ← evita duplicados si reintenta
    notes: (order as any).notes,
  });

  // 6) Persistir
  await orderRef.set({
    status: 'invoiced',
    invoiceId: invoice.id,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
