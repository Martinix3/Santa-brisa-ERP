// src/app/api/docs/route.ts
import { NextResponse } from 'next/server';
import { generateDocumentHtml } from '@/ai/flows/generate-doc-html-flow';
import type { DocumentHtmlInput } from '@/ai/flows/generate-doc-html-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as DocumentHtmlInput;

        if (!body.kind || !body.data) {
            return new NextResponse(JSON.stringify({ error: 'Faltan los parámetros "kind" o "data".' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const html = await generateDocumentHtml(body);
        
        return new NextResponse(html, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error: any) {
        console.error('[API Docs Error]', error);
        return new NextResponse(JSON.stringify({ error: 'Fallo al generar el documento HTML.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
