// src/server/integrations/holded/createInvoice.worker.ts
import { adminDb as db } from '@/server/firebase';
import type { OrderSellOut, Party, PartyRole, Item } from '@/domain/ssot';
import { callHoldedApi } from './client';
import { Timestamp } from 'firebase-admin/firestore';


export async function handleCreateHoldedInvoice({ orderId }: { orderId: string }) {
  const orderRef = db.collection('ordersSellOut').doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw new Error(`Order ${orderId} not found`);
  const order = snap.data() as OrderSellOut;

  // This worker should only run for DIRECT sales, which have invoices.
  // A check in the queue trigger or here would be wise.

  const accountSnap = await db.collection('accounts').doc(order.accountId).get();
  const account = accountSnap.data();
  if (!account || (account as any).flow === 'PLACEMENT') {
    console.log(`Order ${orderId} belongs to a PLACEMENT account. Skipping Holded invoice creation.`);
    return;
  }
  const partyId = account.partyId;

  if ((order as any).external?.holdedInvoiceId || order.status === 'invoiced') return;

  await orderRef.set({ billingStatus: 'INVOICING', updatedAt: Timestamp.now() }, { merge: true });

  if (!partyId) throw new Error(`Order ${order.id} is missing partyId`);

  // 1) Party (cliente)
  const partySnap = await db.collection('parties').doc(partyId).get();
  if (!partySnap.exists) throw new Error(`Party ${partyId} not found`);
  const party = partySnap.data() as Party;

  // 2) Asegurar contacto Holded
  let contactId = (party as any).external?.holdedContactId;
  if (!contactId) {
    const created: any = await callHoldedApi('/contacts', 'POST', {
      name: party.legalName || 'Unknown Name',
      code: party.taxId,
      email: (party.emails ?? [])[0]?.value,
      address: party.billingAddress?.street,
      city: party.billingAddress?.city,
      postalCode: party.billingAddress?.zip,
      country: (party.billingAddress as any)?.countryCode || 'ES',
      type: 'client',
    });
    contactId = created.id;

    // Ensure Party has CUSTOMER role in PartyRole collection
    const partyRolesSnap = await db.collection('partyRoles').where('partyId', '==', partyId).where('role', '==', 'CUSTOMER').limit(1).get();
    if (partyRolesSnap.empty) {
        const newRoleRef = db.collection('partyRoles').doc();
        const newRole: PartyRole = {
            id: newRoleRef.id,
            partyId: partyId,
            role: 'CUSTOMER',
            isActive: true,
            createdAt: Timestamp.now().toMillis().toString(),
            data: {} as any
        };
        await newRoleRef.set(newRole);
    }
    
    await db.collection('parties').doc(partyId).set({
      external: { ...((party as any).external||{}), holdedContactId: contactId },
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  // 3) Líneas con impuestos
  const itemIds = (order.lines || []).map(l => l.itemId);
  const itemsSnap = itemIds.length ? await db.collection('items').where('id', 'in', itemIds).get() : { docs: [] };
  const itemsById = new Map(itemsSnap.docs.map(doc => [doc.id, doc.data() as Item]));

  const items = (order.lines || []).map(l => {
    const itemData = itemsById.get(l.itemId);
    return {
      name: itemData?.name || l.name,
      sku: itemData?.sku,
      units: l.qty,
      price: l.priceUnit,
      tax: (l as any).taxRate ?? 21,
      discount: l.discountPct ?? 0,
    };
  });

  // 4) Fecha a epoch segundos
  const issuedAtSec = Math.floor((typeof order.createdAt === 'number' ? order.createdAt : new Date(order.createdAt).getTime()) / 1000);

  // 5) Crear factura (idempotencia: customId)
  const invoice: any = await callHoldedApi('/documents/invoice', 'POST', {
    contactId,
    items,
    currency: (order.currency || 'EUR').toUpperCase(),
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
