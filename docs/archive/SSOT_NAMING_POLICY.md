# SSOT Naming Policy & Audit System

## 🎯 Objetivo

Mantener consistencia en los nombres de campos del SSOT para evitar errores en integraciones, queries y transformaciones de datos.

---

## 📋 Políticas de Nombres Canónicos

### 1. Identificadores (IDs)

**Reglas:**
- **`id`**: PK de la entidad (siempre sin prefijo)
- **`...Id`**: FK a otra entidad del SSOT
- **`...PartyId`**: FK específica a la tabla `Party`
- **`...ItemId`**: FK específica a la tabla `Item`

**✅ Correcto:**
```typescript
interface Order {
  id: string;                    // PK
  accountId: string;             // FK a Account
  partyId: string;               // FK a Party (genérico)
  distributorPartyId?: string;   // FK específica a Party (distribuidor)
  createdById: string;           // FK a User
}
```

**❌ Incorrecto:**
```typescript
interface Order {
  orderId: string;               // ❌ PK debe ser solo 'id'
  distributorId: string;         // ❌ Ambiguo: ¿Party o Distributor entity?
  salesRepId: string;            // ❌ Deprecado, usar 'ownerId'
}
```

---

### 2. Números de Documento vs IDs Internos

**Regla:** Separa identificadores internos de números visibles/externos.

- **`...Id`** → Identificador interno (DB/SSOT)
- **`...Number`** → Número humano/externo (factura, albarán, envío)

**✅ Correcto:**
```typescript
interface Shipment {
  id: string;              // PK interno
  shipmentNumber: string;  // Número visible: "ENV-2025-001"
  orderId: string;         // FK al pedido
}

interface Order {
  id: string;
  orderNumber?: string;    // Opcional, para sistemas externos
}
```

**❌ Incorrecto:**
```typescript
interface Shipment {
  shipmentId: string;      // ❌ PK debe ser 'id'
  number: string;          // ❌ Demasiado genérico
}
```

---

### 3. Fechas y Timestamps

**Regla:** Usa sufijos consistentes según el tipo de dato.

- **`...At`** → Instantes (ISO timestamp): `createdAt`, `updatedAt`, `shippedAt`
- **`...Date`** → Fechas de documento/negocio: `issueDate`, `dueDate`, `expiryDate`
- **Prohibido:** `date` genérico suelto

**✅ Correcto:**
```typescript
interface Invoice {
  issueDate: ISODateString;      // Fecha del documento
  dueDate: ISODateString;        // Fecha de vencimiento
  createdAt: ISODateString;      // Timestamp de creación
  paidAt?: ISODateString;        // Timestamp de pago
}
```

**❌ Incorrecto:**
```typescript
interface Invoice {
  date: string;              // ❌ Demasiado genérico
  created: string;           // ❌ Falta sufijo 'At'
  dueTime: string;           // ❌ Inconsistente con 'Date'
}
```

---

### 4. Cantidades

**Regla:** Usa siempre `qty` (no `quantity`).

- **`qty`** → Cantidad estándar en líneas
- **`...Qty`** → Cantidades derivadas: `plannedQty`, `madeQty`, `reservedQty`, `outputQty`

**✅ Correcto:**
```typescript
interface OrderLine {
  itemId: string;
  qty: number;               // Cantidad pedida
  uom: SalesUnit;
}

interface ProductionOrder {
  targetQty: number;         // Cantidad objetivo
  madeQty?: number;          // Cantidad producida
  reservedQty?: number;      // Cantidad reservada
}
```

**❌ Incorrecto:**
```typescript
interface OrderLine {
  quantity: number;          // ❌ Usar 'qty'
  targetQuantity: number;    // ❌ Usar 'targetQty'
}
```

---

### 5. Items y SKUs

**Regla:** Separa identificador interno de código comercial.

- **`itemId`** → FK a la tabla Item (PK interno)
- **`sku`** → Código comercial/venta (campo de Item, no FK)

**✅ Correcto:**
```typescript
interface OrderLine {
  itemId: string;            // FK obligatoria
  qty: number;
}

interface Item {
  id: string;                // PK
  sku: string;               // Código comercial único
  name: string;
}
```

**❌ Incorrecto:**
```typescript
interface OrderLine {
  sku: string;               // ❌ Usar itemId como FK
  qty: number;
}
```

**Excepciones permitidas:**
- Sistemas legacy o vistas denormalizadas pueden incluir `sku` adicional para performance
- Siempre debe estar acompañado de `itemId`

---

### 6. Nombres y Denominaciones

**Regla:** Usa un campo principal para display.

- **`name`** → Nombre principal de entidad
- **`legalName`** → Nombre legal (solo empresas)
- **`tradeName`** → Nombre comercial
- **`title`** → Título de eventos/tareas/proyectos

**✅ Correcto:**
```typescript
interface Party {
  name: string;              // Nombre de display
  legalName?: string;        // Razón social
  tradeName?: string;        // Nombre comercial
}

interface Task {
  title: string;             // Título de la tarea
  desc?: string;             // Descripción
}
```

**❌ Incorrecto:**
```typescript
interface Account {
  accountName: string;       // ❌ Redundante, usar 'name'
  customerName: string;      // ❌ Denormalizado, obtener de Party
}
```

---

### 7. Direcciones y Ubicaciones

**Regla:** Usa Value Objects estructurados.

**✅ Correcto:**
```typescript
interface Address {
  street: string;
  city: string;
  zip: string;
  province?: string;
  country: string;
  countryCode?: string;
}

interface Geo {
  lat: number;
  lng: number;
}

interface Party {
  billingAddress?: Address;
  shippingAddress?: Address;
  location?: Geo;
}
```

**❌ Incorrecto:**
```typescript
interface Party {
  address: string;           // ❌ Demasiado genérico
  addressLine1: string;      // ❌ Campos sueltos, usar Address
  lat: number;               // ❌ Campos sueltos, usar Geo
  lng: number;
}
```

---

## 🔍 Sistema de Auditoría Automática

### Test Automático

El test `scripts/ssot-naming-audit.test.ts` detecta:

1. **Familias de nombres con variantes** (ej: `orderId`, `orderNumber`)
2. **Campos prohibidos** (ej: `quantity`, `date` genérico)
3. **Patrones inconsistentes** de IDs
4. **Campos deprecados sin marcar**

### Ejecución

```bash
# Ejecutar el test
npm run test scripts/ssot-naming-audit.test.ts

# O con vitest directamente
npx vitest run scripts/ssot-naming-audit.test.ts
```

### Salida del Test

El test genera un informe detallado:

```
📊 FAMILIAS DE NOMBRES CON VARIANTES DETECTADAS:

  distributor: distributorId, distributorPartyId
  order: orderId, orderNumber
  shipment: shipmentId, shipmentNumber

❌ REGLAS DURAS VIOLADAS:

  quantity: Usa qty, no quantity (excepto targetQuantity deprecado)
  date: Evita "date" genérico suelto: prefiere ...At o ...Date específico

⚠️  FAMILIAS DE NOMBRES A RESOLVER:

  receipt: receiptId, receiptNumber
  
💡 Añade a ALLOW si son variantes aceptables o unifica los nombres.

📈 ESTADÍSTICAS DEL SSOT:

  Interfaces:        87
  Types:             156
  Enums (literales): 45
  Campos únicos:     423
  Campos totales:    1,247
  Campos deprecated: 38
```

---

## 🛠️ Cómo Resolver Violaciones

### 1. Familias de Nombres con Variantes

**Opción A: Aceptar conscientemente**

Si la variante es intencional (ej: `orderId` + `orderNumber`):

```typescript
// En el test, añadir a ALLOW
const ALLOW = new Set<string>([
  'order',    // ✅ Permitimos orderId + orderNumber
  'shipment', // ✅ Permitimos shipmentId + shipmentNumber
]);
```

**Opción B: Unificar nombres**

Si la variante es un error, unificar:

```typescript
// ❌ Antes
interface Order {
  code: string;
  orderNumber: string;
}

// ✅ Después
interface Order {
  orderNumber: string;  // Unificado
}
```

### 2. Campos Prohibidos

Deprecar y reemplazar:

```typescript
// ❌ Antes
interface OrderLine {
  quantity: number;
}

// ✅ Después
interface OrderLine {
  qty: number;
  /** @deprecated Use qty */
  quantity?: number;
}
```

### 3. Patrones de ID Inconsistentes

Corregir la semántica:

```typescript
// ❌ Antes
interface Account {
  distributorId: string;  // ¿Es Party o Distributor entity?
}

// ✅ Después
interface Account {
  distributorPartyId?: string;  // Explícito: es un Party
  /** @deprecated Use distributorPartyId */
  distributorId?: string;
}
```

---

## 📚 Ejemplos Completos

### Entidad de Pedido (Order)

```typescript
interface OrderSellOut {
  // === IDENTIFICADORES ===
  id: string;                    // PK
  orderNumber?: string;          // Número visible
  accountId: string;             // FK a Account
  partyId?: string;              // FK a Party
  distributorPartyId?: string;   // FK a Party (distribuidor)
  createdById?: string;          // FK a User
  
  // === ESTADO ===
  status: OrderStatus;
  billingStatus?: BillingStatus;
  
  // === DATOS ===
  lines: OrderLine[];
  totalAmount?: number;
  currency: Currency;
  
  // === FECHAS ===
  orderDate?: ISODateString;     // Fecha del pedido
  createdAt: ISODateString;      // Timestamp creación
  updatedAt: ISODateString;      // Timestamp actualización
  
  // === EXTERNAL ===
  external?: {
    shopifyOrderId?: string;
    holdedInvoiceId?: string;
  };
  
  // === DEPRECATED (temporal) ===
  /** @deprecated Use distributorPartyId */
  distributorId?: string;
}
```

### Línea de Pedido (OrderLine)

```typescript
interface OrderLine {
  itemId: string;                // FK a Item
  qty: number;                   // Cantidad
  uom: SalesUnit;                // Unidad
  priceUnit: number;             // Precio unitario
  discountPct?: number;          // Descuento %
  
  // === DEPRECATED ===
  /** @deprecated Use itemId */
  sku?: string;
  
  // === OPTIONAL (denormalized) ===
  name?: string;                 // Denormalizado para display
}
```

---

## 🚀 Integración en CI

### GitHub Actions

Añadir al workflow de CI:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  ssot-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test scripts/ssot-naming-audit.test.ts
```

### Pre-commit Hook

Opcional, para validar antes de commit:

```bash
# .husky/pre-commit
npx vitest run scripts/ssot-naming-audit.test.ts --silent
```

---

## 📊 Métricas de Calidad

### Objetivos

- ✅ 0 violaciones de reglas duras
- ✅ < 10 familias de nombres sin resolver
- ✅ 100% campos deprecados marcados con `@deprecated`
- ✅ Test pasa en CI

### Estado Actual

Ejecutar el test para ver el estado actual:

```bash
npm run test scripts/ssot-naming-audit.test.ts
```

---

## 🔄 Proceso de Migración

Cuando necesites cambiar un nombre:

1. **Añadir nuevo campo** con nombre canónico
2. **Deprecar campo antiguo** con `@deprecated Use newField`
3. **Actualizar código** para usar nuevo campo
4. **Migrar datos** en Firestore (si aplica)
5. **Eliminar campo antiguo** después de 2-3 sprints

**Ejemplo:**

```typescript
// Sprint 1: Añadir + Deprecar
interface Order {
  distributorPartyId?: string;
  /** @deprecated Use distributorPartyId */
  distributorId?: string;
}

// Sprint 2-3: Migrar código y datos

// Sprint 4: Eliminar
interface Order {
  distributorPartyId?: string;
}
```

---

## 📖 Referencias

- [SSOT Source](src/domain/ssot.ts)
- [Test de Auditoría](scripts/ssot-naming-audit.test.ts)
- [Reporte de Auditoría](SSOT_AUDIT_REPORT.md)

---

**Última actualización:** 2025-01-18  
**Versión:** 1.0  
**Mantenedor:** Equipo de Arquitectura
