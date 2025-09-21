
import { NextResponse } from 'next/server';
import { fetchInvoices } from '@/features/integrations/holded/service';
import { adminDb } from '@/server/firebaseAdmin';
import type { Account, OrderSellOut } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const db = adminDb;

  try {
    const holdedApiKey = process.env.HOLDED_API_KEY;

    if (!holdedApiKey) {
      return NextResponse.json({ error: 'La API Key de Holded no está configurada en el archivo .env (HOLDED_API_KEY).' }, { status: 400 });
    }

    const invoices = await fetchInvoices(holdedApiKey);
    
    const accountsSnapshot = await db.collection('accounts').get();
    const accounts = accountsSnapshot.docs.map(doc => doc.data() as Account);
    const accountMapByName = new Map(accounts.map(acc => [acc.name.toLowerCase(), acc]));

    const existingOrdersSnapshot = await db.collection('ordersSellOut').get();
    const existingOrderRefs = new Set(existingOrdersSnapshot.docs.map(doc => doc.data().holdedDocId));
    
    let createdCount = 0;
    const batch = db.batch();

    for (const invoice of invoices) {
      const holdedDocId = `holded_${invoice.id}`;
      if (existingOrderRefs.has(holdedDocId)) {
        continue; // Skip already imported invoices
      }

      const account = accountMapByName.get(invoice.contactName.toLowerCase());
      if (!account) {
        console.log(`[Holded Sync] Skipping invoice ${invoice.id}: Account "${invoice.contactName}" not found.`);
        continue;
      }

      const newOrderId = db.collection('ordersSellOut').doc().id;
      const newOrder: OrderSellOut = {
        id: newOrderId,
        accountId: (account as Account).id,
        status: 'paid', // Holded invoices are usually for completed sales
        currency: 'EUR',
        createdAt: new Date(invoice.date * 1000).toISOString(),
        totalAmount: invoice.total,
        source: 'HOLDED',
        holdedDocId: holdedDocId,
        docNumber: invoice.docNumber,
        lines: invoice.items.map(item => ({
          sku: item.sku || 'UNKNOWN',
          qty: item.units,
          uom: 'uds',
          priceUnit: item.price,
        })),
        notes: `Importado de Holded. Factura: ${invoice.docNumber}`,
      };

      const orderRef = db.collection('ordersSellOut').doc(newOrderId);
      batch.set(orderRef, newOrder);
      createdCount++;
    }

    if (createdCount > 0) {
      await batch.commit();
    }
    
    try {
      await db.collection('dev-metadata').doc('integrations').set({ holded: { lastInvoiceSyncAt: new Date().toISOString() } }, { merge: true });
    } catch(e) {
        console.warn("Could not save last sync time for Holded invoices.", e);
    }

    return NextResponse.json({ 
        ok: true, 
        message: `Sincronización completada. ${createdCount} nuevas facturas importadas como pedidos.`,
        invoiceCount: invoices.length,
        created: createdCount,
    });

  } catch (error: any) {
    console.error('[Holded Sync Error]', error);
    return NextResponse.json({ error: 'Fallo al obtener datos de Holded.', details: error.message }, { status: 500 });
  }
}
