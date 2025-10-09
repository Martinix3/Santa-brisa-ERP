# MODELO DE DATOS DE HOLDED

Documentación completa del modelo de datos de Holded para integración con Santa Brisa ERP.

---

## 🏗️ ARQUITECTURA GENERAL

Holded organiza sus datos en **módulos principales**:

1. **Invoicing** - Facturación y documentos
2. **Contacts** - Clientes, proveedores y contactos
3. **Products** - Productos y servicios
4. **Accounting** - Contabilidad
5. **Treasury** - Tesorería
6. **Projects** - Proyectos
7. **Warehouse** - Almacenes
8. **Team** - Equipo y usuarios

---

## 📋 ENTIDADES PRINCIPALES

### 1. CONTACT (Contacto)

**Endpoint:** `/api/invoicing/v1/contacts`

**Estructura:**
```typescript
interface HoldedContact {
  id: string;                    // ID único
  name: string;                  // Nombre comercial
  tradename?: string;            // Nombre fiscal/razón social
  vatnumber?: string;            // CIF/NIF
  email?: string;                // Email principal
  mobile?: string;               // Teléfono móvil
  phone?: string;                // Teléfono fijo
  
  // Dirección de facturación
  billing?: {
    address?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    countryCode?: string;
  };
  
  // Dirección de envío
  shipping?: {
    address?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    countryCode?: string;
  };
  
  // Datos financieros
  billFormat?: 'invoice' | 'ticket';
  salesAccount?: string;         // Cuenta contable de ventas
  purchaseAccount?: string;      // Cuenta contable de compras
  paymentMethod?: string;        // Método de pago por defecto
  paymentDays?: number;          // Días de pago
  discount?: number;             // Descuento por defecto
  
  // Datos bancarios
  iban?: string;
  swift?: string;
  bankName?: string;
  
  // Clasificación
  tags?: string[];               // Tags/Etiquetas
  customFields?: Record<string, any>;
  
  // Metadatos
  type?: 'customer' | 'supplier' | 'both';
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  
  // Relaciones
  salesrepId?: string;           // ID del comercial asignado
  notes?: string;
}
```

**Tipos de contacto:**
- `customer`: Cliente
- `supplier`: Proveedor
- `both`: Cliente y Proveedor

---

### 2. DOCUMENT (Documento)

**Endpoint:** `/api/invoicing/v1/documents/{type}`

Tipos de documentos:
- `estimate` - Presupuesto
- `salesorder` - Pedido de venta
- `deliverynote` - Albarán
- `invoice` - Factura
- `purchaseorder` - Pedido de compra

**Estructura base:**
```typescript
interface HoldedDocument {
  id: string;
  docNumber?: string;            // Número de documento
  docNumberPrefix?: string;
  numeration?: string;
  
  // Tipo y estado
  type: 'estimate' | 'invoice' | 'salesorder' | 'deliverynote' | 'purchaseorder';
  status?: 'draft' | 'sent' | 'accepted' | 'paid' | 'void' | 'overdue';
  
  // Fechas
  date: string;                  // Fecha del documento
  dueDate?: string;              // Fecha de vencimiento
  validityDate?: string;         // Fecha de validez (presupuestos)
  
  // Cliente/Proveedor
  contactId: string;
  contactName?: string;
  contactCode?: string;
  
  // Líneas de producto
  items: Array<{
    id?: string;
    sku?: string;
    name: string;
    desc?: string;
    units: number;
    price: number;
    discount?: number;
    tax?: number;
    taxName?: string;
    subtotal?: number;
    total?: number;
    
    // Referencias
    productId?: string;
    warehouseId?: string;
    
    // Datos adicionales
    customFields?: Record<string, any>;
  }>;
  
  // Totales
  subtotal?: number;
  discount?: number;
  tax?: number;
  taxBase?: number;
  total: number;
  currency?: string;             // EUR, USD, etc.
  
  // Impuestos desglosados
  taxes?: Array<{
    name: string;
    rate: number;
    base: number;
    amount: number;
  }>;
  
  // Pagos
  payments?: Array<{
    date: string;
    amount: number;
    method?: string;
    notes?: string;
  }>;
  
  // Información adicional
  notes?: string;                // Notas internas
  terms?: string;                // Términos y condiciones
  info?: string;                 // Información adicional
  
  // Referencias
  projectId?: string;
  salesrepId?: string;
  warehouseId?: string;
  
  // Conversiones
  fromDoc?: string;              // ID del documento origen (ej: presupuesto → factura)
  linkedDocs?: string[];         // Documentos relacionados
  
  // Metadatos
  tags?: string[];
  customFields?: Record<string, any>;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
  }>;
  
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}
```

---

### 3. PRODUCT (Producto)

**Endpoint:** `/api/invoicing/v1/products`

```typescript
interface HoldedProduct {
  id: string;
  name: string;
  sku?: string;                  // Código/Referencia
  barcode?: string;              // Código de barras
  
  // Tipo
  type?: 'product' | 'service';
  active?: boolean;
  
  // Descripción
  desc?: string;                 // Descripción corta
  longDesc?: string;             // Descripción larga
  
  // Precios
  price?: number;                // Precio de venta
  cost?: number;                 // Precio de coste
  priceWithTax?: boolean;        // Si el precio incluye impuestos
  
  // Impuestos
  tax?: number;                  // % impuesto por defecto
  taxName?: string;
  
  // Inventario
  unit?: string;                 // Unidad de medida (ud, kg, L, etc)
  stock?: number;                // Stock actual
  stockMin?: number;             // Stock mínimo
  stockMax?: number;             // Stock máximo
  
  // Tracking
  trackStock?: boolean;          // Si controla stock
  trackSerials?: boolean;        // Si usa números de serie
  trackBatches?: boolean;        // Si usa lotes
  
  // Clasificación
  categoryId?: string;
  tags?: string[];
  
  // Datos adicionales
  weight?: number;
  volume?: number;
  images?: string[];
  
  // Contabilidad
  salesAccount?: string;
  purchaseAccount?: string;
  
  // Proveedores
  suppliers?: Array<{
    contactId: string;
    supplierSku?: string;
    cost?: number;
    minOrder?: number;
    leadTime?: number;           // Días de entrega
  }>;
  
  // Metadatos
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 4. WAREHOUSE (Almacén)

**Endpoint:** `/api/warehouse/v1/warehouses`

```typescript
interface HoldedWarehouse {
  id: string;
  name: string;
  code?: string;
  active?: boolean;
  
  // Ubicación
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
  };
  
  // Configuración
  default?: boolean;             // Almacén por defecto
  
  // Stock
  products?: Array<{
    productId: string;
    sku?: string;
    stock: number;
    reserved?: number;
    available?: number;
    location?: string;           // Ubicación física
  }>;
  
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 5. STOCK MOVEMENT (Movimiento de Stock)

**Endpoint:** `/api/warehouse/v1/movements`

```typescript
interface HoldedStockMovement {
  id: string;
  date: string;
  
  // Tipo de movimiento
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  reason?: string;
  
  // Almacenes
  warehouseId: string;
  toWarehouseId?: string;        // Para transferencias
  
  // Productos
  items: Array<{
    productId: string;
    sku?: string;
    quantity: number;
    cost?: number;
    batch?: string;
    serial?: string;
    location?: string;
  }>;
  
  // Referencia
  documentId?: string;           // Documento relacionado (factura, albarán)
  notes?: string;
  
  createdAt?: string;
  createdBy?: string;
}
```

---

### 6. PROJECT (Proyecto)

**Endpoint:** `/api/projects/v1/projects`

```typescript
interface HoldedProject {
  id: string;
  name: string;
  code?: string;
  
  // Estado
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  
  // Fechas
  startDate?: string;
  endDate?: string;
  deadline?: string;
  
  // Cliente
  contactId?: string;
  contactName?: string;
  
  // Financiero
  budget?: number;
  spent?: number;
  currency?: string;
  
  // Facturación
  billingType?: 'fixed' | 'hourly' | 'milestone';
  hourlyRate?: number;
  
  // Equipo
  teamMembers?: Array<{
    userId: string;
    role?: string;
    hourlyRate?: number;
  }>;
  
  // Tareas
  tasks?: Array<{
    id: string;
    name: string;
    desc?: string;
    status?: 'todo' | 'doing' | 'done';
    assignedTo?: string;
    dueDate?: string;
    hours?: number;
  }>;
  
  // Gastos
  expenses?: Array<{
    id: string;
    date: string;
    amount: number;
    category?: string;
    billable?: boolean;
  }>;
  
  // Metadatos
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 7. PAYMENT (Pago)

**Endpoint:** `/api/treasury/v1/payments`

```typescript
interface HoldedPayment {
  id: string;
  date: string;
  amount: number;
  
  // Tipo
  type: 'income' | 'expense';
  method?: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  
  // Referencia
  documentId?: string;
  contactId?: string;
  contactName?: string;
  
  // Contabilidad
  accountId?: string;            // Cuenta bancaria
  category?: string;             // Categoría contable
  
  // Estado
  status?: 'pending' | 'completed' | 'cancelled';
  reconciled?: boolean;
  
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 8. USER / TEAM (Usuario / Equipo)

**Endpoint:** `/api/team/v1/users`

```typescript
interface HoldedUser {
  id: string;
  email: string;
  name: string;
  
  // Rol
  role?: 'admin' | 'manager' | 'user' | 'accountant';
  
  // Permisos
  permissions?: {
    invoicing?: boolean;
    contacts?: boolean;
    products?: boolean;
    warehouse?: boolean;
    projects?: boolean;
    accounting?: boolean;
    treasury?: boolean;
  };
  
  // Datos comerciales
  salesrep?: boolean;            // Si es comercial
  commission?: number;           // % comisión
  target?: number;               // Objetivo de ventas
  
  active?: boolean;
  lastLogin?: string;
  createdAt?: string;
}
```

---

## 🔗 RELACIONES ENTRE ENTIDADES

```
CONTACT (Cliente)
    ↓ (contactId)
DOCUMENT (Factura/Presupuesto)
    ↓ (documentId)
PAYMENT (Pago)

PRODUCT (Producto)
    ↓ (productId)
WAREHOUSE (Almacén) → STOCK
    ↓ (productId)
DOCUMENT ITEMS (Líneas de factura)

CONTACT (Cliente)
    ↓ (contactId)
PROJECT (Proyecto)
    ↓ (projectId)
DOCUMENT (Factura del proyecto)

USER (Comercial)
    ↓ (salesrepId)
CONTACT (Cliente asignado)
    ↓ (contactId)
DOCUMENT (Ventas del comercial)
```

---

## 📊 WEBHOOKS DISPONIBLES

Holded puede enviar notificaciones en tiempo real:

### Eventos de Documentos:
- `estimate.created`
- `estimate.updated`
- `estimate.accepted`
- `invoice.created`
- `invoice.updated`
- `invoice.paid`
- `salesorder.created`
- `deliverynote.created`

### Eventos de Contactos:
- `contact.created`
- `contact.updated`
- `contact.deleted`

### Eventos de Productos:
- `product.created`
- `product.updated`
- `product.stock_updated`

### Eventos de Pagos:
- `payment.created`
- `payment.completed`

---

## 🎯 CAMPOS PERSONALIZADOS (Custom Fields)

Holded permite añadir campos personalizados a:
- Contactos
- Productos
- Documentos
- Proyectos

```typescript
customFields: {
  [key: string]: string | number | boolean | Date;
}
```

Ejemplos:
- `customFields.segmento`: "HORECA" | "RETAIL" | "DISTRIBUIDOR"
- `customFields.comercial_asignado`: "Patxi" | "Nico"
- `customFields.zona`: "Norte" | "Sur"

---

## 📝 TAGS Y CATEGORÍAS

### Tags:
```typescript
tags: string[]  // Ej: ["vip", "mayorista", "online"]
```

### Categorías de Productos:
```typescript
category: {
  id: string;
  name: string;
  parent?: string;  // Categoría padre (subcategorías)
}
```

---

## 💰 MONEDA Y MULTIMONEDA

```typescript
currency: 'EUR' | 'USD' | 'GBP' | 'MXN' | ...

// Para documentos en otra moneda
exchangeRate?: number;
baseCurrency?: string;
```

---

## 🌍 INTERNACIONALIZACIÓN

### Países soportados:
- España (ES)
- México (MX)
- Argentina (AR)
- Chile (CL)
- Colombia (CO)
- Perú (PE)
- Y más...

### Impuestos por país:
- España: IVA (21%, 10%, 4%)
- México: IVA (16%)
- Argentina: IVA (21%)

---

## 🔑 AUTENTICACIÓN

```typescript
Headers: {
  'key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
}
```

**Obtener API Key:**
1. Holded Dashboard
2. Configuración → Integraciones → API
3. Generar nueva clave

---

## 📈 LÍMITES Y PAGINACIÓN

### Rate Limits:
- 60 requests / minuto (por API key)
- 1000 requests / hora

### Paginación:
```
?page=1&limit=50
```

Máximo: 100 items por request

---

## 🎨 MODELO VISUAL

```
┌─────────────────┐
│    CONTACT      │
│   (Cliente)     │
└────────┬────────┘
         │
         ├─────────► DOCUMENT (Presupuesto)
         │                │
         │                └──► DOCUMENT (Factura)
         │                         │
         │                         └──► PAYMENT (Pago)
         │
         ├─────────► PROJECT (Proyecto)
         │                │
         │                └──► DOCUMENT (Factura proyecto)
         │
         └─────────► USER (Comercial asignado)


┌─────────────────┐
│    PRODUCT      │
│   (Producto)    │
└────────┬────────┘
         │
         ├─────────► WAREHOUSE (Stock por almacén)
         │                │
         │                └──► MOVEMENT (Movimientos)
         │
         └─────────► DOCUMENT ITEM (Línea factura)
```

---

## 🔄 FLUJO TÍPICO DE VENTAS

```
1. CONTACT (Cliente) creado en Holded
   ↓
2. ESTIMATE (Presupuesto) enviado
   ↓ (cliente acepta)
3. SALESORDER (Pedido) generado
   ↓
4. DELIVERYNOTE (Albarán) emitido
   ↓ (salida de stock)
5. WAREHOUSE MOVEMENT registrado
   ↓
6. INVOICE (Factura) emitida
   ↓ (cliente paga)
7. PAYMENT (Pago) registrado
   ↓
8. INVOICE status = 'paid'
```

---

## 📚 RECURSOS ADICIONALES

- Documentación oficial: https://www.holded.com/es/help/api
- API Explorer: https://api.holded.com/
- Comunidad: https://help.holded.com/

---

**Fecha:** 9 de octubre, 2025
**Versión:** API v1
**Autor:** Análisis para integración Santa Brisa ERP
