// This file can contain additional types that are shared across the domain
// but are not part of the core SSOT definition, for better organization.
// For now, it's empty as we've consolidated everything in ssot.ts.
import type { Department, InteractionStatus, OrderStatus, AccountType, Stage } from './ssot';

export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO'|'FERIA'|'FORMACION'|'OTRO';

export type Payload =
    | { type: 'venta', items: { itemId: string; qty: number }[] }
    | { type: 'interaccion', note: string, nextActionDate?: string }
    | { type: 'visita_plv', note: string, nextActionDate?: string, plvInstalled: boolean, plvNotes?: string }
    | { type: 'cobro', amount: number, notes?: string }
    | { type: 'evento_mkt', kpis: { cost: number; attendees: number; leads: number }, notes?: string };


export interface Interaction {
  id: string;
  partyId?: string;
  accountId?: string;
  userId: string;
  dept?: Department;
  kind: InteractionKind;
  note?: string;
  plannedFor?: string;
  createdAt: string;
  status: InteractionStatus;
  resultNote?: string;
  involvedUserIds?: string[];
  location?: string;
  linkedEntity?: {
    type: 'Order' | 'Account' | 'EVENT' | 'Collab' | 'Shipment' | 'ProductionOrder' | 'Interaction' | 'PosTactic';
    id: string;
  };
  tags?: string[];
  posTactic?: {
    tacticCode: string;
    startDate: string;
    endDate?: string;
    costTotal: number;
    executionScore: number;
    exposure?: {
      unitsGiven?: number;
      staffIncentivized?: number;
    };
    appliesToSkuIds?: string[];
    photos?: string[];
  };
  posTacticResult?: PosResult;
}

export type ActivationType = 'bartender_day' | 'tasting' | 'event' | 'other_experience';
export interface Activation {
    id: string;
    accountId: string;
    type: ActivationType;
    cost: number;
    description: string;
    status: 'active' | 'inactive' | 'pending_renewal';
    startDate: string;
    endDate?: string;
    ownerId: string;
}

export interface Promotion {
    id: string;
    code?: string;
    name: string;
    type: '5+1' | 'BOGO' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED';
    value: number;
    validFrom: string;
    validTo: string;
}

export interface MarketingEvent {
    id: string;
    title: string;
    kind: EventKind;
    status: 'planned' | 'active' | 'closed' | 'cancelled';
    startAt: string;
    endAt?: string;
    ownerUserId?: string;
    accountId?: string;
    city?: string;
    location?: string;
    budget?: number;
    spend?: number;
    goal?: {
        leads?: number;
        sampling?: number;
        impressions?: number;
        interactions?: number
    };
    kpis?: {
        leads?: number;
        sampling?: number;
        impressions?: number;
        interactions?: number;
        revenueAttributed?: number;
        roi?: number;
        completedAt?: string;
    };
    links?: {
        activationId?: string;
        plvIds?: string[];
        promotionId?: string;
    };
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OnlineCampaign {
    id: string;
    title: string;
    channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other';
    status: 'planned' | 'active' | 'closed' | 'cancelled';
    startAt: string;
    endAt?: string;
    budget: number;
    spend: number;
    metrics?: any;
    createdAt: string;
    updatedAt: string;
    ownerUserId?: string;
    tracking?: {
        utmCampaign?: string;
        couponCode?: string;
        landingUrl?: string;
    };
}

export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitch' | 'Blog' | 'Otro';
export type Deliverable = 'post' | 'story' | 'reel' | 'short' | 'video_long' | 'stream' | 'blogpost';
export type CompType = 'gift' | 'flat' | 'cpa' | 'cpc' | 'revshare';
export type CollabStatus = 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
export type Tier = 'nano' | 'micro' | 'mid' | 'macro';

export interface InfluencerCollab {
  id: string;
  creatorId: string;
  creatorName: string;
  handle?: string;
  platform: Platform;
  tier: Tier;
  status: CollabStatus;
  ownerUserId?: string;
  couponCode?: string;
  utmCampaign?: string;
  deliverables: {
    kind: Deliverable;
    qty: number;
    dueAt?: string;
  }[];
  compensation: {
    type: CompType;
    amount?: number;
    notes?: string;
  };
  costs?: {
    productCost?: number;
    shippingCost?: number;
    cashPaid?: number;
    otherCost?: number;
  };
  tracking?: {
    views?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    clicks?: number;
    orders?: number;
    revenue?: number;
    updatedAt?: string;
    couponCode?: string;
    utmCampaign?: string;
  };
  metrics?: {
    impressions?: number;
    clicks?: number;
    engagements?: number;
    orders?: number;
    ctr?: number;
    cpm?: number;
    cpc?: number;
    cpe?: number;
    cac?: number;
  };
  dates?: {
    agreedAt?: string;
    goLiveAt?: string;
    completedAt?: string;
    endAt?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  supplierPartyId: string;
}

export interface MaterialCost {
  id: string;
  itemId: string;
  currency: 'EUR';
  costPerUom: number;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

export type HoldedDocType = 'SALES_INVOICE' | 'PURCHASE_BILL' | 'CREDIT_NOTE' | 'EXPENSE';
export type CostObjectKind = 'NONE' | 'PRODUCT' | 'LOT' | 'PROD_ORDER' | 'ACCOUNT' | 'ORDER' | 'SHIPMENT' | 'EVENT' | 'CAMPAIGN' | 'COLLAB' | 'DEPARTMENT';
export type ExpenseCategory = 'COGS_MATERIAL' | 'COGS_FREIGHT' | 'COGS_DUTY' | 'PLV' | 'MARKETING_MEDIA' | 'INFLUENCER' | 'EVENT' | 'TRAVEL' | 'MEALS' | 'ACCOMMODATION' | 'TRANSPORT' | 'SALARIES' | 'SOCIAL_SECURITY' | 'SUBCONTRACTING' | 'OTHER_OPEX';

export interface FinanceLink {
  id: string;
  docType: HoldedDocType;
  externalId: string;
  status: 'paid' | 'pending' | 'overdue';
  netAmount: number; taxAmount: number; grossAmount: number;
  currency: 'EUR';
  issueDate: string;
  dueDate: string;
  docNumber?: string;
  partyId?: string;
  expenseCategory?: ExpenseCategory;
  costObject?: { kind: CostObjectKind; id: string };
  allocationPct?: number;
  campaignId?: string; eventId?: string; collabId?: string;
}
export interface PaymentLink { id: string; financeLinkId: string; externalId?: string; amount: number; date: string; method?: string; }

export type PosUom = 'UNIT'|'HOUR'|'BATCH';
export type PosCostCatalogEntry = {
  id: string;
  code: string;
  label: string;
  defaultUnitCost?: number;
  uom?: PosUom;
  vendor?: string;
  status?: 'ACTIVE'|'DRAFT'|'ARCHIVED';
  createdAt?: string; createdById?: string;
  updatedAt?: string;
};

export type PlvStatus = 'IN_STOCK'|'INSTALLED'|'DAMAGED'|'RETIRED';
export type PlvMaterial = {
  id: string;
  itemId?: string;
  kind: 'SHELF_TALKER'|'STANDEE'|'FRIDGE_STICKER'|'HANGING'|'GONDOLA'|'OTHER';
  purchaseCost?: number;
  purchaseDate?: string;
  expectedLifespanMonths?: number;
  expectedUses?: number;
  usesCount?: number;
  status: PlvStatus;
  accountId?: string;
  installedAt?: string;
  photoUrl?: string;
  createdAt?: string; updatedAt?: string;
};

export type PosTacticItem = {
  id: string;
  catalogCode?: string;
  description: string;
  qty?: number;
  unitCost?: number;
  actualCost: number;
  uom?: PosUom;
  vendor?: string;
  assetId?: string;
  attachments?: string[];
};

export type PosTacticKind = 'PLV'|'MENU'|'INCENTIVE'|'PROMO'|'OTHER';

export type PosTacticStatus = 'planned'|'active'|'closed'|'cancelled';

export type PosResult = {
  roi?: number;
  liftPct?: number;
  upliftUnits?: number;
  confidence?: 'LOW'|'MEDIUM'|'HIGH';
  revenueAttributed?: number;
};

export type PosTactic = {
  id: string;
  accountId: string;
  eventId?: string;
  interactionId?: string;
  orderId?: string;
  tacticCode: string;
  description?: string;
  appliesToItemIds?: string[];
  items: PosTacticItem[];
  plannedCost?: number;
  actualCost: number;
  executionScore: number;
  status: PosTacticStatus;
  createdAt: string; createdById: string;
  updatedAt?: string;
  result?: PosResult;
};

export type CodeEntity = 'PRODUCT' | 'ACCOUNT' | 'PARTY' | 'SUPPLIER' | 'LOT' | 'PROD_ORDER' | 'SHIPMENT' | 'GOODS_RECEIPT' | 'LOCATION' | 'PRICE_LIST' | 'PROMOTION';

export interface CodePolicy {
  entity: CodeEntity;
  template: string;
  regex: string;
  seqScope?: 'GLOBAL' | 'YEAR' | 'MONTH' | 'DAY';
  pad?: number;
}

export type ExternalSystem = 'HOLDED'|'SHOPIFY'|'EAN'|'GTIN'|'CUSTOMER_REF'|'SUPPLIER_REF';

export interface CodeAlias {
  id: string;
  entity: CodeEntity;
  entityId: string;
  system: ExternalSystem;
  code: string;
  createdAt: string;
}

export type IncidentKind = 'QC_INBOUND' | 'QC_PROCESS' | 'QC_RELEASE' | 'LOGISTICS' | 'CUSTOMER_RETURN';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CONTAINED' | 'CLOSED';
export interface Incident {
  id: string;
  kind: IncidentKind;
  status: IncidentStatus;
  openedAt: string;
  closedAt?: string;
  dept?: Department;
  partyId?: string;
  lotNumber?: string;
  goodsReceiptId?: string;
  shipmentId?: string;
  orderId?: string;
  description?: string;
  photos?: string[];
  correctiveActions?: { note: string; at: string; byUserId?: string }[];
  notes?: string;
}

export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';
export type TraceEventKind = 'FARM_DATA' | 'SUPPLIER_PO' | 'ARRIVED' | 'BOOKED' | 'CHECK_PASS' | 'CHECK_FAIL' | 'BATCH_PLANNED' | 'BATCH_RELEASED' | 'BATCH_START' | 'CONSUME' | 'BATCH_END' | 'OUTPUT' | 'PACK_START' | 'PACK_END' | 'MOVE' | 'RESERVE' | 'ORDER_ALLOC' | 'SHIPMENT_PICKED' | 'SHIPPED' | 'DELIVERED';
export interface TraceEvent {
    id: string;
    subject: { type: 'LOT' | 'BATCH' | 'ORDER' | 'SHIPMENT'; id: string; };
    phase: TraceEventPhase;
    kind: TraceEventKind;
    occurredAt: string;
    actorId?: string;
    links?: { lotNumber?: string; batchId?: string; orderId?: string; shipmentId?: string; receiptId?: string; qaCheckId?: string; };
    data?: any;
}
