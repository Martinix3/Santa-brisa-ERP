// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote, Shipment } from '@/domain/ssot';
import { upsertMany } from '@/lib/dataprovider/actions';
import { getServerData } from '@/lib/dataprovider/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipmentId: string } }
): Promise<Response> {
  const { shipmentId } = params;

  try {
    const data = await getServerData();
    const shp = data.shipments.find(s => s.id === shipmentId);
    if (!shp) return new Response('Shipment not found', { status: 404 });

    const now = new Date().toISOString();
    const dnId = `DN-${now.slice(0, 10)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const party = data.parties.find(p => p.id === shp.partyId);

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
        zip: shp.postalCode ?? '', city: shp.city ?? '', country: 'ES'
      },
      lines: (shp.lines || []).map(l => ({
        sku: l.sku, description: l.name ?? l.sku, qty: l.qty, uom: 'uds', lotNumbers: l.lotNumber ? [l.lotNumber] : []
      })),
      company: { name: 'Santa Brisa', vat: 'ESB00000000', address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España' },
      createdAt: now, updatedAt: now,
    };
    
    await upsertMany('deliveryNotes', [dn] as any);
    await upsertMany('shipments', [{ id: shp.id, deliveryNoteId: dnId, updatedAt: now }]);

    const pdfBytes = await renderDeliveryNotePdf({
      id: dn.id,
      dateISO: dn.date,
      orderId: dn.orderId,
      soldTo: dn.soldTo,
      shipTo: dn.shipTo,
      lines: dn.lines,
      company: dn.company
    });

    const body = new Blob([pdfBytes], { type: 'application/pdf' });
    return new Response(body, {
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
