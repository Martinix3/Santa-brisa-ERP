// src/server/integrations/shopify/shopify.webhooks.ts
import crypto from 'crypto';
import { adminDb } from '@/server/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { upsertShopifyOrder } from './upsertShopifyOrder.usecase';

const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;

function verifyShopifyHmac(rawBody: string, hmacHeader?: string | null) {
  if (!hmacHeader) return false;
  const digest = crypto
    .createHmac('sha256', SHOPIFY_SECRET)
    .update(rawBody, 'utf-8')
    .digest('base64');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
  } catch {
    return false;
  }
}

interface WebhookParams {
  rawBody: string;
  hmac: string | null;
  topic: string;
  shop: string;
}

export async function processShopifyWebhook(params: WebhookParams) {
  if (!verifyShopifyHmac(params.rawBody, params.hmac)) {
    console.warn('[Shopify Webhook] Invalid HMAC signature.');
    return { ok: false, error: 'Invalid HMAC signature', status: 401 };
  }

  const payload = JSON.parse(params.rawBody);
  const eventRef = adminDb.collection('integrations').doc('shopify').collection('events').doc(String(payload.id));
  
  const snap = await eventRef.get();
  if (snap.exists && snap.data()?.processedAt) {
    return { ok: true, message: 'Already processed' };
  }

  await eventRef.set({
    topic: params.topic,
    shop: params.shop,
    payload,
    receivedAt: FieldValue.serverTimestamp(),
    status: 'PENDING'
  }, { merge: true });

  try {
    // Aquí es donde se procesa el evento y se convierte en datos del SSOT
    if (params.topic === 'orders/paid' || params.topic === 'orders/create') {
        const { orderId } = await upsertShopifyOrder(payload);
        await eventRef.update({ processedAt: FieldValue.serverTimestamp(), status: 'OK', orderId });
        return { ok: true, message: 'Webhook processed successfully' };
    }
    // ... manejar otros topics
    await eventRef.update({ processedAt: FieldValue.serverTimestamp(), status: 'SKIPPED' });
    return { ok: true, message: 'Topic skipped' };

  } catch (e: any) {
    console.error(`[Shopify Webhook] Error processing event ${payload.id}:`, e);
    await eventRef.update({ processedAt: FieldValue.serverTimestamp(), status: 'ERROR', error: e.message });
    throw e; // Lanza el error para que el endpoint de la API devuelva un 500
  }
}
