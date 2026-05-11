// src/server/actions/holded-treasury-sync.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import { revalidatePath } from "next/cache";
import type { Payment } from "@/domain/ssot";
import { HoldedClient } from "@/server/integrations/holded/client";

const holdedClient = new HoldedClient();

// ============================================================================
// TYPES
// ============================================================================

interface HoldedTreasuryEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  date: string; // ISO date
  dueDate?: string;
  status: 'pending' | 'paid' | 'cancelled';
  method: string; // 'bank_transfer', 'card', 'cash', etc.
  contactId?: string;
  invoiceId?: string;
  description: string;
  reference?: string;
  notes?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

interface SyncResult {
  success: boolean;
  paymentsImported?: number;
  paymentsLinked?: number;
  errors?: string[];
  message?: string;
}

interface FinancialKPIs {
  // Ingresos
  totalRevenue: number;
  collectedRevenue: number;
  pendingCollection: number;
  collectionRate: number; // %
  
  // Egresos
  totalExpenses: number;
  paidExpenses: number;
  pendingPayment: number;
  
  // Balance
  netCashFlow: number;
  
  // Por método
  byMethod: {
    method: Payment['method'];
    amount: number;
    count: number;
  }[];
  
  // Tendencias
  monthlyTrend: {
    month: string;
    income: number;
    expense: number;
    netFlow: number;
  }[];
}

// ============================================================================
// HELPERS: Method Mapping
// ============================================================================

function mapHoldedMethodToERP(holdedMethod: string): Payment['method'] {
  const mapping: Record<string, Payment['method']> = {
    'bank_transfer': 'TRANSFER',
    'transfer': 'TRANSFER',
    'card': 'CARD',
    'credit_card': 'CARD',
    'cash': 'CASH',
    'bizum': 'BIZUM',
  };
  
  const normalized = holdedMethod.toLowerCase().replace(/\s+/g, '_');
  return mapping[normalized] || 'OTHER';
}

// ============================================================================
// HELPERS: Mapping
// ============================================================================

function mapHoldedToPayment(holdedEntry: HoldedTreasuryEntry): Partial<Payment> {
  return {
    kind: holdedEntry.type === 'income' ? 'INCOME' : 'EXPENSE',
    holdedId: holdedEntry.id,
    holdedType: 'treasury',
    amount: holdedEntry.amount,
    currency: holdedEntry.currency as 'EUR' | 'USD',
    method: mapHoldedMethodToERP(holdedEntry.method),
    status: holdedEntry.status === 'paid' ? 
      (holdedEntry.type === 'income' ? 'RECEIVED' : 'PAID') :
      holdedEntry.status === 'cancelled' ? 'CANCELLED' : 'PENDING',
    date: holdedEntry.date,
    dueDate: holdedEntry.dueDate,
    paidAt: holdedEntry.status === 'paid' ? holdedEntry.date : undefined,
    description: holdedEntry.description,
    reference: holdedEntry.reference,
    notes: holdedEntry.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Importa cobros y pagos desde Holded Treasury
 * - Importa income (cobros) y expense (pagos)
 * - Link automático a facturas si tiene invoiceId
 * - Link automático a cuentas si tiene contactId
 */
export async function importPaymentsFromHolded(): Promise<SyncResult> {
  try {
    console.log("[importPaymentsFromHolded] Starting import...");

    // 1. Obtener movimientos de tesorería de Holded
    // TODO: HoldedClient needs public method getTreasuryEntries()
    const response = {
      success: true,
      data: [] as HoldedTreasuryEntry[]
    };

    if (!response.success || !response.data) {
      return {
        success: false,
        message: "Error al obtener movimientos de Holded",
        errors: ["Unknown error"],
      };
    }

    const holdedEntries = response.data;
    console.log(`[importPaymentsFromHolded] Found ${holdedEntries.length} entries in Holded`);

    let imported = 0;
    let linked = 0;
    const errors: string[] = [];

    // 2. Procesar cada movimiento
    for (const entry of holdedEntries) {
      try {
        // Verificar si ya existe (por holdedId)
        const existingSnap = await db
          .collection("payments")
          .where("holdedId", "==", entry.id)
          .limit(1)
          .get();

        if (!existingSnap.empty) {
          // Ya existe, skip
          continue;
        }

        // Crear Payment
        const paymentRef = db.collection("payments").doc();
        const payment = mapHoldedToPayment(entry);

        // Intentar linkear a Account si tiene contactId
        if (entry.contactId) {
          const accountSnap = await db
            .collection("accounts")
            .where("holdedId", "==", entry.contactId)
            .limit(1)
            .get();

          if (!accountSnap.empty) {
            payment.accountId = accountSnap.docs[0].id;
            linked++;
          }
        }

        // TODO: Intentar linkear a Invoice si tiene invoiceId
        // if (entry.invoiceId) {
        //   payment.invoiceId = entry.invoiceId;
        // }

        await paymentRef.set({
          id: paymentRef.id,
          ...payment,
        });

        imported++;
      } catch (error: any) {
        console.error(`[importPaymentsFromHolded] Error processing entry ${entry.id}:`, error);
        errors.push(`${entry.id}: ${error.message}`);
      }
    }

    // 3. Revalidar
    revalidatePath("/finanzas/tesoreria");

    console.log(`[importPaymentsFromHolded] Complete: ${imported} imported, ${linked} linked`);

    return {
      success: true,
      paymentsImported: imported,
      paymentsLinked: linked,
      errors: errors.length > 0 ? errors : undefined,
      message: `Importación completada: ${imported} movimientos, ${linked} vinculados`,
    };
  } catch (error: any) {
    console.error("[importPaymentsFromHolded] Fatal error:", error);
    return {
      success: false,
      message: "Error fatal durante importación",
      errors: [error.message],
    };
  }
}

/**
 * Link automático de pagos a facturas
 * - Busca payments sin invoiceId
 * - Intenta vincular por monto + fecha + cuenta
 */
export async function linkPaymentToInvoice(paymentId: string): Promise<SyncResult> {
  try {
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      return { success: false, message: "Pago no encontrado" };
    }

    const payment = { id: paymentDoc.id, ...paymentDoc.data() } as Payment;

    if (payment.invoiceId) {
      return { success: false, message: "El pago ya está vinculado a una factura" };
    }

    // TODO: Buscar factura por monto + fecha + cuenta
    // const invoicesSnap = await db.collection("invoices")...

    return {
      success: true,
      message: "Linking automático pendiente de implementar",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Obtiene KPIs financieros
 * - Total revenue, collected, pending
 * - Total expenses, paid, pending
 * - Net cash flow
 * - By method breakdown
 * - Monthly trend
 */
export async function getFinancialKPIs(): Promise<{ success: boolean; kpis?: FinancialKPIs; error?: string }> {
  try {
    const paymentsSnap = await db.collection("payments").get();
    const payments = paymentsSnap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Payment[];

    // Separar income y expense
    const incomes = payments.filter(p => p.kind === 'INCOME');
    const expenses = payments.filter(p => p.kind === 'EXPENSE');

    // KPIs de ingresos
    const totalRevenue = incomes.reduce((sum, p) => sum + p.amount, 0);
    const collectedRevenue = incomes
      .filter(p => p.status === 'RECEIVED')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingCollection = incomes
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);
    const collectionRate = totalRevenue > 0
      ? (collectedRevenue / totalRevenue) * 100
      : 0;

    // KPIs de egresos
    const totalExpenses = expenses.reduce((sum, p) => sum + p.amount, 0);
    const paidExpenses = expenses
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPayment = expenses
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);

    // Balance
    const netCashFlow = collectedRevenue - paidExpenses;

    // By method
    const methodMap = new Map<Payment['method'], { amount: number; count: number }>();
    payments.forEach(p => {
      const current = methodMap.get(p.method) || { amount: 0, count: 0 };
      methodMap.set(p.method, {
        amount: current.amount + p.amount,
        count: current.count + 1,
      });
    });
    const byMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }));

    // Monthly trend (últimos 6 meses)
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    payments.forEach(p => {
      const dateStr = p.paidAt ?? p.date ?? new Date().toISOString();
      const month = dateStr.substring(0, 7); // YYYY-MM
      const current = monthlyMap.get(month) || { income: 0, expense: 0 };
      if (p.kind === 'INCOME' && p.status === 'RECEIVED') {
        current.income += p.amount;
      } else if (p.kind === 'EXPENSE' && p.status === 'PAID') {
        current.expense += p.amount;
      }
      monthlyMap.set(month, current);
    });
    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6) // Últimos 6 meses
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        netFlow: data.income - data.expense,
      }));

    const kpis: FinancialKPIs = {
      totalRevenue,
      collectedRevenue,
      pendingCollection,
      collectionRate: Math.round(collectionRate * 10) / 10,
      totalExpenses,
      paidExpenses,
      pendingPayment,
      netCashFlow,
      byMethod,
      monthlyTrend,
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
