// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote, Shipment, OrderSellOut, Party } from '@/domain/ssot';
import { bucket } from '@/lib/firebase/admin';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ shipmentId: string }> }
): Promise<Response> {
  const { shipmentId } = await ctx.params;

  try {
    const shp = await getOne<Shipment>('shipments', shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    // Idempotency: If a delivery note already exists and has a URL, redirect to it.
    if (shp.deliveryNoteId) {
      const dn = await getOne<DeliveryNote>('deliveryNotes', shp.deliveryNoteId);
      if (dn?.pdfUrl) {
          return Response.redirect(dn.pdfUrl, 302);
      }
    }

    const order = await getOne<OrderSellOut>('ordersSellOut', shp.orderId);
    const party = await getOne<Party>('parties', shp.partyId);

    const now = new Date().toISOString();
    const dnId = shp.deliveryNoteId ?? `DN-${now.slice(0,10)}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
    
    const dnData: Omit<DeliveryNote, 'pdfUrl'|'createdAt'|'updatedAt'> & { dateISO: string } = {
      id: dnId,
      orderId: shp.orderId,
      shipmentId: shp.id,
      partyId: shp.partyId,
      series: order?.source === 'SHOPIFY' ? 'ONLINE' : 'B2B',
      date: now,
      dateISO: now, // Ensure dateISO is present for the PDF renderer
      soldTo: { name: party?.name ?? shp.customerName ?? 'Cliente', vat: party?.taxId },
      shipTo: {
        name: shp.customerName ?? 'Cliente',
        address: `${shp.addressLine1 ?? ''} ${shp.addressLine2 ?? ''}`.trim(),
        zip: shp.postalCode ?? '', city: shp.city ?? '', country: 'España'
      },
      lines: (shp.lines || []).map((l: Shipment['lines'][number]) => ({
        sku: l.sku, description: l.name ?? l.sku, qty: l.qty, uom: 'uds', lotNumbers: l.lotNumber ? [l.lotNumber] : []
      })),
      company: { name: 'Santa Brisa', vat: 'ESB00000000', address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España' },
    };
    
    const pdfBytes = await renderDeliveryNotePdf(dnData as any);

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
    await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now as any }]);

    return Response.redirect(signedUrl, 302);

  } catch (err) {
    console.error(`Failed to generate delivery note for shipment ${shipmentId}:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
