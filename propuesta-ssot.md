
# Propuesta de Arquitectura de Datos (SSOT) - V2

Este documento presenta una propuesta completa para la estructura de datos principal de la aplicación. El objetivo es crear un modelo claro, escalable y fácil de mantener que cubra todas las áreas del negocio, unificando conceptos para mayor simplicidad.

---

## 1. Enfoque: Entidades Especializadas y Relacionadas

La arquitectura se basa en el principio de separar cada tipo de entidad en su propia colección de datos, pero reconociendo sus roles fundamentales.

*   **Clientes (`Account`)**: Entidades a las que les vendemos.
*   **Proveedores (`Supplier`)**: Entidades a las que les compramos bienes o servicios (incluye materias primas, agencias, influencers, etc.).
*   **Empleados/Usuarios (`User`)**: Personas con acceso al sistema.

---

## 2. Tipos Primitivos y Enums

Estos son los tipos y uniones que se reutilizan en toda la aplicación para garantizar la consistencia.

```typescript
// Tipos de unidad de medida
export type Uom = 'bottle' | 'case' | 'pallet' | 'uds' | 'kg' | 'g' | 'L' | 'mL';

// Divisas
export type Currency = 'EUR';

// Departamentos internos
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS';

// Etapa del ciclo de vida de un cliente (Account)
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';

// Tipo de cliente (Account)
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'ONLINE' | 'OTRO';

// Estados para flujos de trabajo
export type InteractionStatus = 'open' | 'done' | 'processing';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
export type ProductionStatus = 'pending' | 'released' | 'wip' | 'done' | 'cancelled';
```

---

## 3. Entidades Principales (Personas y Organizaciones)

Representan a los actores clave del negocio.

```typescript
// --- USUARIOS INTERNOS / EMPLEADOS ---
// Representa a una persona con acceso al sistema. Es la entidad para la autenticación y permisos.
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner' | 'marketing';

export interface User { 
  id: string; 
  name: string; 
  email: string; 
  role: UserRole;
  active: boolean; 
  managerId?: string; // ID de su responsable
}

// --- CLIENTES ---
// Representa a una entidad a la que se le vende producto. Es el corazón del CRM.
export interface Account {
  id: string;
  name: string;
  cif?: string;
  
  // --- Clasificación y Propiedad ---
  type: AccountType;
  stage: Stage;
  ownerId: string;     // ID del User o Distributor responsable
  billerId: string;    // Quién factura ('SB' o un Distributor)
  
  // --- Datos de Contacto y Ubicación ---
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  mainContactName?: string;
  mainContactEmail?: string;

  // --- Datos Enriquecidos (pueden ser por IA) ---
  subType?: string;    // Ej. "Bar de copas", "Restaurante de autor"
  tags?: string[];     // Ej. ["música en vivo", "terraza con vistas"]
  openingHours?: string;
  deliveryInstructions?: string;
  
  // --- Datos Financieros ---
  paymentTermsDays?: number;
  paymentMethod?: string;
  billingEmail?: string;
  
  // --- Metadatos del Sistema ---
  createdAt: string; // ISO Date
  updatedAt?: string;
  lastInteractionAt?: string;
  orderCount?: number;
  notes?: string;
}

// --- PROVEEDORES ---
// Entidad a la que se le compra materia prima o servicios.
// Incluye proveedores de marketing como influencers, agencias, etc.
export type SupplierType = 'MATERIA_PRIMA' | 'PACKAGING' | 'SERVICIOS_GENERALES' | 'MARKETING_INFLUENCER' | 'MARKETING_AGENCIA' | 'FOTOGRAFIA' | 'OTRO';

export interface Supplier { 
  id: string; 
  name: string;
  type: SupplierType;
  
  // Datos fiscales y de contacto
  cif?: string;
  country: string;
  contactName?: string;
  email?: string;
  phone?: string;

  // Datos específicos de marketing (si aplica)
  handle?: string;
  platform?: 'Instagram' | 'TikTok' | 'YouTube' | 'Blog' | 'Otro';
  tier?: 'nano' | 'micro' | 'mid' | 'macro';
  audienceSize?: number;

  // Datos financieros
  paymentTermsDays?: number;
  bankAccount?: string;
  
  // Metadatos
  tags?: string[];
  createdAt: string;
}

// --- DISTRIBUIDORES ---
// Un tipo especial de cliente/partner que también puede ser propietario de cuentas.
export interface Distributor { 
  id: string; 
  name: string; 
  city?: string; 
  country?: string; 
  cif?: string; 
}
```

---

## 4. Ventas y Actividad Comercial

Registra las transacciones e interacciones con los clientes.

```typescript
// --- PEDIDOS DE VENTA ---
export interface OrderLine { 
  sku: string; 
  qty: number; 
  uom: 'uds'; // Se asume que los pedidos de venta son siempre en unidades
  priceUnit: number; 
  discount?: number; 
  lotIds?: string[]; // Para trazabilidad
}

export interface OrderSellOut { 
  id: string; 
  accountId: string; // Vinculado a un Account
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL';
  lines: OrderLine[]; 
  createdAt: string; 
  status: OrderStatus;
  currency: Currency;
  totalAmount?: number; // Calculado o explícito
  notes?: string;
  promotionIds?: string[]; // IDs de las promociones aplicadas
  invoiceId?: string;
  externalRef?: string; // Para IDs de sistemas externos como Holded/Shopify
}

// --- INTERACCIONES ---
// Registra cualquier punto de contacto con un cliente.
export interface Interaction {
  id: string;
  userId: string;         // Usuario que registra la interacción
  involvedUserIds?: string[]; // Otros usuarios participantes
  accountId?: string;      // Cuenta con la que se interactúa
  kind: 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
  note?: string;           // Descripción de la interacción
  plannedFor?: string;     // Si es una tarea futura
  createdAt: string;
  status: InteractionStatus; // open | done
  dept?: Department;       // A qué departamento pertenece la tarea
  resultNote?: string;
  nextAction?: {
      date?: string;
      note?: string;
  };
}
```

---

## 5. Producción, Calidad y Trazabilidad

Define cómo se fabrican los productos y cómo se sigue su rastro.

```typescript
// --- CATÁLOGOS DE PRODUCTOS Y MATERIALES ---
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'finished_good' | 'merchandising';
  active: boolean;
  // ...otros campos como unidades por caja, etc.
}

export interface Material { 
  id: string; 
  sku: string; 
  name: string; 
  category: 'raw' | 'packaging' | 'label' | 'consumable' | 'intermediate'; 
  uom: Uom;
  standardCost?: number; 
}

// --- RECETAS (BILL OF MATERIALS) ---
export interface BillOfMaterialItem { 
  materialId: string; 
  quantity: number; 
  uom: Uom; 
}

export interface BillOfMaterial { 
  id: string; 
  sku: string; // SKU del producto terminado que produce
  name: string; 
  items: BillOfMaterialItem[]; 
  batchSize: number; // Tamaño del lote base para las cantidades de los items
  baseUnit: Uom;
}

// --- ÓRDENES DE PRODUCCIÓN ---
export interface ProductionOrder { 
  id: string; 
  sku: string; 
  bomId: string; 
  targetQuantity: number; 
  status: ProductionStatus;
  createdAt: string; 
  lotId?: string; // Lote de producto terminado generado
}

// --- LOTES Y CALIDAD ---
export type QCResult = {
  value?: number | string | boolean;
  notes?: string;
  status: 'ok' | 'ko';
};

export interface Lot {
  id: string; // Formato: YYMMDD-SKU-SEQ
  sku: string;
  quantity: number;
  createdAt: string;
  orderId?: string;      // Production Order ID que lo generó
  supplierId?: string;   // Para materias primas
  quality: { 
    qcStatus: 'hold' | 'release' | 'reject', 
    results: Record<string, QCResult> 
  };
  expDate?: string;
  receivedAt?: string;
}
```

---

## 6. Almacén y Logística

Controla el stock físico y los envíos.

```typescript
// --- INVENTARIO ---
export interface InventoryItem {
  id: string;
  sku: string;
  lotNumber?: string;
  uom: Uom;
  qty: number;
  locationId: string; // Ej: 'FG/MAIN', 'RM/MAIN', 'QC/AREA'
  expDate?: string;
  updatedAt: string;
}

// --- MOVIMIENTOS DE STOCK ---
export type StockReason =
  | 'receipt'       // Entrada de proveedor
  | 'production_in' // Entrada de producción a almacén
  | 'production_out'// Salida de almacén a producción
  | 'sale'          // Salida por venta
  | 'transfer'      // Movimiento entre almacenes
  | 'adjustment'    // Ajuste manual
  | 'return_in'     // Devolución de cliente
  | 'return_out';   // Devolución a proveedor

export interface StockMove {
  id: string;
  sku: string;
  lotNumber?: string;
  uom: Uom;
  qty: number; // Positivo para entrada, negativo para salida
  from?: string; // Ubicación origen
  to?: string;   // Ubicación destino
  reason: StockReason;
  at: string;
  ref?: {
    orderId?: string;
    shipmentId?: string;
    prodOrderId?: string;
    goodsReceiptId?: string;
  };
}

// --- ENVÍOS ---
export interface ShipmentLine {
  sku: string;
  name: string;
  qty: number;
  unit: 'uds';
  lotNumber?: string;
}

export interface Shipment {
  id: string;
  status: ShipmentStatus;
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

## 7. Marketing y Visibilidad

Modela todas las iniciativas de marketing.

```typescript
// --- COLABORACIONES DE MARKETING (CON INFLUENCERS, AGENCIAS, ETC) ---
// Es una transacción con un `Supplier` de tipo marketing.
export interface InfluencerCollab {
    id: string;
    supplierId: string; // ID del proveedor (influencer, agencia...)
    
    // Resumen de la colaboración
    name: string; // Ej: "Campaña Verano con Marta Foodie"
    status: 'PROSPECT' | 'OUTREACH' | 'NEGOTIATING' | 'AGREED' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'DECLINED';
    ownerUserId?: string; // Responsable interno
    
    // Fechas clave
    startDate?: string;
    endDate?: string;

    // Entregables y compensación
    deliverables: { kind: 'reel'|'story'|'post'|'video'; qty: number; dueAt?: string }[];
    compensation: { type: 'gift'|'flat'|'cpa'; amount?: number; currency?: 'EUR'; notes?: string; };

    // Métricas y costes
    costs?: { productCost?: number; shippingCost?: number; cashPaid?: number; otherCost?: number };
    tracking?: { clicks?: number; orders?: number; revenue?: number; impressions?: number; };
    
    createdAt: string;
    updatedAt: string;
}


// --- PLV FÍSICO EN CLIENTE ---
export type ActivationStatus = 'active' | 'inactive' | 'pending_renewal';

export interface Activation {
  id: string;
  accountId: string;   // A qué cliente pertenece
  materialId: string;    // ID del Material de PLV (vaso, cubitera, etc.)
  description: string;   // Ej: "Cubiteras en terraza (10 uds)"
  status: ActivationStatus;
  startDate: string;
  endDate?: string;
  ownerId: string;
  createdAt: string;
}

// --- PROMOCIONES Y OFERTAS ---
export interface Promotion {
  id: string;
  name: string;          // Ej: "Campaña Verano 5+1"
  type: 'BOGO' | '5+1' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED';
  value?: number;         // Ej: 20 (para 20%)
  appliesToSku?: string[];// Si está vacío, aplica a todo el pedido
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

// --- EVENTOS DE MARKETING ---
export interface EventMarketing {
  id: string;
  title: string;
  accountId?: string;    // Cliente donde ocurre el evento (opcional)
  kind: 'DEMO' | 'FERIA' | 'FORMACION' | 'POPUP' | 'OTRO';
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  startAt: string;
  endAt?: string;
  location: string;
  
  // Costes del evento
  budget?: number;       // Presupuesto planificado
  spend?: number;        // Gasto final ejecutado
  extraCosts?: { description: string; amount: number }[]; // Para gastos no planificados (mariachis, etc.)

  // Vínculos a otras entidades
  linkedActivations?: string[]; // IDs de PLV usado
  linkedPromotions?: string[];  // IDs de promociones ofrecidas
  
  ownerId: string;       // Responsable del evento
  createdAt: string;
}

// --- CAMPAÑAS DE PUBLICIDAD ONLINE ---
export interface OnlineCampaign {
  id: string;
  title: string;
  channel: 'IG' | 'FB' | 'TikTok' | 'Google' | 'YouTube' | 'Email' | 'Other';
  status: 'planned' | 'active' | 'closed' | 'cancelled';
  startAt: string;
  endAt?: string;
  budget: number;
  spend: number;
  metrics?: {
    impressions?: number;
    clicks?: number;
    roas?: number;
    // ... más métricas
  };
}
```
