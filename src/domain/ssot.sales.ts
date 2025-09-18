// domain/ssot.sales.ts - Canónico de Ventas
import type { Currency } from './ssot.core';

export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
export type Department = 'PRODUCCION' | 'ALMACEN' | 'MARKETING' | 'VENTAS' | 'FINANZAS';
export type InteractionStatus = 'open' | 'done';

export interface OrderLine {
  sku: string;
  qty: number;
  unit: 'uds';
  priceUnit: number;
  discount?: number;
  lotIds?: string[];
  description?: string;
}

export interface OrderSellOut {
  id: string;
  accountId: string;
  status: OrderStatus;
  currency: Currency;
  createdAt: string;
  closedAt?: string;
  lines: OrderLine[];
  notes?: string;
  totalAmount?: number;
  source?: 'CRM' | 'SHOPIFY' | 'HOLDED' | 'MANUAL';
  paymentMethod?: string;
  paymentTermDays?: number;
  invoiceId?: string;
  externalRef?: string; // Para guardar el ID de la factura de Holded, etc.
}

export interface Interaction {
  id: string;
  userId: string; // El "owner" o creador de la tarea
  involvedUserIds?: string[]; // Usuarios adicionales implicados
  accountId?: string; // Cuenta de cliente asociada
  kind: InteractionKind;
  note?: string;
  plannedFor?: string;
  createdAt: string;
  durationMin?: number;
  sentiment?: 'pos' | 'neu' | 'neg';
  dept?: Department;
  status: InteractionStatus;
  
  // Campos "vitaminados"
  location?: string;
  linkedEntity?: {
    type: 'Order' | 'Account' | 'Campaign' | 'Collab' | 'Shipment' | 'ProductionOrder';
    id: string;
  };
  tags?: string[];
}
