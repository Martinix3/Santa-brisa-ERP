// src/app/api/webhooks/shopify/route.ts
import { NextResponse } from 'next/server';
import { processShopifyEvent } from '@/server/integrations/shopify/process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const hmac = req.headers.get('X-Shopify-Hmac-SHA256');
    const topic = req.headers.get('X-Shopify-Topic') || 'unknown';
    const shop = req.headers.get('X-Shopify-Shop-Domain') || 'unknown';

    if (!hmac) {
      return NextResponse.json({ ok: false, error: 'Missing HMAC header' }, { status: 401 });
    }

    const result = await processShopifyEvent({
      rawBody,
      hmac,
      topic,
      shop,
    });

    if (result.ok) {
      return NextResponse.json({ ok: true, message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 400 });
    }
  } catch (e: any) {
    console.error('[Shopify Webhook API] Unhandled error:', e);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
