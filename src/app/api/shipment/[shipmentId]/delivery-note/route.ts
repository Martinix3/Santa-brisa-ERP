// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote, Shipment, OrderSellOut, Party } from '@/domain/ssot';
import { bucket } from '@/lib/firebase/admin';

async function generateAndSendPdf(shp: Shipment, dn: DeliveryNote) {
  // Regenerate PDF bytes from stored metadata
  const pdfBytes = await renderDeliveryNotePdf({
    id: dn.id,
    dateISO: dn.date,
    orderId: dn.orderId,
    soldTo: dn.soldTo,
    shipTo: dn.shipTo,
    lines: dn.lines,
    company: dn.company,
  });

  // If there's a stored URL and we trust it, we can just redirect.
  // For this example, we'll assume we might need to regenerate/re-upload if something changed.
  
  const filePath = `delivery-notes/${dn.id}.pdf`;
  const file = bucket().file(filePath);

  // Re-upload to ensure consistency
  await file.save(Buffer.from(pdfBytes), {
    contentType: 'application/pdf',
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '9999-12-31',
  });

  // Update the stored URL in case it changes (unlikely with this config)
  await upsertMany('deliveryNotes', [{ id: dn.id, pdfUrl: signedUrl }]);

  return Response.redirect(signedUrl, 302);
}


export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ shipmentId: string }> }
): Promise<Response> {
  const { shipmentId } = await ctx.params;

  try {
    const shp = await getOne<Shipment>('shipments', shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    // Idempotency check: if DN already exists, use its URL or regenerate.
    if (shp.deliveryNoteId) {
      const dn = await getOne<DeliveryNote>('deliveryNotes', shp.deliveryNoteId);
      if (dn?.pdfUrl) {
          return Response.redirect(dn.pdfUrl, 302);
      }
      if (dn) {
        return generateAndSendPdf(shp, dn);
      }
    }

    const order = await getOne<OrderSellOut>('ordersSellOut', shp.orderId);
    const party = await getOne<Party>('parties', shp.partyId);

    const now = new Date().toISOString();
    const dnId = `DN-${now.slice(0,10)}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
    
    const dnData: Omit<DeliveryNote, 'pdfUrl'> = {
      id: dnId,
      orderId: shp.orderId,
      shipmentId: shp.id,
      partyId: shp.partyId,
      series: order?.source === 'SHOPIFY' ? 'ONLINE' : 'B2B',
      date: now,
      soldTo: { name: party?.name ?? shp.customerName ?? 'Cliente', vat: party?.vat },
      shipTo: {
        name: shp.customerName ?? 'Cliente',
        address: `${shp.addressLine1 ?? ''} ${shp.addressLine2 ?? ''}`.trim(),
        zip: shp.postalCode ?? '', city: shp.city ?? '', country: 'España'
      },
      lines: (shp.lines || []).map((l: Shipment['lines'][number]) => ({
        sku: l.sku, description: l.name ?? l.sku, qty: l.qty, uom: 'uds', lotNumbers: l.lotNumber ? [l.lotNumber] : []
      })),
      company: { name: 'Santa Brisa', vat: 'ESB00000000', address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España' },
      createdAt: now, updatedAt: now,
    };
    
    const pdfBytes = await renderDeliveryNotePdf(dnData as DeliveryNote);

    const filePath = `delivery-notes/${dnId}.pdf`;
    const file = bucket().file(filePath);
    await file.save(Buffer.from(pdfBytes), {
        contentType: 'application/pdf',
        resumable: false,
    });
    
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '9999-12-31',
    });

    await upsertMany('deliveryNotes', [{ ...dnData, pdfUrl: signedUrl } as any]);
    await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now }]);

    return Response.redirect(signedUrl, 302);

  } catch (err) {
    console.error(`Failed to generate delivery note for shipment ${shipmentId}:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
