
// src/app/api/webhooks/shopify/orders/paid/route.ts
import { NextResponse } from 'next/server';
import { verifyShopifyHmac } from '@/server/integrations/shopify/hmac';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get('x-shopify-hmac-sha256');

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.warn('Invalid HMAC signature received for Shopify orders/paid webhook.');
    return new NextResponse('Invalid HMAC', { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    console.log(`Processing orders/paid webhook for Shopify order ID: ${payload.id}`);

    // La función de importación es idempotente y actualizará el estado del pedido.
    await importSingleShopifyOrder(String(payload.id));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error processing Shopify orders/paid webhook:', error);
    return new NextResponse(`Webhook processing failed: ${error.message}`, { status: 500 });
  }
}
