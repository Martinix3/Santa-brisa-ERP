// src/server/integrations/holded/mappers.ts

/**
 * HOLDED MAPPERS - Transforma datos de Holded al SSOT
 * 
 * Implementa las reglas de mapeo con:
 * - Claves naturales para idempotencia
 * - Normalización de datos (fechas, países, teléfonos)
 * - Data quality checks
 * - Preservación de payload original (raw)
 */

import type { 
  Account, 
  Item, 
  AccountType,
  Stage,
  ISODateString,
} from '@/domain/ssot';
import type { 
  HoldedContact, 
  HoldedProduct, 
  HoldedPayment, 
  HoldedWarehouse 
} from './validators';
import { 
  normalizeDate, 
  normalizeCountry, 
  normalizePhone,
  normalizeEmail,
  normalizeCIF,
  normalizePostalCodeES,
  toEan13,
  toGrams,
  mapHoldedContactType,
  mapPaymentMethod,
} from '@/domain/integration-helpers';

// =================================================================
// TYPES PARA NUEVAS ENTIDADES (temporal hasta añadir al SSOT)
// =================================================================

export interface CashflowPayment {
  id: string;
  provider: string;
  externalId: string;
  
  // Referencias
  partyId?: string;
  accountId?: string;
  contactName?: string;
  
  // Financiero
  amount: number;
  currency: string;
  kind: 'IN' | 'OUT';
  
  // Fechas
  date: ISODateString;
  postedAt?: ISODateString;
  
  // Método
  method?: 'TRANSFER' | 'CARD' | 'CASH' | 'CHECK' | 'PAYPAL' | 'STRIPE' | 'OTHER';
  bankId?: string;
  bankAccount?: string;
  
  // Documento
  doc?: {
    type: 'invoice' | 'trans' | 'receipt' | 'order' | 'other';
    id: string;
    number?: string;
  };
  
  // Estado
  status: 'NEW' | 'POSTED' | 'RECONCILED' | 'VOID';
  
  // Notas
  notes?: string;
  tags?: string[];
  
  // Integration metadata
  origin: {
    provider: string;
    eventId?: string;
    eventType?: string;
    syncedAt: ISODateString;
  };
  raw: any;
  
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  type: 'WAREHOUSE' | 'STORE' | 'PRODUCTION' | 'TRANSIT' | 'VIRTUAL';
  isDefault?: boolean;
  
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
  
  // Integration metadata
  externalIds?: {
    holded?: string;
    [key: string]: string | undefined;
  };
  origin?: {
    provider: string;
    eventId?: string;
    eventType?: string;
    syncedAt?: ISODateString;
  };
  raw?: any;
  
  active?: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// =================================================================
// DATA QUALITY
// =================================================================

export interface DataQuality {
  missing?: string[];
  invalid?: string[];
  warnings?: string[];
}

function checkContactQuality(contact: HoldedContact): DataQuality {
  const dq: DataQuality = {};
  
  // Missing fields
  const missing: string[] = [];
  if (!contact.email && !contact.mobile && !contact.phone) {
    missing.push('email', 'phone');
  }
  dq.missing = missing.length > 0 ? missing : undefined;
  
  // Invalid fields
  const invalid: string[] = [];
  if (contact.billAddress?.postalCode && contact.billAddress.countryCode === 'ES') {
    const normalized = normalizePostalCodeES(contact.billAddress.postalCode);
    if (!normalized) invalid.push('postalCode');
  }
  if (contact.vatnumber) {
    const normalized = normalizeCIF(contact.vatnumber);
    if (!normalized) invalid.push('cif');
  }
  dq.invalid = invalid.length > 0 ? invalid : undefined;
  
  return dq;
}

function checkProductQuality(product: HoldedProduct): DataQuality {
  const dq: DataQuality = {};
  const warnings: string[] = [];
  
  // SKU vacío
  if (!product.sku || product.sku.trim() === '') {
    warnings.push('SKU vacío - bloquear alta');
  }
  
  // Precio <= 0 y forSale = true
  const forSale = typeof product.forSale === 'number' ? product.forSale === 1 : product.forSale;
  if (forSale && (!product.price || product.price <= 0)) {
    warnings.push('Producto para venta sin precio válido');
  }
  
  // EAN-13 inválido
  if (product.barcode) {
    const ean = toEan13(product.barcode);
    if (!ean) warnings.push('Código de barras inválido');
  }
  
  dq.warnings = warnings.length > 0 ? warnings : undefined;
  
  return dq;
}

// =================================================================
// MAPPERS: HOLDED → SSOT
// =================================================================

/**
 * Mapea Contact de Holded a Account del SSOT
 * 
 * Reglas:
 * - ID: holded:contact:{holdedId} (clave natural)
 * - AccountType: inferido desde contact.type + heurísticas
 * - Stage: POTENCIAL por defecto (se recalcula por servicio)
 * - Normalización: fechas, país, teléfono, email, CIF
 * - Data Quality: checks automáticos
 */
export function mapContactToAccount(
  contact: HoldedContact,
  eventId?: string
): Partial<Account> & { 
  externalIds: { holded: string }; 
  origin: any; 
  raw: any;
  dq?: DataQuality;
} {
  const dq = checkContactQuality(contact);
  
  // Inferir AccountType
  const accountType: AccountType = mapHoldedContactType(contact.type);
  
  // Dirección de facturación normalizada
  const billingAddress = contact.billAddress ? {
    street: contact.billAddress.address ?? '',
    city: contact.billAddress.city ?? '',
    zip: normalizePostalCodeES(contact.billAddress.postalCode) ?? contact.billAddress.postalCode ?? '',
    province: contact.billAddress.province,
    country: normalizeCountry(contact.billAddress.country),
    countryCode: normalizeCountry(contact.billAddress.countryCode),
  } : undefined;
  
  // Dirección de envío (primera si hay)
  const shippingAddress = contact.shippingAddresses?.[0] ? {
    street: contact.shippingAddresses[0].address ?? '',
    city: contact.shippingAddresses[0].city ?? '',
    zip: normalizePostalCodeES(contact.shippingAddresses[0].postalCode) ?? contact.shippingAddresses[0].postalCode ?? '',
    province: contact.shippingAddresses[0].province,
    country: normalizeCountry(contact.shippingAddresses[0].country),
    countryCode: normalizeCountry(contact.shippingAddresses[0].countryCode),
  } : undefined;
  
  return {
    id: `holded:contact:${contact.id}`,
    name: contact.name || contact.tradeName || 'Sin nombre',
    segment: accountType as any, // SUPPLIER se mapea a DISTRIBUIDOR en el helper
    stage: 'POTENCIAL' as Stage,
    ownerId: 'system',
    flow: 'DIRECT',
    billingAddress,
    shippingAddress,
    createdAt: normalizeDate(contact.createdAt),
    updatedAt: normalizeDate(contact.updatedAt),
    
    // Integration metadata
    externalIds: { holded: contact.id },
    origin: {
      provider: 'holded',
      eventId,
      eventType: 'contact.sync',
      syncedAt: new Date().toISOString(),
    },
    raw: contact,
    dq: Object.keys(dq).length > 0 ? dq : undefined,
  } as any;
}

/**
 * Mapea Product de Holded a Item del SSOT
 */
export function mapProductToItem(
  product: HoldedProduct,
  eventId?: string
): Partial<Item> & { externalIds: { holded: string }; origin: any; raw: any; dq?: DataQuality } {
  const dq = checkProductQuality(product);
  
  const forSale = typeof product.forSale === 'number' ? product.forSale === 1 : product.forSale;
  const forPurchase = typeof product.forPurchase === 'number' ? product.forPurchase === 1 : product.forPurchase;
  
  return {
    id: `sku:${product.sku}`,
    sku: product.sku,
    name: product.name,
    category: 'fg', // Por defecto, refinar con lógica
    uom: 'unit',
    active: true,
    stdCost: product.cost ?? undefined,
    priceBase: product.price,
    
    // Integration metadata
    externalIds: { holded: product.id },
    origin: {
      provider: 'holded',
      eventId,
      eventType: 'product.sync',
      syncedAt: new Date().toISOString(),
    },
    raw: product,
    dq: Object.keys(dq).length > 0 ? dq : undefined,
  } as any;
}

/**
 * Mapea Payment de Holded a CashflowPayment
 */
export function mapPaymentToCashflow(
  payment: HoldedPayment,
  eventId?: string
): CashflowPayment {
  return {
    id: `holded:payment:${payment.id}`,
    provider: 'holded',
    externalId: payment.id,
    
    partyId: `holded:contact:${payment.contactId}`,
    contactName: payment.contactName,
    
    amount: payment.amount,
    currency: payment.currency,
    kind: payment.amount >= 0 ? 'IN' : 'OUT',
    
    date: normalizeDate(payment.date),
    
    method: payment.paymentMethod ? mapPaymentMethod(payment.paymentMethod) : undefined,
    bankId: payment.bankId ?? undefined,
    bankAccount: payment.bankAccount ?? undefined,
    
    doc: payment.documentId ? {
      type: payment.documentType === 'invoice' ? 'invoice' : 'trans',
      id: `holded:doc:${payment.documentId}`,
    } : undefined,
    
    status: 'POSTED',
    notes: payment.notes ?? undefined,
    
    origin: {
      provider: 'holded',
      eventId,
      eventType: 'payment.sync',
      syncedAt: new Date().toISOString(),
    },
    raw: payment,
    
    createdAt: normalizeDate(payment.createdAt),
    updatedAt: normalizeDate(payment.updatedAt),
  };
}

/**
 * Mapea Warehouse de Holded a Location
 */
export function mapWarehouseToLocation(
  warehouse: HoldedWarehouse,
  eventId?: string
): Location {
  return {
    id: `holded:warehouse:${warehouse.id}`,
    name: warehouse.name || 'Almacén Principal',
    type: 'WAREHOUSE',
    isDefault: warehouse.default,
    
    address: {
      street: warehouse.address ?? undefined,
      city: warehouse.city ?? undefined,
      province: warehouse.province ?? undefined,
      postalCode: normalizePostalCodeES(warehouse.postalCode) ?? warehouse.postalCode ?? undefined,
      country: normalizeCountry(warehouse.country),
      countryCode: normalizeCountry(warehouse.countryCode),
    },
    
    externalIds: { holded: warehouse.id },
    origin: {
      provider: 'holded',
      eventId,
      eventType: 'warehouse.sync',
      syncedAt: new Date().toISOString(),
    },
    raw: warehouse,
    
    active: true,
    createdAt: normalizeDate(warehouse.createdAt),
    updatedAt: normalizeDate(warehouse.updatedAt),
  };
}
