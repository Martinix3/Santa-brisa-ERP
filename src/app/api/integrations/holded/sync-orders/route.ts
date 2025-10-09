// src/app/api/integrations/holded/sync-orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import type { Party, Account, OrderSellOut } from '@/domain/ssot.v7';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sincroniza contactos y pedidos desde Holded
 * POST para forzar sincronización
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[Holded Sync] Starting sync...');

    const HOLDED_API_KEY = process.env.HOLDED_API_KEY;
    if (!HOLDED_API_KEY) {
      throw new Error('HOLDED_API_KEY not configured');
    }

    // PASO 1: Obtener contactos de Holded
    console.log('[Holded Sync] Step 1: Fetching contacts from Holded...');
    
    const contactsRes = await fetch(
      'https://api.holded.com/api/invoicing/v1/contacts',
      {
        method: 'GET',
        headers: {
          'key': HOLDED_API_KEY,
          'accept': 'application/json',
        },
      }
    );

    if (!contactsRes.ok) {
      const errorText = await contactsRes.text();
      console.error('[Holded Sync] Contacts API Error:', errorText);
      throw new Error(`Holded Contacts API error ${contactsRes.status}: ${errorText}`);
    }

    const contacts = await contactsRes.json();
    console.log(`[Holded Sync] Found ${contacts.length} contacts`);

    // PASO 2: Obtener facturas de Holded
    console.log('[Holded Sync] Step 2: Fetching invoices from Holded...');
    
    const invoicesRes = await fetch(
      'https://api.holded.com/api/invoicing/v1/documents/invoice',
      {
        method: 'GET',
        headers: {
          'key': HOLDED_API_KEY,
          'accept': 'application/json',
        },
      }
    );

    if (!invoicesRes.ok) {
      const errorText = await invoicesRes.text();
      console.error('[Holded Sync] Invoices API Error:', errorText);
      throw new Error(`Holded Invoices API error ${invoicesRes.status}: ${errorText}`);
    }

    const invoices = await invoicesRes.json();
    console.log(`[Holded Sync] Found ${invoices.length} invoices`);

    let contactsCreated = 0;
    let contactsSkipped = 0;
    let ordersCreated = 0;
    let ordersSkipped = 0;
    const errors: string[] = [];

    // PASO 3: Importar Contactos → Parties + Accounts
    console.log('[Holded Sync] Step 3: Importing contacts...');
    
    for (const contact of contacts) {
      try {
        const existingParty = await db.collection('parties')
          .where('external.holdedContactId', '==', contact.id)
          .limit(1)
          .get();

        if (!existingParty.empty) {
          contactsSkipped++;
          continue;
        }

        const party = await createPartyFromHoldedContact(contact);
        if (!party) {
          errors.push(`No se pudo crear Party para contacto ${contact.id}`);
          continue;
        }

        await findOrCreateAccountForParty(party);
        
        contactsCreated++;
        console.log(`[Holded Sync] Created Party + Account for: ${contact.name}`);

      } catch (err: any) {
        console.error(`[Holded Sync] Error processing contact ${contact.id}:`, err);
        errors.push(`Contact ${contact.id}: ${err.message}`);
      }
    }

    // PASO 4: Importar Facturas → Orders
    console.log('[Holded Sync] Step 4: Importing invoices as orders...');
    
    for (const invoice of invoices) {
      try {
        const existingOrders = await db.collection('ordersSellOut')
          .where('external.holdedInvoiceId', '==', invoice.id)
          .limit(1)
          .get();

        if (!existingOrders.empty) {
          ordersSkipped++;
          continue;
        }

        const party = await findPartyByHoldedContactId(invoice.contactId);
        if (!party) {
          errors.push(`No se encontró Party para contacto ${invoice.contactId}`);
          continue;
        }

        const account = await findAccountByPartyId(party.id);
        if (!account) {
          errors.push(`No se encontró Account para party ${party.id}`);
          continue;
        }

        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const order: OrderSellOut = {
          id: orderId,
          docNumber: invoice.docNumber || `INV-${invoice.id}`,
          accountId: account.id,
          partyId: party.id,
          flow: 'DIRECT',
          status: invoice.status === 'paid' ? 'paid' : 'invoiced',
          billingStatus: invoice.status === 'paid' ? 'paid' : 'invoiced',
          source: 'HOLDED',
          lines: (invoice.items || []).map((item: any) => ({
            itemId: item.sku || item.id,
            name: item.name || item.sku,
            qty: item.units || 1,
            uom: 'unit',
            priceUnit: item.price || 0,
            discountPct: item.discount || 0,
          })),
          totalAmount: invoice.total || 0,
          currency: 'EUR',
          orderDate: invoice.date || new Date().toISOString(),
          notes: invoice.notes,
          external: {
            holdedInvoiceId: invoice.id,
          },
          createdAt: Timestamp.now().toDate().toISOString(),
          updatedAt: Timestamp.now().toDate().toISOString(),
          createdById: 'holded_sync',
        };

        await db.collection('ordersSellOut').doc(orderId).set(order);
        
        console.log(`[Holded Sync] Order created: ${orderId} from invoice ${invoice.id}`);
        ordersCreated++;

      } catch (err: any) {
        console.error(`[Holded Sync] Error processing invoice ${invoice.id}:`, err);
        errors.push(`Invoice ${invoice.id}: ${err.message}`);
      }
    }

    const message = `Sincronización completada: ${contactsCreated} cuentas, ${ordersCreated} pedidos`;
    
    console.log(`[Holded Sync] ${message}`);
    if (errors.length > 0) {
      console.log(`[Holded Sync] Errors:`, errors);
    }

    return NextResponse.json({
      ok: true,
      message,
      stats: {
        contacts: {
          total: contacts.length,
          created: contactsCreated,
          skipped: contactsSkipped,
        },
        orders: {
          total: invoices.length,
          created: ordersCreated,
          skipped: ordersSkipped,
        },
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[Holded Sync] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Crear Party desde un contacto de Holded
 */
async function createPartyFromHoldedContact(contact: any): Promise<Party | null> {
  try {
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
        holdedContactId: contact.id,
        holdedUpdatedAt: contact.updatedAt,
        holdedTags: contact.tags || [],
      },
      roles: ['CUSTOMER'],
      createdAt: Timestamp.now().toDate().toISOString(),
      updatedAt: Timestamp.now().toDate().toISOString(),
    };

    await db.collection('parties').doc(partyId).set(party);
    console.log('[Holded Sync] Party created:', partyId);

    return party;
  } catch (error) {
    console.error('[Holded Sync] Error creating party:', error);
    return null;
  }
}

/**
 * Buscar Party por holdedContactId
 */
async function findPartyByHoldedContactId(holdedContactId: string): Promise<Party | null> {
  const partiesSnap = await db.collection('parties')
    .where('external.holdedContactId', '==', holdedContactId)
    .limit(1)
    .get();

  if (!partiesSnap.empty) {
    return partiesSnap.docs[0].data() as Party;
  }

  return null;
}

/**
 * Buscar Account por partyId
 */
async function findAccountByPartyId(partyId: string): Promise<Account | null> {
  const accountsSnap = await db.collection('accounts')
    .where('partyId', '==', partyId)
    .limit(1)
    .get();

  if (!accountsSnap.empty) {
    return accountsSnap.docs[0].data() as Account;
  }

  return null;
}

/**
 * Buscar Account para esta Party, o crear una nueva
 */
async function findOrCreateAccountForParty(party: Party): Promise<Account> {
  const accountsSnap = await db.collection('accounts')
    .where('partyId', '==', party.id)
    .limit(1)
    .get();

  if (!accountsSnap.empty) {
    return accountsSnap.docs[0].data() as Account;
  }

  const holdedTags = (party.external?.holdedTags || []) as string[];
  const tagsLower = holdedTags.map(t => t.toLowerCase().replace('#', ''));
  
  let segment: string = 'HORECA';
  if (tagsLower.includes('distribuidor')) {
    segment = 'DISTRIBUIDOR';
  } else if (tagsLower.includes('online') || tagsLower.includes('ecommerce')) {
    segment = 'RETAIL';
  } else if (tagsLower.includes('privada') || tagsLower.includes('privado')) {
    segment = 'PRIVADA';
  }
  
  let ownerId = 'auto';
  const comercialTags = ['patxi', 'nico', 'alfonso', 'martin'];
  
  for (const comercial of comercialTags) {
    if (tagsLower.includes(comercial)) {
      const userSnap = await db.collection('users')
        .where('name', '==', comercial.charAt(0).toUpperCase() + comercial.slice(1))
        .limit(1)
        .get();
      
      if (!userSnap.empty) {
        ownerId = userSnap.docs[0].id;
        console.log(`[Holded Sync] Assigned owner ${comercial} to account`);
        break;
      }
    }
  }
  
  if (ownerId === 'auto') {
    const usersSnap = await db.collection('users').where('active', '==', true).limit(1).get();
    ownerId = usersSnap.empty ? 'auto' : usersSnap.docs[0].id;
  }

  const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const account: Account = {
    id: accountId,
    partyId: party.id,
    name: party.name,
    segment: segment as any,
    stage: 'ACTIVA',
    flow: 'DIRECT',
    ownerId: ownerId,
    source: 'HOLDED',
    createdAt: Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now().toDate().toISOString(),
  };

  await db.collection('accounts').doc(accountId).set(account);
  console.log(`[Holded Sync] Account created: ${accountId}, segment: ${segment}, owner: ${ownerId}`);

  return account;
}
