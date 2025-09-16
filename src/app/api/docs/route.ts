// app/api/docs/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentHtml } from '@/ai/flows/generate-doc-html-flow';
import pdf from 'html-pdf';

const validKinds = new Set(['sales_order', 'shipping_label', 'delivery_note']);

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
  }

  const { kind, order, account, products } = payload;

  if (!kind || !order) {
    return new Response(JSON.stringify({ error: 'Payload inválido: falta kind u order' }), { status: 400 });
  }

  if (!validKinds.has(kind)) {
    return new Response(JSON.stringify({ error: `Kind no válido. Usa uno de: ${Array.from(validKinds).join(', ')}` }), { status: 400 });
  }

  try {
    // 1. Llama al flow de Genkit para generar el HTML
    const htmlContent = await generateDocumentHtml({
      kind,
      data: { order, account, products },
    });

    // 2. Convierte el HTML a PDF usando html-pdf
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const pdfOptions: pdf.CreateOptions = {
        format: kind === 'shipping_label' ? 'A6' : 'A4',
        orientation: kind === 'shipping_label' ? 'portrait' : 'portrait',
        border: '1cm',
      };
      
      pdf.create(htmlContent, pdfOptions).toBuffer((err, buffer) => {
        if (err) return reject(err);
        resolve(buffer);
      });
    });

    // 3. Devuelve el buffer del PDF
    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${kind}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('PDF render error:', e);
    return new Response(JSON.stringify({ error: 'No se pudo generar el PDF', details: e.message }), { status: 500 });
  }
}
