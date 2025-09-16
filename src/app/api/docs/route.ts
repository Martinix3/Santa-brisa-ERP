// app/api/docs/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentHtml } from '@/ai/flows/generate-doc-html-flow';
import puppeteer from 'puppeteer';

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

    // 2. Convierte el HTML a PDF usando Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfOptions: import('puppeteer').PDFOptions = {
        format: kind === 'shipping_label' ? 'A6' : 'A4',
        printBackground: true,
        margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm',
        }
    };

    const buffer = await page.pdf(pdfOptions);
    await browser.close();

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
