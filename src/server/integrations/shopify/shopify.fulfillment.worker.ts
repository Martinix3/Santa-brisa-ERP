
import type { Shipment, OrderSellOut } from '@/domain/ssot';

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP!;

async function shopifyAdmin(path: string, method: string, body?: any) {
  const url = `https://${SHOPIFY_SHOP}/admin/api/2024-07/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Shopify ${method} ${path} -> ${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

type Payload = {
    shipmentId: string;
    shopifyOrderId: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;
};

export async function handleUpdateShopifyFulfillment(payload: Payload) {
  const { shopifyOrderId, trackingNumber, trackingUrl, carrier } = payload;
  
  if (!shopifyOrderId) throw new Error("Missing shopifyOrderId");

  const fulfillmentOrdersData = await shopifyAdmin(`orders/${shopifyOrderId}/fulfillment_orders.json`, 'GET');
  const openFulfillmentOrder = fulfillmentOrdersData.fulfillment_orders.find((fo: any) => fo.status === 'open');

  if (!openFulfillmentOrder) {
    console.warn(`No open fulfillment order for Shopify order ${shopifyOrderId}. It may already be fulfilled.`);
    return { message: "No open fulfillment order." };
  }
  
  const fulfillmentPayload = {
    fulfillment: {
      location_id: openFulfillmentOrder.assigned_location_id,
      tracking_info: {
        number: trackingNumber,
        url: trackingUrl,
        company: carrier,
      },
      line_items_by_fulfillment_order: [
        {
          fulfillment_order_id: openFulfillmentOrder.id
        }
      ],
      notify_customer: true
    }
  };
  
  const fulfillmentResult = await shopifyAdmin('fulfillments.json', 'POST', fulfillmentPayload);

  console.log(`Successfully created fulfillment for Shopify order ${shopifyOrderId}.`);
  return { fulfillmentId: fulfillmentResult.fulfillment.id };
}
