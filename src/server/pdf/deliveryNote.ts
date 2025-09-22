

// runtime: Node (no Edge) cuando se use en route/actions
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type DeliveryLine = { sku: string; description: string; qty: number; uom?: string };
export type DeliveryNoteInput = {
  id: string;                          // DN-2025-000123
  dateISO: string;                     // new Date().toISOString()
  orderId: string;
  soldTo: { name: string; vat?: string };
  shipTo: { name: string; address: string; zip: string; city: string; country: string };
  lines: DeliveryLine[];
  notes?: string;
  company: { name: string; vat?: string; address?: string; city?: string; zip?: string; country?: string };
};

export async function renderDeliveryNotePdf(input: DeliveryNoteInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 en puntos
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, opts: any = {}) => {
    page.drawText(text ?? '', {
      x, y,
      size: opts.size ?? 10,
      font: opts.bold ? helvBold : helv,
      color: opts.color ?? rgb(0,0,0),
    });
  };

  // Márgenes
  const left = 40, top = 800, right = 555;
  let y = top;

  // Cabecera empresa
  drawText(input.company.name, left, y, { size: 14, bold: true }); y -= 16;
  if (input.company.vat) { drawText(`CIF: ${input.company.vat}`, left, y); y -= 12; }
  if (input.company.address) { drawText(input.company.address, left, y); y -= 12; }
  const cityLine = [input.company.zip, input.company.city, input.company.country].filter(Boolean).join(' · ');
  if (cityLine) { drawText(cityLine, left, y); y -= 18; }

  // Título documento
  drawText(`ALBARÁN ${input.id}`, left, y, { size: 16, bold: true }); 
  const date = new Date(input.dateISO).toLocaleDateString('es-ES');
  drawText(`Fecha: ${date}`, right - helv.widthOfTextAtSize(`Fecha: ${date}`, 10), y+2);
  y -= 20;
  drawText(`Pedido: ${input.orderId}`, left, y); y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0.8,0.8,0.8) }); y -= 14;

  // Sold-to / Ship-to
  drawText('Cliente', left, y, { bold: true }); 
  drawText('Enviar a', 300, y, { bold: true }); y -= 12;

  drawText(input.soldTo.name, left, y);
  if (input.soldTo.vat) drawText(`CIF: ${input.soldTo.vat}`, left, y-12);

  const shipLines = [
    input.shipTo.name,
    input.shipTo.address,
    `${input.shipTo.zip} ${input.shipTo.city}`,
    input.shipTo.country,
  ].filter(Boolean);
  shipLines.forEach((t, i)=> drawText(t, 300, y - i*12 ));

  y -= (shipLines.length * 12) + 18;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: rgb(0.8,0.8,0.8) }); y -= 12;

  // Tabla líneas
  const headers = ['SKU', 'Descripción', 'Uds', 'Ud.'];
  const colX = [left, left+100, left+420, left+460];
  headers.forEach((h, i) => drawText(h, colX[i], y, { bold: true })); 
  y -= 12;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.7,0.7,0.7) }); y -= 8;

  input.lines.forEach(line => {
    const rowH = 12;
    if (y < 80) { // nueva página si no hay espacio
      y = top;
      doc.addPage(page);
    }
    drawText(line.sku, colX[0], y);
    drawText(line.description ?? '', colX[1], y);
    drawText(String(line.qty), colX[2], y);
    drawText(line.uom ?? 'ud', colX[3], y);
    y -= rowH + 4;
  });

  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.7,0.7,0.7) }); y -= 14;

  if (input.notes) {
    drawText('Notas:', left, y, { bold: true }); y -= 12;
    drawText(input.notes, left, y);
    y -= 14;
  }

  // Firma
  drawText('Recibí conforme:', left, 80);
  page.drawRectangle({ x: left, y: 90, width: 200, height: 0.5, color: rgb(0.7,0.7,0.7) });

  return await doc.save(); // Uint8Array
}

export function toDataUri(bytes: Uint8Array) {
  const b64 = Buffer.from(bytes).toString('base64');
  return `data:application/pdf;base64,${b64}`;
}
