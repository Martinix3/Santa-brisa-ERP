
# Propuesta de Arquitectura de Datos (SSOT)

Este documento presenta una propuesta para la estructura de datos principal de la aplicación. El objetivo es crear un modelo claro, escalable y fácil de mantener.

---

## Enfoque: Entidades Especializadas y Separadas

La propuesta se basa en el principio de **separar cada tipo de entidad en su propia colección de datos**. En lugar de usar una única colección genérica de "contactos" o "cuentas" para todo, se definen colecciones distintas para cada rol:

-   `accounts`: Clientes (HORECA, RETAIL, etc.).
-   `suppliers`: Proveedores de materias primas y servicios.
-   `creators`: Influencers y creadores de contenido.
-   `users`: Usuarios internos del CRM.
-   `distributors`: Distribuidores de producto.

### Ventajas de este enfoque:
1.  **Claridad del Modelo**: Cada entidad tiene solo los campos que le corresponden. Un `Supplier` no tiene un "stage de venta", y un `Account` no tiene "condiciones de entrega de materia prima".
2.  **Rendimiento**: Las consultas son más rápidas y eficientes al no tener que escanear una colección masiva en busca de un `type`.
3.  **Seguridad**: Facilita la implementación de reglas de acceso. El equipo de producción podría tener acceso a `suppliers` pero no a los datos de venta de `accounts`.
4.  **Mantenibilidad**: Es mucho más fácil añadir o modificar campos a una entidad específica sin afectar a las demás.

---

## Esquema de Datos Propuesto (`domain/ssot.ts`)

A continuación, se detalla la estructura de cada tipo principal.

### 1. Tipos Primitivos y Enums

```typescript
// Tipos primitivos y uniones que se reutilizan en toda la aplicación.

export type Uom = 'bottle' | 'case' | 'pallet' | 'uds' | 'kg' | 'g' | 'L' | 'mL';
export type Currency = 'EUR' | 'USD';
export type Department = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS';

// Etapa del ciclo de vida de un cliente (Account)
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';

// Tipo de cliente (Account)
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'DISTRIBUIDOR' | 'IMPORTADOR' | 'ONLINE' | 'OTRO';

// Estados para pedidos, interacciones, etc.
export type InteractionStatus = 'open' | 'done' | 'processing';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
export type ProductionStatus = 'pending' | 'released' | 'wip' | 'done' | 'cancelled';
```

### 2. Entidades Principales

#### 2.1. Cuentas (Clientes)
Representa a una entidad a la que se le vende producto. Es el corazón del CRM de ventas.

```typescript
export interface Account {
  id: string;          // ID único
  name: string;        // Nombre comercial
  cif?: string;        // CIF/NIF para facturación
  
  // --- Clasificación y Propiedad ---
  type: AccountType;   // HORECA, RETAIL, etc.
  stage: Stage;        // Etapa del ciclo de venta
  ownerId: string;     // ID del User o Distributor responsable
  billerId: string;    // ID del que factura ('SB' o un Distributor)
  subType?: string;    // Enriquecido por IA (ej. "Bar de copas")
  tags?: string[];     // Enriquecido por IA (ej. ["música en vivo"])

  // --- Datos de Contacto y Ubicación ---
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  mainContactName?: string;
  mainContactEmail?: string;

  // --- Datos Operativos ---
  openingHours?: string;        // Enriquecido por IA
  deliveryInstructions?: string;// Enriquecido por IA
  
  // --- Datos Financieros ---
  paymentTermsDays?: number;  // Días para pagar
  paymentMethod?: string;     // Transferencia, Domiciliado, etc.
  billingEmail?: string;      // Email para enviar facturas
  
  // --- Metadatos del Sistema ---
  createdAt: string;          // ISO Date
  updatedAt?: string;         // ISO Date
  lastInteractionAt?: string; // ISO Date
  orderCount?: number;        // Total de pedidos históricos
  notes?: string;             // Notas internas
}
```

#### 2.2. Proveedores
Entidad a la que se le compra materia prima o servicios.

```typescript
export interface Supplier { 
  id: string; 
  name: string;
  cif?: string;
  country: string;
  
  // --- Datos de Contacto ---
  contactName?: string;
  email?: string;
  phone?: string;
  
  // --- Datos Financieros ---
  paymentTermsDays?: number;
  bankAccount?: string;
  
  // --- Metadatos ---
  createdAt: string;
}
```

#### 2.3. Creadores (Influencers)
Entidad para colaboraciones de marketing.

```typescript
export interface Creator {
    id: string;
    name: string;          // Nombre real
    handle: string;        // @usuario en la plataforma
    platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Blog' | 'Otro';
    tier: 'nano' | 'micro' | 'mid' | 'macro'; // Basado en seguidores
    audienceSize?: number;
    
    // --- Datos de Contacto ---
    email?: string;
    phone?: string;
    shippingAddress?: string; // Para enviar producto
    
    // --- Metadatos ---
    tags?: string[];
    createdAt: string;
    updatedAt?: string;
}
```

#### 2.4. Usuarios del Sistema
Personas que usan esta aplicación (comerciales, administradores, etc.).

```typescript
export type UserRole = 'comercial' | 'admin' | 'ops' | 'owner';

export interface User { 
  id: string; 
  name: string; 
  email: string; // Email es obligatorio para el login
  role: UserRole;
  active: boolean; 
  managerId?: string; // ID de su responsable (otro User)
  
  // --- Opcional: KPIs para dashboards ---
  kpiBaseline?: {
    revenue?: number;
    unitsSold?: number;
    visits?: number;
  }
}
```

### 3. Entidades Transaccionales y de Soporte

#### Pedidos de Venta
```typescript
export interface OrderLine { 
  sku: string; 
  qty: number; 
  uom: 'uds'; // Se asume que los pedidos son siempre en unidades
  priceUnit: number; 
  discount?: number; 
  lotIds?: string[];
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
}
```

#### Interacciones
Registra cualquier punto de contacto con un cliente.
```typescript
export interface Interaction {
  id: string;
  userId: string;         // Usuario que registra la interacción
  involvedUserIds?: string[]; // Otros usuarios participantes
  accountId: string;      // Cuenta con la que se interactúa
  kind: 'VISITA' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'OTRO';
  note: string;           // Descripción de la interacción
  plannedFor?: string;     // Si es una tarea futura
  createdAt: string;
  status: InteractionStatus; // open | done
  dept: Department;       // A qué departamento pertenece la tarea
}
```

#### Productos y Materiales
Catálogos de lo que se vende y lo que se usa para producir.
```typescript
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
  category: 'raw' | 'packaging' | 'label' | 'consumable'; 
  uom: Uom;
  standardCost?: number; 
}
```

#### Activaciones en Punto de Venta (PLV)
Registra los elementos de visibilidad, incentivos y acuerdos en un cliente para medir coste e impacto.
```typescript
export type ActivationStatus = 'active' | 'inactive' | 'pending_renewal';

export interface Activation {
  id: string;          // ID único de la activación
  accountId: string;   // A qué cliente pertenece
  
  // ¿Qué es?
  type: 'VISIBILIDAD' | 'INCENTIVO' | 'ACUERDO_PERMANENCIA';
  description: string;   // Ej: "Posición preferente en carta de cócteles", "Cubiteras en terraza", "Incentivo jefe de barra"
  
  // ¿Cuánto cuesta?
  costType: 'one-off' | 'monthly' | 'quarterly';
  costAmount: number;    // El coste en EUR de esta activación para el período
  
  // ¿Cuándo?
  status: ActivationStatus;
  startDate: string;     // Fecha de inicio
  endDate?: string;      // Fecha de fin (si aplica, para acuerdos temporales)
  
  // ¿Quién lo gestionó?
  ownerId: string;       // ID del comercial responsable
  createdAt: string;
}
```
