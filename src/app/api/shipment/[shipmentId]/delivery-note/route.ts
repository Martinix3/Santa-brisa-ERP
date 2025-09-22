// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote } from '@/domain/ssot';

export async function GET(_req: NextRequest, { params }: { params: { shipmentId: string } }) {
  const { shipmentId } = params;

  try {
    const q = await adminDb
      .collection('deliveryNotes')
      .where('shipmentId', '==', shipmentId)
      .limit(1)
      .get();

    if (q.empty) {
      return new NextResponse('Delivery Note not found for this shipment', { status: 404 });
    }

    const deliveryNote = q.docs[0].data() as DeliveryNote;

    const pdfBytes = await renderDeliveryNotePdf({
      id: deliveryNote.id,
      dateISO: deliveryNote.date,
      orderId: deliveryNote.orderId,
      soldTo: deliveryNote.soldTo,
      shipTo: deliveryNote.shipTo,
      lines: deliveryNote.lines,
      company: { name: 'Santa Brisa', vat: 'B00000000' },
    });

    const body: ArrayBuffer = pdfBytes.buffer;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="albaran-${deliveryNote.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error(`Failed to serve delivery note for shipment ${shipmentId}:`, err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
