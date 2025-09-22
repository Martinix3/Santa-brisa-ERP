// src/server/workers/shopify.fulfillment.ts
import { adminDb } from '@/server/firebaseAdmin';
// A real implementation would have a robust Shopify client
// This is a placeholder for the logic.

async function shopifyAdminApi(path: string, method: 'GET' | 'POST', body?: any) {
    const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
    const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
    if (!SHOPIFY_TOKEN || !SHOPIFY_SHOP) {
        throw new Error("Shopify credentials not configured.");
    }
    const url = `https://${SHOPIFY_SHOP}/admin/api/2024-07/${path}`;
    const res = await fetch(url, {
        method,
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        throw new Error(`Shopify API Error: ${res.status} ${await res.text()}`);
    }
    return res.json();
}


export async function handleUpdateShopifyFulfillment({ shopifyOrderId, trackingNumber, carrier, trackingUrl, lineItems }: {
    shopifyOrderId: string;
    trackingNumber: string;
    carrier: string;
    trackingUrl?: string;
    lineItems: { shopifyLineItemId: string; qty: number }[];
}) {
    if (!shopifyOrderId) throw new Error("Missing shopifyOrderId");

    // 1. Find the fulfillment order IDs for the order
    const fulfillmentOrdersData = await shopifyAdminApi(`orders/${shopifyOrderId}/fulfillment_orders.json`, 'GET');
    const openFulfillmentOrder = fulfillmentOrdersData.fulfillment_orders.find((fo: any) => fo.status === 'open');

    if (!openFulfillmentOrder) {
        console.warn(`No open fulfillment order found for Shopify order ${shopifyOrderId}. It may already be fulfilled.`);
        return { message: "No open fulfillment order." };
    }
    
    // 2. Create the fulfillment
    const fulfillmentPayload = {
        fulfillment: {
            location_id: openFulfillmentOrder.assigned_location_id,
            tracking_info: {
                number: trackingNumber,
                url: trackingUrl,
                company: carrier,
            },
            line_items_by_fulfillment_order: [{
                fulfillment_order_id: openFulfillmentOrder.id,
                // If you need to fulfill specific items, you'd map them here.
                // For simplicity, we fulfill all items in the fulfillment order.
            }],
            notify_customer: true,
        }
    };
    
    const fulfillmentResult = await shopifyAdminApi('fulfillments.json', 'POST', fulfillmentPayload);

    console.log(`Successfully created fulfillment for Shopify order ${shopifyOrderId}.`);
    return { fulfillmentId: fulfillmentResult.fulfillment.id };
}
