
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
export type TaskStatusNew = 'BACKLOG' | 'DRAFT' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED' | 'PROGRAMADA' | 'SNOOZED';
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
export type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type LotStatus = 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED';
export type LotBucket = 'HOLD' | 'RELEASED' | 'REJECTED';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO';
export type PosTacticStatus = 'planned' | 'approved' | 'scheduled' | 'delivered' | 'active' | 'closed' | 'cancelled';
export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'CONSUME' | 'OUTPUT' | 'QC_TEST' | 'SHIPMENT' | 'ADJUSTMENT' | 'MOVE' | 'ARRIVED' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD';
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type CommercialFlow = 'DIRECT' | 'PLACEMENT';
/** @deprecated Use `CommercialFlow` instead. */
export type AccountMode = 'DIRECTA' | 'COLOCACION';
export type CollabStatus = 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'Blog' | 'Otro';
export type Tier = 'nano' | 'micro' | 'mid' | 'macro';
export type PosCatalogItem = PosCostCatalogEntry;
export type PosResult = { upliftUnits: number; liftPct: number; roi: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; revenueAttributed: number };
export type VelocityInput = { itemId: string; qty: number; date: string; };

// -----------------------------------------------------------------
// 2. Interfaces de Entidades Principales
// -----------------------------------------------------------------
// ... (Interfaces se mantienen sin cambios, omitidas por brevedad) ...
export interface Contact { id: string; kind: 'ORG' | 'PERSON'; roles: PartyRoleType[]; displayName: string; legalName?: string; nameNorm?: string; tradeName?: string; vat?: string; emails?: Array<{ value: string; isPrimary?: boolean; kind?: string; }>; phones?: Array<{ value: string; isPrimary?: boolean; kind?: string; }>; addresses?: Array<{ kind: string; street?: string; city?: string; postalCode?: string; province?: string; countryCode?: string; }>; customer?: { segment?: string; placement?: string; ownerId?: string; distributorId?: string; ownerName?: string; }; supplier?: { categories?: string[]; }; status?: string; source?: string; tags?: string[]; externalRefs?: Record<string, string>; links?: { website?: string; }; location?: { lat: number; lng: number; address?: string; }; createdAt: ISODateString; updatedAt: ISODateString; }
export interface Party { id: string; name: string; kind: 'ORG' | 'PERSON'; legalName?: string; tradeName?: string; /** @deprecated Use `vat` as the preferred field. */ taxId?: string; vat?: string; billingAddress?: Address; shippingAddress?: Address; emails?: CommItem[]; phones?: CommItem[]; people?: Person[]; tags?: string[]; external?: { holdedContactId?: string; holdedUpdatedAt?: string; holdedTags?: string[]; shopifyCustomerId?: string; }; roles?: PartyRoleType[]; createdAt: ISODateString; updatedAt: ISODateString; serviceArea?: any; location?: { lat: number, lng: number }; }
export interface Account { id: string; partyId: string; name: string; segment: Segment; stage: Stage; ownerId: string; flow: CommercialFlow; distributorPartyId?: string; /** @deprecated Use distributorPartyId */ distributorId?: string; /** @deprecated Use ownerId */ salesRepId?: string; source?: string; aliases?: string[]; createdAt: ISODateString; updatedAt: ISODateString; lastInteractionAt?: string; external?: any; isTarget?: boolean; targetUserId?: string; targetedAt?: ISODateString; location?: { lat: number; lng: number; address?: string; }; photos?: string[]; documents?: { id: string; name: string; url: string; type: 'contract' | 'invoice' | 'visit_photo' | 'plv_certificate' | 'other'; uploadedAt: ISODateString; uploadedBy?: string; }[]; /** @deprecated Use Party.billingAddress */ billingAddress?: Address; /** @deprecated Use Party.shippingAddress */ shippingAddress?: Address; /** @deprecated Use segment */ accountType?: AccountType; /** @deprecated Use stage */ accountStage?: Stage; /** @deprecated Use flow */ commercialFlow?: CommercialFlow; /** @deprecated */ tradeName?: string; /** @deprecated */ tags?: string[]; /** @deprecated Use channels array */ channels?: Array<'HORECA' | 'RETAIL' | 'ONLINE'>; /** @deprecated Use `flow` instead. */ mode?: AccountMode; /** @deprecated Use `segment` instead. */ type?: AccountType; /** @deprecated This field is no longer used. */ subType?: string; /** @deprecated Use the `Note` entity instead. */ notes?: string; /** @deprecated Use a dedicated `CodeAlias` entity instead. */ code?: string; }
// (Y así para el resto de interfaces)
// --- Omitiendo el resto de interfaces para mantener la respuesta concisa ---
// --- El contenido completo de las interfaces se mantiene como en tu archivo original ---
export type Note = { id: string; text: string; createdAt: string; accountId?: string; accountName?: string; assets?: string[]; location?: { lat:number; lng:number; ts:number }; contactName?: string; starred?: boolean; derived?: { kind: 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA' }; };
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
  name: string;
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
export interface OrderSellOut { id: string; docNumber?: string; accountId: string; partyId?: string; flow?: 'PLACEMENT' | 'DIRECT'; distributorId?: string; isSellOutReported?: boolean; status: OrderStatus; billingStatus?: BillingStatus; lines: OrderLine[]; /** @deprecated Use 'lines' instead */ items?: OrderLine[]; totalAmount?: number; currency: Currency; source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED'; notes?: string; external?: { shopifyOrderId?: string; holdedEstimateId?: string; holdedInvoiceId?: string; }; createdAt: Timestamp; updatedAt: Timestamp; createdById?: string; orderDate?: ISO; linkedPromotions?: string[]; region?: 'ES' | 'USA' | 'MX' | 'OTHER'; channel?: 'DIRECT' | 'DISTRIBUTOR' | 'ONLINE'; }
export type ShipmentLine = { itemId: string; sku?: string; name: string; qty: number; uom: SalesUnit; lotNumber?: string; locationId?: string; note?: string };
export interface Shipment { id: string; shipmentNumber?: string; orderId: string; partyId: string; accountId: string; mode: 'PARCEL' | 'PALLET'; status: ShipmentStatus; lines: ShipmentLine[]; customerName: string; addressLine1: string; addressLine2?: string; city: string; postalCode: string; country: string; /** @deprecated Use individual address fields */ toAddress?: Address; carrier?: string; trackingCode?: string; trackingUrl?: string; labelUrl?: string; deliveryNoteId?: string; holdedInvoiceId?: string; weightKg?: number; dimsCm?: { l: number; w: number; h: number }; checks?: { visualOk?: boolean }; isSample?: boolean; samplePurpose?: string; sampleNotes?: string; packedById?: string; validatedById?: string; validatedAt?: Timestamp; validationNotes?: string; shippedAt?: Timestamp; createdAt: Timestamp; updatedAt: Timestamp; notes?: string; shippingCost?: number; expectedDeliveryDate?: Timestamp; }
export interface Item { id: string; sku: string; name: string; category: ItemCategory; uom: Uom; active: boolean; isActive?: boolean; stdCost?: number; bottleMl?: number; caseUnits?: number; unitsPerCase?: number; priceBase?: number; priceUnit?: number; priceList?: Record<string, number>; costUnit?: number; weightPerUnit?: number; volumePerUnit?: number; casesPerPallet?: number; }
export interface BillOfMaterial { id: string; outputItemId: string; name: string; stage?: ProductionStage; batchSize: number; baseUnit: Uom; items: { itemId: string; qty: number; uom: Uom, role?: 'FORMULA' | 'PACKAGING' | 'COST_ONLY' }[]; isActive?: boolean; }
export type JournalEntry = { id: string; at: string; kind: 'LOG'|'INCIDENT'; summary: string; data?: any };
export interface ProductionOrder { id: string; orderNumber?: string; /** @deprecated Use orderNumber */ code?: string; bomId: string; outputItemId: string; /** @deprecated Use outputItemId */ outputSku?: string; targetQuantity: number; /** @deprecated Use targetQuantity */ outputQty?: number; status: ProductionStatus; baseUnit: Uom; /** @deprecated Use baseUnit */ uom?: Uom; createdAt: Timestamp; scheduledFor?: Timestamp; responsibleId?: string; startedAt?: Timestamp; completedAt?: Timestamp; pauseLog?: { pausedAt: Timestamp; resumedAt?: Timestamp }[]; execution?: { finishedAt?: Timestamp; goodUnits?: number; durationHours?: number }; costing?: { actual?: { perUnit?: number; yieldLossPct?: number } }; shortages?: any[]; reservations?: any[]; incidents?: any[]; finalOutputs?: any[]; finalConsumptions?: any[]; journal?: JournalEntry[]; checks?: boolean[]; updatedAt?: Timestamp; }
export interface Lot { id: string; lotNumber: LotNumber; itemId: string; /** @deprecated Use itemId */ sku?: string; itemName?: string; quantity: number; /** @deprecated Use quantity */ qtyMade?: number; uom: Uom; qcStatus: QcStatus; status?: LotStatus; qcPlanId?: string; producedByOrderId?: string; createdByGoodsReceiptId?: string; parentLotNumber?: LotNumber; /** @deprecated Use parentLotNumber */ genealogy?: {parents?: string[]; children?: string[]}; expDate?: Timestamp; createdAt: Timestamp; updatedAt: Timestamp; receivedAt?: Timestamp; externalLot?: string; supplierId?: string; deliveryNote?: string; }
export interface Interaction { id: string; userId: string; involvedUserIds?: string[]; accountId: string; kind: InteractionKind; note?: string; plannedFor?: Timestamp; createdAt: Timestamp; status: InteractionStatus; resultNote?: string; dept?: Department; linkedEntity?: { type: 'ORDER' | 'SHIPMENT' | 'POS_TACTIC' | 'EVENT'; id: string }; tags?: string[]; location?: string; updatedAt?: Timestamp; outcome?: any; title?: string; startAt?: Timestamp; endAt?: Timestamp; durationMin?: number; uiKind?: TaskKind; }
export interface CalendarEvent { id: string; accountId?: string; accountName?: string; title: string; dept: Department; startAt: string; endAt: string; externalRef?: { provider:'google'|'outlook', id:string } | null; createdById?: string; updatedAt?: string; }
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
  systemConfig?: SystemConfig; 
}
export const SANTA_DATA_COLLECTIONS: (keyof SantaData)[] = [ "contacts", "parties", "partyRoles", "partyDuplicates", "users", "accounts", "ordersSellOut", "interactions", "items", "billOfMaterials", "productionOrders", "lots", "lotGenealogy", "onHand", "stockMoves", "shipments", "goodsReceipts", "deliveryNotes", "qcPlans", "qcParameters", "qcTests", "qcProtocols", "protocolLogs", "marketingEvents", "onlineCampaigns", "influencerCollabs", "posTactics", "posCostCatalog", "plv_material", "socialMetrics", "webAnalytics", "activations", "reservations", "notes", "systemConfig" ];
// Note: tasks, campaigns, automations are loaded on-demand, not auto-loaded
export interface StockMove { id: string; itemId: string; lotNumber: string; qty: number; uom: Uom; reason: string; fromLocationId?: string; toLocationId?: string; occurredAt: Timestamp; createdAt: Timestamp; ref?: any; unitCost?: number; /** @deprecated Use reason */ items?: Array<{sku: string; qty: number}>; /** @deprecated Use occurredAt */ date?: string; /** @deprecated Use fromLocationId */ warehouseId?: string; /** @deprecated Use toLocationId */ toWarehouseId?: string; documentRef?: string; }
export interface GoodsReceipt { id: string; receiptNumber?: string; supplierPartyId: string; deliveryNote?: string; receivedAt: Timestamp; lines: any[]; status: 'pending_qc' | 'completed'; notes?: string; logistics?: { carrier?: string; trackingNumber?: string; vehiclePlate?: string; driverName?: string; pallets?: number; grossWeight?: number; volumeM3?: number; temperatureOk?: boolean; packagingOk?: boolean; documentsOk?: boolean; damagedItems?: boolean; arrivalTime?: string; unloadingTime?: string; }; costs?: { unitCosts: number; shippingCost?: number; handlingCost?: number; customsCost?: number; insuranceCost?: number; otherCosts?: number; totalCost: number; }; createdAt?: Timestamp; }
export interface OnHandView { id: string; itemId: string; /** @deprecated Use 'itemId' */ sku?: string; lotNumber: string; /** @deprecated Use 'lotNumber' */ lotNumbers?: Record<string, any>; locationId: string; /** @deprecated Use 'locationId' */ warehouseId?: string; qty: number; /** @deprecated Use 'reservedQty' */ reserved?: number; uom: Uom; qcStatus: QcStatus; category: ItemCategory; expiryAt?: Timestamp | null; reservedQty?: number; createdAt: Timestamp; updatedAt: Timestamp; }
export interface LotGenealogyEdge { id: string; parentLotNumber: string; childLotNumber: string; qty: number; uom: Uom; createdAt: string; }
export interface ReservationView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number }
export interface MarketingEvent { id: string; title: string; startAt: string; endAt?: string; spend?: number; kpis?: any; accountId?: string; status: 'planned' | 'active' | 'closed' | 'cancelled'; city?: string; kind: EventKind; createdAt: Timestamp; updatedAt: Timestamp; ownerUserId?: string;}
export interface OnlineCampaign { id: string; title: string; channel: string; startAt: string; endAt?: string; budget?: number; spend?: number; metrics?: { impressions?: number; clicks?: number; conversions?: number; ctr?: number; cpc?: number; cpm?: number; roas?: number; revenue?: number; }; status: 'planned' | 'active' | 'closed' | 'cancelled'; createdAt: Timestamp; updatedAt: Timestamp; ownerUserId?: string; tracking?: { utmCampaign?: string; couponCode?: string; landingUrl?: string; }; adCosts?: { meta?: number; google?: number; tiktok?: number; other?: number; }; }
export interface InfluencerCollab { id: string; creatorName: string; platform: string; tier: string; status: any; dates?: any; costs?: any; tracking?: any; metrics?: any; deliverables?: any; compensation?: any; creatorId?:string; supplierPartyId?:string; ownerUserId?:string; createdAt:Timestamp; updatedAt:Timestamp; }
export interface PosTactic { id: string; accountId: string; tacticCode?: string; description?: string; customDesc?: string; catalogItemId?: string; qtyPlanned?: number; estCost?: number; actualCost: number; executionScore: number; status: PosTacticStatus; createdAt: Timestamp; createdById: string; items?: PosTacticItem[]; result?: any; taskId?: string; updatedAt: Timestamp; }
export interface PosCostCatalogEntry { id: string; name: string; family: string; fulfillmentMode: string; defaultCost?: number; defaultKpisTemplate?: any; }
export interface DeliveryNote { id: string; pdfUrl?: string; shipmentId: string; partyId: string; series: 'ONLINE'|'B2B'|'INTERNAL'; date: Timestamp; soldTo: any; shipTo: any; lines: any[]; company: any; createdAt: Timestamp; updatedAt: Timestamp; }
export interface QcPlanBySku { id: string; name: string; sku: string; specs: any[] }
export interface ParameterBySku { id: string; code: string; name: string; sku: string; unit?: string; method?: string; target?: number; tolerance?: number; range?: {min?:number,max?:number}, notes?: string }
export interface Protocol { id: string; title: string; code?: string; priority: 'PRP' | 'oPRP' | 'CCP'; active: boolean; checklist: string[]; criticalLimits?: string; monitoring?: string; correctiveActions?: string; verification?: string; records?: string; appliesToSkus?: string[]; createdAt?: Timestamp; updatedAt?: Timestamp; }
export interface QcTest { id: string; lotNumber: string; parameterId: string; kind?: string; valueNumeric?: number; valueText?: string; value?: string | number; testedAt: string; takenAt?: string; testedBy: string; result?: 'PASS' | 'FAIL' | 'NA'; }
export interface ProtocolLog { id: string; productionOrderId: string; }
export interface PosTacticItem {}
export interface Invoice {}
export interface PriceList {}
export interface AccountPriceOverride {}
export interface Activation {}
export interface Promotion {}
export interface MaterialCost {}
export interface FinanceLink { id: string; docType: string; externalId: string; status: 'pending' | 'paid' | 'overdue'; docNumber?: string; netAmount: number; taxAmount: number; grossAmount: number; currency: Currency; issueDate: string; dueDate: string; partyId?: string; costObject?: { kind: string; id: string; }; }
export interface PaymentLink { id: string; externalId: string; financeLinkId: string; amount: number; date: string; method?: string; }
export interface TraceEvent { id: string; at: string; title: string; details: string; links?: { prodOrderId?:string; lotNumber?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string;}; data?: any; phase: TraceEventPhase; kind: TraceEventKind; }

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

export interface Incident {}
export interface CodeAlias {}
export interface Integration {}
export interface Job {}
export interface DeadLetter {}
export interface Expense {}

// -----------------------------------------------------------------
// 2b. NUEVAS ENTIDADES PARA MARKETING DIGITAL Y MÉTRICAS WEB
// -----------------------------------------------------------------

export interface SocialMetrics {
  id: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook';
  date: ISODateString;
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
  date: ISODateString;
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

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  title: string;
  department: Department;
  description?: string;
  startAt?: ISODateString;
  endAt?: ISODateString;
  status: ProjectStatus;
  teamMemberIds: string[];      // usuarios involucrados
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

export interface Campaign {
  id: string;
  title: string;
  kind: CampaignKind;
  department: Department;
  startAt?: ISODateString;
  endAt?: ISODateString;
  kpiTarget?: number;
  notes?: string;
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
export type SellOutStatus = OrderStatus; // Para Shopify
export type SellOutSource = 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';

// -----------------------------------------------------------------
// 4. Metadatos y Constantes (AHORA COMPATIBLE Y UNIFICADO)
// -----------------------------------------------------------------

const colorValues = {
  sun: '#fff5a9', sunStrong: '#fecb46', agua: '#99d9d9', cobre: '#c56a3c',
  naranja: '#ed6a36', verdeMar: '#5a9496', neutral50: '#FAFAFA', neutral900: '#111111',
  success: '#22c55e', warning: '#fecb46', danger: '#ef4444', info: '#3b82f6',
  pink: '#f472b6', hotpink: '#ec4899', indigo: '#6366f1', purple: '#8b5cf6', gray: '#9ca3af',
};

// Restaurado para compatibilidad
export const SB_COLORS = {
  brand: {
    sun: colorValues.sun, sunStrong: colorValues.sunStrong, agua: colorValues.agua, cobre: colorValues.cobre,
    naranja: colorValues.naranja, verdeMar: colorValues.verdeMar, neutral50: colorValues.neutral50, neutral900: colorValues.neutral900,
  },
  primary: { sun: colorValues.sun, copper: colorValues.cobre, aqua: colorValues.agua, teal: colorValues.verdeMar, },
  state: { success: colorValues.success, warning: colorValues.warning, danger: colorValues.danger, info: colorValues.info, },
  lotQC: {
    release: { label: 'LIBERADO', bg: colorValues.success, text: '#ffffff' },
    hold: { label: 'RETENIDO', bg: colorValues.warning, text: '#111111' },
    reject: { label: 'RECHAZADO', bg: colorValues.danger, text: '#ffffff' },
  },
};

// Restaurado para compatibilidad
export const PARTY_ROLE_META: Record<PartyRoleType, { label: string; accent: string }> = {
  CUSTOMER: { label: 'Cliente', accent: colorValues.cobre },
  SUPPLIER: { label: 'Proveedor', accent: colorValues.agua },
  DISTRIBUTOR: { label: 'Distribuidor', accent: colorValues.verdeMar },
  IMPORTER: { label: 'Importador', accent: colorValues.verdeMar },
  INFLUENCER: { label: 'Influencer', accent: colorValues.pink },
  CREATOR: { label: 'Creator', accent: colorValues.hotpink },
  EMPLOYEE: { label: 'Empleado', accent: colorValues.indigo },
  BRAND_AMBASSADOR: { label: 'Brand Ambassador', accent: colorValues.purple },
  OTHER: { label: 'Otro', accent: colorValues.gray },
};

// Restaurado para compatibilidad
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; accent: string }> = {
  open: { label: 'Abierto', accent: colorValues.info },
  confirmed: { label: 'Confirmado', accent: colorValues.verdeMar },
  shipped: { label: 'Enviado', accent: colorValues.success },
  invoiced: { label: 'Facturado', accent: colorValues.cobre },
  paid: { label: 'Pagado', accent: colorValues.success },
  cancelled: { label: 'Cancelado', accent: colorValues.danger },
  lost: { label: 'Perdido', accent: colorValues.danger },
};

// Account Stage Metadata
export const ACCOUNT_STAGE_META: Record<Stage, { label: string; variant: 'info' | 'primary' | 'destructive' | 'default' }> = {
  ACTIVA: { label: 'Activas', variant: 'info' },
  SEGUIMIENTO: { label: 'En seguimiento', variant: 'primary' },
  POTENCIAL: { label: 'Potenciales', variant: 'destructive' },
  FALLIDA: { label: 'Perdidas', variant: 'default' },
  CERRADA: { label: 'Cerradas', variant: 'default' },
  BAJA: { label: 'Bajas', variant: 'default' },
};

// Restaurado para compatibilidad
export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; accent: string }> = {
  pending: { label: 'Pendiente', accent: colorValues.info },
  picking: { label: 'Picking', accent: colorValues.verdeMar },
  ready_to_ship: { label: 'Validado', accent: colorValues.verdeMar },
  shipped: { label: 'Enviado', accent: colorValues.success },
  delivered: { label: 'Entregado', accent: colorValues.success },
  cancelled: { label: 'Cancelado', accent: colorValues.danger },
  exception: { label: 'Incidencia', accent: colorValues.warning },
};

// Restaurado para compatibilidad
export const LOT_QC_META = SB_COLORS.lotQC;

// Restaurado para compatibilidad (con textColor)
export const DEPT_META: Record<Department, { label: string; color: string; textColor: string }> = {
  VENTAS:     { label: 'Ventas',     color: '#ea945e', textColor: '#ffffff' },
  MARKETING:  { label: 'Marketing',  color: '#9dd4d6', textColor: '#2F5D5D' },
  PRODUCCION: { label: 'Producción', color: '#638c8d', textColor: '#ffffff' },
  CALIDAD:    { label: 'Calidad',    color: '#829fce', textColor: '#ffffff' },
  ALMACEN:    { label: 'Almacén',    color: '#996947', textColor: '#ffffff' },
  FINANZAS:   { label: 'Finanzas',   color: '#fecb46', textColor: '#412c00' },
  PERSONAL:   { label: 'Personal',   color: 'hsl(var(--sb-accent-personal))', textColor: 'hsl(var(--sb-neutral-900))' },
  OPS:        { label: 'Operaciones',color: colorValues.indigo, textColor: '#ffffff' },
};

// Restaurado para compatibilidad
export const ITEM_CATEGORY_META: Record<ItemCategory, { label: string; }> = {
  fg: { label: "Producto Terminado" },
  raw: { label: "Materia Prima" },
  pack: { label: "Packaging" },
  label: { label: "Etiqueta" },
  intermediate: { label: "Producto Intermedio" },
  consumable: { label: "Consumible" },
  merch: { label: "Merchandising" },
};

// Restaurado para compatibilidad
export const MODULE_ACCENTS: Record<string, string> = {
  personal: "var(--sb-accent-personal)",
  sales: "var(--sb-accent-ventas)",
  marketing: "var(--sb-accent-marketing)",
  production: "var(--sb-accent-produccion)",
  quality: "var(--sb-accent-calidad)",
  warehouse: "var(--sb-accent-logistica)",
  finance: "var(--sb-accent-finance)",
  admin: "var(--sb-accent-admin)",
  ops: "var(--sb-accent-ops)", // Asumiendo que existe --sb-accent-ops
};

export const SB_THEME = {
  chart: {
    line: [
        `hsl(var(--primary))`,
        `hsl(var(--sb-accent-ventas))`,
        `hsl(var(--sb-accent-marketing))`,
        `hsl(var(--sb-accent-produccion))`
    ],
    grid: `hsl(var(--border))`,
  },
};
// El resto de METAs y helpers se mantienen como en tu versión original...
export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; accent: string }> = { HORECA: { label: 'Horeca', accent: SB_COLORS.primary.copper }, RETAIL: { label: 'Retail', accent: SB_COLORS.primary.aqua }, DISTRIBUIDOR: { label: 'Distribuidor', accent: SB_COLORS.primary.teal }, PRIVADA: { label: 'Venta Privada', accent: SB_COLORS.brand.naranja }, ONLINE: { label: 'Online', accent: SB_COLORS.brand.sunStrong }, OTRO: { label: 'Otro', accent: '#9ca3af' }, };
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
      color: string;
      textColor: string;
    }>;
  };
  
  // 2. METADATA
  metadata: {
    departments: Record<Department, { label: string }>;
    orderStatuses: Record<OrderStatus, { label: string }>;
    shipmentStatuses: Record<ShipmentStatus, { label: string }>;
    partyRoles: Record<PartyRoleType, { label: string }>;
    lotQc: {
      release: { label: string; bg: string; text: string };
      hold: { label: string; bg: string; text: string };
      reject: { label: string; bg: string; text: string };
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
      color: '#9ca3af',
      enabled: true,
      order: 1,
    },
    {
      id: 'VISITA',
      name: 'Visita Comercial',
      icon: '🏪',
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
      color: '#10b981',
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
      color: '#ec4899',
      enabled: true,
      validations: {
        requiresAccount: false,
      },
      order: 5,
    },
  ],
};
