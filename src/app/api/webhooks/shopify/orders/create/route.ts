
import { NextResponse } from 'next/server';
import { verifyShopifyHmac } from '@/server/integrations/shopify/hmac';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get('x-shopify-hmac-sha256');

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.warn('Invalid HMAC signature received for Shopify webhook.');
    return new NextResponse('Invalid HMAC', { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    console.log(`Processing orders/create webhook for Shopify order ID: ${payload.id}`);

    // Reutilizamos la lógica de importación que ya es idempotente
    // y maneja la creación de la Party/Account online y el encolado de jobs.
    await importSingleShopifyOrder(String(payload.id));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error processing Shopify orders/create webhook:', error);
    // Devolvemos un error 500 para que Shopify reintente el webhook.
    return new NextResponse(`Webhook processing failed: ${error.message}`, { status: 500 });
  }
}
