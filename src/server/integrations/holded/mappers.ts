// src/server/integrations/holded/mappers.ts
// =================================================================
// MAPPERS DE HOLDED RAW → SSOT
// =================================================================
// Todos usan materialize() para garantizar campos completos

import type { Account, Item, Warehouse, Order, OrderItem } from '@/domain/ssot';
import {
  DEFAULT_ACCOUNT,
  DEFAULT_ITEM,
  DEFAULT_WAREHOUSE,
  DEFAULT_ORDER,
  materialize,
} from './defaults';

const now = () => new Date().toISOString();

// =================================================================
// HELPERS
// =================================================================

function parseHoldedDate(unixSec: number | string | null | undefined): string {
  if (!unixSec) return now();
  const timestamp = typeof unixSec === 'number' ? unixSec * 1000 : parseInt(String(unixSec)) * 1000;
  return new Date(timestamp).toISOString();
}

// =================================================================
// CONTACT → ACCOUNT
// =================================================================

export function mapContactToAccount(raw: any): Account {
  const type = raw.type || '';
  const isSupplier = type === 'supplier' || raw.supplierRecord?.name;
  const isCustomer = type === 'client' || raw.clientRecord === 1 || raw.clientRecord === true;

  const patch: Partial<Omit<Account, 'id'>> = {
    name: String(raw.name || ''),
    legalName: raw.tradeName || raw.name || null,
    cif: raw.vatnumber || null,
    vat: raw.vatnumber || null,
    accountType: (isSupplier ? 'DISTRIBUIDOR' : isCustomer ? 'CLIENTE_FINAL' : 'OTRO') as any,
    accountStage: 'POTENCIAL',
    commercialFlow: 'DIRECTA',
    
    billingAddress: {
      street: raw.billAddress?.address || null,
      city: raw.billAddress?.city || null,
      postalCode: raw.billAddress?.postalCode || null,
      province: raw.billAddress?.province || null,
      country: raw.billAddress?.country || null,
    },
    
    shippingAddress: raw.shipAddress ? {
      street: raw.shipAddress?.address || null,
      city: raw.shipAddress?.city || null,
      postalCode: raw.shipAddress?.postalCode || null,
      province: raw.shipAddress?.province || null,
      country: raw.shipAddress?.country || null,
    } : {
      street: null,
      city: null,
      postalCode: null,
      province: null,
      country: null,
    },
    
    mainContactEmail: raw.email || null,
    mainContactPhone: raw.phone || raw.mobile || null,
    mainContactName: raw.contactName || raw.contactPerson || null,
    
    external: {
      holdedId: raw.id ? String(raw.id) : (null as any),
      shopifyCustomerId: null as any,
    },
    
    createdAt: now(),
    updatedAt: now(),
  };

  const account = materialize(DEFAULT_ACCOUNT, patch);
  return {
    id: String(raw.id || ''),
    ...account,
  };
}

// =================================================================
// PRODUCT → ITEM
// =================================================================

export function mapProductToItem(raw: any): Item {
  const price = typeof raw.total === 'number' ? raw.total
              : typeof raw.price === 'number' ? raw.price
              : 0;

  const patch: Partial<Omit<Item, 'id'>> = {
    name: String(raw.name || ''),
    sku: String(raw.sku || raw.id || ''),
    price,
    trackStock: !!raw.hasStock,
    trackBatches: !!raw.trackBatches,
    trackSerials: !!raw.trackSerials,
    gtin: raw.barcode ? [String(raw.barcode)] : [],
    
    external: {
      holdedId: raw.id ? String(raw.id) : (null as any),
      shopifyProductId: null as any,
    },
    
    createdAt: now(),
    updatedAt: now(),
  };

  const item = materialize(DEFAULT_ITEM, patch);
  return {
    id: String(raw.id || ''),
    ...item,
  };
}

// =================================================================
// WAREHOUSE → WAREHOUSE
// =================================================================

export function mapWarehouseToWarehouse(raw: any): Warehouse {
  const patch: Partial<Omit<Warehouse, 'id'>> = {
    name: String(raw.name || 'Almacén'),
    code: raw.code || null,
    default: !!raw.default,
    active: raw.active !== false,
    
    external: {
      holdedId: raw.id ? String(raw.id) : (null as any),
    },
    
    createdAt: now(),
    updatedAt: now(),
  };

  const warehouse = materialize(DEFAULT_WAREHOUSE, patch);
  return {
    id: String(raw.id || ''),
    ...warehouse,
  };
}

// =================================================================
// DOCUMENT → ORDER
// =================================================================

export function mapDocumentToOrder(raw: any): Order {
  const unixSec = raw.date ?? raw.createdAt ?? null;
  const isoDate = unixSec ? parseHoldedDate(unixSec) : now();

  // Mapear items
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const mappedItems: OrderItem[] = rawItems.map((it: any) => ({
    sku: String(it.sku || it.productId || ''),
    qty: Number(it.qty ?? it.units ?? 0),
    unitPrice: Number(it.price ?? 0),
    discountPct: typeof it.discount === 'number' ? it.discount : null,
    taxPct: typeof it.tax === 'number' ? it.tax : null,
    linkedPromotionIds: [],
  }));

  const patch: Partial<Omit<Order, 'id'>> = {
    accountId: raw.contactId ? String(raw.contactId) : undefined,
    date: isoDate,
    amount: Number(raw.total ?? 0),
    taxBase: typeof raw.subtotal === 'number' ? raw.subtotal : null,
    tax: typeof raw.tax === 'number' ? raw.tax : null,
    currency: 'EUR',
    status: 'ABIERTO',
    channel: 'DIRECTA',
    source: 'Holded',
    items: mappedItems,
    notes: raw.desc || raw.notes || null,
    
    holded: {
      documentId: raw.id ? String(raw.id) : (null as any),
      type: raw.documentType || raw.type || undefined,
      number: raw.number || raw.docNumber || (null as any),
    },
    
    createdAt: now(),
    updatedAt: now(),
  };

  const order = materialize(DEFAULT_ORDER, patch);
  return {
    id: String(raw.id || ''),
    ...order,
  };
}

// =================================================================
// EXPORTS
// =================================================================

export const MAPPERS = {
  contacts: mapContactToAccount,
  products: mapProductToItem,
  warehouses: mapWarehouseToWarehouse,
  documents: mapDocumentToOrder,
} as const;
