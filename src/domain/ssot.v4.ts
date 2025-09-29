
// src/domain/ssot.v4.ts
// This file contains the previous version of the SSOT for type compatibility.

export type Timestamp = string;
export type LotNumber = string;
export type ISO = string;
export type UnitOfMass = 'kg' | 'g';
export type UnitOfVolume = 'L' | 'mL';
export type SalesUnit = 'bottle' | 'case' | 'pallet' | 'uds';
export type Uom = UnitOfMass | UnitOfVolume | SalesUnit;
export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD' | 'PERSONAL';
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR' | 'OTHER';
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO' | 'DISTRIBUIDOR';
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';
export type InteractionStatus = 'open' | 'done' | 'processing' | 'closed' | 'cancelled';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'exception' | 'cancelled';
export type ProductionStatus = 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED';
export type ProductionStage = 'PRODUCCION' | 'ENVASADO';
export type ItemCategory = 'fg' | 'raw' | 'pack' | 'label' | 'intermediate' | 'consumable' | 'merch';
export type QcStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED';
export type LotStatus = 'OPEN' | 'RELEASED' | 'BLOCKED' | 'CONSUMED' | 'SCRAPPED';
export type LotBucket = 'HOLD' | 'RELEASED' | 'REJECTED';
export type InteractionKind = 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO' | 'COBRO' | 'EVENTO_MKT';
export type EventKind = 'DEMO' | 'FERIA' | 'FORMACION' | 'OTRO';
export type PosTacticStatus = 'planned' | 'active' | 'closed' | 'cancelled';
export type TraceEventKind = 'RECEIPT' | 'PRODUCTION_OUT' | 'PRODUCTION_IN' | 'CONSUME' | 'OUTPUT' | 'QC_TEST' | 'SHIPMENT' | 'ADJUSTMENT' | 'MOVE' | 'ARRIVED' | 'GENEALOGY_PARENT' | 'GENEALOGY_CHILD';
export type TraceEventPhase = 'SOURCE' | 'RECEIPT' | 'QC' | 'PRODUCTION' | 'PACK' | 'WAREHOUSE' | 'SALE' | 'DELIVERY';

// Interfaces from the previous version
export interface User { id: string; name: string; email?: string; role: UserRole; active: boolean; }
export interface Item { id: string; sku: string; name: string; category: ItemCategory; uom: Uom; active: boolean; stdCost?: number; bottleMl?: number; caseUnits?: number; }
export interface BillOfMaterial { id: string; outputItemId: string; name: string; batchSize: number; baseUnit: Uom; items: any[]; }
export interface ProductionOrder { id: string; orderNumber?: string; bomId: string; outputItemId: string; targetQuantity: number; status: ProductionStatus; createdAt: Timestamp; }
export interface StockMove { id: string; itemId: string; lotNumber: string; qty: number; uom: Uom; reason: string; fromLocationId?: string; toLocationId?: string; occurredAt: Timestamp; }
export interface GoodsReceipt { id: string; supplierPartyId: string; receivedAt: Timestamp; lines: any[]; }
export interface OnHandView { id: string; itemId: string; lotNumber: string; locationId: string; qty: number; uom: Uom; qcStatus: QcStatus; category: ItemCategory; expiryAt?: string | null; reservedQty?: number; createdAt: string; updatedAt: string; }
export interface Party { id: string; name: string; legalName: string; taxId?: string; billingAddress?: any; phones?: any[]; emails?: any[]; }
export interface PartyRole { id: string; partyId: string; role: PartyRoleType; }
export interface CustomerData {}
export interface Interaction { id: string; accountId: string; note?: string; kind: InteractionKind; createdAt: string; status: InteractionStatus; plannedFor?: string; userId: string; dept?: Department; linkedEntity?: any; involvedUserIds?: string[]; location?: string; }
export interface MarketingEvent { id: string; title: string; }
export interface OnlineCampaign { id: string; title: string; }
export interface InfluencerCollab { id: string; creatorName: string; }
export interface PosTactic { id: string; accountId: string; }
export interface PosTacticItem {}
export interface PosCostCatalogEntry {}
export interface PlvMaterial {}
export interface Lot { id: string; lotNumber: LotNumber; itemId: string; qcStatus: QcStatus; createdAt: Timestamp; }
export interface QcTest { id: string; }
export interface QcPlanBySku { id: string; }
export interface ParameterBySku { id: string; }
export interface Protocol { id: string; }
export interface DeliveryNote { id: string; }
export interface FinanceLink { id: string; }
export interface PaymentLink { id: string; }
export interface LotGenealogyEdge { id: string; }

export type { SB_THEME } from './ssot.metas';

export interface SantaDataV4 {
    items: Item[];
    stockMoves: StockMove[];
    productionOrders: ProductionOrder[];
    ordersSellOut: any[];
    shipments: any[];
    goodsReceipts: GoodsReceipt[];
    onHand: OnHandView[];
    parties: Party[];
    partyRoles: PartyRole[];
    accounts: Account[];
    users: User[];
    interactions: Interaction[];
    billOfMaterials: BillOfMaterial[];
    lots: Lot[];
    partyDuplicates: any[];
    qcParameters: ParameterBySku[];
    qcPlans: QcPlanBySku[];
    qcTests: QcTest[];
    deliveryNotes: DeliveryNote[];
    lotGenealogy: LotGenealogyEdge[];
    marketingEvents: MarketingEvent[];
    onlineCampaigns: OnlineCampaign[];
    influencerCollabs: InfluencerCollab[];
    posTactics: PosTactic[];
    posCostCatalog: PosCostCatalogEntry[];
    plv_material: PlvMaterial[];
    reservations?: any[];
    [key: string]: any;
}
