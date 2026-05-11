// src/app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/server/firebase';
import { syncOrdersFromShopify } from '@/server/actions/shopify-sync';

/**
 * Webhook de Shopify
 * Eventos soportados:
 * - orders/create: Nuevo pedido
 * - orders/updated: Pedido actualizado
 * - orders/paid: Pedido pagado
 * - orders/fulfilled: Pedido enviado
 * - orders/cancelled: Pedido cancelado
 */
export async function POST(request: NextRequest) {
  try {
    const topic = request.headers.get('X-Shopify-Topic');
    const hmac = request.headers.get('X-Shopify-Hmac-SHA256');
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain');

    console.log('[Webhook Shopify] Received:', { topic, shopDomain });

    if (!topic) {
      return NextResponse.json(
        { error: 'Missing X-Shopify-Topic header' },
        { status: 400 }
      );
    }

    // TODO: Verificar HMAC signature para seguridad
    // const isValid = verifyShopifyWebhook(request.body, hmac, process.env.SHOPIFY_API_SECRET);
    // if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const payload = await request.json();

    // Procesar según el tipo de evento
    switch (topic) {
      case 'orders/create':
      case 'orders/updated':
        await handleOrderUpdate(payload);
        break;

      case 'orders/paid':
        await handleOrderPaid(payload);
        break;

      case 'orders/fulfilled':
        await handleOrderFulfilled(payload);
        break;

      case 'orders/cancelled':
        await handleOrderCancelled(payload);
        break;

      default:
        console.log(`[Webhook Shopify] Unhandled topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook Shopify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==================== EVENT HANDLERS ====================

async function handleOrderUpdate(order: any) {
  console.log(`[Webhook Shopify] Order ${order.id} created/updated`);

  // Buscar orden en Firestore
  const ordersQuery = await db
    .collection('ordersSellOut')
    .where('external.shopifyOrderId', '==', order.id.toString())
    .limit(1)
    .get();

  if (ordersQuery.empty) {
    // Nueva orden → sincronizar
    console.log(`[Webhook Shopify] New order ${order.id}, syncing...`);
    await syncOrdersFromShopify({ limit: 1 });
  } else {
    // Orden existente → actualizar
    const docId = ordersQuery.docs[0].id;
    await db.collection('ordersSellOut').doc(docId).update({
      totalAmount: parseFloat(order.total_price),
      updatedAt: new Date().toISOString()
    });
    console.log(`[Webhook Shopify] Updated order ${docId}`);
  }
}

async function handleOrderPaid(order: any) {
  console.log(`[Webhook Shopify] Order ${order.id} paid`);

  const ordersQuery = await db
    .collection('ordersSellOut')
    .where('external.shopifyOrderId', '==', order.id.toString())
    .limit(1)
    .get();

  if (!ordersQuery.empty) {
    const docId = ordersQuery.docs[0].id;
    await db.collection('ordersSellOut').doc(docId).update({
      status: 'confirmed',
      updatedAt: new Date().toISOString()
    });
    console.log(`[Webhook Shopify] Marked order ${docId} as confirmed`);
  }
}

async function handleOrderFulfilled(order: any) {
  console.log(`[Webhook Shopify] Order ${order.id} fulfilled`);

  const ordersQuery = await db
    .collection('ordersSellOut')
    .where('external.shopifyOrderId', '==', order.id.toString())
    .limit(1)
    .get();

  if (!ordersQuery.empty) {
    const docId = ordersQuery.docs[0].id;
    await db.collection('ordersSellOut').doc(docId).update({
      status: 'shipped',
      updatedAt: new Date().toISOString()
    });
    console.log(`[Webhook Shopify] Marked order ${docId} as shipped`);
  }
}

async function handleOrderCancelled(order: any) {
  console.log(`[Webhook Shopify] Order ${order.id} cancelled`);

  const ordersQuery = await db
    .collection('ordersSellOut')
    .where('external.shopifyOrderId', '==', order.id.toString())
    .limit(1)
    .get();

  if (!ordersQuery.empty) {
    const docId = ordersQuery.docs[0].id;
    await db.collection('ordersSellOut').doc(docId).update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    console.log(`[Webhook Shopify] Marked order ${docId} as cancelled`);
  }
}

// ==================== SECURITY ====================

function verifyShopifyWebhook(
  body: string,
  hmac: string | null,
  secret: string | undefined
): boolean {
  if (!hmac || !secret) return false;

  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmac;
}
