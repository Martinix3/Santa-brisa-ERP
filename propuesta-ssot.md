
# Propuesta de Arquitectura de Datos (SSOT) - V3 (Modelo Party-Role)

Este documento presenta una arquitectura de datos unificada basada en el patrón "Party-Role", que centraliza los contactos y los relaciona con sus funciones en el negocio. También establece a Holded como la fuente de verdad contable.

---

## 1. Principios de Diseño

*   **Contacto Único (Party)**: Una persona u organización (un CIF/NIF) solo existe una vez en la base de datos, en la entidad `Party`.
*   **Roles sobre Contactos**: Un `Party` puede tener múltiples roles (`CUSTOMER`, `SUPPLIER`, `INFLUENCER`). Cada rol se almacena en `PartyRole` y contiene los datos específicos de esa relación.
*   **Holded como Maestro Contable**: El CRM no duplica la contabilidad. Almacena referencias (IDs) a facturas, gastos y pagos de Holded para enriquecer la vista de negocio.
*   **Separación de Conceptos**:
    *   `Party`: Quién es la entidad legal.
    *   `Account`: La oportunidad comercial o pipeline de venta con un cliente.
    *   `OrderSellOut`: La transacción de venta.
    *   `FinanceLink`: El registro contable de una transacción.

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

// Roles que puede tener una Party
export type PartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'DISTRIBUTOR' | 'IMPORTER' | 'INFLUENCER' | 'CREATOR' | 'EMPLOYEE' | 'BRAND_AMBASSADOR';

// Tipo de canal de venta (para una Cuenta)
export type AccountType = 'HORECA' | 'RETAIL' | 'PRIVADA' | 'ONLINE' | 'OTRO';

// Etapa del ciclo de vida de una Cuenta (pipeline comercial)
export type Stage = 'POTENCIAL' | 'ACTIVA' | 'SEGUIMIENTO' | 'FALLIDA' | 'CERRADA' | 'BAJA';

// Estados para flujos de trabajo
export type InteractionStatus = 'open' | 'done' | 'processing';
export type OrderStatus = 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
export type ShipmentStatus = 'pending' | 'picking' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
export type ProductionStatus = 'pending' | 'released' | 'wip' | 'done' | 'cancelled';
```

---

## 3. Entidades Centrales: Party y Roles

Este es el núcleo del nuevo modelo de contactos.

```typescript
// --- CONTACTO UNIFICADO (PARTY) ---
// Representa a una persona u organización única. Es el maestro de contactos.
export interface Party {
  id: string;
  kind: 'ORG' | 'PERSON';
  name: string;
  taxId?: string; // CIF, NIF, VAT ID. Clave de unicidad.

  // --- Datos de Contacto (Array) ---
  // Permite múltiples emails, teléfonos, etc. para una misma entidad.
  contacts: { type: 'email' | 'phone' | 'web'; value: string; isPrimary?: boolean; description?: string; }[];
  addresses: { type: 'main' | 'billing' | 'shipping'; street: string; city: string; postalCode?: string; country: string; isPrimary?: boolean; }[];
  
  // --- Identidades Digitales ---
  handles?: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'twitter', string>>;
  
  // --- Metadatos ---
  tags?: string[];
  createdAt: string;
  holdedContactId?: string; // ID 1:1 con el Contacto en Holded
}

// --- ROLES DE LA PARTY ---
// Define la relación de negocio que tenemos con una Party.
export interface PartyRole {
    id: string;
    partyId: string;        // Vínculo a la Party
    role: PartyRoleType;    // El tipo de relación que es
    isActive: boolean;
    
    // Datos específicos del rol
    data: CustomerData | SupplierData | InfluencerData | EmployeeData;
    
    createdAt: string;
}

// --- Interfaces para los datos de cada rol ---
export interface CustomerData {
    priceListId?: string;
    paymentTermsDays?: number;
    salesRepId: string;       // ID del User responsable
    billerId: string;         // 'SB' o un ID de distribuidor
}
export interface SupplierData {
    paymentTermsDays?: number;
    bankAccountNumber?: string;
}
export interface InfluencerData {
    tier: 'nano' | 'micro' | 'mid' | 'macro';
    audienceSize?: number;
}
export interface EmployeeData {
    department: Department;
    managerId?: string;
    startDate: string;
}
```

---

## 4. Entidades de Negocio Adaptadas

Las entidades existentes ahora se vinculan al modelo `Party`.

```typescript
// --- CUENTAS DE CLIENTE (CRM) ---
// Representa una oportunidad de venta o un pipeline con un cliente (Party con rol CUSTOMER).
export interface Account {
  id: string;
  partyId: string;      // Vinculado a una Party
  name: string;         // Denormalizado de Party para facilidad de uso
  
  // --- Clasificación Comercial (Pipeline) ---
  type: AccountType;    // HORECA, RETAIL...
  stage: Stage;
  subType?: string;      // Ej. "Bar de copas", "Restaurante de autor"
  ownerId: string;        // ID del User o Distributor responsable de la venta
  
  // --- Metadatos del Sistema ---
  createdAt: string;
  updatedAt?: string;
  lastInteractionAt?: string;
  notes?: string;
}

// --- PROVEEDORES ---
// Un proveedor es simplemente una Party con un PartyRole de SUPPLIER.
// No necesita una entidad separada, pero se puede crear un `type Supplier` por conveniencia.
export type Supplier = Party & { roleData: SupplierData };

// --- USUARIOS INTERNOS / EMPLEADOS ---
// User sigue siendo la entidad para autenticación y permisos.
export interface User { 
  id: string; 
  name: string; 
  email: string; 
  partyId?: string; // Opcional, si los empleados también son Parties
  // ... roles y permisos
}

// --- INTERACCIONES ---
// Se puede vincular a una Party directamente, incluso si no tiene una cuenta de cliente creada.
export interface Interaction {
  id:string;
  partyId?: string;     // Para registrar llamadas a proveedores, etc.
  accountId?: string;   // Para interacciones comerciales con clientes
  userId: string;
  // ... resto de campos (kind, note, plannedFor, etc.)
}
```

---

## 5. Contabilidad y Finanzas (Integración con Holded)

Estas entidades modelan los enlaces a la contabilidad, no la contabilidad en sí.

```typescript
// --- PEDIDOS DE VENTA ---
export interface OrderSellOut { 
  id: string;
  accountId: string;
  // ...
  holdedDocId?: string; // ID de la Factura/Albarán/Pedido en Holded
  holdedDocType?: 'estimate' | 'order' | 'delivery' | 'invoice';
}

// --- ENTRADA DE MERCANCÍA ---
export interface GoodsReceipt {
    id: string;
    supplierPartyId: string;
    // ...
    holdedBillId?: string; // ID de la factura de compra en Holded
}


// --- ENLACE FINANCIERO ---
// Conecta una actividad de negocio (evento, campaña) con un documento contable.
export type HoldedDocType = 'SALES_INVOICE' | 'PURCHASE_BILL' | 'CREDIT_NOTE' | 'EXPENSE';

export interface FinanceLink {
    id: string;
    
    // --- Referencia al documento contable ---
    docType: HoldedDocType;
    externalId: string;     // ID del documento en Holded
    docNumber?: string;
    status: 'paid' | 'pending' | 'overdue';
    
    // --- Importes denormalizados ---
    netAmount: number;
    taxAmount: number;
    grossAmount: number;
    currency: Currency;
    
    // --- Fechas clave ---
    issueDate: string;
    dueDate: string;
    paidDate?: string;
    
    // --- Vínculos de negocio del CRM ---
    campaignId?: string;
    eventId?: string;
    collabId?: string;
    partyId?: string;
}

// --- ENLACE DE PAGO/COBRO ---
// Modela un movimiento de tesorería individual asociado a un FinanceLink.
export interface PaymentLink {
    id: string;
    financeLinkId: string;  // A qué documento contable pertenece
    externalId?: string;    // ID del pago en Holded
    amount: number;
    date: string;
    method?: string;        // ej. 'transfer', 'credit_card'
}
```

---

## 6. Marketing y Producción (Sin Cambios Estructurales)

Las entidades de Marketing (`InfluencerCollab`, `EventMarketing`) y Producción (`ProductionOrder`, `BillOfMaterial`, `Lot`) no necesitan cambios drásticos, solo se asegurarían de usar `partyId` donde antes usaban `creatorId` o `supplierId`.

```typescript
// Ejemplo de cambio en InfluencerCollab
export interface InfluencerCollab {
    id: string;
    supplierPartyId: string; // Antes era creatorId, ahora apunta a una Party
    // ... resto de campos
}
```
