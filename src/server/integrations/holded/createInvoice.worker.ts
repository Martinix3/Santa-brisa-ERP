
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

  if (order.external?.holdedInvoiceId || order.billingStatus === 'INVOICED') return;

  await orderRef.set({ billingStatus: 'INVOICING', updatedAt: Timestamp.now() }, { merge: true });

  if (!order.partyId) throw new Error(`Order ${order.id} is missing partyId`);

  // 1) Party (cliente)
  const partySnap = await db.collection('parties').doc(order.partyId).get();
  if (!partySnap.exists) throw new Error(`Party ${order.partyId} not found`);
  const party = partySnap.data() as Party;

  // 2) Asegurar contacto Holded
  let contactId = party.external?.holdedContactId;
  if (!contactId) {
    const created: any = await callHoldedApi('/contacts', 'POST', {
      name: party.tradeName || party.legalName,
      code: party.vat, // vat -> code en Holded
      email: (party.emails ?? [])[0]?.value,
      address: party.billingAddress?.address,
      city: party.billingAddress?.city,
      postalCode: party.billingAddress?.zip,
      country: party.billingAddress?.countryCode || 'ES',
      type: 'client',
    });
    contactId = created.id;

    // Ensure Party has CUSTOMER role in PartyRole collection
    const partyRolesSnap = await db.collection('partyRoles').where('partyId', '==', order.partyId).where('role', '==', 'CUSTOMER').limit(1).get();
    if (partyRolesSnap.empty) {
        const newRoleRef = db.collection('partyRoles').doc();
        const newRole: PartyRole = {
            id: newRoleRef.id,
            partyId: order.partyId,
            role: 'CUSTOMER',
            isActive: true,
            createdAt: Timestamp.now().toMillis().toString(),
            data: {} as any
        };
        await newRoleRef.set(newRole);
    }
    
    await db.collection('parties').doc(order.partyId).set({
      external: { ...(party.external||{}), holdedContactId: contactId },
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  // 3) Líneas con impuestos
  const itemIds = (order.lines || []).map(l => l.itemId);
  const itemsSnap = await db.collection('items').where('id', 'in', itemIds).get();
  const itemsById = new Map(itemsSnap.docs.map(doc => [doc.id, doc.data() as Item]));

  const items = (order.lines || []).map(l => {
    const itemData = itemsById.get(l.itemId);
    return {
      name: l.name || itemData?.name || l.itemId,
      sku: itemData?.sku,
      units: l.qty,
      price: l.priceUnit,
      tax: l.taxRate ?? 21,
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
    notes: order.notes,
  });

  // 6) Persistir
  await orderRef.set({
    billingStatus: 'INVOICED',
    external: { ...(order.external||{}), holdedInvoiceId: invoice.id },
    updatedAt: Timestamp.now()
  }, { merge: true });
}
