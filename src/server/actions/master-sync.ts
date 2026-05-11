// src/server/actions/master-sync.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { importAccountsFromHolded } from "./holded-accounts-sync";
import { importOrdersFromHolded } from "./holded-orders-sync";
import { importPaymentsFromHolded } from "./holded-treasury-sync";
import { importInvoicesFromHolded } from "./holded-invoices-sync";
import { syncShopifyOrders } from "./shopify-dashboard";

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicateCandidate {
  id: string;
  source: 'holded' | 'shopify' | 'sendcloud';
  type: 'account' | 'order' | 'shipment';
  data: any;
  duplicateOf?: string; // ID del registro existente
  duplicateOfName?: string;
  matchStrategy?: 'cif' | 'email' | 'name' | 'order_number';
  matchConfidence?: number; // 0-1
  action?: 'merge' | 'create' | 'skip'; // Acción propuesta
}

export interface PreSyncAnalysis {
  duplicates: DuplicateCandidate[];
  summary: {
    totalToSync: number;
    duplicates: number;
    newRecords: number;
  };
}

export interface MasterSyncResult {
  success: boolean;
  holded: {
    accounts: { synced: number; errors: number };
    orders: { synced: number; errors: number };
    payments: { synced: number; errors: number };
    invoices: { synced: number; errors: number };
  };
  sendcloud: {
    tracking: { updated: number; errors: number };
  };
  shopify: {
    orders: { imported: number; errors: number };
  };
  startedAt: string;
  completedAt: string;
  durationMs: number;
  errors?: string[];
}

// ============================================================================
// PRE-SYNC ANALYSIS
// ============================================================================

/**
 * Analiza los datos a sincronizar y detecta duplicados potenciales
 * ANTES de ejecutar la sincronización
 */
export async function preSyncAnalysis(): Promise<PreSyncAnalysis> {
  const duplicates: DuplicateCandidate[] = [];

  try {
    // Por ahora retornar análisis vacío ya que la detección real requiere más implementación
    return {
      duplicates: [],
      summary: {
        totalToSync: 0,
        duplicates: 0,
        newRecords: 0,
      },
    };

    // TODO: Implementar análisis real cuando se necesite
    /*
    // 1. Analizar cuentas de Holded
    const holdedAccounts: any[] = [];
    const firestoreAccounts = await db.collection("accounts").get();
    const existingAccounts = firestoreAccounts.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    for (const holdedAcc of holdedAccounts) {
      // Buscar duplicados por CIF
      const duplicateByCif = existingAccounts.find(
        (acc: any) => acc.partyCif === holdedAcc.vatNumber
      );

      if (duplicateByCif) {
        duplicates.push({
          id: holdedAcc.id,
          source: 'holded',
          type: 'account',
          data: holdedAcc,
          duplicateOf: duplicateByCif.id,
          duplicateOfName: duplicateByCif.name || duplicateByCif.id,
          matchStrategy: 'cif',
          matchConfidence: 1.0,
          action: 'merge', // Propuesta: merge
        });
      }
    }

    // 2. Analizar pedidos de Shopify
    // TODO: Obtener pedidos de Shopify y comparar
    const shopifyOrders: any[] = []; // await shopifyClient.getOrders();
    const firestoreOrders = await db
      .collection("ordersSellOut")
      .where("source", "==", "SHOPIFY")
      .get();
    const existingOrders = firestoreOrders.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    for (const shopifyOrder of shopifyOrders) {
      const duplicateByOrderNumber = existingOrders.find(
        (ord: any) => ord.external?.shopifyOrderId === shopifyOrder.id
      );

      if (duplicateByOrderNumber) {
        duplicates.push({
          id: shopifyOrder.id,
          source: 'shopify',
          type: 'order',
          data: shopifyOrder,
          duplicateOf: duplicateByOrderNumber.id,
          duplicateOfName: `Pedido #${shopifyOrder.order_number}`,
          matchStrategy: 'order_number',
          matchConfidence: 1.0,
          action: 'skip', // Propuesta: skip (ya existe)
        });
      }
    }

    // 3. Summary
    const summary = {
      totalToSync: holdedAccounts.length + shopifyOrders.length,
      duplicates: duplicates.length,
      newRecords: holdedAccounts.length + shopifyOrders.length - duplicates.length,
    };

    return {
      duplicates,
      summary,
    };
    */
  } catch (error: any) {
    console.error("[preSyncAnalysis] Error:", error);
    return {
      duplicates: [],
      summary: {
        totalToSync: 0,
        duplicates: 0,
        newRecords: 0,
      },
    };
  }
}

/**
 * Resuelve un duplicado según la acción del usuario
 * - merge: Actualizar registro existente
 * - create: Crear nuevo (ignorar duplicado)
 * - skip: No hacer nada
 */
export async function resolveDuplicate(
  candidateId: string,
  action: 'merge' | 'create' | 'skip'
): Promise<{ success: boolean; message?: string }> {
  try {
    // TODO: Implementar lógica de resolución
    // Por ahora solo guardamos la decisión
    await db.collection("sync_decisions").doc(candidateId).set({
      candidateId,
      action,
      resolvedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Duplicado ${action === 'merge' ? 'fusionado' : action === 'create' ? 'creado como nuevo' : 'omitido'}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

// ============================================================================
// MASTER SYNC
// ============================================================================

/**
 * Sincroniza TODAS las integraciones en orden
 * - Holded: Cuentas, Pedidos, Pagos, Facturas
 * - Sendcloud: Tracking updates
 * - Shopify: Pedidos
 */
export async function masterSyncAll(): Promise<MasterSyncResult> {
  const startTime = Date.now();
  const result: MasterSyncResult = {
    success: true,
    holded: {
      accounts: { synced: 0, errors: 0 },
      orders: { synced: 0, errors: 0 },
      payments: { synced: 0, errors: 0 },
      invoices: { synced: 0, errors: 0 },
    },
    sendcloud: {
      tracking: { updated: 0, errors: 0 },
    },
    shopify: {
      orders: { imported: 0, errors: 0 },
    },
    startedAt: new Date().toISOString(),
    completedAt: "",
    durationMs: 0,
    errors: [],
  };

  try {
    console.log("[masterSyncAll] Starting master sync...");

    // 1. HOLDED - Cuentas
    try {
      const accountsResult = await importAccountsFromHolded();
      result.holded.accounts.synced = accountsResult.accountsImported || 0;
      if (accountsResult.errors) {
        result.holded.accounts.errors = accountsResult.errors.length;
        result.errors?.push(...accountsResult.errors);
      }
    } catch (error: any) {
      result.holded.accounts.errors = 1;
      result.errors?.push(`Holded Accounts: ${error.message}`);
    }

    // 2. HOLDED - Pedidos
    try {
      const ordersResult = await importOrdersFromHolded();
      result.holded.orders.synced = ordersResult.ordersImported || 0;
      if (ordersResult.errors) {
        result.holded.orders.errors = ordersResult.errors.length;
        result.errors?.push(...ordersResult.errors);
      }
    } catch (error: any) {
      result.holded.orders.errors = 1;
      result.errors?.push(`Holded Orders: ${error.message}`);
    }

    // 3. HOLDED - Pagos
    try {
      const paymentsResult = await importPaymentsFromHolded();
      result.holded.payments.synced = paymentsResult.paymentsImported || 0;
      if (paymentsResult.errors) {
        result.holded.payments.errors = paymentsResult.errors.length;
        result.errors?.push(...paymentsResult.errors);
      }
    } catch (error: any) {
      result.holded.payments.errors = 1;
      result.errors?.push(`Holded Payments: ${error.message}`);
    }

    // 4. HOLDED - Facturas
    try {
      const invoicesResult = await importInvoicesFromHolded();
      result.holded.invoices.synced = invoicesResult.invoicesImported || 0;
      if (invoicesResult.errors) {
        result.holded.invoices.errors = invoicesResult.errors.length;
        result.errors?.push(...invoicesResult.errors);
      }
    } catch (error: any) {
      result.holded.invoices.errors = 1;
      result.errors?.push(`Holded Invoices: ${error.message}`);
    }

    // 5. SENDCLOUD - Tracking updates
    try {
      // TODO: Implementar cuando esté el endpoint
      // const trackingResult = await syncAllTrackingUpdates();
      result.sendcloud.tracking.updated = 0;
    } catch (error: any) {
      result.sendcloud.tracking.errors = 1;
      result.errors?.push(`Sendcloud: ${error.message}`);
    }

    // 6. SHOPIFY - Pedidos (sin límite de fecha = todo el histórico)
    try {
      const shopifyResult = await syncShopifyOrders({ limit: 250, daysBack: undefined });
      result.shopify.orders.imported = shopifyResult.imported || 0;
      if (shopifyResult.errors) {
        result.shopify.orders.errors = shopifyResult.errors.length;
        result.errors?.push(...shopifyResult.errors);
      }
    } catch (error: any) {
      result.shopify.orders.errors = 1;
      result.errors?.push(`Shopify: ${error.message}`);
    }

    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startTime;

    console.log("[masterSyncAll] Complete:", result);

    return result;
  } catch (error: any) {
    result.success = false;
    result.errors?.push(`Fatal: ${error.message}`);
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startTime;

    console.error("[masterSyncAll] Fatal error:", error);
    return result;
  }
}
