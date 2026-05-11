// src/server/actions/shopify-sync.ts
'use server';

import { adminDb as db } from '@/server/firebase';
import { ShopifyClient } from '../integrations/shopify/client';
import type { OrderSellOut, OrderLine } from '@/domain/ssot';

/**
 * Sincroniza pedidos desde Shopify a Firestore
 * Importa pedidos nuevos y actualiza existentes
 */
export async function syncOrdersFromShopify(params?: {
  limit?: number;
  sinceDate?: string;
}) {
  try {
    const client = new ShopifyClient();
    
    // Obtener pedidos de Shopify
    const shopifyOrders = await client.getOrders({
      limit: params?.limit || 50,
      status: 'any',
      created_at_min: params?.sinceDate
    });

    console.log(`[Shopify Sync] Found ${shopifyOrders.length} orders`);

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    for (const shopifyOrder of shopifyOrders) {
      try {
        // Buscar si ya existe en Firestore
        const existingQuery = await db
          .collection('ordersSellOut')
          .where('external.shopifyOrderId', '==', shopifyOrder.id.toString())
          .limit(1)
          .get();

        const alreadyExists = !existingQuery.empty;

        if (alreadyExists) {
          // Actualizar orden existente
          const docId = existingQuery.docs[0].id;
          await db.collection('ordersSellOut').doc(docId).update({
            status: mapShopifyStatusToERP(shopifyOrder.financial_status, shopifyOrder.fulfillment_status),
            'external.shopifyUpdatedAt': shopifyOrder.updated_at,
            updatedAt: new Date().toISOString()
          });
          results.updated++;
        } else {
          // Crear nueva orden
          const erpOrder: Partial<OrderSellOut> = {
            source: 'SHOPIFY',
            channel: 'ONLINE',
            flow: 'DIRECT',
            status: mapShopifyStatusToERP(shopifyOrder.financial_status, shopifyOrder.fulfillment_status),
            totalAmount: parseFloat(shopifyOrder.total_price),
            currency: 'EUR',
            lines: shopifyOrder.line_items.map((item: any): OrderLine => ({
              itemId: item.sku || `shopify-${item.product_id}`,
              sku: item.sku,
              name: item.title,
              qty: item.quantity,
              uom: 'unit',
              priceUnit: parseFloat(item.price)
            })),
            external: {
              shopifyOrderId: shopifyOrder.id.toString()
            },
            createdAt: shopifyOrder.created_at,
            updatedAt: new Date().toISOString()
          };

          // Buscar o crear cuenta del cliente
          const accountId = await findOrCreateAccount(shopifyOrder);
          if (accountId) {
            erpOrder.accountId = accountId;
          }

          await db.collection('ordersSellOut').add(erpOrder);
          results.imported++;
        }
      } catch (error) {
        console.error(`[Shopify Sync] Error processing order ${shopifyOrder.id}:`, error);
        results.errors++;
      }
    }

    console.log('[Shopify Sync] Results:', results);

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('[Shopify Sync] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Actualiza inventario en Shopify cuando hay cambios en el ERP
 */
export async function updateShopifyInventory(itemId: string, quantity: number) {
  try {
    const client = new ShopifyClient();

    // Obtener mapping SKU → Shopify Variant ID
    // TODO: Implementar tabla de mapping en Firestore
    const itemDoc = await db.collection('items').doc(itemId).get();
    const item = itemDoc.data();
    
    if (!item?.external?.shopifyVariantId) {
      console.warn(`[Shopify Sync] No Shopify variant ID for item ${itemId}`);
      return { success: false, error: 'No Shopify mapping' };
    }

    await client.updateInventory(
      parseInt(item.external.shopifyVariantId),
      quantity
    );

    console.log(`[Shopify Sync] Updated inventory for ${itemId}: ${quantity} units`);

    return { success: true };
  } catch (error) {
    console.error('[Shopify Sync] Error updating inventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Marca pedido como fulfilled en Shopify cuando se envía desde el ERP
 */
export async function fulfillShopifyOrder(orderId: string) {
  try {
    // Obtener orden del ERP
    const orderDoc = await db.collection('ordersSellOut').doc(orderId).get();
    const order = orderDoc.data() as OrderSellOut;

    if (!order?.external?.shopifyOrderId) {
      return { success: false, error: 'Order not from Shopify' };
    }

    const client = new ShopifyClient();
    await client.fulfillOrder(parseInt(order.external.shopifyOrderId));

    // Actualizar estado en el ERP
    await db.collection('ordersSellOut').doc(orderId).update({
      status: 'shipped',
      updatedAt: new Date().toISOString()
    });

    console.log(`[Shopify Sync] Fulfilled order ${orderId}`);

    return { success: true };
  } catch (error) {
    console.error('[Shopify Sync] Error fulfilling order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

function mapShopifyStatusToERP(
  financialStatus: string,
  fulfillmentStatus: string | null
): OrderSellOut['status'] {
  // Priority: fulfillment status
  if (fulfillmentStatus === 'fulfilled') return 'shipped';
  if (fulfillmentStatus === 'partial') return 'confirmed';

  // Then: financial status
  if (financialStatus === 'paid') return 'confirmed';
  if (financialStatus === 'pending') return 'open';
  if (financialStatus === 'refunded') return 'cancelled';

  return 'open';
}

async function findOrCreateAccount(shopifyOrder: any): Promise<string | null> {
  try {
    const customerEmail = shopifyOrder.customer?.email || shopifyOrder.email;

    if (!customerEmail) {
      console.warn('[Shopify Sync] No customer email found');
      return null;
    }

    // Buscar cuenta existente por email
    const existingQuery = await db
      .collection('accounts')
      .where('emails', 'array-contains', customerEmail)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return existingQuery.docs[0].id;
    }

    // Crear nueva cuenta
    const newAccount = {
      name: shopifyOrder.customer 
        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`.trim()
        : customerEmail,
      segment: 'ONLINE' as const,
      stage: 'ACTIVA' as const,
      flow: 'DIRECT' as const,
      source: 'SHOPIFY',
      emails: [customerEmail],
      external: {
        shopifyCustomerId: shopifyOrder.customer?.id?.toString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('accounts').add(newAccount);
    console.log(`[Shopify Sync] Created new account ${docRef.id} for ${customerEmail}`);

    return docRef.id;
  } catch (error) {
    console.error('[Shopify Sync] Error finding/creating account:', error);
    return null;
  }
}
