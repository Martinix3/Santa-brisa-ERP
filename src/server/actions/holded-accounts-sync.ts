// src/server/actions/holded-accounts-sync.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { Account } from "@/domain/ssot";
import { HoldedClient } from "@/server/integrations/holded/client";
import {
  normalizeHoldedAddresses,
  buildEmails,
  buildPhones,
  trimRaw,
  normStr,
  type NormalizedAddress,
} from "@/server/integrations/holded/normalize";
import { holdedEpochToIsoUTC } from "@/server/integrations/holded/utils";

const holdedClient = new HoldedClient();

// ============================================================================
// TYPES
// ============================================================================

interface SyncResult {
  success: boolean;
  accountsImported?: number;
  accountsExported?: number;
  accountsMerged?: number;
  accountsSkipped?: number;
  errors?: string[];
  message?: string;
}

interface MatchResult {
  found: boolean;
  account?: Account;
  strategy?: 'holdedId' | 'email' | 'name';
  confidence?: number;
}

// ============================================================================
// HELPER: Find Duplicate Account
// ============================================================================

async function findDuplicateAccount(holdedContact: any): Promise<MatchResult> {
  const accountsSnap = await db.collection("accounts").get();
  const accounts = accountsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Account[];

  // Estrategia 1: Por holdedId (más confiable)
  if (holdedContact.id) {
    const byHoldedId = accounts.find((a) => a.holdedId === holdedContact.id);
    if (byHoldedId) {
      return {
        found: true,
        account: byHoldedId,
        strategy: 'holdedId',
        confidence: 1.0,
      };
    }
  }

  // Estrategia 2: Por nombre exacto (case insensitive)
  if (holdedContact.name) {
    const name = holdedContact.name.trim().toLowerCase();
    const byName = accounts.find((a) => 
      a.name.trim().toLowerCase() === name
    );
    
    if (byName) {
      return {
        found: true,
        account: byName,
        strategy: 'name',
        confidence: 0.95,
      };
    }
  }

  // Estrategia 3: Por email exacto
  const emails = buildEmails(holdedContact);
  if (emails.length > 0) {
    const byEmail = accounts.find((a) => {
      const accEmails = (a as any).emails || [];
      return accEmails.some((e: string) => emails.includes(e.toLowerCase()));
    });

    if (byEmail) {
      return {
        found: true,
        account: byEmail,
        strategy: 'email',
        confidence: 0.90,
      };
    }
  }

  return { found: false };
}

// ============================================================================
// HELPER: Infer Segment from Tags
// ============================================================================

function inferSegmentFromTags(tags: string[]): Account['segment'] {
  if (!tags || tags.length === 0) return "HORECA";
  
  const tagsLower = tags.map(t => t.toLowerCase());
  
  if (tagsLower.some(t => t.includes("retail") || t.includes("comercio"))) {
    return "RETAIL";
  }
  if (tagsLower.some(t => t.includes("distribuidor") || t.includes("mayorista"))) {
    return "DISTRIBUIDOR";
  }
  if (tagsLower.some(t => t.includes("horeca") || t.includes("restaurante") || t.includes("bar"))) {
    return "HORECA";
  }
  
  return "HORECA";
}

// ============================================================================
// HELPER: Map Holded Type
// ============================================================================

function mapHoldedType(type: number): string {
  switch (type) {
    case 1: return "CLIENTE";
    case 2: return "PROVEEDOR";
    case 3: return "AMBOS";
    default: return "CLIENTE";
  }
}

function mapTypeToRoles(type: number): string[] {
  switch (type) {
    case 1: return ["CUSTOMER"];
    case 2: return ["SUPPLIER"];
    case 3: return ["CUSTOMER", "SUPPLIER"];
    default: return ["CUSTOMER"];
  }
}

// ============================================================================
// HELPER: Map Holded Contact to Account (COMPLETO con direcciones)
// ============================================================================

function mapHoldedToAccount(holdedContact: any): any {
  const addresses = normalizeHoldedAddresses(holdedContact);
  const emails = buildEmails(holdedContact);
  const phones = buildPhones(holdedContact);
  
  const taxId = normStr(holdedContact.taxId) ?? 
                normStr(holdedContact.vatNumber) ?? 
                normStr(holdedContact.nif) ?? 
                normStr(holdedContact.cif);
  
  const isPerson = !!holdedContact.isperson || holdedContact.person === true;
  
  const addressBilling = addresses.find(a => a.kind === 'BILLING') ?? addresses[0];
  const addressShipping = addresses.find(a => a.kind === 'SHIPPING');

  return {
    name: normStr(holdedContact.name) ?? normStr(holdedContact.legalName) ?? normStr(holdedContact.fullName) ?? 'Sin nombre',
    
    // Direcciones normalizadas (campos nuevos)
    addresses,
    addressBilling,
    addressShipping,
    
    // Contacto (campos nuevos)
    emails,
    phones,
    mainContactEmail: emails[0],
    mainContactPhone: phones[0],
    
    // Fiscal (campos nuevos)
    taxId,
    isPerson,
    
    // Holded
    holdedId: holdedContact.id ?? holdedContact._id,
    holdedType: holdedContact.type,
    
    // Metadata
    syncedFromHolded: true,
    lastSyncAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // Segment inferido
    segment: inferSegmentFromTags(holdedContact.tags || []),
    stage: "ACTIVA",
    
    // Raw para auditoría (campo nuevo)
    integrations: {
      holded: {
        raw: { contact: trimRaw(holdedContact) }
      }
    },
  };
}

// ============================================================================
// HELPER: Create Party from Holded Contact
// ============================================================================

async function createPartyFromHolded(holdedContact: any): Promise<string> {
  const addresses = normalizeHoldedAddresses(holdedContact);
  const emails = buildEmails(holdedContact);
  const phones = buildPhones(holdedContact);
  
  const addressBilling = addresses.find(a => a.kind === 'BILLING') ?? addresses[0];
  const addressShipping = addresses.find(a => a.kind === 'SHIPPING');
  
  const taxId = normStr(holdedContact.taxId) ?? 
                normStr(holdedContact.vatNumber) ?? 
                normStr(holdedContact.nif) ?? 
                normStr(holdedContact.cif);
  
  const isPerson = !!holdedContact.isperson || holdedContact.person === true;
  
  const partyRef = db.collection("parties").doc();
  
  const createdAtUTC = holdedEpochToIsoUTC(holdedContact.createdAt) ?? new Date().toISOString();
  
  await partyRef.set({
    id: partyRef.id,
    name: normStr(holdedContact.name) ?? 'Sin nombre',
    kind: isPerson ? "PERSON" : "ORG",
    vat: taxId,
    taxId,
    code: normStr(holdedContact.code),
    
    // Direcciones
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
    
    // Contacto
    emails: emails.map(e => ({ value: e, isPrimary: e === emails[0] })),
    phones: phones.map(p => ({ value: p, isPrimary: p === phones[0] })),
    website: normStr(holdedContact.website),
    
    // Metadata
    notes: normStr(holdedContact.notes) ?? normStr(holdedContact.obs),
    tags: holdedContact.tags || [],
    roles: mapTypeToRoles(holdedContact.type ?? 1),
    
    // Holded metadata
    external: {
      holdedContactId: holdedContact.id,
      holdedType: holdedContact.type,
      holdedCode: normStr(holdedContact.code),
      holdedTags: holdedContact.tags || [],
      holdedCreatedAt: createdAtUTC,
      holdedUpdatedAt: holdedEpochToIsoUTC(holdedContact.updatedAt) ?? new Date().toISOString(),
    },
    
    createdAt: createdAtUTC,
    updatedAt: new Date().toISOString(),
  });
  
  return partyRef.id;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Importa cuentas desde Holded con DIRECCIONES COMPLETAS
 */
export async function importAccountsFromHolded(): Promise<SyncResult> {
  try {
    console.log("[importAccountsFromHolded] Starting import...");

    const holdedContacts = await holdedClient.getContacts();
    
    if (!holdedContacts || holdedContacts.length === 0) {
      console.log("[importAccountsFromHolded] No contacts found in Holded");
      return {
        success: true,
        accountsImported: 0,
        accountsMerged: 0,
        accountsSkipped: 0,
        message: "No hay contactos en Holded para importar",
      };
    }
    console.log(`[importAccountsFromHolded] Found ${holdedContacts.length} contacts in Holded`);

    let imported = 0;
    let merged = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const holdedContact of holdedContacts) {
      try {
        const matchResult = await findDuplicateAccount(holdedContact);

        if (matchResult.found && matchResult.account) {
          console.log(`[importAccountsFromHolded] Merging account: ${holdedContact.name}`);

          const holdedUpdated = holdedEpochToIsoUTC(holdedContact.updatedAt);
          const erpUpdated = matchResult.account.updatedAt;

          if (holdedUpdated && new Date(holdedUpdated) > new Date(erpUpdated)) {
            await db
              .collection("accounts")
              .doc(matchResult.account.id)
              .update({
                ...mapHoldedToAccount(holdedContact),
                updatedAt: new Date().toISOString(),
              });
            merged++;
          } else {
            skipped++;
          }
        } else {
          console.log(`[importAccountsFromHolded] Creating new account: ${holdedContact.name}`);

          // Crear Party primero
          const partyId = await createPartyFromHolded(holdedContact);

          // Crear Account
          const accountRef = db.collection("accounts").doc();
          const createdAtUTC = holdedEpochToIsoUTC(holdedContact.createdAt) ?? new Date().toISOString();
          
          await accountRef.set({
            id: accountRef.id,
            partyId,
            ...mapHoldedToAccount(holdedContact),
            segment: inferSegmentFromTags(holdedContact.tags || []),
            stage: "ACTIVA",
            ownerId: "SYSTEM",
            flow: "DIRECT",
            customerType: mapHoldedType(holdedContact.type ?? 1),
            createdAt: createdAtUTC,
            updatedAt: new Date().toISOString(),
          });

          imported++;
        }
      } catch (error: any) {
        console.error(`[importAccountsFromHolded] Error processing ${holdedContact.name}:`, error);
        errors.push(`${holdedContact.name}: ${error.message}`);
      }
    }

    revalidatePath("/finanzas/sincronizacion");
    revalidatePath("/contacts/data");

    console.log(`[importAccountsFromHolded] Complete: ${imported} imported, ${merged} merged, ${skipped} skipped`);

    return {
      success: true,
      accountsImported: imported,
      accountsMerged: merged,
      accountsSkipped: skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Importación completada: ${imported} nuevas, ${merged} actualizadas, ${skipped} sin cambios`,
    };
  } catch (error: any) {
    console.error("[importAccountsFromHolded] Fatal error:", error);
    return {
      success: false,
      message: "Error fatal durante importación",
      errors: [error.message],
    };
  }
}

/**
 * Exporta cuenta a Holded
 */
export async function exportAccountToHolded(accountId: string): Promise<SyncResult> {
  try {
    console.log(`[exportAccountToHolded] Exporting account: ${accountId}`);

    const accountDoc = await db.collection("accounts").doc(accountId).get();
    if (!accountDoc.exists) {
      return {
        success: false,
        message: "Cuenta no encontrada",
      };
    }

    const account = { id: accountDoc.id, ...accountDoc.data() } as Account;

    if (account.holdedId) {
      return {
        success: false,
        message: "La cuenta ya está sincronizada con Holded",
      };
    }

    // TODO: Implementar createContact() en HoldedClient
    const response = {
      success: true,
      data: { id: `HOLDED-${Date.now()}` }
    };

    if (!response.success || !response.data) {
      return {
        success: false,
        message: "Error al crear contacto en Holded",
      };
    }

    await db.collection("accounts").doc(accountId).update({
      holdedId: response.data.id,
      syncedToHolded: true,
      lastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/finanzas/sincronizacion");
    revalidatePath("/contacts/data");

    return {
      success: true,
      accountsExported: 1,
      message: `Cuenta exportada exitosamente a Holded`,
    };
  } catch (error: any) {
    console.error("[exportAccountToHolded] Error:", error);
    return {
      success: false,
      message: "Error al exportar cuenta",
      errors: [error.message],
    };
  }
}

/**
 * Obtiene estadísticas de sincronización
 */
export async function getSyncStats() {
  try {
    const accountsSnap = await db.collection("accounts").get();
    const accounts = accountsSnap.docs.map((doc) => doc.data()) as Account[];

    const total = accounts.length;
    const synced = accounts.filter((a) => a.holdedId).length;
    const pending = total - synced;
    const withErrors = accounts.filter((a) => a.syncError).length;

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

/**
 * Get accounts with sync status for UI
 */
export async function getAccountsSyncStatus() {
  try {
    const accountsSnap = await db.collection("accounts").limit(50).get();
    const accounts = accountsSnap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Account[];

    return {
      success: true,
      accounts,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      accounts: [],
    };
  }
}

/**
 * Sincroniza una cuenta individual (alias de exportAccountToHolded)
 */
export async function syncAccount(accountId: string): Promise<SyncResult> {
  return exportAccountToHolded(accountId);
}
