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
export interface User { 
  id: string; 
  name: string; 
  email?: string; 
  role: 'comercial' | 'admin' | 'ops' | 'owner'; 
  active: boolean; 
  managerId?: string; 
  kpiBaseline?: {
    revenue?: number;
    unitsSold?: number;
    visits?: number;
  }
}

export interface Distributor { 
  id: string; 
  name: string; 
  city?: string; 
  country?: string; 
  cif?: string; 
}

export interface Supplier { 
  id: string; 
  name: string; 
  country: string; 
}
```

### Cuentas y Ventas (Accounts & Sales)

```typescript
export interface Account {
  id: string;
  name: string;
  city?: string;
  type: AccountType;
  stage: Stage;
  ownerId: string; // ID del User o Distributor responsable
  billerId: string; // ID del que factura ('SB' o un Distributor)
  
  address?: string;
  phone?: string;
  cif?: string;
  mainContactName?: string;
  mainContactPhone?: string;
  mainContactEmail?: string;
  createdAt: string;
  lastInteractionAt?: string;
  orderCount?: number;
  // Campos enriquecidos por IA
  subType?: string;
  tags?: string[];
  notes?: string;
  openingHours?: string;
  deliveryInstructions?: string;
  // Campos financieros
  paymentTermsDays?: number;
  paymentMethod?: string;
  billingEmail?: string;
  updatedAt?: string;
}

export interface OrderLine { 
  sku: string; 
  qty: number; 
  unit: 'uds'; // Simplificado, ya que siempre se usa 'uds'
  priceUnit: number; 
  discount?: number; 
  lotIds?: string[];
  description?: string;
}

export interface OrderSellOut { 
  id: string; 
  accountId: string; 
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  lines: OrderLine[]; 
  createdAt: string; 
  status: 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
  currency: 'EUR';
  closedAt?: string;
  notes?: string;
  totalAmount?: number;
  paymentMethod?: string;
  paymentTermDays?: number;
  invoiceId?: string;
  externalRef?: string; // Para IDs de sistemas externos como Holded/Shopify
}
```

### Interacciones

```typescript
export interface Interaction {
  id: string;
  userId: string;
  involvedUserIds?: string[];
  accountId?: string;
  kind: 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
  note?: string;
  plannedFor?: string;
  createdAt: string;
  durationMin?: number;
  sentiment?: 'pos' | 'neu' | 'neg';
  dept?: Department;
  status: 'open' | 'done' | 'processing';
  
  location?: string;
  linkedEntity?: {
    type: 'Order' | 'Account' | 'Campaign' | 'Collab' | 'Shipment' | 'ProductionOrder' | 'Interaction';
    id: string;
  };
  tags?: string[];
  
  resultNote?: string;
  nextAction?: {
      date?: string;
      note?: string;
  };
}
```

### Producción (Production)

```typescript
export interface Material { 
  id: string; 
  sku: string; 
  name: string; 
  category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate' | 'finished_good' | 'merchandising'; 
  unit?: Uom; 
  standardCost?: number; 
}

export interface BillOfMaterialItem { 
  materialId: string; 
  quantity: number; 
  unit?: string; 
}

export interface BillOfMaterial { 
  id: string; 
  sku: string; 
  name: string; 
  items: BillOfMaterialItem[]; 
  batchSize: number; 
  baseUnit?: string;
}

export interface ProductionOrder { 
  id: string; 
  sku: string; 
  bomId: string; 
  targetQuantity: number; 
  status: 'pending' | 'released' | 'wip' | 'done' | 'cancelled'; 
  createdAt: string; 
  lotId?: string; 
}

export type QCResult = {
  value?: number | string | boolean;
  notes?: string;
  status: 'ok' | 'ko';
};

export interface Lot {
  id: string;
  sku: string;
  quantity: number;
  createdAt: string;
  orderId?: string; // Production Order ID
  supplierId?: string; // For raw materials
  quality: { qcStatus: 'hold' | 'release' | 'reject', results: Record<string, QCResult> };
  expDate?: string;
  receivedAt?: string;
}
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
    goodsReceiptId?: string;
  };
}

export interface GoodsReceiptLine {
    materialId: string;
    sku: string;
    lotId: string;
    qty: number;
    uom: Uom;
}
export interface GoodsReceipt {
    id: string;
    supplierId: string;
    deliveryNote: string; // Número de albarán del proveedor
    receivedAt: string;
    lines: GoodsReceiptLine[];
    status: 'pending_qc' | 'completed' | 'partial';
}

export interface ShipmentLine {
  sku: string;
  name: string;
  qty: number;
  unit: 'uds';
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
---
