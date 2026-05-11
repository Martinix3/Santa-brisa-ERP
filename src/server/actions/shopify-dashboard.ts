"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { OrderSellOut } from "@/domain/ssot";
import { ShopifyClient } from "@/server/integrations/shopify/client";
import { 
  normalizeShopifyAddresses, 
  buildCustomerEmails, 
  buildCustomerPhones,
  trimRaw,
  normStr
} from "@/server/integrations/shopify/normalize";
import { normalizeDate } from "@/server/integrations/holded/utils";

// ============================================================================
// TYPES
// ============================================================================

interface ShopifyKPIs {
  newToday: number;
  pendingConfirm: number;
  inLogistics: number;
  shipped: number;
}

interface ShopifyOrderView extends OrderSellOut {
  hasShipment: boolean;
  shipmentId?: string;
  shipmentStatus?: string;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Obtiene KPIs de pedidos Shopify
 */
export async function getShopifyKPIs(): Promise<{
  success: boolean;
  kpis?: ShopifyKPIs;
  error?: string;
}> {
  try {
    const ordersSnap = await db
      .collection("ordersSellOut")
      .where("source", "==", "SHOPIFY")
      .get();

    const orders = ordersSnap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as OrderSellOut[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // New today
    const newToday = orders.filter((o) => o.createdAt >= todayStr).length;

    // Pending confirm (status = open)
    const pendingConfirm = orders.filter((o) => o.status === "open").length;

    // In logistics (status = confirmed, pero sin shipped)
    const inLogistics = orders.filter(
      (o) => o.status === "confirmed" && !["shipped", "invoiced", "paid"].includes(o.status)
    ).length;

    // Shipped
    const shipped = orders.filter((o) =>
      ["shipped", "invoiced", "paid"].includes(o.status)
    ).length;

    return {
      success: true,
      kpis: {
        newToday,
        pendingConfirm,
        inLogistics,
        shipped,
      },
    };
  } catch (error: any) {
    console.error("[getShopifyKPIs] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Obtiene lista de pedidos Shopify con info de shipment
 */
export async function getShopifyOrders(filters?: {
  status?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  orders?: ShopifyOrderView[];
  error?: string;
}> {
  try {
    let query: any = db.collection("ordersSellOut").where("source", "==", "SHOPIFY");

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const ordersSnap = await query.orderBy("createdAt", "desc").get();

    const orders = ordersSnap.docs.map((doc: any) => ({
      ...doc.data(),
      id: doc.id,
    })) as OrderSellOut[];

    // Check shipments para cada order
    const ordersWithShipment = await Promise.all(
      orders.map(async (order) => {
        const shipmentSnap = await db
          .collection("shipments")
          .where("orderId", "==", order.id)
          .limit(1)
          .get();

        if (!shipmentSnap.empty) {
          const shipment = shipmentSnap.docs[0].data();
          return {
            ...order,
            hasShipment: true,
            shipmentId: shipmentSnap.docs[0].id,
            shipmentStatus: shipment.status,
          };
        }

        return {
          ...order,
          hasShipment: false,
        };
      })
    );

    return {
      success: true,
      orders: ordersWithShipment as ShopifyOrderView[],
    };
  } catch (error: any) {
    console.error("[getShopifyOrders] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sincroniza pedidos desde Shopify API a Firestore
 */
export async function syncShopifyOrders(params?: {
  limit?: number;
  daysBack?: number;
}): Promise<{
  success: boolean;
  imported?: number;
  updated?: number;
  message?: string;
  errors?: string[];
}> {
  try {
    console.log("[syncShopifyOrders] Starting sync...");

    // Calculate date filter (null = no limit)
    const daysBack = params?.daysBack || null;
    let created_at_min: string | undefined = undefined;
    
    if (daysBack) {
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      created_at_min = date.toISOString();
    }

    // Get orders from Shopify
    const shopifyClient = new ShopifyClient();
    const shopifyOrders = await shopifyClient.getOrders({
      limit: params?.limit || 250,
      ...(created_at_min ? { created_at_min } : {}),
    });

    console.log(`[syncShopifyOrders] Found ${shopifyOrders.length} orders in Shopify`);

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const shopifyOrder of shopifyOrders) {
      try {
        // Check if exists
        const existingSnap = await db
          .collection("ordersSellOut")
          .where("external.shopifyOrderId", "==", shopifyOrder.id.toString())
          .limit(1)
          .get();

        if (!existingSnap.empty) {
          // Update
          const orderId = existingSnap.docs[0].id;
          await db.collection("ordersSellOut").doc(orderId).update({
            status: mapShopifyStatus(shopifyOrder.financial_status, shopifyOrder.fulfillment_status),
            updatedAt: new Date().toISOString(),
          });
          updated++;
        } else {
          // Normalizar direcciones, emails, phones
          const addresses = normalizeShopifyAddresses(shopifyOrder);
          const emails = buildCustomerEmails(shopifyOrder.customer || {});
          const phones = buildCustomerPhones(shopifyOrder.customer || {}, shopifyOrder);
          
          // Buscar o crear Account por email
          let accountId = "";
          if (shopifyOrder.customer?.email) {
            const accountsSnap = await db
              .collection("accounts")
              .where("emails", "array-contains", shopifyOrder.customer.email.toLowerCase())
              .limit(1)
              .get();

            if (!accountsSnap.empty) {
              accountId = accountsSnap.docs[0].id;
              console.log(`[syncShopifyOrders] Found existing account: ${accountId}`);
            } else {
              // Crear nueva cuenta CON normalización completa
              const newAccountRef = db.collection("accounts").doc();
              const customerName = [
                normStr(shopifyOrder.customer.first_name), 
                normStr(shopifyOrder.customer.last_name)
              ].filter(Boolean).join(' ') || shopifyOrder.customer.email;

              const addressBilling = addresses.find(a => a.kind === 'BILLING') ?? addresses[0];
              const addressShipping = addresses.find(a => a.kind === 'SHIPPING');

              await newAccountRef.set({
                id: newAccountRef.id,
                name: customerName,
                emails,
                phones,
                mainContactEmail: emails[0],
                mainContactPhone: phones[0],
                addresses,
                addressBilling,
                addressShipping,
                segment: "ECOMMERCE",
                stage: "ACTIVA",
                ownerId: "SYSTEM",
                flow: "DIRECT",
                customerType: "CLIENTE",
                sourceSystems: ["SHOPIFY"],
                externalIds: {
                  shopifyCustomerId: shopifyOrder.customer.id?.toString(),
                },
                integrations: {
                  shopify: {
                    raw: { customer: trimRaw(shopifyOrder.customer || {}) }
                  }
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              accountId = newAccountRef.id;
              console.log(`[syncShopifyOrders] Created new account: ${accountId}`);
            }
          }

          // Mapear SKUs a itemIds (buscar en catálogo)
          const linesWithItemIds = await Promise.all(
            shopifyOrder.line_items.map(async (item: any) => {
              let itemId = "";
              if (item.sku) {
                const itemSnap = await db
                  .collection("items")
                  .where("sku", "==", item.sku)
                  .limit(1)
                  .get();
                if (!itemSnap.empty) {
                  itemId = itemSnap.docs[0].id;
                }
              }
              return {
                itemId: itemId || item.sku, // Fallback al SKU
                sku: item.sku || "",
                name: item.title,
                qty: item.quantity,
                uom: "unit" as const,
                priceUnit: parseFloat(item.price),
              };
            })
          );

          // Normalizar fechas
          const nd = normalizeDate(shopifyOrder.created_at, true);

          // Create new order con todos los datos + normalización
          const orderRef = db.collection("ordersSellOut").doc();
          await orderRef.set({
            id: orderRef.id,
            source: "SHOPIFY",
            external: {
              shopifyOrderId: shopifyOrder.id.toString(),
              shopifyOrderNumber: shopifyOrder.order_number,
              customerEmail: shopifyOrder.customer?.email,
            },
            docNumber: `#${shopifyOrder.order_number}`,
            accountId: accountId,
            partyId: accountId,
            lines: linesWithItemIds,
            totalAmount: parseFloat(shopifyOrder.total_price),
            currency: shopifyOrder.currency || "EUR",
            status: mapShopifyStatus(shopifyOrder.financial_status, shopifyOrder.fulfillment_status),
            orderDate: shopifyOrder.created_at,
            // Guardar dirección de envío normalizada
            shippingAddress: addresses.find(a => a.kind === 'SHIPPING') || addresses[0],
            // Linkage para matching con Holded (por "Shopify #N")
            linkage: {
              matchedWith: undefined,
              confidence: 'NONE' as const,
              reason: `shopify_order_${shopifyOrder.order_number}`,
            },
            // Integrations raw data
            integrations: {
              shopify: {
                raw: { order: trimRaw(shopifyOrder) }
              }
            },
            // Fechas normalizadas
            importMeta: {
              firstSeenAtUTC: new Date().toISOString(),
              lastSeenAtUTC: new Date().toISOString(),
              source: 'SHOPIFY',
              dayKey: nd.dayKey,
              monthKey: nd.monthKey,
            },
            createdAt: nd.utc,
            updatedAt: new Date().toISOString(),
          });
          imported++;
          console.log(`[syncShopifyOrders] Created order #${shopifyOrder.order_number}`);
        }
      } catch (error: any) {
        console.error(`[syncShopifyOrders] Error processing order ${shopifyOrder.order_number}:`, error);
        errors.push(`Order ${shopifyOrder.order_number}: ${error.message}`);
      }
    }

    revalidatePath("/ventas/shopify");
    revalidatePath("/ventas/pedidos");

    console.log(`[syncShopifyOrders] Complete: ${imported} imported, ${updated} updated`);

    // Auto-link con Holded después de sync
    let linked = 0;
    try {
      const { linkShopifyHoldedOrders } = await import("@/server/actions/link-orders");
      const linkResult = await linkShopifyHoldedOrders();
      if (linkResult.success && linkResult.linked) {
        linked = linkResult.linked;
        console.log(`[syncShopifyOrders] Auto-linked ${linked} orders with Holded`);
      }
    } catch (linkError: any) {
      console.warn(`[syncShopifyOrders] Auto-link failed:`, linkError.message);
    }

    const message = linked > 0
      ? `Sincronización completada: ${imported} nuevos, ${updated} actualizados, ${linked} enlazados con Holded`
      : `Sincronización completada: ${imported} nuevos, ${updated} actualizados`;

    return {
      success: true,
      imported,
      updated,
      message,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("[syncShopifyOrders] Fatal error:", error);
    return {
      success: false,
      message: "Error fatal durante sincronización",
      errors: [error.message],
    };
  }
}

/**
 * Confirma un pedido y crea shipment
 */
export async function confirmShopifyOrder(orderId: string): Promise<{
  success: boolean;
  shipmentId?: string;
  message?: string;
  error?: string;
}> {
  try {
    // Get order
    const orderDoc = await db.collection("ordersSellOut").doc(orderId).get();
    if (!orderDoc.exists) {
      return {
        success: false,
        error: "Pedido no encontrado",
      };
    }

    const order = { ...orderDoc.data(), id: orderDoc.id } as OrderSellOut;

    // Update order status
    await db.collection("ordersSellOut").doc(orderId).update({
      status: "confirmed",
      updatedAt: new Date().toISOString(),
    });

    // Get account info for customer name
    let customerName = "Cliente";
    if (order.accountId) {
      const accountDoc = await db.collection("accounts").doc(order.accountId).get();
      if (accountDoc.exists) {
        customerName = accountDoc.data()?.name || "Cliente";
      }
    }

    // Create shipment con todos los datos del pedido
    const shipmentRef = db.collection("shipments").doc();
    await shipmentRef.set({
      id: shipmentRef.id,
      orderId: order.id,
      accountId: order.accountId,
      partyId: order.partyId || order.accountId,
      status: "pending",
      lines: order.lines.map((line) => ({
        itemId: line.itemId,
        sku: line.sku || "",
        name: line.name || "",
        qty: line.qty,
        uom: line.uom,
      })),
      // Copiar datos completos desde order.shippingAddress (campo nuevo de Shopify)
      customerName: (order as any).shippingAddress?.name || customerName,
      addressLine1: (order as any).shippingAddress?.address1 || "",
      addressLine2: (order as any).shippingAddress?.address2,
      city: (order as any).shippingAddress?.city || "",
      postalCode: (order as any).shippingAddress?.zip || "",
      country: (order as any).shippingAddress?.country || "ES",
      mode: "PARCEL" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/ventas/shopify");
    revalidatePath("/warehouse/logistics");

    return {
      success: true,
      shipmentId: shipmentRef.id,
      message: "Pedido confirmado y envío creado",
    };
  } catch (error: any) {
    console.error("[confirmShopifyOrder] Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapShopifyStatus(
  financial: string,
  fulfillment: string
): OrderSellOut["status"] {
  if (fulfillment === "fulfilled") return "shipped";
  if (financial === "paid") return "confirmed";
  if (financial === "authorized") return "confirmed";
  return "open";
}
