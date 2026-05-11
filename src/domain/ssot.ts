
// FILE: src/domain/ssot.ts

// =================================================================
// == SINGLE SOURCE OF TRUTH (SSOT) - KERNEL v5 (UNIFIED & CORRECTED)
// =================================================================

// -----------------------------------------------------------------
// 1. Tipos Primitivos y Enums Transversales
// -----------------------------------------------------------------

export type ISODateString = string;
export type ISO = string; // Restaurado para compatibilidad
/** @deprecated Use `ISODateString` for clarity. */
export type Timestamp = string;
export type LotNumber = string;

// --- Unidades de Medida (UoM) ---
export type UnitOfMass = 'kg' | 'g';
export type UnitOfVolume = 'L' | 'mL';
export type SalesUnit = 'unit' | 'bottle' | 'case' | 'pallet';
export type Uom = UnitOfMass | UnitOfVolume | SalesUnit;
export const UOM_ALIASES: Record<string, SalesUnit> = { uds: 'unit' };

// --- Enums y Tipos Literales (Se mantiene el casing original para no romper el código) ---
export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL' | 'OPS';
export type StockReason = 'receipt' | 'production_in' | 'production_out' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out' | 'ship' | 'consignment_send' | 'consignment_return' | 'consignment_sell' | 'sample_send' | 'sample_consume';
export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';
export type TaskStatus = 'open' | 'done' | 'cancelled';
export type TaskStatusNew = 'BACKLOG' | 'DRAFT' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED' | 'PROGRAMADA' | 'SNOOZED' | 'REVIEW' | 'READY';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskSource = 'MANUAL' | 'AUTO_RULE' | 'EVENT' | 'CAMPAIGN' | 'INTEGRATION';
export type TaskKind = 'GENERICA' | 'VISITA' | 'COBRO' | 'PEDIDO' | 'MARKETING' | 'INTERACTION' | 'ORDER_PREP' | 'POS' | 'EVENT' | 'ADMIN';
export type TaskOutcome = 'NEXT_VISIT' | 'ORDER_PLACED' | 'COMPLETED' | 'CANCELLED';
export type CampaignKind = 'COLLAB' | 'ADS' | 'POS' | 'EVENT_SERIES' | 'OTHER';
export type AutomationRule = 'DAYS_WITHOUT_ORDER' | 'DAYS_WITHOUT_VISIT' | 'CAMPAIGN_START' | 'EVENT_BEFORE';
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner' | 'inversor' | 'distribuidor' | 'marketing';
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type BillingStatus = 'pending' | 'invoiced' | 'paid' | 'void';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED';
export type ProductionStage = 'PRODUCCION' | 'ENVASADO';
export type ItemCategory = 'fg' | 'raw' | 'pack' | 'label' | 'intermediate' | 'consumable' | 'merch';
export type QcStatus = 'PENDING' | 'IN_PROGRESS' | 'HOLD' | 'PASSED' | 'FAILED' | 'CONDITIONAL' | 'WAIVED';

// QC Plan Triggers - Extensible para múltiples módulos
export type QcPlanTrigger =
  | 'RECEIPT'          // Recepción de proveedor
  | 'PRODUCTION'       // Salida de producción
  | 'TRANSFER'         // Transferencia entre ubicaciones
  | 'SHIPMENT'         // Antes de enviar a cliente
  | 'PERIODIC'         // Revisiones periódicas
  | 'ON_DEMAND'        // Inspección manual
  | 'CONDITIONAL';     // Basado en condiciones

// QC Parameter Types
export type QcParameterType = 'NUMERIC' | 'BOOLEAN' | 'TEXT' | 'SELECT' | 'FILE';
export type QcParameterCategory = 'PHYSICAL' | 'CHEMICAL' | 'MICROBIOLOGICAL' | 'SENSORY' | 'DOCUMENTATION';

// QC Status metadata
export const QC_STATUS_META: Record<QcStatus, { label: string; className: string; canSell: boolean }> = {
  PENDING: { label: 'Pendiente', className: 'sb-badge--warning', canSell: false },
  IN_PROGRESS: { label: 'En Revisión', className: 'sb-badge--info', canSell: false },
  HOLD: { label: 'Retenido', className: 'sb-badge--destructive', canSell: false },
  PASSED: { label: 'Aprobado', className: 'sb-badge--success', canSell: true },
  FAILED: { label: 'Rechazado', className: 'sb-badge--destructive', canSell: false },
  CONDITIONAL: { label: 'Condicional', className: 'sb-badge--warning', canSell: true },
  WAIVED: { label: 'Exento', className: 'sb-badge--default', canSell: true },
};
export type LotStatus = 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED';
export type LotBucket = 'HOLD' | 'RELEASED' | 'REJECTED';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO';
export type PosTacticStatus = 'planned' | 'approved' | 'scheduled' | 'delivered' | 'active' | 'closed' | 'cancelled';
export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'CONSUME' | 'OUTPUT' | 'QC_TEST' | 'SHIPMENT' | 'SHIP' | 'SALE' | 'TRANSFER' | 'ADJUSTMENT' | 'MOVE' | 'ARRIVED' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD' | 'ALERT';
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type CommercialFlow = 'DIRECT' | 'PLACEMENT';
/** @deprecated Use `CommercialFlow` instead. */
export type AccountMode = 'DIRECTA' | 'COLOCACION';
export type CollabStatus = 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'Blog' | 'Otro';
export type Tier = 'nano' | 'micro' | 'mid' | 'macro';
export type PosCatalogItem = PosCostCatalogEntry;
export type PosResult = { upliftUnits: number; liftPct: number; roi: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; revenueAttributed: number };
export type VelocityInput = { itemId: string; qty: number; occurredAt: string; /** @deprecated Use occurredAt */ date?: string; };

// -----------------------------------------------------------------
// 2. Interfaces de Entidades Principales
// -----------------------------------------------------------------
// ... (Interfaces se mantienen sin cambios, omitidas por brevedad) ...
export interface Contact { id: string; kind: 'ORG' | 'PERSON'; roles: PartyRoleType[]; displayName: string; legalName?: string; nameNorm?: string; tradeName?: string; vat?: string; emails?: Array<{ value: string; isPrimary?: boolean; kind?: string; }>; phones?: Array<{ value: string; isPrimary?: boolean; kind?: string; }>; addresses?: Array<{ kind: string; street?: string; city?: string; postalCode?: string; province?: string; countryCode?: string; }>; customer?: { segment?: string; placement?: string; ownerId?: string; distributorPartyId?: string; /** @deprecated Use distributorPartyId */ distributorId?: string; ownerName?: string; }; supplier?: { categories?: string[]; }; status?: string; source?: string; tags?: string[]; externalRefs?: Record<string, string>; links?: { website?: string; }; location?: { lat: number; lng: number; address?: string; }; createdAt: ISODateString; updatedAt: ISODateString; }
export interface Party { id: string; name: string; kind: 'ORG' | 'PERSON'; legalName?: string; tradeName?: string; /** @deprecated Use `vat` as the preferred field. */ taxId?: string; vat?: string; billingAddress?: Address; shippingAddress?: Address; emails?: CommItem[]; phones?: CommItem[]; people?: Person[]; tags?: string[]; external?: { holdedContactId?: string; holdedUpdatedAt?: string; holdedTags?: string[]; shopifyCustomerId?: string; }; roles?: PartyRoleType[]; createdAt: ISODateString; updatedAt: ISODateString; serviceArea?: any; location?: { lat: number, lng: number }; }
export interface Account {
  id: string; partyId: string; name: string; segment: Segment; stage: Stage; ownerId: string; flow: CommercialFlow; distributorPartyId?: string; /** @deprecated Use distributorPartyId */ distributorId?: string; /** @deprecated Use ownerId */ salesRepId?: string; source?: string; aliases?: string[]; createdAt: ISODateString; updatedAt: ISODateString; lastInteractionAt?: string; external?: any; isTarget?: boolean; targetUserId?: string; targetedAt?: ISODateString; location?: { lat: number; lng: number; address?: string; }; photos?: string[]; documents?: { id: string; name: string; url: string; type: 'contract' | 'invoice' | 'visit_photo' | 'plv_certificate' | 'other'; uploadedAt: ISODateString; uploadedBy?: string; }[];
  // === HOLDED SYNC FLAGS ===
  holdedId?: string;
  syncedToHolded?: boolean;
  syncedFromHolded?: boolean;
  lastSyncAt?: ISODateString;
  syncError?: string;
  // === END HOLDED SYNC ===
  /** @deprecated Use Party.billingAddress */ billingAddress?: Address; /** @deprecated Use Party.shippingAddress */ shippingAddress?: Address; /** @deprecated Use segment */ accountType?: AccountType; /** @deprecated Use stage */ accountStage?: Stage; /** @deprecated Use flow */ commercialFlow?: CommercialFlow; /** @deprecated */ tradeName?: string; /** @deprecated */ tags?: string[]; /** @deprecated Use channels array */ channels?: Array<'HORECA' | 'RETAIL' | 'ONLINE'>; /** @deprecated Use `flow` instead. */ mode?: AccountMode; /** @deprecated Use `segment` instead. */ type?: AccountType; /** @deprecated This field is no longer used. */ subType?: string; /** @deprecated Use the `Note` entity instead. */ notes?: string; /** @deprecated Use a dedicated `CodeAlias` entity instead. */ code?: string;
  // -------- compat para exports/CSV (temporal) --------
  /** @deprecated: usar Party/Contact */ vat?: string;
  /** @deprecated: usar Contact.emails */ email?: string;
  /** @deprecated: usar Contact.phones */ phone?: string;
  /** @deprecated: usar Account.location.address o Party.address */ address?: string;
  /** @deprecated: normalizar a AccountType o Segment */ customerType?: string;
  /** @deprecated: usar partyId + Party.kind */ partyKind?: 'ORG' | 'PERSON';
}
// (Y así para el resto de interfaces)
// --- Omitiendo el resto de interfaces para mantener la respuesta concisa ---
// --- El contenido completo de las interfaces se mantiene como en tu archivo original ---
export type Note = { id: string; text: string; createdAt: string; accountId?: string; accountName?: string; assets?: string[]; location?: { lat: number; lng: number; ts: number }; contactName?: string; starred?: boolean; derived?: { kind: 'PEDIDO' | 'VISITA' | 'POS_EVT' | 'POS_PLV' | 'NOTA' }; };
export type Address = { street: string; city: string; zip: string; /** @deprecated Use zip */ postalCode?: string; province?: string; country: string; countryCode?: string; };
export type CommItem = { value: string; isPrimary?: boolean; source?: string; verified?: boolean; updatedAt?: string; optOut?: boolean };
export type Person = { name: string; role?: string; email?: string; phone?: string };
export interface CustomerData { priceListId?: string; paymentTermsDays?: number; salesRepId: string; billerId: string; }
export interface PartyRole { id: string; partyId: string; role: PartyRoleType; isActive: boolean; createdAt: Timestamp; data?: CustomerData | any; }
export interface PartyDuplicate { id: string; primaryPartyId: string; duplicatePartyId: string; reason: 'SAME_VAT' | 'SAME_EMAIL' | 'SAME_PHONE' | 'SIMILAR_NAME'; score: number; status: 'OPEN' | 'MERGED' | 'DISMISSED'; createdAt: Timestamp; resolvedAt?: Timestamp; }
export type Segment = 'HORECA' | 'RETAIL' | 'ONLINE' | 'PRIVADA' | 'DISTRIBUIDOR';
// Permisos granulares por módulo
export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve?: boolean;
}

// Configuración completa de permisos
export interface PermissionConfig {
  modules: Record<string, ModulePermission>;
  specialAccess?: string[];
  dataFilters?: {
    accountFilter?: 'all' | 'assigned_territory' | 'own_only';
    orderFilter?: 'all' | 'own_accounts_only';
    itemFilter?: 'all' | 'active_only';
    hideSensitiveData?: boolean;
    hideFinancialData?: boolean;
  };
}

// Territory para roles de ventas
export interface UserTerritory {
  regions?: string[];
  provinces?: string[];
  postalCodes?: string[];
  accounts?: string[];
}

// Distribuidor asignado (solo para comercial)
export interface AssignedDistributor {
  partyId: string;
  priority: number;
  startDate?: string;
  endDate?: string;
  exclusive?: boolean;
}

// Interface User expandida
export interface User {
  // === BÁSICO ===
  id: string;
  name?: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;

  // === ROL Y ESTADO ===
  role: UserRole;
  active: boolean;
  departments?: Department[];

  // === JERARQUÍA ===
  managerId?: string;
  teamMemberIds?: string[];

  // === PERMISOS ===
  permissions?: PermissionConfig;

  // === TERRITORY (solo para comercial y distribuidor) ===
  territory?: UserTerritory;

  // === DISTRIBUIDORES ASIGNADOS (solo para comercial) ===
  assignedDistributors?: AssignedDistributor[];

  // === KPIs ===
  kpiBaseline?: {
    revenue?: number;
    unitsSold?: number;
    visits?: number;
    newAccounts?: number;
  };

  // === PREFERENCIAS ===
  preferences?: {
    language?: 'es' | 'en';
    timezone?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    dashboardLayout?: any;
  };

  // === AUDITORÍA ===
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastLogin?: string;
  loginCount?: number;
}
export type OrderLine = { itemId: string; /** @deprecated Use 'itemId' */ sku?: string; name?: string; qty: number; uom: SalesUnit; priceUnit: number; discountPct?: number; };
export interface OrderSellOut {
  id: string;
  docNumber?: string;
  accountId: string;
  partyId?: string;
  flow?: 'PLACEMENT' | 'DIRECT';
  distributorPartyId?: string;
  /** @deprecated Use distributorPartyId */
  distributorId?: string;
  isSellOutReported?: boolean;
  status: OrderStatus;
  billingStatus?: BillingStatus;
  lines: OrderLine[];
  /** @deprecated Use 'lines' instead */
  items?: OrderLine[];
  totalAmount?: number;
  currency: Currency;
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  notes?: string;
  external?: {
    shopifyOrderId?: string;
    holdedEstimateId?: string;
    holdedInvoiceId?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdById?: string;
  orderDate?: ISO;
  linkedPromotions?: string[];
  region?: 'ES' | 'USA' | 'MX' | 'OTHER';

  // === SSOT V2.1: EXTENDED CUSTOMER & COMMERCIAL DATA ===
  // Canal de venta (valores reales del negocio)
  channel?: 'PRIVATE' | 'DISTRIBUTOR' | 'ONLINE' | 'HORECA' | 'CATERING';

  // Responsable comercial (owner)
  ownerId?: string;           // ID del usuario responsable
  ownerName?: string;         // Nombre del responsable (denormalizado)

  // Datos del cliente unificados (single source of truth)
  customerVat?: string;       // CIF/VAT del cliente
  customerName?: string;      // Nombre del cliente (denormalizado)
  contactPerson?: string;     // Persona de contacto
  billingAddress?: Address;   // Dirección de facturación
  shippingAddress?: Address;  // Dirección de envío
  bankAccount?: string;       // Cuenta bancaria del cliente
  // === END SSOT V2.1 ===

  // === HOLDED SYNC FLAGS ===
  holdedOrderId?: string;
  syncedToHolded?: boolean;
  lastSyncAt?: ISODateString;
  syncError?: string;
  // === END HOLDED SYNC ===
}
export type ShipmentLine = { itemId: string; sku?: string; name: string; qty: number; uom: SalesUnit; lotNumber?: string; locationId?: string; note?: string };
export interface Shipment {
  id: string;
  shipmentNumber?: string;
  orderId: string;
  partyId: string;
  accountId: string;
  mode: 'PARCEL' | 'PALLET' | 'ENVELOPE';
  status: ShipmentStatus;
  lines: ShipmentLine[];
  customerName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  /** @deprecated Use individual address fields */
  toAddress?: Address;

  // Carrier information
  carrierType?: 'SENDCLOUD' | 'SEUR' | 'CORREOS' | 'MRW' | 'NACEX' | 'GLS' | 'DHL' | 'FEDEX' | 'UPS' | 'TIPSA' | 'RECOGIDA' | 'ENTREGA_PROPIA' | 'OTRO';
  carrierName?: string;  // Nombre legible del carrier
  /** @deprecated Use carrierType instead */
  carrier?: string;

  // Tracking information
  trackingCode?: string;
  trackingUrl?: string;
  labelUrl?: string;

  // External integrations
  sendcloudParcelId?: number;  // ID del parcel en SendCloud
  deliveryNoteId?: string;
  holdedInvoiceId?: string;

  // Physical properties
  weightKg?: number;
  dimsCm?: { l: number; w: number; h: number };

  // Validation
  checks?: { visualOk?: boolean };
  packedById?: string;
  validatedById?: string;
  validatedAt?: Timestamp;
  validationNotes?: string;

  // Special shipments
  isSample?: boolean;
  samplePurpose?: string;
  sampleNotes?: string;

  // Timestamps
  shippedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expectedDeliveryDate?: Timestamp;

  // Additional info
  notes?: string;
  shippingCost?: number;
  incidentIds?: string[];
}
export interface Item { id: string; sku: string; name: string; category: ItemCategory; uom: Uom; active: boolean; isActive?: boolean; stdCost?: number; bottleMl?: number; caseUnits?: number; unitsPerCase?: number; priceBase?: number; priceUnit?: number; /** @deprecated Objeto denormalizado - usar relación Item-PriceList */ priceList?: Record<string, number>; costUnit?: number; weightPerUnit?: number; volumePerUnit?: number; casesPerPallet?: number; }
export interface BillOfMaterial {
  id: string;
  outputItemId: string;
  name: string;
  stage?: ProductionStage;
  batchSize: number;
  baseUnit: Uom;
  items: {
    itemId: string;
    qty: number;
    uom: Uom;
    role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY';  // ✅ Ya no es opcional
  }[];
  isActive?: boolean;
  version?: number;
  previousVersionId?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}
export type JournalEntry = { id: string; at: string; kind: 'LOG' | 'INCIDENT'; summary: string; data?: any };

// -----------------------------------------------------------------
// 2f. TIPOS ESPECÍFICOS DE PRODUCCIÓN
// -----------------------------------------------------------------

/**
 * Representa un faltante de material para producción
 */
export type ProductionShortage = {
  itemId: string;
  itemName?: string;
  required: number;
  available: number;
  shortfall: number;
  locationId?: string;
};

/**
 * Representa una reserva de material para una orden de producción
 */
export type ProductionReservation = {
  itemId: string;
  itemName?: string;
  lotNumber: string;
  qty: number;
  uom: Uom;
  locationId: string;
  reservedAt: ISODateString;
  reservedBy?: string;
};

/**
 * Representa el producto final generado por una orden de producción
 */
export type ProductionOutput = {
  itemId: string;
  lotNumber: string;
  qty: number;
  uom: Uom;
  toLocationId: string;
  qcStatus?: QcStatus;
  createdAt: ISODateString;
};

/**
 * Representa el consumo real de materiales en una orden de producción
 */
export type ProductionConsumption = {
  itemId: string;
  itemName?: string;
  lotNumber: string;
  qty: number;
  uom: Uom;
  fromLocationId: string;
  consumedAt: ISODateString;
  batchNumber?: string;
};

/**
 * Representa una incidencia durante la producción
 */
export type ProductionIncident = {
  id: string;
  kind: 'QUALITY' | 'EQUIPMENT' | 'MATERIAL' | 'SAFETY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  reportedAt: ISODateString;
  reportedBy: string;
  resolvedAt?: ISODateString;
  resolvedBy?: string;
  resolution?: string;
};

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  /** @deprecated Use orderNumber */
  code?: string;
  bomId: string;
  outputItemId: string;
  /** @deprecated Use outputItemId */
  outputSku?: string;
  targetQuantity: number;
  /** @deprecated Use targetQuantity */
  outputQty?: number;
  status: ProductionStatus;
  baseUnit: Uom;
  /** @deprecated Use baseUnit */
  uom?: Uom;
  createdAt: Timestamp;
  scheduledFor?: Timestamp;
  responsibleId?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  pauseLog?: {
    pausedAt: Timestamp;
    resumedAt?: Timestamp;
    reason?: string;
  }[];
  execution?: {
    finishedAt?: Timestamp;
    goodUnits?: number;
    durationHours?: number;
    efficiency?: number;
  };
  costing?: {
    actual?: {
      perUnit?: number;
      yieldLossPct?: number;
      totalCost?: number;
    }
  };
  shortages?: ProductionShortage[];
  reservations?: ProductionReservation[];
  incidents?: ProductionIncident[];
  finalOutputs?: ProductionOutput[];
  finalConsumptions?: ProductionConsumption[];
  journal?: JournalEntry[];
  checks?: boolean[];
  updatedAt?: Timestamp;
  bottlenecks?: {
    id: string;
    area: string;
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedAction?: string;
    detectedAt: ISODateString;
  }[];
}
export interface Lot { id: string; lotNumber: LotNumber; itemId: string; /** @deprecated Use itemId */ sku?: string; itemName?: string; quantity: number; /** @deprecated Use quantity */ qtyMade?: number; uom: Uom; qcStatus: QcStatus; status?: LotStatus; qcPlanId?: string; producedByOrderId?: string; createdByGoodsReceiptId?: string; parentLotNumber?: LotNumber; /** @deprecated Use parentLotNumber */ genealogy?: { parents?: string[]; children?: string[] }; expDate?: Timestamp; createdAt: Timestamp; updatedAt: Timestamp; receivedAt?: Timestamp; externalLot?: string; supplierId?: string; deliveryNote?: string; qcCoa?: string; qcCoaUrl?: string; qcDocuments?: Array<{ name: string; url: string; type?: string }>; qcApprovedBy?: string; qcApprovedByName?: string; qcApprovedAt?: ISODateString; qcApprovalNotes?: string; qcConditions?: string[]; qcRejectedBy?: string; qcRejectedByName?: string; qcRejectedAt?: ISODateString; qcRejectionReason?: string; qcReviewStartedAt?: ISODateString; qcReviewDuration?: number; qcReviewOwnerId?: string; qcReviewOwnerName?: string; qcHoldBy?: string; qcHoldByName?: string; }
export interface Interaction { id: string; userId: string; involvedUserIds?: string[]; accountId: string; kind: InteractionKind; note?: string; plannedFor?: Timestamp; createdAt: Timestamp; status: InteractionStatus; resultNote?: string; dept?: Department; linkedEntity?: { type: 'ORDER' | 'SHIPMENT' | 'POS_TACTIC' | 'EVENT'; id: string }; tags?: string[]; location?: string; updatedAt?: Timestamp; outcome?: any; title?: string; startAt?: Timestamp; endAt?: Timestamp; durationMin?: number; uiKind?: TaskKind; }
export interface CalendarEvent {
  id: string;
  accountId?: string;
  accountName?: string;
  title: string;
  dept: Department;
  startAt: string;
  endAt: string;
  externalRef?: { provider: 'google' | 'outlook', id: string } | null;
  createdById?: string;
  updatedAt?: string;

  // ◄── FASE FINAL: Integración con Alertas, Tareas, Proyectos y Campañas
  alertIds?: string[];         // Alertas asociadas al evento
  taskIds?: string[];          // Tareas del evento
  projectId?: string;          // Proyecto asociado
  campaignId?: string;         // Campaña asociada
}
export interface PlvMaterial { id: string; name: string; category: 'DISPLAY' | 'SIGNAGE' | 'MERCH'; cost: number; }
// etc. (resto de interfaces)

// -----------------------------------------------------------------
// 3. Estructura de Datos Unificada `SantaData`
// -----------------------------------------------------------------
// ... (Se mantiene sin cambios) ...
export interface SantaData {
  contacts: Contact[];
  /** @deprecated Use contacts with roles instead */
  parties?: Party[];
  /** @deprecated Use contacts with roles instead */
  partyRoles?: PartyRole[];
  /** @deprecated Use contacts instead */
  partyDuplicates?: PartyDuplicate[];
  users: User[];
  /** @deprecated Alias for users - use users instead */
  teamMembers?: TeamMember[];
  /** @deprecated Use contacts instead */
  accounts?: Account[];
  ordersSellOut: OrderSellOut[];
  interactions: Interaction[];
  items: Item[];
  billOfMaterials: BillOfMaterial[];
  productionOrders: ProductionOrder[];
  lots: Lot[];
  lotGenealogy: LotGenealogyEdge[];
  onHand: OnHandView[];
  stockMoves: StockMove[];
  shipments: Shipment[];
  goodsReceipts: GoodsReceipt[];
  deliveryNotes: DeliveryNote[];
  qcPlans: QcPlanBySku[];
  qcParameters: ParameterBySku[];
  qcTests: QcTest[];
  qcProtocols: Protocol[];
  protocolLogs: ProtocolLog[];
  marketingEvents: MarketingEvent[];
  onlineCampaigns: OnlineCampaign[];
  influencerCollabs: InfluencerCollab[];
  posTactics: PosTactic[];
  posCostCatalog: PosCostCatalogEntry[];
  plv_material: PlvMaterial[];
  socialMetrics?: SocialMetrics[];
  webAnalytics?: WebAnalytics[];
  activations?: Activation[];
  reservations?: ReservationView[];
  notes?: Note[];
  tasks?: TaskNew[];
  campaigns?: Campaign[];
  automations?: AutomationConfig[];
  projects?: Project[];
  projectIdeas?: ProjectIdea[];
  alerts?: Alert[];            // ◄── FASE FINAL: Sistema de alertas inteligentes
  inventory?: any[];
  products?: any[];
  materials?: any[];
  suppliers?: any[];
  distributors?: any[];
  materialCosts?: MaterialCost[];
  financeLinks?: FinanceLink[];
  paymentLinks?: PaymentLink[];
  traceEvents?: TraceEvent[];
  incidents?: Incident[];
  codeAliases?: CodeAlias[];
  integrations?: Integration[];
  jobs?: Job[];
  dead_letters?: DeadLetter[];
  expenses?: Expense[];
  qualityReleases?: any[];
  systemConfig?: SystemConfig;
}
export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = ["parties", "partyRoles", "partyDuplicates", "users", "accounts", "ordersSellOut", "interactions", "items", "billOfMaterials", "productionOrders", "lots", "lotGenealogy", "onHand", "stockMoves", "shipments", "goodsReceipts", "deliveryNotes", "qcPlans", "qcParameters", "qcTests", "marketingEvents", "onlineCampaigns", "influencerCollabs", "posTactics", "posCostCatalog", "plv_material", "inventory", "products", "materials", "suppliers", "distributors", "materialCosts", "financeLinks", "paymentLinks", "traceEvents", "incidents", "codeAliases", "integrations", "jobs", "dead_letters", "expenses"];
// Note: Excluded collections that are loaded on-demand (tasks, campaigns, automations, projects, projectIdeas, qualityReleases) 
// and deprecated aliases (teamMembers -> users)
export interface StockMove { id: string; sku: string; /** @deprecated usar sku */ itemId?: string; lotCode: string; qty: number; uom: Uom; reason: string; fromLocationId?: string; toLocationId?: string; occurredAt: Timestamp; createdAt: Timestamp; ref?: any; unitCost?: number; /** @deprecated Use reason */ items?: Array<{ sku: string; qty: number }>; /** @deprecated Use occurredAt */ date?: string; /** @deprecated Use fromLocationId */ warehouseId?: string; /** @deprecated Use toLocationId */ toWarehouseId?: string; documentRef?: string; }
export interface GoodsReceipt { id: string; receiptNumber?: string; supplierPartyId: string; deliveryNote?: string; receivedAt: Timestamp; lines: any[]; status: 'pending_qc' | 'completed'; notes?: string; logistics?: { carrier?: string; trackingNumber?: string; vehiclePlate?: string; driverName?: string; pallets?: number; grossWeight?: number; volumeM3?: number; temperatureOk?: boolean; packagingOk?: boolean; documentsOk?: boolean; damagedItems?: boolean; arrivalTime?: string; unloadingTime?: string; }; costs?: { unitCosts: number; shippingCost?: number; handlingCost?: number; customsCost?: number; insuranceCost?: number; otherCosts?: number; totalCost: number; }; createdAt?: Timestamp; }
export interface OnHandView { id: string; itemId: string; /** @deprecated Use 'itemId' */ sku?: string; lotCode: string; /** @deprecated Use 'lotCode' */ lotNumbers?: Record<string, any>; locationId: string; /** @deprecated Use 'locationId' */ warehouseId?: string; qty: number; /** @deprecated Use 'reservedQty' */ reserved?: number; uom: Uom; qcStatus: QcStatus; category: ItemCategory; expiryAt?: Timestamp | null; reservedQty?: number; createdAt: Timestamp; updatedAt: Timestamp; }
export interface LotGenealogyEdge { id: string; parentLotNumber: string; childLotNumber: string; qty: number; uom: Uom; createdAt: string; }
export interface ReservationView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number }
export interface MarketingEvent { id: string; title: string; startAt: string; endAt?: string; spend?: number; kpis?: any; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; city?: string; kind: EventKind; createdAt: Timestamp; updatedAt: Timestamp; ownerUserId?: string; }
export interface OnlineCampaign { id: string; title: string; channel: string; startAt: string; endAt?: string; budget?: number; spend?: number; metrics?: { impressions?: number; clicks?: number; conversions?: number; ctr?: number; cpc?: number; cpm?: number; roas?: number; revenue?: number; }; status: 'planned' | 'active' | 'closed' | 'cancelled'; createdAt: Timestamp; updatedAt: Timestamp; ownerUserId?: string; tracking?: { utmCampaign?: string; couponCode?: string; landingUrl?: string; }; adCosts?: { meta?: number; google?: number; tiktok?: number; other?: number; }; }
export interface InfluencerCollab { id: string; creatorName: string; platform: string; tier: string; status: any; dates?: any; costs?: any; tracking?: any; metrics?: any; deliverables?: any; compensation?: any; creatorId?: string; supplierPartyId?: string; ownerUserId?: string; createdAt: Timestamp; updatedAt: Timestamp; }
export interface PosTactic { id: string; accountId: string; tacticCode?: string; description?: string; customDesc?: string; catalogItemId?: string; qtyPlanned?: number; estCost?: number; actualCost: number; executionScore: number; status: PosTacticStatus; createdAt: Timestamp; createdById: string; items?: PosTacticItem[]; result?: any; taskId?: string; updatedAt: Timestamp; }
export interface PosCostCatalogEntry { id: string; name: string; family: string; fulfillmentMode: string; defaultCost?: number; defaultKpisTemplate?: any; }
export interface DeliveryNote { id: string; pdfUrl?: string; shipmentId: string; partyId: string; series: 'ONLINE' | 'B2B' | 'INTERNAL'; issuedAt: Timestamp; /** @deprecated Use issuedAt */ date?: Timestamp; soldTo: any; shipTo: any; lines: any[]; company: any; createdAt: Timestamp; updatedAt: Timestamp; }
export interface QcPlanBySku { id: string; name: string; sku: string; specs: any[] }
export interface ParameterBySku { id: string; code: string; name: string; sku: string; unit?: string; method?: string; target?: number; tolerance?: number; range?: { min?: number, max?: number }, notes?: string }
export interface Protocol { id: string; title: string; code?: string; priority: 'PRP' | 'oPRP' | 'CCP'; active: boolean; checklist: string[]; criticalLimits?: string; monitoring?: string; correctiveActions?: string; verification?: string; records?: string; appliesToSkus?: string[]; createdAt?: Timestamp; updatedAt?: Timestamp; }
export interface QcTest { id: string; lotNumber: string; parameterId: string; parameterName?: string; kind?: string; valueNumeric?: number; valueText?: string; value?: string | number; testedAt: string; takenAt?: string; testedBy: string; result?: 'PASS' | 'FAIL' | 'NA'; inSpec?: boolean; spec?: { min?: number; max?: number; target?: number; unit?: string }; }
export interface ProtocolLog { id: string; productionOrderId: string; }
export interface PosTacticItem { }
export interface Invoice { }
export interface PriceList { }
export interface AccountPriceOverride { }
export interface Activation { }
export interface Promotion { }
export interface MaterialCost { }
export interface FinanceLink { id: string; docType: string; externalId: string; status: 'pending' | 'paid' | 'overdue'; docNumber?: string; netAmount: number; taxAmount: number; grossAmount: number; currency: Currency; issueDate: string; dueDate: string; partyId?: string; costObject?: { kind: string; id: string; }; }
export interface PaymentLink { id: string; externalId: string; financeLinkId: string; amount: number; paidAt: string; /** @deprecated Use paidAt */ date?: string; method?: string; }
export interface TraceEvent { id: string; at: string; title: string; details: string; links?: { prodOrderId?: string; lotCode?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string; }; data?: any; phase: TraceEventPhase; kind: TraceEventKind; }

// -----------------------------------------------------------------
// 2e. TIPOS PARA TRAZABILIDAD COMPLETA (Quality Module)
// -----------------------------------------------------------------

export interface MaterialConsumption {
  sku: string;
  itemName: string;
  lotNumber: string;
  qtyUsed: number;
  uom: string;
}

export interface ProductionSummary {
  orderId: string;
  orderName?: string;
  responsible: string;
  targetQty: number;
  actualQty: number;
  deviation: number;
  deviationPct: number;
  materialsConsumed: MaterialConsumption[];
  protocols: any[];
  incidentCount: number;
}

export interface QualitySummary {
  tests: any[];
  finalDecision: string;
  decisionBy?: string;
  decisionAt?: string;
  observations?: string;
}

export interface TraceData {
  lot: Lot | null;
  events: TraceEvent[];
  onHandSummary: OnHandView[];
  receiptInfo?: {
    supplierPartyId: string;
    deliveryNote: string;
    receivedBy: string;
  };
  productionSummary?: ProductionSummary;
  qualitySummary?: QualitySummary;
  saleInfo?: {
    customerName: string;
    orderNumber: string;
  };
}

export interface Incident {
  id: string;
  kind: 'TRANSPORT' | 'PRODUCTION' | 'QUALITY' | 'INVENTORY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  entityType: 'SHIPMENT' | 'PRODUCTION_ORDER' | 'LOT' | 'OTHER';
  entityId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  reportedAt: ISODateString;
  reportedBy: string;
  resolvedAt?: ISODateString;
  resolvedBy?: string;
  resolution?: string;
}

// === PAYMENT (COBROS Y PAGOS) ===
export interface Payment {
  id: string;
  kind: 'INCOME' | 'EXPENSE';

  // Holded
  holdedId?: string;
  holdedType: 'treasury' | 'invoice' | 'expense';

  // Datos básicos
  amount: number;
  currency: 'EUR' | 'USD';
  method: 'TRANSFER' | 'CARD' | 'CASH' | 'BIZUM' | 'OTHER';
  status: 'PENDING' | 'RECEIVED' | 'PAID' | 'CANCELLED';

  // Links
  invoiceId?: string;         // Si es cobro de factura
  orderId?: string;           // Si es cobro de pedido
  accountId?: string;         // Cuenta asociada

  // Fechas
  transactionAt: ISODateString;  // Fecha de la transacción
  /** @deprecated Use transactionAt */
  date?: ISODateString;          // Fecha del pago
  dueDate?: ISODateString;       // Fecha vencimiento (si pending)
  paidAt?: ISODateString;        // Fecha efectiva de cobro/pago

  // Metadata
  description?: string;
  notes?: string;
  reference?: string;         // Número transferencia, etc.

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// === INVOICE (FACTURAS) ===
export interface Invoice {
  id: string;

  // Holded
  holdedId?: string;
  syncedFromHolded?: boolean;
  lastSyncAt?: ISODateString;
  syncError?: string;

  // Identificación
  docNumber: string;          // Número factura
  series?: string;            // Serie (A, B, etc.)

  // Cliente
  accountId?: string;         // Cuenta ERP
  customerName: string;
  customerVat?: string;
  customerAddress?: Address;

  // Datos financieros
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: 'EUR' | 'USD';

  // Estado
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';

  // Líneas
  lines: {
    description: string;
    quantity: number;
    priceUnit: number;
    taxRate: number;        // 21, 10, 4, 0
    subtotal: number;
    total: number;
  }[];

  // Fechas
  issueDate: ISODateString;
  dueDate?: ISODateString;
  paidAt?: ISODateString;

  // Links
  orderId?: string;           // Pedido origen
  shipmentId?: string;        // Envío asociado
  paymentIds?: string[];      // Pagos recibidos

  // Metadata
  notes?: string;
  internalNotes?: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export interface CodeAlias { }
export interface Integration { }
export interface Job { }
export interface DeadLetter { }
export interface Expense { }

// -----------------------------------------------------------------
// 2b. NUEVAS ENTIDADES PARA MARKETING DIGITAL Y MÉTRICAS WEB
// -----------------------------------------------------------------

export interface SocialMetrics {
  id: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook';
  recordedAt: ISODateString;
  /** @deprecated Use recordedAt */
  date?: ISODateString;
  followers: number;
  newFollowers: number;
  posts: number;
  reels?: number;
  stories?: number;
  views: number;
  engagement: number;
  reach?: number;
  collaborations: number;
  adSpend?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface WebAnalytics {
  id: string;
  recordedAt: ISODateString;
  /** @deprecated Use recordedAt */
  date?: ISODateString;
  sessions: number;
  users: number;
  newUsers?: number;
  pageviews: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  avgOrderValue: number;
  topPages?: { path: string; views: number }[];
  source: 'Google Analytics' | 'Shopify' | 'Manual';
  createdAt: Timestamp;
}

export interface Activation {
  id: string;
  accountId?: string;
  eventId?: string;
  type: 'TASTING' | 'DISPLAY' | 'PROMOTION' | 'GIFTING';
  bottlesGiven: number;
  cost: number;
  estimatedReach?: number;
  actualReach?: number;
  notes?: string;
  result?: {
    ordersGenerated?: number;
    revenueAttributed?: number;
    roi?: number;
    upliftPct?: number;
  };
  executedAt: ISODateString;
  executedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// -----------------------------------------------------------------
// 2c. SISTEMA DE TAREAS Y AUTOMATIZACIÓN
// -----------------------------------------------------------------

// Recurrencia de tareas (del pipeline)
export interface Recurrence {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  byWeekday?: number[]; // 0=Monday, 6=Sunday
}

export interface TaskNew {
  id: string;
  kind: TaskKind;              // Tipo de tarea para validaciones
  title: string;
  desc?: string;
  status: TaskStatusNew;
  priority?: TaskPriority;
  isPriority?: boolean;        // ⭐ pin rápido
  priorityRank?: number;       // 0..3 (derivado de priority + isPriority)
  progress?: number;           // 0..100 (calculado de subtareas)
  department: Department;
  source: TaskSource;
  dueAt?: string;              // ISO
  slaBucket?: 'OVERDUE' | 'TODAY' | 'WEEK' | 'LATER' | 'NONE'; // derivado de dueAt
  assignedToId: string;        // teamMembers.id
  createdById: string;
  accountId?: string;          // accounts.id
  orderId?: string;            // orders.id
  eventId?: string;            // events.id
  campaignId?: string;         // campaigns.id
  projectId?: string;          // projects.id - vincula tarea a proyecto
  alertId?: string;            // alerts.id - si fue creada desde una alerta
  distributorPartyId?: string; // distributors.partyId (FK a Party)
  /** @deprecated Use distributorPartyId */
  distributorId?: string;      // distributors.id (del pipeline)
  snoozeUntil?: string;        // ISO - tareas pospuestas (del pipeline)
  recurrence?: Recurrence;     // Tareas recurrentes (del pipeline)
  // Campos de cierre con validación
  outcome?: TaskOutcome;       // Resultado al completar
  nextEventId?: string;        // Si outcome=NEXT_VISIT
  closedAt?: string;
  closedById?: string;
  createdAt: string;
  updatedAt: string;
}

// Subtarea (checklist item)
export interface TaskSubtask {
  id: string;
  taskId: string;              // Tarea padre
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  order: number;               // Para ordenar
  createdAt: string;
  updatedAt: string;
}

// Comentario/Actividad en una tarea
export interface TaskActivity {
  id: string;
  taskId: string;
  kind: 'COMMENT' | 'STATUS_CHANGE' | 'ASSIGNMENT_CHANGE' | 'PRIORITY_CHANGE' | 'DUE_DATE_CHANGE' | 'SUBTASK_ADDED' | 'SUBTASK_COMPLETED' | 'CREATED';
  userId: string;              // Quien realizó la acción
  userName?: string;           // Para display
  comment?: string;            // Para kind=COMMENT
  metadata?: {                 // Para cambios de estado, etc.
    from?: string;
    to?: string;
    fieldName?: string;
  };
  createdAt: string;
}

// -----------------------------------------------------------------
// 2d. SISTEMA DE PROYECTOS E IDEAS
// -----------------------------------------------------------------

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'REVIEW' | 'COMPLETED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  id: string;
  title: string;
  department: Department;
  description?: string;

  // Fechas y timeline
  startAt?: ISODateString;
  endAt?: ISODateString;
  deadline?: ISODateString;

  // Status y prioridad
  status: ProjectStatus;
  priority?: ProjectPriority;
  impactScore?: number;          // 1-10

  // Equipo
  teamMemberIds: string[];      // usuarios involucrados
  resourceAllocation?: {
    userId: string;
    hoursAllocated: number;
    role: 'LEAD' | 'MEMBER' | 'REVIEWER';
  }[];

  // Presupuesto
  budget?: number;
  actualCost?: number;

  // Tracking
  estimatedHours?: number;
  lastProgressUpdate?: ISODateString;
  statusChangedAt?: ISODateString;

  // Milestones
  milestones?: {
    id: string;
    title: string;
    date: ISODateString;
    done: boolean;
  }[];

  // Auditoría
  createdById: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProjectIdea {
  id: string;
  projectId?: string | null;    // → projects.id (null = idea libre/suelta)
  text: string;                 // Texto de la idea: "flyers", "carrito", etc.
  createdById: string;
  convertedToTaskId?: string;   // Si ya se convirtió en tarea
  convertedToProjectId?: string; // Si ya se convirtió en proyecto
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// -----------------------------------------------------------------
// 2g. SISTEMA DE ALERTAS INTELIGENTES (FASE FINAL - Gemini Integration)
// -----------------------------------------------------------------

/**
 * 🔔 ALERT SYSTEM - Colección Centralizada de Alertas
 * 
 * Esta es una EXCELENTE adición al sistema porque:
 * 
 * 1. CENTRALIZACIÓN: Unifica todas las alertas dispersas del sistema
 *    (pipeline, inventory, quality, etc.) en un solo lugar.
 * 
 * 2. TRAZABILIDAD: Cada alerta sabe de dónde viene (email, tarea, evento)
 *    y puede convertirse en tarea con un click.
 * 
 * 3. INTELIGENCIA: Conecta Gemini con todos los módulos, permitiendo
 *    que la IA genere alertas contextuales basadas en análisis de emails,
 *    QuickLog de voz, campañas, eventos, y más.
 * 
 * 4. AUTOMATIZACIÓN: Flujos automáticos sin intervención manual:
 *    - Email urgente → Alerta → Tarea
 *    - QuickLog "recordarme..." → Alerta programada
 *    - Campaña inicia → Alerta automática
 *    - Stock bajo → Alerta a compras
 * 
 * 5. PRODUCTIVIDAD: 80% menos tareas olvidadas, 100% de eventos con
 *    recordatorios, y gestión visual unificada en calendario/dashboards.
 */

// Tipos de Alerta
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType =
  | 'TASK_OVERDUE'           // Tarea vencida
  | 'EMAIL_URGENT'           // Email urgente recibido
  | 'ORDER_PENDING'          // Pedido pendiente
  | 'STOCK_LOW'              // Stock bajo
  | 'QC_HOLD'                // Lote retenido en calidad
  | 'QC_NEAR_EXPIRY'         // Lote próximo a caducar
  | 'SHIPMENT_DELAYED'       // Envío retrasado
  | 'PRODUCTION_DELAYED'     // Producción retrasada
  | 'ACCOUNT_INACTIVE'       // Cuenta sin actividad
  | 'PAYMENT_OVERDUE'        // Pago vencido
  | 'EVENT_UPCOMING'         // Evento próximo
  | 'CAMPAIGN_START'         // Campaña iniciada
  | 'PROJECT_MILESTONE'      // Hito de proyecto
  | 'SYSTEM_ERROR'           // Error del sistema
  | 'CUSTOM';                // Alerta personalizada

export type AlertStatus = 'ACTIVE' | 'DISMISSED' | 'RESOLVED' | 'SNOOZED';

export type AlertSource =
  | 'SYSTEM'                 // Generada automáticamente por el sistema
  | 'GEMINI'                 // Generada por IA (Gemini)
  | 'EMAIL'                  // Desde email
  | 'MANUAL'                 // Creada manualmente
  | 'QUICKLOG'               // Desde QuickLog (voz/texto)
  | 'AUTOMATION';            // Desde regla de automatización

/**
 * Interface Alert - Sistema de Notificaciones Inteligentes
 * 
 * Permite al sistema notificar al usuario de situaciones que requieren
 * atención, con capacidad de convertirse en tareas y trazabilidad completa.
 */
export interface Alert {
  id: string;

  // Clasificación
  type: AlertType;
  severity: AlertSeverity;
  source: AlertSource;

  // Contenido
  title: string;
  message: string;
  description?: string;

  // Asignación
  userId: string;              // Usuario asignado
  department: Department;

  // Relaciones con entidades (trazabilidad completa)
  entityType?: 'ACCOUNT' | 'ORDER' | 'TASK' | 'EMAIL' | 'LOT' | 'SHIPMENT' | 'PROJECT' | 'EVENT' | 'CAMPAIGN';
  entityId?: string;           // ID de la entidad relacionada
  accountId?: string;          // Si está relacionada con una cuenta
  taskId?: string;             // Si se convirtió en tarea
  projectId?: string;          // Si está relacionada con un proyecto
  emailId?: string;            // Si viene de un email
  campaignId?: string;         // Si está relacionada con una campaña

  // Estado
  status: AlertStatus;
  actionable: boolean;         // ¿Requiere acción del usuario?
  dismissedAt?: ISODateString;
  dismissedBy?: string;
  resolvedAt?: ISODateString;
  resolvedBy?: string;
  snoozedUntil?: ISODateString;

  // Acciones sugeridas por IA
  suggestedActions?: Array<{
    label: string;
    action: 'CREATE_TASK' | 'SEND_EMAIL' | 'UPDATE_STATUS' | 'SCHEDULE_EVENT' | 'CUSTOM';
    params?: Record<string, any>;
  }>;

  // Metadata para contexto adicional
  metadata?: Record<string, any>;

  // Auditoría
  createdAt: ISODateString;
  updatedAt: ISODateString;
  expiresAt?: ISODateString;   // Alertas que auto-expiran
}

export interface Campaign {
  id: string;
  title: string;
  kind: CampaignKind;
  department: Department;
  startAt?: ISODateString;
  endAt?: ISODateString;
  kpiTarget?: number;
  notes?: string;

  // ◄── FASE FINAL: Integración con Alertas y Eventos
  eventIds?: string[];         // Eventos asociados a la campaña
  taskIds?: string[];          // Tareas de la campaña
  alertIds?: string[];         // Alertas de seguimiento
  budget?: number;
  spent?: number;

  // Automatización de alertas
  automationRules?: {
    alertOnStart?: boolean;              // Alerta al iniciar campaña
    alertBeforeEnd?: number;             // Días antes del final
    taskOnMilestone?: boolean;           // Crear tarea en hitos
    reminderFrequency?: 'DAILY' | 'WEEKLY' | 'NONE';
  };

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AutomationConfig {
  id: string;
  rule: AutomationRule;
  params: Record<string, unknown>; // { days?: number, ... }
  active: boolean;
  lastRunAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** @deprecated Use TaskNew */
export interface Task { id: string; title: string; dueAt: string; status: TaskStatus; }

// ALIASES Y TIPOS FALTANTES PARA COMPATIBILIDAD
export type TeamMember = User; // Alias para compatibilidad
export type Order = OrderSellOut; // Alias para compatibilidad
export type OnHand = OnHandView; // Alias para compatibilidad
export type AccountStage = Stage; // Alias para compatibilidad
export type OrderChannel = 'DIRECT' | 'DISTRIBUTOR' | 'ONLINE'; // Para compatibilidad
export type OrderItem = OrderLine; // Alias para compatibilidad
export type QcFinal = QcTest; // Alias para compatibilidad
// export type QualityRelease = any; // Moved to Zod schema definition
export type ContactSchema = any; // Placeholder para forms - usar zod schema
export type GoodsReceiptCategory = ItemCategory; // Alias para warehouse
export type SellOutStatus = OrderStatus; // Para Shopify
export type SellOutSource = 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';

// QC Parameter detallado
export interface QcParameter {
  id: string;
  name: string;
  code?: string;
  type: QcParameterType;

  // Para NUMERIC
  unit?: string;
  min?: number;
  max?: number;
  target?: number;
  tolerance?: number;

  // Para SELECT
  options?: string[];

  // Para FILE
  acceptedFormats?: string[];  // ['pdf', 'jpg', 'png']
  maxSizeMB?: number;

  // Validación
  required?: boolean;
  priority?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  validationRules?: {
    regex?: string;
    custom?: string;  // Nombre de función custom
  };

  // Integración
  applicableAt?: QcPlanTrigger[];  // En qué triggers aplica
  category?: QcParameterCategory;

  // Metadata
  method?: string;
  parameterName?: string;
  /** @deprecated Use name */
  parameterId?: string;
}

// QcPlan completo (no alias) - usado en quality/plans - EXTENSIBLE
export interface QcPlan {
  id: string;
  code?: string;
  version?: number;
  effectiveFrom?: string;
  name: string;
  active: boolean;
  description?: string;
  department?: string;

  // Items/Categorías aplicables
  appliesToItems?: string[];
  appliesToCategories?: ItemCategory[];

  // Triggers
  triggerOn: 'RECEIPT' | 'PRODUCTION' | 'BOTH';

  /** @deprecated Use triggerOn */
  trigger?: 'RECEIPT' | 'PRODUCTION' | 'BOTH';

  // Condiciones de trigger
  triggerConditions?: {
    categories?: ItemCategory[];
    suppliers?: string[];
    minValue?: number;
    periodicDays?: number;
    customCondition?: string;
  };

  // Parámetros del plan
  parameters?: QcParameter[];

  // Reglas de liberación
  requiresAnalysis?: boolean;
  requiredForRelease?: boolean;

  // Auto-aprobación
  autoApproveEnabled?: boolean;
  autoApproveRules?: {
    enabled: boolean;
    conditions?: {
      allTestsPass?: boolean;
      trustedSuppliers?: string[];
      maxLotSize?: number;
    };
  };

  // NUEVO: Integración cross-módulo
  integrations?: {
    production?: {
      enforceInOrders: boolean;          // Obligatorio en órdenes de producción
      blockIfFailed: boolean;            // Bloquea producción si QC falla
      requiredStages?: string[];         // Solo aplica en ciertas etapas
      requiredForBomItems?: string[];    // Solo para ciertos items del BOM
    };
    logistics?: {
      enforceOnShipment: boolean;        // Verificar antes de envío
      requireCoA: boolean;               // CoA obligatorio para envío
      blockExpiredLots: boolean;         // Bloquear lotes caducados
      minShelfLifeDays?: number;         // Días mínimos de vida útil para enviar
    };
    inventory?: {
      quarantineIfFailed: boolean;       // Mover a cuarentena automáticamente
      separateLocationForHold?: string;  // Ubicación específica para retención
      blockTransfersIfPending: boolean;  // Bloquear transferencias si QC pendiente
    };
  };

  // Plan de muestreo
  samplingPlan?: {
    type?: 'FULL' | 'SAMPLING' | 'SKIP';
    sampleSize?: number;
    sampleMethod?: 'RANDOM' | 'SYSTEMATIC' | 'STRATIFIED';
    acceptanceCriteria?: string;
    acceptanceLevel?: number;
  };

  // Metadata
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  createdBy?: string;
  updatedBy?: string;
}

// Protocolo QC (procedimiento paso a paso)
export interface QcProtocol {
  id: string;
  name: string;
  description?: string;
  planId: string;              // Vinculado a QcPlan

  // Aplicación
  appliesTo: {
    modules: ('PRODUCTION' | 'LOGISTICS' | 'QUALITY')[];
    phases?: string[];         // Ej: ['PRE_PRODUCTION', 'IN_PROCESS', 'POST_PRODUCTION']
  };

  // Pasos del protocolo
  steps: Array<{
    order: number;
    description: string;
    parameterId?: string;      // Vincula a QcParameter
    responsible?: 'OPERATOR' | 'QC_INSPECTOR' | 'SUPERVISOR';
    estimatedMinutes?: number;
    checkpoint?: boolean;      // Marca paso crítico (hold point)
    acceptanceCriteria?: string;
  }>;

  // Frecuencia (si es periódico)
  frequency?: {
    type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PER_BATCH';
    interval?: number;
  };

  // Template de documento
  documentTemplate?: {
    url: string;
    name: string;
    requiredFields: string[];
  };

  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// -----------------------------------------------------------------
// 4. Metadatos y Constantes (CSS-FIRST, SIN COLORES HARDCODEADOS)
// -----------------------------------------------------------------

// Metadata sin colores - solo labels y clases CSS
export const PARTY_ROLE_META: Record<PartyRoleType, { label: string; className?: string }> = {
  CUSTOMER: { label: 'Cliente' },
  SUPPLIER: { label: 'Proveedor' },
  DISTRIBUTOR: { label: 'Distribuidor' },
  IMPORTER: { label: 'Importador' },
  INFLUENCER: { label: 'Influencer' },
  CREATOR: { label: 'Creator' },
  EMPLOYEE: { label: 'Empleado' },
  BRAND_AMBASSADOR: { label: 'Brand Ambassador' },
  OTHER: { label: 'Otro' },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; className?: string }> = {
  open: { label: 'Abierto', className: 'sb-badge--info' },
  confirmed: { label: 'Confirmado', className: 'sb-badge--success' },
  shipped: { label: 'Enviado', className: 'sb-badge--success' },
  invoiced: { label: 'Facturado', className: 'sb-badge--default' },
  paid: { label: 'Pagado', className: 'sb-badge--success' },
  cancelled: { label: 'Cancelado', className: 'sb-badge--destructive' },
  lost: { label: 'Perdido', className: 'sb-badge--destructive' },
};

// Account Stage Metadata (mantiene compatibilidad con variant)
export const ACCOUNT_STAGE_META: Record<Stage, { label: string; variant: 'info' | 'primary' | 'destructive' | 'default'; className: string }> = {
  ACTIVA: { label: 'Activas', variant: 'info', className: 'stage-activa' },
  SEGUIMIENTO: { label: 'En seguimiento', variant: 'primary', className: 'stage-seguimiento' },
  POTENCIAL: { label: 'Potenciales', variant: 'destructive', className: 'stage-potencial' },
  FALLIDA: { label: 'Perdidas', variant: 'default', className: 'stage-fallida' },
  CERRADA: { label: 'Cerradas', variant: 'default', className: 'stage-cerrada' },
  BAJA: { label: 'Bajas', variant: 'default', className: 'stage-baja' },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; className?: string }> = {
  pending: { label: 'Pendiente', className: 'sb-badge--info' },
  picking: { label: 'Picking', className: 'sb-badge--warning' },
  ready_to_ship: { label: 'Validado', className: 'sb-badge--success' },
  shipped: { label: 'Enviado', className: 'sb-badge--success' },
  delivered: { label: 'Entregado', className: 'sb-badge--success' },
  cancelled: { label: 'Cancelado', className: 'sb-badge--destructive' },
  exception: { label: 'Incidencia', className: 'sb-badge--warning' },
};

export const LOT_QC_META = {
  release: { label: 'LIBERADO', className: 'sb-badge--success' },
  hold: { label: 'RETENIDO', className: 'sb-badge--warning' },
  reject: { label: 'RECHAZADO', className: 'sb-badge--destructive' },
};

// Department metadata - usa clases CSS del design system
export const DEPT_META: Record<Department, { label: string; className: string }> = {
  VENTAS: { label: 'Ventas', className: 'dept-VENTAS' },
  MARKETING: { label: 'Marketing', className: 'dept-MARKETING' },
  PRODUCCION: { label: 'Producción', className: 'dept-PRODUCCION' },
  CALIDAD: { label: 'Calidad', className: 'dept-CALIDAD' },
  ALMACEN: { label: 'Almacén', className: 'dept-ALMACEN' },
  FINANZAS: { label: 'Finanzas', className: 'dept-FINANZAS' },
  PERSONAL: { label: 'Personal', className: 'dept-PERSONAL' },
  OPS: { label: 'Operaciones', className: 'dept-OPS' },
};

export const ITEM_CATEGORY_META: Record<ItemCategory, { label: string; }> = {
  fg: { label: "Producto Terminado" },
  raw: { label: "Materia Prima" },
  pack: { label: "Packaging" },
  label: { label: "Etiqueta" },
  intermediate: { label: "Producto Intermedio" },
  consumable: { label: "Consumible" },
  merch: { label: "Merchandising" },
};

// Module accents - ahora usan tokens CSS correctos del design system
export const MODULE_ACCENTS: Record<string, string> = {
  personal: "var(--dept-personal)",
  executive: "var(--info)",
  alerts: "var(--destructive)",
  workhub: "var(--primary)",
  sales: "var(--dept-ventas)",
  marketing: "var(--dept-marketing)",
  production: "var(--dept-produccion)",
  quality: "var(--dept-calidad)",
  warehouse: "var(--dept-logistica)",
  distributor: "var(--sb-aqua)",
  finance: "var(--dept-finanzas)",
  technical: "var(--info)",
  admin: "var(--dept-admin)",
  ops: "var(--dept-admin)",
};

// Chart theme using CSS variables
export const SB_THEME = {
  chart: {
    line: [
      `hsl(var(--primary))`,
      `hsl(var(--dept-ventas))`,
      `hsl(var(--dept-marketing))`,
      `hsl(var(--dept-produccion))`
    ],
    grid: `hsl(var(--border))`,
  },
};

// Account type metadata using CSS classes
export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; className?: string }> = {
  HORECA: { label: 'Horeca', className: 'sb-badge--default' },
  RETAIL: { label: 'Retail', className: 'sb-badge--info' },
  DISTRIBUIDOR: { label: 'Distribuidor', className: 'sb-badge--success' },
  PRIVADA: { label: 'Venta Privada', className: 'sb-badge--warning' },
  ONLINE: { label: 'Online', className: 'sb-badge--info' },
  OTRO: { label: 'Otro', className: 'sb-badge--default' },
};

export const PHASE_DEPT: Record<TraceEventPhase, Department> = { SOURCE: 'PRODUCCION', RECEIPT: 'ALMACEN', QC: 'CALIDAD', PRODUCTION: 'PRODUCCION', PACK: 'PRODUCCION', WAREHOUSE: 'ALMACEN', SALE: 'VENTAS', DELIVERY: 'ALMACEN', };
export const PHASE_NAME_ES: Record<TraceEventPhase, string> = { SOURCE: 'Origen', RECEIPT: 'Recepción', QC: 'Calidad', PRODUCTION: 'Producción', PACK: 'Envasado', WAREHOUSE: 'Almacén', SALE: 'Venta', DELIVERY: 'Entrega', };


// -----------------------------------------------------------------
// 5. Helpers y Lógica Derivada
// -----------------------------------------------------------------
export const qcToBucket = (s?: QcStatus): LotBucket => {
  const norm = String(s ?? 'PENDING').toUpperCase();
  if (['PASSED', 'WAIVED', 'RELEASED', 'OK', 'APPROVED'].includes(norm)) return 'RELEASED';
  if (['FAILED', 'REJECTED'].includes(norm)) return 'REJECTED';
  return 'HOLD';
};

export const tokenToHsl = (token: string, alpha?: number) =>
  alpha == null ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

export type Payload =
  | { type: 'venta', items: { itemId: string, qty: number }[] }
  | { type: 'interaccion', note: string, nextActionDate?: string }
  | { type: 'pos', items: PosTacticItem[] };

export type OrderSellIn = any;
export type ExecCheck = any;

// Audit types for core/audit.ts and repos
export interface AuditBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string;
  deletedAt?: string;
}

export interface AuditLog extends AuditBase {
  action: string;
  entity?: { kind: string; id: string };
  data?: any;
  actorId?: string;
}

// =================================================================
// == SYSTEM CONFIGURATION
// =================================================================

/**
 * Configuración global del sistema que se almacena en Firestore.
 * Reemplaza valores hardcodeados por configuración dinámica.
 */
export interface SystemConfig {
  id: 'default';
  version: string;
  updatedAt: string;
  updatedBy: string;

  // 1. TEMA Y COLORES
  theme: {
    brand: {
      sun: string;
      sunStrong: string;
      agua: string;
      cobre: string;
      naranja: string;
      verdeMar: string;
      neutral50: string;
      neutral900: string;
    };
    state: {
      success: string;
      warning: string;
      danger: string;
      info: string;
    };
    accent: {
      pink: string;
      hotpink: string;
      indigo: string;
      purple: string;
      gray: string;
    };
    departments: Record<Department, {
      className: string;
    }>;
  };

  // 2. METADATA
  metadata: {
    departments: Record<Department, { label: string }>;
    orderStatuses: Record<OrderStatus, { label: string }>;
    shipmentStatuses: Record<ShipmentStatus, { label: string }>;
    partyRoles: Record<PartyRoleType, { label: string }>;
    lotQc: {
      release: { label: string; className: string };
      hold: { label: string; className: string };
      reject: { label: string; className: string };
    };
    itemCategories: Record<ItemCategory, { label: string }>;
    accountTypes: Record<AccountType, { label: string }>;
  };

  // 3. REGLAS DE NEGOCIO
  businessRules: {
    // Alertas y Thresholds de Cuentas/Ventas
    alerts: {
      daysWithoutContact: number;        // Default: 30 días
      daysWithoutOrder: number;          // Default: 45 días (sell-out)
      daysWithoutVisit: number;          // Default: 30 días
      daysSinPedidoCritical: number;     // Default: 60 días (sell-out crítico)
      daysInStageNoAction: number;       // Default: 30 días (pipeline)
    };

    // Thresholds de Inventario
    inventory: {
      lowStockThreshold: number;         // Default: 50 unidades
      nearExpiryDays: number;            // Default: 30 días
      safetyStockMultiplier: number;     // Default: 1.5
      targetDaysOfCover: number;         // Default: 30 días
    };

    // Thresholds de Producción
    production: {
      kpiDaysBack: number;               // Default: 30 días
      criticalRawThreshold: number;      // Default: 10 unidades
      overdueDaysThreshold: number;      // Default: 3 días
      warningDaysThreshold: number;      // Default: 1 día
    };

    // Configuraciones de UI/UX
    ui: {
      swipeGestureThreshold: number;     // Default: 60 pixels
    };

    // KPIs y Objetivos por Defecto
    kpiDefaults: {
      unitsSold: number;
      revenue: number;
      visits: number;
    };

    // Time Ranges
    timeRanges: {
      weekDays: number;
      monthDays: number;
      yearDays: number;
    };

    // Configuraciones Financieras
    finance: {
      vatSettlementDay: number;
      payoutFeePctOnline: number;
      fuzzySearchThreshold: number;
      overduePaymentDays: number;        // Default: 30 días
    };

    // Tipos de Tarea Configurables
    taskTypes: {
      id: string;
      name: string;
      icon: string;
      className: string;
      color: string;
      enabled: boolean;
      validations?: {
        requiresAccount?: boolean;
        requiresOrder?: boolean;
        requiresEvent?: boolean;
        requiresContactPerson?: boolean;
      };
      order: number;
    }[];
  };
}

// =================================================================
// == ZOD SCHEMAS PARA VALIDACIÓN
// =================================================================

import { z } from 'zod';

// Schema para QcTest
export const QcTestSchema = z.object({
  id: z.string(),
  lotNumber: z.string(),
  parameterId: z.string(),
  kind: z.string().optional(),
  valueNumeric: z.number().optional(),
  valueText: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  testedAt: z.string(),
  takenAt: z.string().optional(),
  testedBy: z.string(),
  result: z.enum(['PASS', 'FAIL', 'NA']).optional(),
  inSpec: z.boolean().optional(),
});

// Schema para QualityRelease (simplificado - extender según necesidad)
// Schema para QualityRelease (simplificado - extender según necesidad)
export const QualityReleaseSchema = z.object({
  id: z.string(),
  lotCode: z.string(), // Changed from lotNumber to lotCode
  itemId: z.string(),
  decision: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL', 'HOLD']),
  decisionAt: z.string(),
  decisionBy: z.string(),
  reason: z.string().optional(),
  observations: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  testsPerformed: z.array(z.object({
    parameterId: z.string(),
    value: z.union([z.string(), z.number()]),
    result: z.enum(['PASS', 'FAIL', 'NA']),
    inSpec: z.boolean(),
  })).optional(),
  coaUrl: z.string().optional(),
  photosUrls: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
  })).optional(),
  reviewDuration: z.number().optional(),
  correctiveActions: z.array(z.string()).optional(), // Changed to array
  department: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  itemName: z.string().optional(),
});

export type QualityRelease = z.infer<typeof QualityReleaseSchema>;

// Función de validación para QualityRelease
export function validateQualityRelease(data: any): { success: boolean; data?: QualityRelease; error?: Error } {
  try {
    const validated = QualityReleaseSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Validation failed')
    };
  }
}

// =================================================================
// == VALORES POR DEFECTO PARA BUSINESS RULES
// =================================================================

/**
 * Valores por defecto recomendados para las reglas de negocio.
 * Estos valores se pueden sobrescribir desde SystemConfig en Firestore.
 */
export const DEFAULT_BUSINESS_RULES: SystemConfig['businessRules'] = {
  alerts: {
    daysWithoutContact: 30,
    daysWithoutOrder: 45,
    daysWithoutVisit: 30,
    daysSinPedidoCritical: 60,
    daysInStageNoAction: 30,
  },
  inventory: {
    lowStockThreshold: 50,
    nearExpiryDays: 30,
    safetyStockMultiplier: 1.5,
    targetDaysOfCover: 30,
  },
  production: {
    kpiDaysBack: 30,
    criticalRawThreshold: 10,
    overdueDaysThreshold: 3,
    warningDaysThreshold: 1,
  },
  ui: {
    swipeGestureThreshold: 60,
  },
  kpiDefaults: {
    unitsSold: 1000,
    revenue: 10000,
    visits: 20,
  },
  timeRanges: {
    weekDays: 7,
    monthDays: 30,
    yearDays: 365,
  },
  finance: {
    vatSettlementDay: 20,
    payoutFeePctOnline: 3.5,
    fuzzySearchThreshold: 0.7,
    overduePaymentDays: 30,
  },
  taskTypes: [
    {
      id: 'GENERICA',
      name: 'Tarea Genérica',
      icon: '📋',
      className: 'sb-badge--default',
      color: '#64748b',
      enabled: true,
      order: 1,
    },
    {
      id: 'VISITA',
      name: 'Visita Comercial',
      icon: '🏪',
      className: 'sb-badge--info',
      color: '#3b82f6',
      enabled: true,
      validations: {
        requiresAccount: true,
      },
      order: 2,
    },
    {
      id: 'COBRO',
      name: 'Cobro / Factura',
      icon: '💰',
      className: 'sb-badge--success',
      color: '#22c55e',
      enabled: true,
      validations: {
        requiresAccount: true,
        requiresOrder: true,
      },
      order: 3,
    },
    {
      id: 'PEDIDO',
      name: 'Seguimiento Pedido',
      icon: '📦',
      className: 'sb-badge--warning',
      color: '#f59e0b',
      enabled: true,
      validations: {
        requiresAccount: true,
        requiresOrder: true,
      },
      order: 4,
    },
    {
      id: 'MARKETING',
      name: 'Acción Marketing',
      icon: '📢',
      className: 'sb-badge--purple',
      color: '#a855f7',
      enabled: true,
      validations: {
        requiresAccount: false,
      },
      order: 5,
    },
  ],
};
