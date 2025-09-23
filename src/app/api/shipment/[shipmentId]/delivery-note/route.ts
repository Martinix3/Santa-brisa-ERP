// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote, Shipment, OrderSellOut, Party } from '@/domain/ssot';

async function generateAndSendPdf(shipment: Shipment, deliveryNote: DeliveryNote) {
  const pdfBytes = await renderDeliveryNotePdf({
    id: deliveryNote.id,
    dateISO: deliveryNote.date,
    orderId: deliveryNote.orderId,
    soldTo: deliveryNote.soldTo,
    shipTo: deliveryNote.shipTo,
    lines: deliveryNote.lines,
    company: deliveryNote.company,
  });

  const nodeBody = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes as Uint8Array);
  return new Response(nodeBody as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="albaran-${shipment.id}.pdf"`,
    },
  });
}


export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ shipmentId: string }> }
): Promise<Response> {
  const { shipmentId } = await ctx.params;

  try {
    const shp = await getOne<Shipment>('shipments', shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    // Idempotency check: if DN already exists, regenerate and return it.
    if (shp.deliveryNoteId) {
      const dn = await getOne<DeliveryNote>('deliveryNotes', shp.deliveryNoteId);
      if (dn) {
        return generateAndSendPdf(shp, dn);
      }
    }

    const order = await getOne<OrderSellOut>('ordersSellOut', shp.orderId);
    const party = await getOne<Party>('parties', shp.partyId);

    const now = new Date().toISOString();
    const dnId = `DN-${now.slice(0,10)}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
    
    const dn: DeliveryNote = {
      id: dnId,
      orderId: shp.orderId,
      shipmentId: shp.id,
      partyId: shp.partyId,
      series: 'B2B',
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
    
    await upsertMany('deliveryNotes', [dn as any]);
    await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now }]);

    return generateAndSendPdf(shp, dn);

  } catch (err) {
    console.error(`Failed to generate delivery note for shipment ${shipmentId}:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
