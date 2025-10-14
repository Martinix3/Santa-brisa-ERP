// src/server/integrations/holded/validators.ts

/**
 * HOLDED VALIDATORS - Esquemas Zod para validación de payloads
 * 
 * Valida webhooks y respuestas API de Holded antes de mapear al SSOT
 */

import { z } from 'zod';

// =================================================================
// CONTACTS (Clientes/Proveedores)
// =================================================================

export const ZHoldedAddress = z.object({
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
});

export const ZHoldedContactPerson = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const ZHoldedContact = z.object({
  id: z.string(),
  type: z.enum(['client', 'supplier', 'both']).optional(),
  name: z.string().min(1),
  tradeName: z.string().nullable().optional(),
  vatnumber: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  mobile: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  
  billAddress: ZHoldedAddress.optional(),
  shippingAddresses: z.array(ZHoldedAddress).optional(),
  contactPersons: z.array(ZHoldedContactPerson).optional(),
  
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  
  // Metadata de Holded
  updatedAt: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  updatedHash: z.string().optional(),
  
  // Campos adicionales que pueden venir
  code: z.string().optional(),
  iban: z.string().nullable().optional(),
  swift: z.string().nullable().optional(),
});

export type HoldedContact = z.infer<typeof ZHoldedContact>;

// =================================================================
// PRODUCTS (Productos/Items)
// =================================================================

export const ZHoldedTax = z.object({
  id: z.string(),
  name: z.string().optional(),
  rate: z.number().optional(),
});

export const ZHoldedProduct = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  desc: z.string().nullable().optional(),
  
  // Precio y costos
  price: z.number().optional(),
  cost: z.number().nullable().optional(),
  
  // Control de uso
  forSale: z.union([z.number(), z.boolean()]).optional(),
  forPurchase: z.union([z.number(), z.boolean()]).optional(),
  
  // Stock (no confiable como source of truth)
  hasStock: z.boolean().optional(),
  stock: z.number().optional(),
  
  // Impuestos
  taxes: z.array(ZHoldedTax).optional(),
  
  // Logística
  barcode: z.string().nullable().optional(),
  weight: z.number().nullable().optional(), // kg o g, depende
  weightUnit: z.string().nullable().optional(),
  
  // Metadata
  updatedAt: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  updatedHash: z.string().optional(),
});

export type HoldedProduct = z.infer<typeof ZHoldedProduct>;

// =================================================================
// PAYMENTS (Pagos/Cobros)
// =================================================================

export const ZHoldedPayment = z.object({
  id: z.string(),
  
  // Contacto
  contactId: z.string(),
  contactName: z.string().optional(),
  
  // Monto y moneda
  amount: z.number(),
  currency: z.string().default('EUR'),
  
  // Fechas
  date: z.union([z.string(), z.number()]),
  
  // Documento relacionado
  documentType: z.enum(['invoice', 'trans', 'ticket', 'estimate', 'proforma']).optional(),
  documentId: z.string().optional(),
  
  // Método de pago
  paymentMethod: z.string().nullable().optional(),
  bankId: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  
  // Notas
  notes: z.string().nullable().optional(),
  
  // Metadata
  updatedAt: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
});

export type HoldedPayment = z.infer<typeof ZHoldedPayment>;

// =================================================================
// WAREHOUSES (Almacenes)
// =================================================================

export const ZHoldedWarehouse = z.object({
  id: z.string(),
  name: z.string(),
  
  // Ubicación
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
  
  // Configuración
  default: z.boolean().optional(),
  
  // Metadata
  updatedAt: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
});

export type HoldedWarehouse = z.infer<typeof ZHoldedWarehouse>;

// =================================================================
// WEBHOOKS (Eventos de Holded)
// =================================================================

export const ZHoldedWebhook = z.object({
  event: z.string(), // 'contact.created', 'contact.updated', etc.
  accountId: z.string(),
  timestamp: z.number(),
  
  // Payload según el tipo de evento
  data: z.record(z.any()),
});

export type HoldedWebhook = z.infer<typeof ZHoldedWebhook>;

// =================================================================
// HELPERS DE VALIDACIÓN
// =================================================================

/**
 * Valida y parsea un contact de Holded
 * Devuelve null si la validación falla
 */
export function validateHoldedContact(raw: unknown): HoldedContact | null {
  const result = ZHoldedContact.safeParse(raw);
  if (!result.success) {
    console.error('Invalid Holded Contact:', result.error);
    return null;
  }
  return result.data;
}

/**
 * Valida y parsea un product de Holded
 */
export function validateHoldedProduct(raw: unknown): HoldedProduct | null {
  const result = ZHoldedProduct.safeParse(raw);
  if (!result.success) {
    console.error('Invalid Holded Product:', result.error);
    return null;
  }
  return result.data;
}

/**
 * Valida y parsea un payment de Holded
 */
export function validateHoldedPayment(raw: unknown): HoldedPayment | null {
  const result = ZHoldedPayment.safeParse(raw);
  if (!result.success) {
    console.error('Invalid Holded Payment:', result.error);
    return null;
  }
  return result.data;
}

/**
 * Valida y parsea un warehouse de Holded
 */
export function validateHoldedWarehouse(raw: unknown): HoldedWarehouse | null {
  const result = ZHoldedWarehouse.safeParse(raw);
  if (!result.success) {
    console.error('Invalid Holded Warehouse:', result.error);
    return null;
  }
  return result.data;
}

/**
 * Valida un webhook de Holded
 */
export function validateHoldedWebhook(raw: unknown): HoldedWebhook | null {
  const result = ZHoldedWebhook.safeParse(raw);
  if (!result.success) {
    console.error('Invalid Holded Webhook:', result.error);
    return null;
  }
  return result.data;
}
