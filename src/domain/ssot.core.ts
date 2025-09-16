// domain/ssot.core.ts - Tipos canónicos compartidos

// --- Tipos Primitivos y Enums Transversales ---
export type Currency = 'EUR';
export type Uom = 'bottle' | 'case' | 'pallet' | 'ud' | 'kg' | 'g' | 'L' | 'mL';
export type ProductKind = 'RM' | 'SFG' | 'FG'; // Raw Material, Semi-Finished Good, Finished Good

// --- Entidades Maestras ---
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  managerId?: string;
  permissions?: string[];
  kpiBaseline?: {
    revenue?: number;
    unitsSold?: number;
    visits?: number;
  }
}

export type AccountType = 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'OTRO' | 'PROVEEDOR';
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  city?: string;
  country?: string;
  cif?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  // Campos específicos de cliente
  stage?: 'ACTIVA' | 'SEGUIMIENTO' | 'POTENCIAL' | 'FALLIDA';
  salesRepId?: string;
  distributorId?: string;
  lastInteractionAt?: string;
}


export interface Product {
  id: string;
  sku: string;
  name: string;
  kind: ProductKind;
  uom: Uom;
  // Para FG
  bottleMl?: number;
  caseUnits?: number;
  casesPerPallet?: number;
  // Para RM
  supplierIds?: string[];
}

export interface PriceListLine {
  productId: string;
  price: number;
  discount?: number;
}
export interface PriceList {
  id: string;
  name: string;
  currency: Currency;
  effectiveFrom: string;
  lines: PriceListLine[];
}

export interface Material {
    id: string;
    sku: string;
    name: string;
    specVersion?: string;
    supplierIds?: string[];
    allergens?: string[];
    certs?: string[];
    targetParams?: {
        code: string;
        name: string;
        uom: string;
        target: number;
        min?: number;
        max?: number;
    }[];
    createdAt: string;
    updatedAt: string;
}
