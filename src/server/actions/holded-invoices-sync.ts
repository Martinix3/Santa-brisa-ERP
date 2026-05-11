// src/server/actions/holded-invoices-sync.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { Invoice } from "@/domain/ssot";
import { HoldedClient } from "@/server/integrations/holded/client";

const holdedClient = new HoldedClient();

// ============================================================================
// TYPES
// ============================================================================

interface HoldedInvoice {
  id: string;
  docNumber: string;
  series?: string;
  contact: {
    id: string;
    name: string;
    vat?: string;
  };
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  lines: {
    desc: string;
    units: number;
    price: number;
    tax: number;
  }[];
  date: string; // ISO date
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

interface SyncResult {
  success: boolean;
  invoicesImported?: number;
  invoicesSynced?: number;
  errors?: string[];
  message?: string;
}

interface InvoiceKPIs {
  todayInvoiced: number;
  pendingCollection: number;
  collectedThisMonth: number;
  monthTotal: number;
  overdueCount: number;
  overdueAmount: number;
  avgCollectionDays: number;
  byStatus: {
    status: Invoice['status'];
    count: number;
    amount: number;
  }[];
}

// ============================================================================
// HELPERS
// ============================================================================

function mapHoldedToInvoice(holdedInvoice: any): Partial<Invoice> {
  // Mapear status numérico de Holded a string
  // 0: draft, 1: sent, 2: paid, 3: overdue, 4: cancelled
  const statusMap: Record<number, Invoice['status']> = {
    0: 'DRAFT',
    1: 'SENT',
    2: 'PAID',
    3: 'OVERDUE',
    4: 'CANCELLED'
  };
  
  // Calcular paymentStatus basándose en pagos
  let paymentStatus: Invoice['paymentStatus'] = 'PENDING';
  const paymentsTotal = holdedInvoice.paymentsTotal || 0;
  const total = holdedInvoice.total || 0;
  
  if (paymentsTotal >= total) {
    paymentStatus = 'PAID';
  } else if (paymentsTotal > 0) {
    paymentStatus = 'PARTIAL';
  }
  
  return {
    holdedId: holdedInvoice.id,
    syncedFromHolded: true,
    lastSyncAt: new Date().toISOString(),
    
    docNumber: holdedInvoice.docNumber || '',
    series: holdedInvoice.series,
    
    customerName: holdedInvoice.contactName || '',
    customerVat: holdedInvoice.contact?.vat,
    
    subtotal: holdedInvoice.subtotal || 0,
    taxAmount: holdedInvoice.tax || 0,
    total: holdedInvoice.total || 0,
    currency: (holdedInvoice.currency?.toUpperCase() || 'EUR') as 'EUR' | 'USD',
    
    status: statusMap[holdedInvoice.status] || 'DRAFT',
    paymentStatus,
    
    lines: (holdedInvoice.products || holdedInvoice.lines || []).map((line: any) => ({
      description: line.name || line.desc || '',
      quantity: line.units || 0,
      priceUnit: parseFloat(line.price) || 0,
      taxRate: line.tax || 0,
      subtotal: (line.units || 0) * (parseFloat(line.price) || 0),
      total: (line.units || 0) * (parseFloat(line.price) || 0) * (1 + (line.tax || 0) / 100),
    })),
    
    issueDate: holdedInvoice.date ? new Date(holdedInvoice.date * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: holdedInvoice.dueDate ? new Date(holdedInvoice.dueDate * 1000).toISOString().split('T')[0] : undefined,
    paidAt: holdedInvoice.paidDate ? new Date(holdedInvoice.paidDate * 1000).toISOString() : undefined,
    
    notes: holdedInvoice.notes,
    
    createdAt: holdedInvoice.createdAt ? new Date(holdedInvoice.createdAt * 1000).toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Importa facturas desde Holded
 * - Solo facturas de los últimos 90 días
 * - Link automático a cuentas por holdedId
 * - Link automático a shipments si existe
 */
export async function importInvoicesFromHolded(): Promise<SyncResult> {
  try {
    console.log("[importInvoicesFromHolded] Starting import...");

    // 1. Obtener facturas de Holded
    const holdedInvoices = await holdedClient.getInvoices();
    
    if (!holdedInvoices) {
      return {
        success: false,
        message: "Error al obtener facturas de Holded",
        errors: ["API returned null"],
      };
    }
    console.log(`[importInvoicesFromHolded] Found ${holdedInvoices.length} invoices in Holded`);

    let imported = 0;
    let synced = 0;
    const errors: string[] = [];

    // 2. Procesar cada factura
    for (const holdedInvoice of holdedInvoices) {
      try {
        // Verificar si ya existe
        const existingSnap = await db
          .collection("invoices")
          .where("holdedId", "==", holdedInvoice.id)
          .limit(1)
          .get();

        if (!existingSnap.empty) {
          // Ya existe, actualizar
          const invoiceId = existingSnap.docs[0].id;
          await db.collection("invoices").doc(invoiceId).update({
            ...mapHoldedToInvoice(holdedInvoice),
            updatedAt: new Date().toISOString(),
          });
          synced++;
          continue;
        }

        // No existe, crear
        const invoiceRef = db.collection("invoices").doc();
        const invoice = mapHoldedToInvoice(holdedInvoice);

        // Intentar linkear a Account
        if (holdedInvoice.contact.id) {
          const accountSnap = await db
            .collection("accounts")
            .where("holdedId", "==", holdedInvoice.contact.id)
            .limit(1)
            .get();

          if (!accountSnap.empty) {
            invoice.accountId = accountSnap.docs[0].id;
          }
        }

        // TODO: Intentar linkear a Shipment por holdedInvoiceId
        // const shipmentSnap = await db.collection("shipments")
        //   .where("holdedInvoiceId", "==", holdedInvoice.id)
        //   .limit(1).get();

        await invoiceRef.set({
          id: invoiceRef.id,
          ...invoice,
        });

        imported++;
      } catch (error: any) {
        console.error(`[importInvoicesFromHolded] Error processing ${holdedInvoice.docNumber}:`, error);
        errors.push(`${holdedInvoice.docNumber}: ${error.message}`);
      }
    }

    // 3. Revalidar
    revalidatePath("/finanzas/facturas");

    console.log(`[importInvoicesFromHolded] Complete: ${imported} imported, ${synced} updated`);

    return {
      success: true,
      invoicesImported: imported,
      invoicesSynced: synced,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sincronización completada: ${imported} nuevas, ${synced} actualizadas`,
    };
  } catch (error: any) {
    console.error("[importInvoicesFromHolded] Fatal error:", error);
    return {
      success: false,
      message: "Error fatal durante importación",
      errors: [error.message],
    };
  }
}

/**
 * Obtiene KPIs de facturación
 * - Hoy facturado
 * - Pendiente cobro
 * - Cobrado mes
 * - Vencidas
 */
export async function getInvoiceKPIs(): Promise<{ success: boolean; kpis?: InvoiceKPIs; error?: string }> {
  try {
    const invoicesSnap = await db.collection("invoices").get();
    const invoices = invoicesSnap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Invoice[];

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    // Hoy facturado
    const todayInvoiced = invoices
      .filter(inv => inv.issueDate.startsWith(today))
      .reduce((sum, inv) => sum + inv.total, 0);

    // Pendiente cobro
    const pendingCollection = invoices
      .filter(inv => inv.paymentStatus === 'PENDING')
      .reduce((sum, inv) => sum + inv.total, 0);

    // Cobrado este mes
    const collectedThisMonth = invoices
      .filter(inv => inv.paidAt && inv.paidAt >= monthStartStr)
      .reduce((sum, inv) => sum + inv.total, 0);

    // Total facturado mes
    const monthTotal = invoices
      .filter(inv => inv.issueDate >= monthStartStr)
      .reduce((sum, inv) => sum + inv.total, 0);

    // Vencidas
    const todayDate = new Date();
    const overdue = invoices.filter(inv => {
      if (inv.paymentStatus === 'PAID') return false;
      if (!inv.dueDate) return false;
      return new Date(inv.dueDate) < todayDate;
    });
    const overdueCount = overdue.length;
    const overdueAmount = overdue.reduce((sum, inv) => sum + inv.total, 0);

    // Días promedio de cobro
    const paidInvoices = invoices.filter(inv => inv.paidAt);
    const avgCollectionDays = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => {
          const issued = new Date(inv.issueDate);
          const paid = new Date(inv.paidAt!);
          const days = Math.floor((paid.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / paidInvoices.length
      : 0;

    // By status
    const statusMap = new Map<Invoice['status'], { count: number; amount: number }>();
    invoices.forEach(inv => {
      const current = statusMap.get(inv.status) || { count: 0, amount: 0 };
      statusMap.set(inv.status, {
        count: current.count + 1,
        amount: current.amount + inv.total,
      });
    });
    const byStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      ...data,
    }));

    const kpis: InvoiceKPIs = {
      todayInvoiced,
      pendingCollection,
      collectedThisMonth,
      monthTotal,
      overdueCount,
      overdueAmount,
      avgCollectionDays: Math.round(avgCollectionDays),
      byStatus,
    };

    return {
      success: true,
      kpis,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
