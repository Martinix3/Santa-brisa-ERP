// domain/ssot.procurement.ts - Canónico de Compras/Proveedores/Finanzas
import type { Currency, Uom } from "./ssot.core";

// --- COMPRAS Y RECEPCIONES ---
export interface Receipt {
    id: string;
    supplierId: string;
    warehouseId: string;
    expectedAt: string;
    receivedAt?: string;
    status: 'EXPECTED' | 'RECEIVED' | 'BOOKED';
    lines: {
        materialSku: string;
        orderedQty: number;
        uom: Uom;
        receivedQty: number;
        lotId: string;
    }[];
    documents?: {
        type: 'COA' | 'CMR' | 'INVOICE';
        url: string;
    }[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// --- FACTURACIÓN Y PAGOS (simplificado) ---
export interface SupplierBillLine {
  description?: string;
  materialId?: string;
  qty?: number;
  uom?: Uom;
  unitPrice?: number;
  taxPct?: number;
  total: number;
}
export type SupplierBillStatus = "open"|"partially_paid"|"paid"|"void";
export interface SupplierBill {
  id: string;
  supplierId: string;
  poId?: string;
  currency: Currency;
  issuedAt: string;
  dueAt?: string;
  status: SupplierBillStatus;
  lines: SupplierBillLine[];
  subtotal?: number;
  taxTotal?: number;
  grandTotal: number;
  externalRef?: string;
}

export interface Payment {
  id: string;
  kind: "customer"|"supplier";
  supplierId?: string;
  accountId?: string;
  amount: number;
  currency: Currency;
  paidAt: string;
  method?: string;
  refBillId?: string;
  externalRef?: string;
}
