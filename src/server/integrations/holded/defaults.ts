// src/server/integrations/holded/defaults.ts
// =================================================================
// PLANTILLAS DE DATOS CON TODOS LOS CAMPOS
// =================================================================
// Garantiza que NUNCA hay undefined, solo null, '', 0, []
// Compatible con Firestore y SSOT v7

import type {
  Account,
  Item,
  Warehouse,
  Order,
  Address,
} from '@/domain/ssot';

const now = () => new Date().toISOString();

// =================================================================
// PLANTILLAS BASE
// =================================================================

export const EMPTY_ADDRESS: Address = {
  street: null as any,
  city: null as any,
  postalCode: null as any,
  province: null as any,
  country: null as any,
};

export const DEFAULT_ACCOUNT: Omit<Account, 'id'> = {
  name: '',
  legalName: null as any,
  cif: null as any,
  vat: null as any,
  accountType: 'OTRO',
  accountStage: 'POTENCIAL',
  parentAccountId: null as any,
  distributorId: null as any,
  salesRepId: null as any,
  channels: [],
  tags: [],
  billingAddress: { ...EMPTY_ADDRESS },
  shippingAddress: { ...EMPTY_ADDRESS },
  mainContactName: null as any,
  mainContactEmail: null as any,
  mainContactPhone: null as any,
  commercialFlow: 'DIRECTA',
  enrichment: undefined,
  paymentMethodDefault: null as any,
  paymentDaysDefault: null as any,
  discountDefaultPct: null as any,
  iban: null as any,
  custom: {},
  external: {
    holdedId: null as any,
    shopifyCustomerId: null as any,
  },
  createdAt: '',
  updatedAt: '',
  createdById: undefined,
  updatedById: undefined,
  deletedAt: undefined,
};

export const DEFAULT_ITEM: Omit<Item, 'id'> = {
  name: '',
  sku: '',
  gtin: [],
  kind: 'PRODUCT',
  uom: 'UNIT',
  pack: {
    unitsPerCase: null as any,
    casesPerPallet: null as any,
    taraKg: null as any,
  },
  trackStock: false,
  trackBatches: false,
  trackSerials: false,
  dimensions: {
    w: null as any,
    h: null as any,
    l: null as any,
    unit: null as any,
  },
  weightKg: null as any,
  volumeL: null as any,
  defaultTaxPct: null as any,
  msrp: null as any,
  cost: null as any,
  price: 0,
  categoryId: null as any,
  tags: [],
  images: [],
  suppliers: [],
  longDesc: null as any,
  marketingFlags: [],
  external: {
    holdedId: null as any,
    shopifyProductId: null as any,
  },
  createdAt: '',
  updatedAt: '',
  createdById: undefined,
  updatedById: undefined,
  deletedAt: undefined,
};

export const DEFAULT_WAREHOUSE: Omit<Warehouse, 'id'> = {
  name: '',
  code: null as any,
  active: true,
  address: { ...EMPTY_ADDRESS },
  kind: undefined,
  consignment: {
    ownerAccountId: null as any,
    terms: null as any,
    returnPolicy: null as any,
  },
  default: false,
  external: {
    holdedId: null as any,
  },
  createdAt: '',
  updatedAt: '',
  createdById: undefined,
  updatedById: undefined,
  deletedAt: undefined,
};

export const DEFAULT_ORDER: Omit<Order, 'id'> = {
  accountId: null as any,
  distributorId: null as any,
  channel: 'DIRECTA',
  source: 'Holded',
  date: '',
  currency: 'EUR',
  status: 'ABIERTO',
  amount: 0,
  taxBase: null as any,
  tax: null as any,
  discountTotal: null as any,
  items: [],
  notes: null as any,
  linkedPromotions: [],
  shipmentId: null as any,
  warehouseId: null as any,
  holded: {
    documentId: null as any,
    type: undefined,
    number: null as any,
  },
  createdAt: '',
  updatedAt: '',
  createdById: undefined,
  updatedById: undefined,
  deletedAt: undefined,
};

// =================================================================
// MATERIALIZE HELPER
// =================================================================
// Aplica un patch sobre una plantilla, garantizando que
// NUNCA quede undefined en el resultado

export function materialize<T extends Record<string, any>>(
  template: T,
  patch: Partial<T>
): T {
  const result: any = Array.isArray(template) ? [] : {};

  for (const key of Object.keys(template)) {
    const templateValue = (template as any)[key];
    const patchValue = (patch as any)[key];

    // Si el patch no tiene el campo, usar el template
    if (patchValue === undefined) {
      if (templateValue && typeof templateValue === 'object' && !Array.isArray(templateValue)) {
        // Si es objeto anidado, copiar recursivamente
        result[key] = materialize(templateValue, {});
      } else {
        // Usar valor por defecto del template (null, '', 0, [])
        result[key] = templateValue;
      }
    }
    // Si el patch tiene un objeto anidado, mergear recursivamente
    else if (
      patchValue &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue) &&
      templateValue &&
      typeof templateValue === 'object' &&
      !Array.isArray(templateValue)
    ) {
      result[key] = materialize(templateValue, patchValue);
    }
    // En cualquier otro caso, usar el valor del patch
    else {
      result[key] = patchValue;
    }
  }

  return result as T;
}
