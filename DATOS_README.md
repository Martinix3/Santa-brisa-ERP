# Léeme: Estructuras de Datos del Proyecto

Este documento centraliza las principales estructuras de datos (`type` e `interface`) utilizadas en la aplicación. Sirve como referencia rápida para el desarrollo.

---

## 1. Dominio Principal (SSOT)

Fuente: `domain/ssot.ts`

### Tipos Generales

```typescript
export type Uom = 'bottle' | 'case' | 'pallet' | 'ud' | 'kg' | 'g' | 'L' | 'mL';
export type Currency = 'EUR';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS';
```

### Personas y Organizaciones

```typescript
export type User = { 
  id: string; 
  name: string; 
  email?: string; 
  role: 'comercial' | 'admin' | 'ops' | 'owner'; 
  active: boolean; 
  managerId?: string; 
};

export type Distributor = { 
  id: string; 
  name: string; 
  city?: string; 
  country?: string; 
  cif?: string; 
};
```

### Cuentas y Ventas (Accounts & Sales)

```typescript
export type AccountMode = 
  | { mode: 'PROPIA_SB'; ownerUserId: string; biller: 'SB' } 
  | { mode: 'COLOCACION'; ownerUserId: string; billerPartnerId: string } 
  | { mode: 'DISTRIB_PARTNER'; ownerPartnerId: string; billerPartnerId: string };

export type Account = { 
  id: string; 
  name: string; 
  city?: string; 
  stage: 'ACTIVA' | 'SEGUIMIENTO' | 'POTENCIAL' | 'FALLIDA'; 
  type: 'HORECA' | 'RETAIL' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'OTRO'; 
  mode: AccountMode; 
  distributorId?: string; 
  cif?: string; 
  address?: string; 
  phone?: string; 
  createdAt: string; 
};

export type OrderLine = { 
  sku: string; 
  qty: number; 
  unit: 'caja' | 'ud' | 'palet'; 
  priceUnit: number; 
  discount?: number; 
  lotNumber?: string; 
};

export type OrderSellOut = { 
  id: string; 
  accountId: string; 
  userId?: string; 
  distributorId?: string; 
  status: 'open' | 'confirmed' | 'shipped' | 'lost' | 'cancelled'; 
  createdAt: string; 
  lines: OrderLine[]; 
};
```

### Producción (Production)

```typescript
export type Material = { 
  id: string; 
  sku?:string; 
  name: string; 
  category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate' | 'finished_good' | 'merchandising'; 
  unit?: 'kg' | 'L' | 'g' | 'ud' | 'mL'; 
  standardCost?: number; 
};

export type BomItem = { 
  materialId: string; 
  quantity: number; 
  unit?: string; 
};

export type BillOfMaterial = { 
  id?:string; 
  sku: string; 
  name: string; 
  items: BomItem[]; 
  batchSize: number; 
  baseUnit?: string;
};

export type ProductionOrder = { 
  id: string; 
  sku: string; 
  bomId?: string; 
  targetQuantity: number; 
  status: 'pending' |'released'| 'wip' | 'done' | 'cancelled'; 
  createdAt: string; 
  lotId?: string; 
};

export type QCResult = {
  value?: number;
  notes?: string;
  status: 'ok' | 'ko';
};

export type LotQuality = {
  qcStatus: 'hold' | 'release' | 'reject';
  results: Record<string, QCResult>;
  docs?: any[];
};

export type Lot = {
  id: string;
  sku: string;
  quantity: number;
  createdAt: string;
  orderId: string;
  quality: LotQuality;
  expDate?: string;
  receivedAt?: string;
};

export type TraceEvent = { 
  id: string; 
  type: 'consume' | 'produce' | 'quality_check'; 
  materialId: string; 
  qty: number; 
  at: string; 
  meta?: Record<string, any>; 
};
```

### Almacén y Logística (Warehouse & Logistics)

```typescript
export interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
  bottleMl?: number;
  caseUnits?: number;
  casesPerPallet?: number;
  active: boolean;
  materialId?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  lotNumber?: string;
  uom: Uom;
  qty: number;
  locationId: string;
  expDate?: string;
  updatedAt: string;
}

export type StockReason =
  | 'receipt'
  | 'production_in'
  | 'production_out'
  | 'sale'
  | 'transfer'
  | 'adjustment'
  | 'return_in'
  | 'return_out';

export interface StockMove {
  id: string;
  sku: string;
  lotNumber?: string;
  uom: Uom;
  qty: number;
  from?: string;
  to?: string;
  reason: StockReason;
  at: string;
  ref?: {
    orderId?: string;
    shipmentId?: string;
    prodOrderId?: string;
  };
}

export interface ShipmentLine {
  sku: string;
  name: string;
  qty: number;
  unit: 'caja' | 'ud' | 'palet';
  lotNumber?: string;
}

export interface Shipment {
  id: string;
  status: 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  accountId: string;
  customerName: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  country?: string;
  lines: ShipmentLine[];
  notes?: string;
}
```

### Marketing

```typescript
export type MktStatus = 'planned' | 'active' | 'closed' | 'cancelled';

export type EventMarketing = { 
  id: string; 
  title: string; 
  kind: 'DEMO' | 'FERIA' | 'FORMACION' | 'POPUP' | 'OTRO'; 
  status: MktStatus; 
  startAt: string; 
  endAt?: string; 
  city?: string; 
  venue?: string; 
  goal?: { sampling: number; leads: number; salesBoxes: number; }; 
  spend?: number; 
  plv?: Array<{ sku: string; qty: number; }>; 
};

export type OnlineCampaign = { 
  id: string; 
  title: string; 
  channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other'; 
  status: MktStatus; 
  startAt: string; 
  endAt?: string; 
  budget: number; 
  spend: number; 
  metrics?: { 
    impressions: number; 
    clicks: number; 
    ctr?: number; 
    conversions?: number; 
    cpa?: number; 
    roas?: number; 
  }; 
  assets?: any[]; 
  utm?: Record<string,string> 
};
```

### Marketing de Influencers

Fuente: `domain/influencers.ts`

```typescript
export type Platform = "Instagram"|"TikTok"|"YouTube"|"Twitch"|"Blog"|"Otro";
export type Tier = "nano"|"micro"|"mid"|"macro";

export interface Creator {
  id: string;
  name: string;
  handle?: string;
  platform: Platform;
  tier: Tier;
  audience?: number;
  country?: string; city?: string;
  email?: string; phone?: string;
  shippingAddress?: string;
  tags?: string[];
  createdAt: string; updatedAt: string;
}

export type InfStatus =
  | "PROSPECT" | "OUTREACH" | "NEGOTIATING" | "AGREED"
  | "LIVE" | "COMPLETED" | "PAUSED" | "DECLINED";

export type Deliverable =
  | "post" | "story" | "reel" | "short" | "video_long" | "stream" | "blogpost";

export type CompType = "gift" | "flat" | "cpa" | "cpc" | "revshare";

export interface InfluencerCollab {
  id: string;
  creatorId?: string;
  creatorName: string;
  handle?: string;
  platform: Platform;
  tier: Tier;
  status: InfStatus;
  ownerUserId?: string;
  couponCode?: string;
  utmCampaign?: string;
  landingUrl?: string;
  deliverables: { kind: Deliverable; qty: number; dueAt?: string }[];
  compensation: { type: CompType; amount?: number; currency?: "EUR"; notes?: string; };
  costs?: { productCost?: number; shippingCost?: number; cashPaid?: number; otherCost?: number };
  tracking?: {
    clicks?: number; orders?: number; revenue?: number;
    impressions?: number; views?: number;
    likes?: number; comments?: number; saves?: number; shares?: number;
    updatedAt?: string;
  };
  dates?: { outreachAt?: string; agreedAt?: string; goLiveAt?: string; deadlineAt?: string; completedAt?: string; };
  sampleOrderId?: string;
  eventIds?: string[];
  notes?: string;
  createdAt: string; updatedAt: string;
}
```

---

## 2. Estructuras para Generación de PDFs

Fuente: `features/pdf/generation.tsx`

Estas estructuras son específicas para la librería `pdf-lib` y se construyen a partir de los datos del SSOT.

```typescript
export type Address = {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type OrderLinePDF = {
  sku: string;
  descripcion: string;
  cajas: number;
  unidadesPorCaja: number;
  loteSugerido?: string;
  lote?: string;
};

export type Pedido = {
  id: string;
  fecha: string;
  cliente: Address;
  remitente: Address;
  observaciones?: string;
  lineas: OrderLinePDF[];
};

export type Albaran = {
  id: string;
  pedidoId: string;
  fecha: string;
  cliente: Address;
  remitente: Address;
  incidencias?: string;
  lineas: OrderLinePDF[];
};

export type EtiquetaEnvio = {
  pedidoId: string;
  albaranId?: string;
  remitente: Address;
  destinatario: Address;
  bultos: number;
  pesoKg?: number;
  notas?: string;
};
```

---

## 3. Estructuras para Módulos Específicos

### Cashflow

Fuente: `src/cashflow.settings.ts`

```typescript
export type ChannelCF = 'sell_in' | 'sell_out' | 'direct' | 'online';

export type CashflowSettings = {
  currency: 'EUR';
  openingBalance: number;
  defaultTermsDays: number;
  termsByChannel?: Partial<Record<ChannelCF, number>>;
  lagByPaymentMethod?: Partial<Record<'contado'|'transferencia'|'tarjeta'|'paypal'|'domiciliado', number>>;
  includeConfidence: { high: boolean; medium: boolean; low: boolean };
  vatMode: 'net'|'gross';
  vatSettlementDay?: 20;
  fxRates?: Record<string, number>;
  payoutFeePctOnline?: number;
  bankFeePct?: number;
  agingLagDays?: number;
  bucket: 'day'|'week'|'month';
};
```

### Lógica de Lotes (Lotting)

Fuente: `src/lotting.ts`

```typescript
export type StockByLot = Array<{
  lotId: string;
  sku: string;
  locationId: string;
  onHand: number;
  expDate?: string;
  receivedAt?: string;
}>;

export type Allocation = { 
  orderId: string; 
  materialId: string; 
  fromLotId: string; 
  qty: number; 
};

export type LottingPolicy = {
  inputStrategy: 'FEFO' | 'FIFO';
  output: {
    maxLotUnits?: number;
    dateFormat?: 'YYYYMMDD';
    suffix: 'alpha' | 'numeric';
  };
};
```
