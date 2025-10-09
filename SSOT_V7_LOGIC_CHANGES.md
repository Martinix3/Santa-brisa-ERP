# CAMBIOS DE LÓGICA SSOT V7

**Fecha:** 9 de octubre, 2025  
**Propósito:** Documentar todos los cambios de lógica necesarios al migrar a SSOT v7

---

## 🎯 RESUMEN EJECUTIVO

**¿Hay que cambiar lógicas? SÍ**, pero son cambios **evolutivos**, no revolucionarios.

Los cambios principales son:
1. **Orders:** Añadir filtrado por `documentType`
2. **Accounts:** Renombrar campos (`tipo` → `segment`, etc.)
3. **Sync:** Nueva lógica de sincronización con Holded
4. **Validaciones:** Adaptar a nuevos campos obligatorios

**Impacto estimado:** 30-40% del código de negocio necesita actualizarse.

---

## 📊 CAMBIOS POR ENTIDAD

### 1️⃣ ORDERS - CAMBIO CRÍTICO

#### **ANTES (SSOT Actual):**
```typescript
// Una única colección "orders"
const orders = await db.collection('orders')
  .where('status', '==', 'ABIERTO')
  .get();

// Estado determinaba el tipo de documento
if (order.status === 'FACTURADO') {
  // Es una factura
}
```

#### **DESPUÉS (SSOT v7):**
```typescript
// Misma colección pero con documentType
const estimates = await db.collection('orders')
  .where('documentType', '==', 'ESTIMATE')
  .where('status', '==', 'ABIERTO')
  .get();

const invoices = await db.collection('orders')
  .where('documentType', '==', 'INVOICE')
  .get();

// Tipo de documento es explícito
if (order.documentType === 'INVOICE') {
  // Es una factura
}
```

#### **Cambios de Lógica Necesarios:**

**1. Filtrado y Queries:**
```typescript
// ❌ ANTES
async function getOpenOrders() {
  return db.collection('orders')
    .where('status', '==', 'ABIERTO')
    .get();
}

// ✅ DESPUÉS
async function getOpenEstimates() {
  return db.collection('orders')
    .where('documentType', '==', 'ESTIMATE')
    .where('status', '==', 'ABIERTO')
    .get();
}

async function getPendingInvoices() {
  return db.collection('orders')
    .where('documentType', '==', 'INVOICE')
    .where('status', 'in', ['SERVIDO', 'FACTURADO'])
    .get();
}
```

**2. Creación de Orders:**
```typescript
// ❌ ANTES
async function createOrder(data) {
  return db.collection('orders').add({
    status: 'ABIERTO',
    ...data
  });
}

// ✅ DESPUÉS
async function createEstimate(data) {
  return db.collection('orders').add({
    documentType: 'ESTIMATE',
    status: 'ABIERTO',
    channel: data.channel || 'DIRECTA',
    source: 'Manual',
    ...data
  });
}

async function convertEstimateToSalesOrder(estimateId) {
  const estimate = await getOrder(estimateId);
  
  // Crear nuevo order como SALESORDER
  return db.collection('orders').add({
    ...estimate,
    documentType: 'SALESORDER',
    status: 'EN_PROCESO',
    // Mantener referencia
    holded: {
      ...estimate.holded,
      type: 'salesorder'
    }
  });
}
```

**3. Dashboards y KPIs:**
```typescript
// ❌ ANTES
async function getTotalRevenue(month) {
  const orders = await db.collection('orders')
    .where('status', '==', 'PAGADO')
    .where('date', '>=', startOfMonth)
    .get();
  
  return orders.reduce((sum, doc) => sum + doc.data().total, 0);
}

// ✅ DESPUÉS
async function getTotalRevenue(month) {
  // Solo contar facturas pagadas
  const invoices = await db.collection('orders')
    .where('documentType', '==', 'INVOICE')
    .where('status', '==', 'PAGADO')
    .where('date', '>=', startOfMonth)
    .get();
  
  return invoices.reduce((sum, doc) => sum + doc.data().total, 0);
}

async function getPendingEstimates() {
  return db.collection('orders')
    .where('documentType', '==', 'ESTIMATE')
    .where('status', 'in', ['ABIERTO', 'EN_PROCESO'])
    .get();
}
```

**4. Componentes UI:**
```typescript
// ❌ ANTES
function OrdersTable() {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const unsubscribe = db.collection('orders')
      .onSnapshot(snapshot => {
        setOrders(snapshot.docs.map(doc => doc.data()));
      });
    return unsubscribe;
  }, []);
  
  return <Table data={orders} />;
}

// ✅ DESPUÉS
function OrdersTable() {
  const [selectedType, setSelectedType] = useState<DocumentType>('ESTIMATE');
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const unsubscribe = db.collection('orders')
      .where('documentType', '==', selectedType)
      .onSnapshot(snapshot => {
        setOrders(snapshot.docs.map(doc => doc.data()));
      });
    return unsubscribe;
  }, [selectedType]);
  
  return (
    <>
      <Tabs value={selectedType} onChange={setSelectedType}>
        <Tab value="ESTIMATE">Presupuestos</Tab>
        <Tab value="SALESORDER">Pedidos</Tab>
        <Tab value="INVOICE">Facturas</Tab>
      </Tabs>
      <Table data={orders} />
    </>
  );
}
```

---

### 2️⃣ ACCOUNTS - CAMBIO MEDIO

#### **ANTES:**
```typescript
interface Account {
  tipo: string;  // 'HORECA', 'RETAIL', etc.
  estado?: string;  // 'activo', 'inactivo'
}
```

#### **DESPUÉS:**
```typescript
interface Account {
  segment: Segment;  // Enum tipado
  stage: Stage;      // Enum tipado
  commercialFlow: CommercialFlow;
}
```

#### **Cambios de Lógica:**

**1. Filtrado:**
```typescript
// ❌ ANTES
const horecaAccounts = await db.collection('accounts')
  .where('tipo', '==', 'HORECA')
  .get();

// ✅ DESPUÉS
const horecaAccounts = await db.collection('accounts')
  .where('segment', '==', 'HORECA')
  .where('stage', '==', 'ACTIVA')
  .get();
```

**2. Creación:**
```typescript
// ❌ ANTES
async function createAccount(data) {
  return db.collection('accounts').add({
    tipo: data.tipo,
    ...data
  });
}

// ✅ DESPUÉS
async function createAccount(data) {
  return db.collection('accounts').add({
    segment: data.segment,
    stage: 'POTENCIAL',  // Siempre empezar como potencial
    commercialFlow: data.commercialFlow || 'DIRECTA',
    channels: data.channels || ['HORECA'],
    ...data
  });
}
```

**3. Business Logic:**
```typescript
// ❌ ANTES
function canSellToAccount(account) {
  return account.estado === 'activo';
}

// ✅ DESPUÉS
function canSellToAccount(account) {
  return ['ACTIVA', 'SEGUIMIENTO'].includes(account.stage);
}

function needsFollowUp(account) {
  return account.stage === 'POTENCIAL' && 
         daysSince(account.createdAt) > 7;
}
```

---

### 3️⃣ SINCRONIZACIÓN HOLDED - NUEVA LÓGICA

Esta es **lógica completamente nueva**:

#### **Flujo de Sincronización:**

```typescript
// 1. Webhook llega desde Holded
async function handleHoldedWebhook(event) {
  // Guardar en log
  await db.collection('holded_webhook_log').add({
    event: event.type,
    holdedId: event.data.id,
    payload: event.data,
    receivedAt: new Date().toISOString(),
    status: 'PENDING'
  });
  
  // Procesar según tipo
  switch (event.type) {
    case 'contact.created':
    case 'contact.updated':
      await syncContactToAccount(event.data);
      break;
    
    case 'invoice.created':
      await syncInvoiceToOrder(event.data);
      break;
    
    case 'invoice.paid':
      await markOrderAsPaid(event.data.id);
      break;
  }
}

// 2. Sync Contact → Account
async function syncContactToAccount(holdedContact) {
  // Buscar si ya existe
  const existingAccount = await db.collection('accounts')
    .where('holdedContactId', '==', holdedContact.id)
    .limit(1)
    .get();
  
  const accountData = {
    name: holdedContact.name,
    vat: holdedContact.vatnumber,
    segment: inferSegmentFromTags(holdedContact.tags),
    stage: 'ACTIVA',
    holdedContactId: holdedContact.id,
    holdedUpdatedAt: holdedContact.updatedAt,
  };
  
  if (existingAccount.empty) {
    // Crear nueva
    await db.collection('accounts').add(accountData);
  } else {
    // Actualizar existente
    await existingAccount.docs[0].ref.update(accountData);
  }
  
  // Actualizar mirror
  await db.collection('holded_contacts_mirror').doc(holdedContact.id).set({
    ...holdedContact,
    lastSyncAt: new Date().toISOString(),
    syncStatus: 'OK'
  });
}
```

---

### 4️⃣ VALIDACIONES - CAMBIO BAJO

#### **Campos Obligatorios Nuevos:**

```typescript
// Orders
interface Order {
  documentType: OrderDocumentType;  // ✅ OBLIGATORIO
  channel: OrderChannel;            // ✅ OBLIGATORIO
  status: OrderStatus;              // ✅ OBLIGATORIO
  currency: Currency;               // ✅ OBLIGATORIO
}

// Accounts
interface Account {
  segment: Segment;                 // ✅ OBLIGATORIO
  stage: Stage;                     // ✅ OBLIGATORIO
  commercialFlow: CommercialFlow;   // ✅ OBLIGATORIO
  channels: string[];               // ✅ OBLIGATORIO
}
```

#### **Validación en Forms:**

```typescript
// ❌ ANTES
function validateOrderForm(data) {
  if (!data.accountId) return 'Account requerida';
  if (!data.total) return 'Total requerido';
  return null;
}

// ✅ DESPUÉS
function validateOrderForm(data) {
  if (!data.accountId) return 'Account requerida';
  if (!data.documentType) return 'Tipo de documento requerido';
  if (!data.channel) return 'Canal requerido';
  if (!data.total) return 'Total requerido';
  if (!data.currency) return 'Moneda requerida';
  return null;
}

function validateAccountForm(data) {
  if (!data.name) return 'Nombre requerido';
  if (!data.segment) return 'Segmento requerido';
  if (!data.stage) return 'Etapa requerida';
  if (!data.commercialFlow) return 'Flujo comercial requerido';
  if (!data.channels?.length) return 'Al menos un canal requerido';
  return null;
}
```

---

## 🔄 CAMBIOS QUE NO AFECTAN LÓGICA

Estos cambios son solo **renaming** (no afectan lógica):

### Items:
- ✅ Mismo modelo básicamente
- ✅ Solo se añaden campos opcionales nuevos
- ❌ No hay breaking changes

### Lots:
- ✅ Mismo modelo
- ✅ Solo se añade `genealogy` (opcional)

### Warehouses:
- ✅ Se añade `kind` y `consignment` (opcionales)
- ❌ No afecta lógica existente

### StockMoves:
- ✅ Mismo modelo
- ✅ Solo se añade `documentRef` (opcional)

---

## 📊 RESUMEN DE IMPACTO

### **Alto Impacto (Cambio de lógica significativo):**

| Entidad | Cambio | Archivos Afectados | Esfuerzo |
|---------|--------|-------------------|----------|
| **Orders** | Añadir `documentType` | ~15-20 archivos | 3-4 días |
| **Holded Sync** | Nueva lógica completa | ~8-10 archivos | 2-3 días |

### **Medio Impacto (Renaming + validación):**

| Entidad | Cambio | Archivos Afectados | Esfuerzo |
|---------|--------|-------------------|----------|
| **Accounts** | `tipo`→`segment`, `estado`→`stage` | ~10-12 archivos | 1-2 días |

### **Bajo Impacto (Solo imports):**

| Entidad | Cambio | Archivos Afectados | Esfuerzo |
|---------|--------|-------------------|----------|
| Items, Lots, Warehouses | Imports a `ssot.v7` | ~20-30 archivos | 0.5-1 día |

---

## 🎯 PLAN DE ACTUALIZACIÓN DE LÓGICA

### **Fase 1: Preparación** (1 día)
```bash
# 1. Identificar todos los archivos que usan Orders
grep -r "collection('orders')" src/

# 2. Identificar todos los archivos que usan Accounts
grep -r "\.tipo" src/
grep -r "\.estado" src/

# 3. Crear lista de archivos a actualizar
```

### **Fase 2: Orders** (3-4 días)

**Orden recomendado:**

1. **Day 1:** Actualizar server actions
   - `src/server/actions/orders.actions.ts`
   - Añadir funciones por documentType

2. **Day 2:** Actualizar helpers y utilities
   - `src/lib/order-helpers.ts`
   - `src/lib/dashboard-helpers.ts`
   
3. **Day 3:** Actualizar componentes UI
   - `src/features/orders/components/OrdersTable.tsx`
   - `src/features/orders/components/OrdersDashboard.tsx`
   - Añadir tabs por documentType

4. **Day 4:** Testing y ajustes
   - Test unitarios
   - Test de integración
   - Ajustes finales

### **Fase 3: Accounts** (1-2 días)

1. **Day 1:** Search & Replace
   ```bash
   # Reemplazar tipo → segment
   find src/ -type f -name "*.ts*" -exec sed -i '' 's/\.tipo/\.segment/g' {} +
   
   # Reemplazar estado → stage
   find src/ -type f -name "*.ts*" -exec sed -i '' 's/\.estado/\.stage/g' {} +
   ```

2. **Day 2:** Validar y testing
   - Compilar y revisar errores
   - Actualizar validaciones
   - Testing

### **Fase 4: Holded Sync** (2-3 días)

1. **Day 1:** Implementar webhooks handlers
2. **Day 2:** Implementar sync functions
3. **Day 3:** Testing de integración

---

## ⚠️ PUNTOS CRÍTICOS DE ATENCIÓN

### **1. Orders: Inferir documentType en datos existentes**

Si tuvieras datos existentes (pero no los tienes), habría que:

```typescript
// Script de migración (NO NECESARIO en tu caso)
async function inferDocumentType(order) {
  // Si tiene holdedInvoiceId → INVOICE
  if (order.holdedInvoiceId) return 'INVOICE';
  
  // Si status = PAGADO o FACTURADO → INVOICE
  if (['PAGADO', 'FACTURADO'].includes(order.status)) {
    return 'INVOICE';
  }
  
  // Si status = SERVIDO → SALESORDER
  if (order.status === 'SERVIDO') return 'SALESORDER';
  
  // Default: ESTIMATE
  return 'ESTIMATE';
}
```

### **2. Accounts: Inferir segment de tags**

```typescript
// Ya implementado en ssot.v7.ts
import { inferSegmentFromTags } from '@/domain/ssot.v7';

const segment = inferSegmentFromTags(['horeca', 'restaurante']);
// => 'HORECA'
```

### **3. Backwards Compatibility**

Para mantener compatibilidad temporal:

```typescript
// Adapter pattern
function getAccountSegment(account: any): Segment {
  // Nuevo formato
  if (account.segment) return account.segment;
  
  // Formato antiguo (fallback)
  if (account.tipo) {
    const mapping = {
      'HORECA': 'HORECA',
      'RETAIL': 'RETAIL',
      // ... etc
    };
    return mapping[account.tipo] || 'RETAIL';
  }
  
  return 'RETAIL';
}
```

---

## ✅ CHECKLIST DE ACTUALIZACIÓN

### **Orders:**
- [ ] Server actions actualizadas
- [ ] Helpers actualizados
- [ ] Components actualizados (añadir tabs)
- [ ] Forms con validación de documentType
- [ ] Dashboards con filtros por documentType
- [ ] Tests actualizados

### **Accounts:**
- [ ] Search & replace ejecutado
- [ ] Validaciones actualizadas
- [ ] Forms actualizados
- [ ] Filtros actualizados
- [ ] Tests actualizados

### **Holded Sync:**
- [ ] Webhook endpoint implementado
- [ ] Sync functions implementadas
- [ ] Mirror collections configuradas
- [ ] Error handling implementado
- [ ] Logging implementado
- [ ] Tests de integración

### **General:**
- [ ] Imports actualizados a `ssot.v7`
- [ ] TypeScript compila sin errores
- [ ] Tests pasan
- [ ] Documentación actualizada

---

## 🚀 RESUMEN FINAL

### **¿Hay que cambiar lógicas? SÍ**

**Principales cambios:**

1. **Orders:** Añadir filtrado por `documentType` (~30% del código)
2. **Accounts:** Renombrar campos (~15% del código)
3. **Holded Sync:** Nueva lógica (código nuevo)
4. **Validaciones:** Adaptar a campos obligatorios (~10% del código)

**Esfuerzo total estimado:** 7-10 días de desarrollo

**Pero recuerda:** Como tus colecciones están vacías, puedes:
- ✅ Implementar todo desde cero sin migración
- ✅ No necesitas mantener backwards compatibility
- ✅ Puedes usar directamente las nuevas interfaces
- ✅ No hay riesgo de corrupción de datos

**Siguiente paso:** Revisar el código actual para identificar exactamente qué archivos necesitan actualizarse.
</result>
<task_progress>
- [x] SSOT v7 documentación completa
- [x] TypeScript interfaces completas  
- [x] Helpers y funciones utilitarias
- [x] Guía de implementación limpia creada
- [x] Documentación de cambios de lógica
- [ ] Configurar Holded API (SIGUIENTE)
- [ ] Crear índices Firestore
- [ ] Implementar cambios de lógica
- [ ] Testing y validación
- [ ] Go-live
</task_progress>
