// src/server/actions/holded-orders-sync.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { OrderSellOut, Account } from "@/domain/ssot";
import { HoldedClient } from "@/server/integrations/holded/client";
import { holdedEpochToIsoUTC, normalizeDate } from "@/server/integrations/holded/utils";
import {
  normalizeHoldedAddresses,
  buildEmails,
  buildPhones,
  normStr,
  trimRaw,
} from "@/server/integrations/holded/normalize";

const holdedClient = new HoldedClient();

// ============================================================================
// TYPES
// ============================================================================

interface HoldedSalesOrder {
  id: string;
  docNumber: string;
  contactId?: string;
  contact?: string;
  contactName?: string;
  date: string | number;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  total: number;
  currency: string;
  lines: {
    name: string;
    units: number;
    price: number;
    tax: number;
  }[];
  notes?: string;
  erpOrderId?: string;
  updatedAt: number;
  createdAt: number;
}

interface SyncResult {
  success: boolean;
  ordersImported?: number;
  ordersExported?: number;
  ordersMerged?: number;
  ordersSkipped?: number;
  accountsHydrated?: number;
  shadowAccountsCreated?: number;
  errors?: string[];
  message?: string;
}

// ============================================================================
// HELPERS: Índice de Accounts por holdedId
// ============================================================================

async function buildAccountsIndexByHoldedId(): Promise<Record<string, string>> {
  const accountsSnap = await db.collection("accounts").get();
  const index: Record<string, string> = {};
  
  accountsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const holdedId = data.holdedId;
    if (holdedId) {
      index[String(holdedId)] = doc.id;
    }
  });
  
  console.log(`[buildAccountsIndex] Built index with ${Object.keys(index).length} accounts`);
  return index;
}

// ============================================================================
// HELPERS: Mapper de Contact Holded → Account
// ============================================================================

function mapHoldedContactToAccount(contact: any): any {
  const addresses = normalizeHoldedAddresses(contact);
  const emails = buildEmails(contact);
  const phones = buildPhones(contact);
  
  const taxId = normStr(contact.taxId) ?? 
                normStr(contact.vatNumber) ?? 
                normStr(contact.nif) ?? 
                normStr(contact.cif);
  
  const isPerson = !!contact.isperson || contact.person === true;
  
  const addressBilling = addresses.find(a => a.kind === 'BILLING') ?? addresses[0];
  const addressShipping = addresses.find(a => a.kind === 'SHIPPING');

  return {
    name: normStr(contact.name) ?? normStr(contact.legalName) ?? normStr(contact.fullName) ?? 'Sin nombre',
    addresses,
    addressBilling,
    addressShipping,
    emails,
    phones,
    mainContactEmail: emails[0],
    mainContactPhone: phones[0],
    taxId,
    isPerson,
    holdedId: String(contact.id ?? contact._id),
    holdedType: contact.type,
    syncedFromHolded: true,
    lastSyncAt: new Date().toISOString(),
    segment: "HORECA",
    stage: "ACTIVA",
    integrations: {
      holded: {
        raw: { contact: trimRaw(contact) }
      }
    },
  };
}

// ============================================================================
// HELPERS: Crear Party desde Contact Holded
// ============================================================================

async function createPartyFromHolded(contact: any): Promise<string> {
  const addresses = normalizeHoldedAddresses(contact);
  const emails = buildEmails(contact);
  const phones = buildPhones(contact);
  
  const addressBilling = addresses.find(a => a.kind === 'BILLING') ?? addresses[0];
  const addressShipping = addresses.find(a => a.kind === 'SHIPPING');
  
  const taxId = normStr(contact.taxId) ?? 
                normStr(contact.vatNumber) ?? 
                normStr(contact.nif) ?? 
                normStr(contact.cif);
  
  const isPerson = !!contact.isperson || contact.person === true;
  
  const partyRef = db.collection("parties").doc();
  
  const createdAtUTC = holdedEpochToIsoUTC(contact.createdAt) ?? new Date().toISOString();
  
  await partyRef.set({
    id: partyRef.id,
    name: normStr(contact.name) ?? 'Sin nombre',
    kind: isPerson ? "PERSON" : "ORG",
    vat: taxId,
    taxId,
    code: normStr(contact.code),
    billingAddress: addressBilling ? {
      street: addressBilling.street,
      city: addressBilling.city,
      zip: addressBilling.postalCode,
      postalCode: addressBilling.postalCode,
      province: addressBilling.province,
      country: addressBilling.country || "España",
      countryCode: addressBilling.countryCode,
    } : undefined,
    shippingAddress: addressShipping ? {
      street: addressShipping.street,
      city: addressShipping.city,
      zip: addressShipping.postalCode,
      postalCode: addressShipping.postalCode,
      province: addressShipping.province,
      country: addressShipping.country || "España",
      countryCode: addressShipping.countryCode,
    } : undefined,
    emails: emails.map(e => ({ value: e, isPrimary: e === emails[0] })),
    phones: phones.map(p => ({ value: p, isPrimary: p === phones[0] })),
    website: normStr(contact.website),
    notes: normStr(contact.notes) ?? normStr(contact.obs),
    tags: contact.tags || [],
    roles: contact.type === 1 ? ["CUSTOMER"] : contact.type === 2 ? ["SUPPLIER"] : ["CUSTOMER", "SUPPLIER"],
    external: {
      holdedContactId: contact.id,
      holdedType: contact.type,
      holdedCode: normStr(contact.code),
      holdedTags: contact.tags || [],
      holdedCreatedAt: createdAtUTC,
      holdedUpdatedAt: holdedEpochToIsoUTC(contact.updatedAt) ?? new Date().toISOString(),
    },
    createdAt: createdAtUTC,
    updatedAt: new Date().toISOString(),
  });
  
  return partyRef.id;
}

// ============================================================================
// MAIN FUNCTION: Importar Orders desde Holded
// ============================================================================

export async function importOrdersFromHolded(): Promise<SyncResult> {
  try {
    console.log("[importOrdersFromHolded] Starting import...");

    // 1. Construir índice de accounts
    const accountsByHoldedId = await buildAccountsIndexByHoldedId();
    
    // 2. Obtener pedidos de Holded
    const holdedOrders = await holdedClient.getDocuments('salesorder');
    
    if (!holdedOrders || holdedOrders.length === 0) {
      console.log("[importOrdersFromHolded] No orders found in Holded");
      return {
        success: true,
        ordersImported: 0,
        message: "No hay pedidos en Holded para importar",
      };
    }
    console.log(`[importOrdersFromHolded] Found ${holdedOrders.length} orders in Holded`);

    let imported = 0;
    let skipped = 0;
    let hydrated = 0;
    let shadows = 0;
    const errors: string[] = [];

    // 3. Procesar cada pedido
    for (const doc of holdedOrders) {
      try {
        // Resolver contactId con múltiples alias
        const contactId = String(
          (doc as any).contact ??
          (doc as any).contactId ??
          (doc as any).contact_id ??
          (doc as any).customer ??
          ''
        ).trim();
        
        const contactName = normStr(
          (doc as any).contactName ?? 
          (doc as any).customerName ?? 
          (doc as any).name
        );

        // Resolver/crear accountId
        let accountId = contactId ? accountsByHoldedId[contactId] : undefined;
        
        // Si no existe y hay contactId, hidratar desde Holded
        if (!accountId && contactId) {
          console.log(`[importOrdersFromHolded] ${doc.docNumber}: Hydrating account for contact ${contactId}`);
          try {
            const contact = await holdedClient.getContactById(contactId);
            if (contact) {
              // Crear party primero
              const partyId = await createPartyFromHolded(contact);
              
              // Crear account
              const accountRef = db.collection("accounts").doc();
              const createdAtUTC = holdedEpochToIsoUTC(contact.createdAt) ?? new Date().toISOString();
              
              await accountRef.set({
                id: accountRef.id,
                partyId,
                ...mapHoldedContactToAccount(contact),
                ownerId: "SYSTEM",
                flow: "DIRECT",
                customerType: "CLIENTE",
                createdAt: createdAtUTC,
                updatedAt: new Date().toISOString(),
              });
              
              accountId = accountRef.id;
              accountsByHoldedId[contactId] = accountId;
              hydrated++;
              console.log(`[importOrdersFromHolded] ✅ Hydrated account ${accountId} from contact ${contactId}`);
            }
          } catch (e: any) {
            console.warn(`[importOrdersFromHolded] ⚠️ Failed to hydrate contact ${contactId}:`, e.message);
          }
        }
        
        // Si aún no hay accountId, crear shadow account
        if (!accountId) {
          const shadowId = `holded-shadow-${doc.docNumber}`;
          console.log(`[importOrdersFromHolded] ${doc.docNumber}: Creating shadow account ${shadowId}`);
          
          // Crear party shadow
          const partyRef = db.collection("parties").doc();
          await partyRef.set({
            id: partyRef.id,
            name: contactName || `Cliente Desconocido (${doc.docNumber})`,
            kind: "ORG",
            roles: ["CUSTOMER"],
            notes: `Shadow account creada automáticamente para pedido ${doc.docNumber}. Requiere enlace manual.`,
            tags: ["SHADOW", "PENDIENTE_ENLACE"],
            external: {
              holdedOrderNumber: doc.docNumber,
              source: "HOLDED_ORDER_IMPORT",
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          
          // Crear account shadow
          const accountRef = db.collection("accounts").doc(shadowId);
          await accountRef.set({
            id: shadowId,
            partyId: partyRef.id,
            name: contactName || `Cliente Desconocido (${doc.docNumber})`,
            segment: "HORECA",
            stage: "PENDIENTE_ENLACE",
            ownerId: "SYSTEM",
            flow: "DIRECT",
            customerType: "CLIENTE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          
          accountId = shadowId;
          shadows++;
          console.log(`[importOrdersFromHolded] ⚠️ Created shadow account ${shadowId}`);
        }

        // Normalizar fechas
        const createdAtISO = typeof doc.date === 'number' 
          ? holdedEpochToIsoUTC(doc.date) ?? new Date().toISOString()
          : doc.date;
        const nd = normalizeDate(createdAtISO, true);

        // Crear order
        const orderRef = db.collection("ordersSellOut").doc();
        await orderRef.set({
          id: orderRef.id,
          docNumber: doc.docNumber,
          accountId,
          status: doc.status === 'sent' || doc.status === 'accepted' ? 'confirmed' : 'open',
          lines: (doc.lines || []).map((line: any) => ({
            itemId: '',
            name: line.name,
            qty: line.units,
            uom: 'unit' as const,
            priceUnit: line.price,
          })),
          totalAmount: doc.total,
          currency: doc.currency || 'EUR',
          source: 'HOLDED' as const,
          notes: doc.notes,
          external: {
            holdedEstimateId: doc.id,
          },
          holdedOrderId: doc.id,
          syncedToHolded: true,
          lastSyncAt: new Date().toISOString(),
          createdAt: nd.utc,
          updatedAt: new Date().toISOString(),
        });

        imported++;
        console.log(`[importOrdersFromHolded] ✅ Created order ${doc.docNumber}`);

      } catch (error: any) {
        console.error(`[importOrdersFromHolded] ❌ Error processing ${doc.docNumber}:`, error);
        errors.push(`${doc.docNumber}: ${error.message}`);
      }
    }

    // Revalidar
    revalidatePath("/finanzas/sincronizacion");
    revalidatePath("/ventas/pedidos");
    revalidatePath("/contacts/data");

    console.log(`[importOrdersFromHolded] Complete: ${imported} imported, ${skipped} skipped, ${hydrated} hydrated, ${shadows} shadows`);

    return {
      success: true,
      ordersImported: imported,
      ordersSkipped: skipped,
      accountsHydrated: hydrated,
      shadowAccountsCreated: shadows,
      errors: errors.length > 0 ? errors : undefined,
      message: `Importación completada: ${imported} pedidos, ${hydrated} cuentas hidratadas, ${shadows} shadow accounts`,
    };
  } catch (error: any) {
    console.error("[importOrdersFromHolded] Fatal error:", error);
    return {
      success: false,
      message: "Error fatal durante importación",
      errors: [error.message],
    };
  }
}

/**
 * Exporta pedido a Holded (stub para compatibilidad)
 */
export async function exportOrderToHolded(orderId: string): Promise<SyncResult> {
  return {
    success: false,
    message: "Exportación a Holded pendiente de implementar",
  };
}

/**
 * Sincroniza estado de pedido (stub para compatibilidad)
 */
export async function syncOrderStatus(orderId: string): Promise<SyncResult> {
  return {
    success: false,
    message: "Sincronización de estado pendiente de implementar",
  };
}

/**
 * Obtiene estadísticas de sincronización de pedidos
 */
export async function getOrdersSyncStats() {
  try {
    const ordersSnap = await db.collection("ordersSellOut").limit(200).get();
    const orders = ordersSnap.docs.map((doc) => doc.data()) as OrderSellOut[];

    const total = orders.length;
    const synced = orders.filter((o) => o.holdedOrderId).length;
    const pending = total - synced;
    const withErrors = orders.filter((o) => (o as any).syncError).length;

    return {
      success: true,
      stats: {
        total,
        synced,
        pending,
        withErrors,
        syncedPercentage: total > 0 ? Math.round((synced / total) * 100) : 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
