// src/app/api/integrations/holded/webhooks/estimate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Account, OrderSellOut } from '@/domain/ssot.v7';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HoldedEstimateWebhook {
  event: 'estimate.created' | 'estimate.updated';
  data: {
    id: string;
    contactId: string;
    date: string;
    items: Array<{
      sku: string;
      name?: string;
      units: number;
      price: number;
      tax?: number;
      discount?: number;
    }>;
    total?: number;
    notes?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as HoldedEstimateWebhook;
    
    console.log('[Holded Webhook] Estimate received:', payload.event, payload.data.id);

    // Solo procesar estimate.created
    if (payload.event !== 'estimate.created') {
      return NextResponse.json({ ok: true, message: 'Event ignored' });
    }

    const { data } = payload;

    // 1. Buscar o crear Party desde Holded contactId
    const party = await findOrCreatePartyFromHoldedContact(data.contactId);
    
    if (!party) {
      throw new Error(`Could not find or create party for Holded contact: ${data.contactId}`);
    }

    // 2. Buscar o crear Account para esta Party
    const account = await findOrCreateAccountForParty(party);

    // 3. Crear Order en el CRM
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const order: OrderSellOut = {
      id: orderId,
      docNumber: `EST-${data.id}`,
      accountId: account.id,
      partyId: party.id,
      flow: 'DIRECT',
      status: 'confirmed',
      billingStatus: 'pending',
      source: 'HOLDED',
      lines: data.items.map(item => ({
        itemId: item.sku,
        name: item.name || item.sku,
        qty: item.units,
        uom: 'unit',
        priceUnit: item.price,
        discountPct: item.discount || 0,
      })),
      totalAmount: data.total || data.items.reduce((sum, i) => sum + (i.units * i.price), 0),
      currency: 'EUR',
      orderDate: data.date,
      notes: data.notes,
      external: {
        holdedEstimateId: data.id,
      },
      createdAt: Timestamp.now().toDate().toISOString(),
      updatedAt: Timestamp.now().toDate().toISOString(),
      createdById: 'holded_webhook',
    };

    await db.collection('ordersSellOut').doc(orderId).set(order);

    console.log('[Holded Webhook] Order created:', orderId);

    return NextResponse.json({ 
      ok: true, 
      orderId,
      message: 'Order created from Holded estimate' 
    });

  } catch (error: any) {
    console.error('[Holded Webhook] Error processing estimate:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Buscar Party por holdedContactId, o crear una nueva
 */
async function findOrCreatePartyFromHoldedContact(holdedContactId: string): Promise<Party | null> {
  // Buscar por external.holdedContactId
  const partiesSnap = await db.collection('parties')
    .where('external.holdedContactId', '==', holdedContactId)
    .limit(1)
    .get();

  if (!partiesSnap.empty) {
    return partiesSnap.docs[0].data() as Party;
  }

  // Si no existe, intentar obtener de Holded API y crear
  try {
    const contactRes = await fetch(
      `https://api.holded.com/api/invoicing/v1/contacts/${holdedContactId}`,
      {
        headers: {
          'key': process.env.HOLDED_API_KEY!,
          'accept': 'application/json',
        },
      }
    );

    if (!contactRes.ok) {
      console.warn('[Holded] Could not fetch contact:', holdedContactId);
      return null;
    }

    const contact = await contactRes.json();

    // Crear nueva Party
    const partyId = `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const party: Party = {
      id: partyId,
      name: contact.name || 'Unknown',
      kind: 'ORG',
      legalName: contact.tradename || contact.name,
      vat: contact.vatnumber,
      billingAddress: contact.billing ? {
        street: contact.billing.address || '',
        city: contact.billing.city || '',
        zip: contact.billing.postalCode || '',
        province: contact.billing.province,
        country: contact.billing.country || 'España',
      } : undefined,
      emails: contact.email ? [{ value: contact.email, isPrimary: true }] : [],
      phones: contact.mobile ? [{ value: contact.mobile, isPrimary: true }] : [],
      external: {
        holdedContactId: holdedContactId,
        holdedUpdatedAt: contact.updatedAt,
      },
      roles: ['CUSTOMER'],
      createdAt: Timestamp.now().toDate().toISOString(),
      updatedAt: Timestamp.now().toDate().toISOString(),
    };

    await db.collection('parties').doc(partyId).set(party);
    console.log('[Holded] Party created:', partyId);

    return party;
  } catch (error) {
    console.error('[Holded] Error creating party:', error);
    return null;
  }
}

/**
 * Buscar Account para esta Party, o crear una nueva
 */
async function findOrCreateAccountForParty(party: Party): Promise<Account> {
  // Buscar account existente para esta party
  const accountsSnap = await db.collection('accounts')
    .where('partyId', '==', party.id)
    .limit(1)
    .get();

  if (!accountsSnap.empty) {
    return accountsSnap.docs[0].data() as Account;
  }

  // Crear nueva Account
  const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Obtener primer usuario para asignar como owner (o usar 'auto')
  const usersSnap = await db.collection('users').where('active', '==', true).limit(1).get();
  const defaultOwner = usersSnap.empty ? 'auto' : usersSnap.docs[0].id;

  const account: Account = {
    id: accountId,
    partyId: party.id,
    name: party.name,
    segment: 'HORECA', // Por defecto, ajustar según tu lógica
    stage: 'ACTIVA',
    flow: 'DIRECT',
    ownerId: defaultOwner,
    source: 'HOLDED',
    createdAt: Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now().toDate().toISOString(),
  };

  await db.collection('accounts').doc(accountId).set(account);
  console.log('[Holded] Account created:', accountId);

  return account;
}
