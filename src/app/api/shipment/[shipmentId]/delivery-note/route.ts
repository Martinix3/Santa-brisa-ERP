// src/app/api/shipment/[shipmentId]/delivery-note/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import { renderDeliveryNotePdf } from '@/server/pdf/deliveryNote';
import type { DeliveryNote } from '@/domain/ssot';

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  const { shipmentId } = params;

  try {
    const deliveryNoteQuery = await adminDb.collection('deliveryNotes').where('shipmentId', '==', shipmentId).limit(1).get();
    
    if (deliveryNoteQuery.empty) {
        // Fallback: intentar generar uno si no existe (opcional) o devolver 404
        return new NextResponse('Delivery Note not found for this shipment', { status: 404 });
    }
    
    const deliveryNote = deliveryNoteQuery.docs[0].data() as DeliveryNote;

    const pdfBytes = await renderDeliveryNotePdf({
        id: deliveryNote.id,
        dateISO: deliveryNote.date,
        orderId: deliveryNote.orderId,
        soldTo: deliveryNote.soldTo,
        shipTo: deliveryNote.shipTo,
        lines: deliveryNote.lines,
        company: { name: 'Santa Brisa', vat: 'B00000000' }
    });
    
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="albaran-${deliveryNote.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error(`Failed to generate delivery note for shipment ${shipmentId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
