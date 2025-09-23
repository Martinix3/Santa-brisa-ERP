
import { NextResponse } from 'next/server';
import { verifyShopifyHmac } from '@/server/integrations/shopify/hmac';
import { importSingleShopifyOrder } from '@/server/integrations/shopify/import-order';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get('x-shopify-hmac-sha256');

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.warn('Invalid HMAC signature received for Shopify orders/fulfilled webhook.');
    return new NextResponse('Invalid HMAC', { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    console.log(`Processing orders/fulfilled webhook for Shopify order ID: ${payload.id}`);
    
    // Al re-importar, el estado se actualizará si nuestro mapeo lo contempla.
    // En el futuro, esto podría disparar un worker para sincronizar el estado del envío.
    await importSingleShopifyOrder(String(payload.id));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error processing Shopify orders/fulfilled webhook:', error);
    return new NextResponse(`Webhook processing failed: ${error.message}`, { status: 500 });
  }
}
