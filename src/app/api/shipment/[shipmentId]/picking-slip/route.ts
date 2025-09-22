// src/app/api/shipment/[shipmentId]/picking-slip/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/server/firebaseAdmin';
import type { Shipment, OrderSellOut, Party } from '@/domain/ssot';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function renderPickingSlipPdf(shipment: Shipment, order?: OrderSellOut, party?: Party): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, size = 10, isBold = false) => {
    page.drawText(text, { x, y, font: isBold ? boldFont : font, size });
  };
  
  let y = height - 50;

  // Header
  drawText('Hoja de Picking', 50, y, 18, true);
  drawText(`Envío: ${shipment.id}`, 50, y - 20, 12);
  drawText(`Fecha: ${new Date(shipment.createdAt).toLocaleDateString('es-ES')}`, width - 150, y, 12);
  y -= 50;

  // Customer Info
  drawText('Cliente y Dirección de Envío', 50, y, 12, true);
  y -= 15;
  drawText(shipment.customerName, 50, y);
  y -= 15;
  if(shipment.addressLine1) {
    drawText(shipment.addressLine1, 50, y);
    y -= 15;
  }
  drawText(`${shipment.postalCode || ''} ${shipment.city}, ${shipment.country || 'España'}`, 50, y);
  y -= 30;

  // Lines Header
  drawText('SKU', 50, y, 10, true);
  drawText('Producto', 150, y, 10, true);
  drawText('Cantidad', 350, y, 10, true);
  drawText('Lote Asignado', 420, y, 10, true);
  y -= 5;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }});
  y -= 15;

  // Lines
  for (const line of shipment.lines) {
    drawText(line.sku, 50, y, 10);
    drawText(line.name, 150, y, 10);
    drawText(String(line.qty), 360, y, 10);
    // Draw an empty box for lot number
    page.drawRectangle({
        x: 420,
        y: y - 2,
        width: 120,
        height: 14,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
    });
    y -= 25;
  }
  y -= 10;
  
  // Checks section
  drawText('Verificaciones de Almacén', 50, y, 12, true);
  y -= 20;

  // Visual Check
  page.drawRectangle({ x: 50, y, width: 12, height: 12, borderColor: rgb(0,0,0), borderWidth: 1 });
  drawText('Inspección Visual OK', 70, y, 10);
  y -= 20;

  // Notes
  drawText('Notas / Incidencias:', 50, y, 10, true);
  y -= 15;
  page.drawRectangle({ x: 50, y, width: width - 100, height: 60, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
  y -= 70;
  
  // Signatures
  drawText('Preparado por:', 50, y, 10, true);
  page.drawLine({ start: { x: 120, y: y-2 }, end: { x: 280, y: y-2 }, thickness: 0.5 });
  drawText('Revisado por:', 320, y, 10, true);
  page.drawLine({ start: { x: 390, y: y-2 }, end: { x: width - 50, y: y-2 }, thickness: 0.5 });

  return doc.save();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  const { shipmentId } = params;

  try {
    const shipmentSnap = await adminDb.collection('shipments').doc(shipmentId).get();
    if (!shipmentSnap.exists) {
      return new NextResponse('Shipment not found', { status: 404 });
    }
    const shipment = shipmentSnap.data() as Shipment;

    const pdfBytes = await renderPickingSlipPdf(shipment);
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="picking-slip-${shipmentId}.pdf"`,
      },
    });

  } catch (error) {
    console.error(`Failed to generate picking slip for shipment ${shipmentId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
