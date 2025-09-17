
import { NextResponse } from 'next/server';
import { fetchInvoices } from '@/features/integrations/holded/service';
import { adminDb } from '@/server/firebaseAdmin';
import type { Account, OrderSellOut } from '@/domain/ssot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const db = adminDb();

  try {
    const secretsSnap = await db.collection('dev-secrets').doc('holded').get();
    const holdedApiKey = secretsSnap.data()?.apiKey;

    if (!holdedApiKey) {
      return NextResponse.json({ error: 'Holded API key no está configurada.' }, { status: 400 });
    }

    const invoices = await fetchInvoices(holdedApiKey);
    
    const accountsSnapshot = await db.collection('accounts').get();
    const accounts = accountsSnapshot.docs.map(doc => doc.data() as Account);
    const accountMapByName = new Map(accounts.map(acc => [acc.name.toLowerCase(), acc]));

    const existingOrdersSnapshot = await db.collection('ordersSellOut').get();
    const existingOrderRefs = new Set(existingOrdersSnapshot.docs.map(doc => doc.data().externalRef));
    
    let createdCount = 0;
    const batch = db.batch();

    for (const invoice of invoices) {
      const externalRef = `holded_${invoice.id}`;
      if (existingOrderRefs.has(externalRef)) {
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
        accountId: account.id,
        status: 'paid', // Holded invoices are usually for completed sales
        currency: 'EUR',
        createdAt: new Date(invoice.date * 1000).toISOString(),
        totalAmount: invoice.total,
        source: 'HOLDED',
        externalRef: externalRef,
        lines: invoice.items.map(item => ({
          sku: item.sku || 'UNKNOWN',
          description: item.name,
          qty: item.units,
          priceUnit: item.price,
          unit: 'uds',
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
    
    await db.collection('dev-secrets').doc('holded').set({ lastSyncAt: new Date().toISOString() }, { merge: true });

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
