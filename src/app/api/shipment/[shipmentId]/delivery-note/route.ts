// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote } from '@/domain/ssot';

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipmentId: string } }
): Promise<Response> {
  const { shipmentId } = params;

  try {
    const q = await adminDb
      .collection('deliveryNotes')
      .where('shipmentId', '==', shipmentId)
      .limit(1)
      .get();

    if (q.empty) {
      return new Response('Delivery Note not found for this shipment', { status: 404 });
    }

    const deliveryNote = q.docs[0].data() as DeliveryNote;

    const pdfBytes = await renderDeliveryNotePdf({
      id: deliveryNote.id,
      dateISO: deliveryNote.date,
      orderId: deliveryNote.orderId,
      soldTo: deliveryNote.soldTo,
      shipTo: {
          name: deliveryNote.shipTo.name,
          address: deliveryNote.shipTo.address,
          zip: deliveryNote.shipTo.zip,
          city: deliveryNote.shipTo.city,
          country: deliveryNote.shipTo.country
      },
      lines: deliveryNote.lines,
      company: { name: 'Santa Brisa', vat: 'B00000000', address: 'C/ Olivos 10', city: 'Madrid', zip: '28010', country: 'España' },
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="albaran-${deliveryNote.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error(`Failed to generate delivery note for shipment ${shipmentId}:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
