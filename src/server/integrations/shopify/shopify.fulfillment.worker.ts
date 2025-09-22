// src/server/integrations/shopify/shopify.fulfillment.worker.ts

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP!; // "mi-tienda.myshopify.com"

async function shopifyAdmin(path: string, method: string, body?: any) {
  const url = `https://${SHOPIFY_SHOP}/admin/api/2024-07/${path}`; // Usando una versión de API reciente
  const r = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error(`Shopify ${method} ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

export async function handleUpdateShopifyFulfillment({ shopifyOrderId, trackingNumber, carrier, lineItems }: any) {
  // En una app real, necesitarías el "fulfillment_order_id" para crear un fulfillment
  // Esta es una versión simplificada
  const fulfillmentOrders = await shopifyAdmin(`orders/${shopifyOrderId}/fulfillment_orders.json`, 'GET');
  const openFulfillmentOrder = fulfillmentOrders.fulfillment_orders.find((fo: any) => fo.status === 'open');

  if (!openFulfillmentOrder) {
    console.warn(`No open fulfillment order for Shopify order ${shopifyOrderId}`);
    return;
  }
  
  await shopifyAdmin(`fulfillments.json`, 'POST', {
    fulfillment: {
      location_id: openFulfillmentOrder.assigned_location_id,
      tracking_info: {
        number: trackingNumber,
        company: carrier,
      },
      line_items_by_fulfillment_order: [
        {
          fulfillment_order_id: openFulfillmentOrder.id
        }
      ],
      notify_customer: true
    }
  });
}
