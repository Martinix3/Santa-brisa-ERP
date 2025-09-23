// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse, type NextRequest } from 'next/server';
import { getOne, upsertMany } from '@/lib/dataprovider/server';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote, Shipment } from '@/domain/ssot';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ shipmentId: string }> }
): Promise<Response> {
  const { shipmentId } = await ctx.params;

  try {
    const shp = await getOne<Shipment>('shipments', shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    const now = new Date().toISOString();
    const dnId = `DN-${now.slice(0, 10)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    const dn: DeliveryNote = {
      id: dnId,
      orderId: shp.orderId,
      shipmentId: shp.id,
      partyId: shp.partyId,
      series: 'B2B',
      date: now,
      soldTo: { name: shp.customerName ?? 'Cliente' },
      shipTo: {
        name: shp.customerName ?? 'Cliente',
        address: `${shp.addressLine1 ?? ''} ${shp.addressLine2 ?? ''}`.trim(),
        zip: shp.postalCode ?? '', city: shp.city ?? '', country: 'ES'
      },
      lines: (shp.lines || []).map((l: Shipment['lines'][number]) => ({
        sku: l.sku, description: l.name ?? l.sku, qty: l.qty, uom: 'uds', lotNumbers: l.lotNumber ? [l.lotNumber] : []
      })),
      company: { name: 'Santa Brisa', vat: 'ESB00000000', address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España' },
      createdAt: now, updatedAt: now,
    };
    
    await upsertMany('deliveryNotes', [dn as any]);
    await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now } as any]);

    const pdfBytes = await renderDeliveryNotePdf({
      id: dn.id,
      dateISO: dn.date,
      orderId: dn.orderId,
      soldTo: dn.soldTo,
      shipTo: dn.shipTo,
      lines: dn.lines,
      company: dn.company
    });

    const nodeBody = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes as Uint8Array);
    return new Response(nodeBody as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="albaran-${shp.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error(`Failed to generate delivery note for shipment ${shipmentId}:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
