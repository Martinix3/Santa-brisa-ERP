// src/domain/ssot.ts
// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL V3
// =================================================================
import type { Incident, Interaction } from './ssot.common';

export type Timestamp = string; // ISO string for full date-time
export type LotNumber = string;      // alias semántico
export type ISO = string;            // si quieres usarlo en campos no Timestamp

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------
export type Uom = 'bottle' | 'case' | 'pallet' | 'unit' | 'kg' | 'g' | 'L' | 'mL';
export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus =
  | 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED';

export type ProductionStage = 'PRODUCCION' | 'ENVASADO';
export type ItemCategory = 'fg'|'raw'|'pack'|'label'|'intermediate'|'consumable'|'merch';
export type QcStatus = 'PENDING'|'PASSED'|'FAILED'|'WAIVED';
export type LotBucket = 'HOLD'|'RELEASED'|'REJECTED';

export function qcToBucket(qc: QcStatus): LotBucket {
  switch (qc) {
    case 'PASSED':
    case 'WAIVED': return 'RELEASED';
    case 'FAILED': return 'REJECTED';
    default: return 'HOLD';
  }
}

// -----------------------------------------------------------------
// 2. Modelo Party / Role (Contacto Unificado)
// -----------------------------------------------------------------
export type Address = { address?: string; city?: string; zip?: string; province?: string; country?: string; countryCode?: string; };
export type CommItem = { value: string; isPrimary?: boolean; verified?: boolean; source?: 'CRM'|'HOLDED'|'IMPORT'|'USER'; updatedAt?: Timestamp; optOut?: boolean; };
export interface PartyPerson { name: string; role?: string; email?: CommItem; phone?: CommItem; updatedAt?: Timestamp; }

export interface Party {
  id: string;
  name: string;
  kind: 'ORG' | 'PERSON';
  legalName: string;
  tradeName?: string;
  taxId?: string;
  vat?: string;
  emails?: CommItem[];
  phones?: CommItem[];
  billingAddress?: Address;
  shippingAddress?: Address;
  handles?: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'twitter', string>>;
  tags?: string[];
  external?: { holdedContactId?: string; holdedUpdatedAt?: Timestamp; shopifyCustomerId?: string; };
  people?: PartyPerson[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CustomerData { priceListId?: string; paymentTermsDays?: number; salesRepId: string; billerId: string; }
export interface SupplierData { paymentTermsDays?: number; bankAccountNumber?: string; }
export interface InfluencerData { tier: 'nano' | 'micro' | 'mid' | 'macro'; audienceSize?: number; }
export interface EmployeeData { department: Department; managerId?: string; startDate: ISO; }

export interface PartyRole {
  id: string; partyId: string; role: PartyRoleType; isActive: boolean;
  data: CustomerData | SupplierData | InfluencerData | EmployeeData; createdAt: Timestamp;
}

export interface User {
  id: string; name: string; email?: string; role: UserRole; active: boolean; managerId?: string;
  kpiBaseline?: { revenue?: number; unitsSold?: number; visits?: number; }
}

export interface Account {
  id: string; code?: string; partyId: string; name: string; type: AccountType; stage: Stage; subType?: string;
  ownerId: string; createdAt: Timestamp; updatedAt?: Timestamp; lastInteractionAt?: Timestamp; notes?: string;
  external?: { shopifyCustomerId?: string; holdedContactId?: string; vat?: string; }
}

// -----------------------------------------------------------------
// 3. Catálogos y Producción
// -----------------------------------------------------------------
export interface Item {
  id: string; sku: string; name: string; category: ItemCategory;
  uom: Uom; active: boolean;
  bottleMl?: number; caseUnits?: number; casesPerPallet?: number; stdCost?: number;
}

export type BomLineRole = 'FORMULA'|'PACKAGING';
export interface BillOfMaterial {
  id: string; outputItemId: string; name: string; batchSize: number; baseUnit: Uom; stage?: ProductionStage;
  items: Array<{ itemId: string; qty: number; uom: Uom; role?: BomLineRole; }>;
  qcPlanId?: string;
}

export type ExecCheck = { id:string; done:boolean; checkedBy?:string; checkedAt?:string };
export interface ProductionOrder {
  id: string; orderNumber?: string; bomId: string; outputItemId: string; targetQuantity: number; status: ProductionStatus;
  createdAt: Timestamp; scheduledFor?: Timestamp; batchCode?: LotNumber; responsibleId?: string; name?: string; baseUnit?: Uom;
  checks?: ExecCheck[];
  incidents?: { id: string; when: Timestamp; severity: 'BAJA'|'MEDIA'|'ALTA'; text: string }[];
  reservations?: any[]; shortages?: any[]; actuals?: any[]; output?: any[]; execution?: any; costing?: any;
}

// -----------------------------------------------------------------
// 4. Inventario, Trazabilidad y Calidad
// -----------------------------------------------------------------
export type StockReason =
  | 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment'
  | 'return_in' | 'return_out' | 'ship' | 'consignment_send' | 'consignment_return' | 'consignment_sell'
  | 'sample_send' | 'sample_consume';

export interface StockMove {
  id: string; itemId: string; qty: number; uom: Uom; lotNumber?: LotNumber;
  fromLocationId?: string; toLocationId?: string;
  reason: StockReason; occurredAt: Timestamp; createdAt: Timestamp; unitCost?: number;
  ref?: { prodOrderId?: string; goodsReceiptId?: string; shipmentId?: string; orderId?: string };
}

export interface OnHandView {
  id: string; itemId: string; lotNumber: string; locationId: string; qty: number; uom: Uom;
  qcStatus: QcStatus; category: ItemCategory; expiryAt?: string | null; reservedQty?: number;
  createdAt: string; updatedAt: string;
}

export interface Lot {
  id: string; lotNumber: LotNumber; itemId: string; quantity: number;
  createdAt: Timestamp; orderId?: string; supplierId?: string; qcStatus: QcStatus; qcPlanId?: string;
  expDate?: Timestamp; receivedAt?: Timestamp; producedByOrderId?: string; createdByGoodsReceiptId?: string;
}

export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'QC_TEST' | 'SHIPMENT' | 'ADJUSTMENT' | 'MOVE';
export interface TraceEvent {
    id: string; at: string; kind: TraceEventKind; title: string; details: string;
    data?: Record<string, any>;
}

// -----------------------------------------------------------------
// 5. Documentos Operativos (Ventas, Compras, Envíos)
// -----------------------------------------------------------------
export type BillingStatus = 'PENDING'|'INVOICING'|'INVOICED'|'PAID'|'FAILED';
export interface OrderSellOut {
  id: string; docNumber?: string; partyId: string; accountId: string; source: 'CRM'|'SHOPIFY'|'OTHER' | 'MANUAL' | 'HOLDED';
  createdAt: Timestamp; currency: Currency;
  lines: Array<{ itemId: string; name?: string; qty: number; priceUnit: number; taxRate?: number; discountPct?: number; uom?: Uom | 'uds'; lotNumbers?: LotNumber[]; }>;
  notes?: string; billingStatus?: BillingStatus; status: OrderStatus; totalAmount?: number;
  external?: { shopifyOrderId?: string; holdedInvoiceId?: string; };
}

export interface GoodsReceipt {
  id: string; receiptNumber?: string; supplierPartyId: string; receivedAt: Timestamp; deliveryNote?: string;
  status: 'pending_qc'|'completed'|'partial'; currency?: Currency;
  lines: Array<{ itemId: string; qty: number; uom: Uom; unitCost: number; lotNumber: LotNumber; }>;
  notes?: string | null;
}

export interface ShipmentLine { itemId: string; name?: string; qty: number; uom: Uom | 'uds'; lotNumber?: LotNumber; }
export interface Shipment {
  id: string; shipmentNumber?: string; orderId: string; accountId: string; partyId: string; mode: 'PARCEL'|'PALLET';
  createdAt: Timestamp; updatedAt: Timestamp; status: ShipmentStatus; lines: ShipmentLine[];
  customerName: string; city: string; addressLine1?: string; addressLine2?: string; postalCode?: string; country?: string;
  carrier?: string; labelUrl?: string; trackingCode?: string; trackingUrl?: string; notes?: string;
  packedById?: string; checks?: { visualOk?: boolean }; isSample?: boolean; samplePurpose?: 'sales'|'qc'|'mkt'|'other';
  sampleNotes?: string; weightKg?: number; dimsCm?: { l:number; w:number; h:number };
  deliveryNoteId?: string; holdedDeliveryId?: string; holdedInvoiceId?: string;
}

export * from './ssot.common';

// -----------------------------------------------------------------
// 6. Lista de Colecciones de la Base de Datos
// -----------------------------------------------------------------
export interface SantaData {
  items: Item[];
  stockMoves: StockMove[];
  productionOrders: ProductionOrder[];
  ordersSellOut: OrderSellOut[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];
  onHand: OnHandView[];
  parties: Party[];
  partyRoles: PartyRole[];
  accounts: Account[];
  users: User[];
  interactions: Interaction[];
  billOfMaterials: BillOfMaterial[];
  lots: Lot[];
  // Deprecated / To be removed
  qaChecks: any[];
  inventory: any[];
  products: any[];
  materials: any[];
  suppliers: any[];
  distributors: any[];
  // Placeholders / Future
  [key: string]: any;
}

export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [
  'items', 'stockMoves', 'productionOrders', 'ordersSellOut', 'shipments', 'goodsReceipts',
  'onHand', 'parties', 'partyRoles', 'accounts', 'users', 'interactions', 'billOfMaterials', 'lots',
  // Deprecated
  'qaChecks', 'inventory', 'products', 'materials', 'suppliers', 'distributors',
];

export * from './ssot.metas';
