// domain/ssot.sales.ts - Canónico de Ventas
import type { Currency } from './ssot.core';

export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'cancelled' | 'lost';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
export type Department = 'PRODUCCION' | 'ALMACEN' | 'MARKETING' | 'VENTAS' | 'FINANZAS';

export interface OrderLine {
  sku: string;
  qty: number;
  unit: 'ud' | 'caja' | 'palet';
  priceUnit: number;
  discount?: number;
  lotIds?: string[];
}

export interface OrderSellOut {
  id: string;
  accountId: string;
  distributorId?: string;
  userId?: string;
  status: OrderStatus;
  currency: Currency;
  createdAt: string;
  closedAt?: string;
  lines: OrderLine[];
  notes?: string;
  totalAmount?: number;
  source?: 'CRM' | 'SHOPIFY' | 'HOLDED' | 'MANUAL';
  biller?: 'SB' | 'PARTNER';
  paymentMethod?: string;
  paymentTermDays?: number;
  invoiceId?: string;
}

export interface Interaction {
  id: string;
  accountId: string;
  userId: string;
  kind: InteractionKind;
  note?: string;
  plannedFor?: string;
  createdAt: string;
  durationMin?: number;
  sentiment?: 'pos' | 'neu' | 'neg';
  dept?: Department;
}
