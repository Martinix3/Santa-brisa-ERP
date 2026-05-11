# GUÍA DE IMPLEMENTACIÓN SSOT V7 - DESDE CERO

**Versión:** 7.0  
**Fecha:** 9 de octubre, 2025  
**Estado:** Colecciones vacías - Implementación limpia

---

## 🎯 CONTEXTO

Este documento es la guía paso a paso para implementar SSOT v7 en Santa Brisa ERP partiendo de **colecciones de Firestore vacías**. No necesitas migración de datos, solo configuración e implementación limpia.

---

## 📋 CHECKLIST GENERAL

- [ ] **Fase 1:** Setup Inicial (2-3 días)
- [ ] **Fase 2:** Integración Holded (3-4 días)
- [ ] **Fase 3:** Actualización de Código (5-7 días)
- [ ] **Fase 4:** Testing y Go-Live (2-3 días)

**Total estimado:** 12-17 días

---

## FASE 1: SETUP INICIAL

### 1.1 Configurar Holded API

#### **Paso 1: Obtener credenciales**

1. Accede a tu cuenta Holded
2. Ve a: `Configuración` → `Integraciones` → `API`
3. Genera una nueva API Key
4. Copia la API Key

#### **Paso 2: Configurar variables de entorno**

Edita `.env.local`:

```bash
# Holded API
HOLDED_API_KEY=tu_api_key_aqui
HOLDED_API_URL=https://api.holded.com/api
HOLDED_WEBHOOK_SECRET=tu_webhook_secret
```

#### **Paso 3: Testing de conectividad**

Crea y ejecuta este script de prueba:

```bash
# Test Holded connection
npm run test-holded-connection
```

**Script:** `scripts/test-holded-connection.ts`
```typescript
import { HoldedClient } from '@/server/integrations/holded/client';

async function testConnection() {
  const client = new HoldedClient(process.env.HOLDED_API_KEY!);
  
  try {
    console.log('🔄 Testing Holded connection...');
    
    // Test: Get contacts
    const contacts = await client.getContacts({ limit: 5 });
    console.log(`✅ Contacts: ${contacts.length} found`);
    
    // Test: Get products
    const products = await client.getProducts({ limit: 5 });
    console.log(`✅ Products: ${products.length} found`);
    
    console.log('✅ Holded connection OK!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
```

**Checklist Paso 1.1:**
- [ ] API Key obtenida
- [ ] Variables de entorno configuradas
- [ ] Test de conexión exitoso

---

### 1.2 Configurar Índices de Firestore

#### **Paso 1: Revisar índices requeridos**

El archivo `firestore.indexes.json` ya debe tener la configuración. Verifica que incluye:

```json
{
  "indexes": [
    {
      "collectionGroup": "accounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "segment", "order": "ASCENDING" },
        { "fieldPath": "stage", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "documentType", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sku", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "onHand",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "warehouseId", "order": "ASCENDING" },
        { "fieldPath": "sku", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sku", "order": "ASCENDING" },
        { "fieldPath": "mfgDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "interactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountId", "order": "ASCENDING" },
        { "fieldPath": "when", "order": "DESCENDING" }
      ]
    }
  ]
}
```

#### **Paso 2: Deploy de índices**

```bash
# Deploy índices a Firestore
firebase deploy --only firestore:indexes

# Verificar estado
firebase firestore:indexes
```

**Nota:** Los índices pueden tardar varios minutos en crearse.

**Checklist Paso 1.2:**
- [ ] `firestore.indexes.json` revisado
- [ ] Índices deployados
- [ ] Estado verificado (todos activos)

---

### 1.3 Configurar Reglas de Seguridad de Firestore

Actualiza `firestore.rules` para incluir las nuevas colecciones:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/teams/$(request.auth.uid)).data.role == 'ADMIN';
    }
    
    // SSOT v7 Collections
    
    // Accounts - lectura todos, escritura auth
    match /accounts/{accountId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Orders - lectura todos, escritura auth
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Items - lectura todos, escritura auth
    match /items/{itemId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // OnHand - solo lectura
    match /onHand/{onHandId} {
      allow read: if isAuthenticated();
      allow write: if false; // Solo por triggers
    }
    
    // Holded mirrors - solo lectura
    match /holded_contacts_mirror/{id} {
      allow read: if isAuthenticated();
      allow write: if false; // Solo por sync jobs
    }
    
    match /holded_products_mirror/{id} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    match /holded_documents_mirror/{id} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Integration jobs - solo admin
    match /integration_jobs/{jobId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Audit logs - solo lectura
    match /auditLogs/{logId} {
      allow read: if isAuthenticated();
      allow write: if false; // Solo por sistema
    }
    
    // ... resto de colecciones siguiendo el patrón
  }
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

**Checklist Paso 1.3:**
- [ ] Reglas actualizadas
- [ ] Reglas deployadas
- [ ] Testing de permisos OK

---

## FASE 2: INTEGRACIÓN HOLDED

### 2.1 Sincronización Inicial de Contactos

#### **Script:** `scripts/sync-holded-initial.ts`

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HoldedClient } from '@/server/integrations/holded/client';
import { inferSegmentFromTags } from '@/domain/ssot.v7';

// Initialize
const app = initializeApp({
  credential: cert(require('../serviceAccount.json'))
});
const db = getFirestore(app);
const holded = new HoldedClient(process.env.HOLDED_API_KEY!);

async function syncContactsInitial() {
  console.log('🚀 Iniciando sincronización inicial de Holded...\n');
  
  // PASO 1: Sync Contacts → Accounts
  console.log('📞 1/4 Sincronizando contactos...');
  const holdedContacts = await holded.getAllContacts();
  console.log(`   Encontrados: ${holdedContacts.length} contactos`);
  
  let accountsCreated = 0;
  const batch = db.batch();
  
  for (const contact of holdedContacts) {
    // Skip si no es customer
    if (contact.type !== 'customer' && contact.type !== 'both') continue;
    
    const accountId = db.collection('accounts').doc().id;
    const accountRef = db.collection('accounts').doc(accountId);
    
    const account = {
      id: accountId,
      name: contact.name || contact.tradename,
      legalName: contact.tradename,
      vat: contact.vatnumber,
      
      segment: inferSegmentFromTags(contact.tags),
      stage: 'ACTIVA' as const,
      
      salesRepId: undefined,
      channels: ['HORECA'] as const,
      commercialFlow: 'DIRECTA' as const,
      
      mainContactEmail: contact.email,
      mainContactPhone: contact.mobile || contact.phone,
      
      billingAddress: contact.billAddress ? {
        street: contact.billAddress.address,
        city: contact.billAddress.city,
        postalCode: contact.billAddress.postalCode,
        province: contact.billAddress.province,
        country: contact.billAddress.country,
      } : undefined,
      
      shippingAddress: contact.address ? {
        street: contact.address.address,
        city: contact.address.city,
        postalCode: contact.address.postalCode,
        province: contact.address.province,
        country: contact.address.country,
      } : undefined,
      
      paymentMethodDefault: contact.paymentMethod,
      paymentDaysDefault: contact.paymentDays,
      discountDefaultPct: contact.discount,
      iban: contact.iban,
      
      tags: contact.tags,
      
      holdedContactId: contact.id,
      holdedUpdatedAt: contact.updatedAt,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'sync-initial',
    };
    
    batch.set(accountRef, account);
    accountsCreated++;
    
    // Commit batch cada 500
    if (accountsCreated % 500 === 0) {
      await batch.commit();
      console.log(`   ✅ ${accountsCreated} accounts creadas...`);
    }
  }
  
  // Commit final
  await batch.commit();
  console.log(`   ✅ Total: ${accountsCreated} accounts creadas\n`);
  
  // PASO 2: Sync Products → Items
  console.log('📦 2/4 Sincronizando productos...');
  const holdedProducts = await holded.getAllProducts();
  console.log(`   Encontrados: ${holdedProducts.length} productos`);
  
  let itemsCreated = 0;
  const itemsBatch = db.batch();
  
  for (const product of holdedProducts) {
    const itemId = db.collection('items').doc().id;
    const itemRef = db.collection('items').doc(itemId);
    
    const item = {
      id: itemId,
      name: product.name,
      sku: product.sku,
      gtin: product.barcode ? [product.barcode] : undefined,
      
      kind: product.type === 'service' ? 'SERVICE' : 'PRODUCT',
      uom: 'UNIT' as const,
      
      trackStock: product.trackStock || false,
      trackBatches: product.trackBatches || false,
      
      msrp: product.price,
      cost: product.cost,
      defaultTaxPct: product.tax,
      
      images: product.img ? [product.img] : undefined,
      
      holdedProductId: product.id,
      holdedUpdatedAt: product.updatedAt,
      
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    itemsBatch.set(itemRef, item);
    itemsCreated++;
    
    if (itemsCreated % 500 === 0) {
      await itemsBatch.commit();
      console.log(`   ✅ ${itemsCreated} items creados...`);
    }
  }
  
  await itemsBatch.commit();
  console.log(`   ✅ Total: ${itemsCreated} items creados\n`);
  
  // PASO 3: Sync Documents → Orders
  console.log('📝 3/4 Sincronizando documentos...');
  const documents = await holded.getAllDocuments();
  console.log(`   Encontrados: ${documents.length} documentos`);
  
  let ordersCreated = 0;
  const ordersBatch = db.batch();
  
  for (const doc of documents) {
    // Buscar accountId
    const accountSnapshot = await db.collection('accounts')
      .where('holdedContactId', '==', doc.contactId)
      .limit(1)
      .get();
    
    if (accountSnapshot.empty) continue;
    
    const accountId = accountSnapshot.docs[0].id;
    const orderId = db.collection('orders').doc().id;
    const orderRef = db.collection('orders').doc(orderId);
    
    const order = {
      id: orderId,
      orderNumber: doc.docNumber,
      accountId,
      
      channel: 'DIRECTA' as const,
      source: 'Holded' as const,
      documentType: mapDocType(doc.docType),
      
      date: doc.date,
      dueDate: doc.dueDate,
      
      status: mapStatus(doc.status, doc.docType),
      currency: 'EUR' as const,
      
      total: doc.total,
      
      items: doc.items.map((item: any) => ({
        sku: findSkuByHoldedId(item.productId), // Helper function
        qty: item.units,
        unitPrice: item.price,
        discountPct: item.discount,
        taxPct: item.tax,
      })),
      
      holded: {
        documentId: doc.id,
        type: doc.docType,
        number: doc.docNumber,
        updatedAt: doc.updatedAt,
      },
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'sync-initial',
    };
    
    ordersBatch.set(orderRef, order);
    ordersCreated++;
    
    if (ordersCreated % 500 === 0) {
      await ordersBatch.commit();
      console.log(`   ✅ ${ordersCreated} orders creadas...`);
    }
  }
  
  await ordersBatch.commit();
  console.log(`   ✅ Total: ${ordersCreated} orders creadas\n`);
  
  // PASO 4: Create mirrors
  console.log('🪞 4/4 Creando mirrors...');
  // TODO: Implementar creación de mirrors
  
  console.log('\n✅ SINCRONIZACIÓN INICIAL COMPLETADA');
  console.log(`📊 Resumen:`);
  console.log(`   - Accounts: ${accountsCreated}`);
  console.log(`   - Items: ${itemsCreated}`);
  console.log(`   - Orders: ${ordersCreated}`);
}

// Helper functions
function mapDocType(holdedType: string): string {
  switch (holdedType) {
    case 'estimate': return 'ESTIMATE';
    case 'salesorder': return 'SALESORDER';
    case 'invoice': return 'INVOICE';
    case 'deliverynote': return 'DELIVERYNOTE';
    default: return 'INTERNAL';
  }
}

function mapStatus(status: string, docType: string): string {
  // Implementar mapeo según documentación
  return 'ABIERTO';
}

// Run
syncContactsInitial().catch(console.error);
```

#### **Ejecutar sincronización:**

```bash
npm run sync-holded-initial
```

**Checklist Paso 2.1:**
- [ ] Script ejecutado sin errores
- [ ] Accounts creadas y verificadas
- [ ] Items creados y verificados
- [ ] Orders creadas y verificadas

---

### 2.2 Configurar Webhooks de Holded

#### **Paso 1: Crear endpoint de webhooks**

El archivo ya existe: `src/app/api/integrations/holded/webhooks/route.ts`

Verificar que está configurado correctamente.

#### **Paso 2: Registrar webhooks en Holded**

En tu cuenta Holded:
1. Ve a `Configuración` → `Integraciones` → `Webhooks`
2. Añade un nuevo webhook para cada evento:

**Webhooks a configurar:**

| Evento | URL | Descripción |
|--------|-----|-------------|
| `contact.created` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Nuevo contacto |
| `contact.updated` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Contacto actualizado |
| `product.created` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Nuevo producto |
| `product.updated` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Producto actualizado |
| `estimate.created` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Nuevo presupuesto |
| `estimate.accepted` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Presupuesto aceptado |
| `salesorder.created` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Nuevo pedido |
| `invoice.created` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Nueva factura |
| `invoice.paid` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Factura pagada |
| `payment.created` | `https://tu-dominio.com/api/integrations/holded/webhooks` | Nuevo pago |

#### **Paso 3: Testing de webhooks**

```bash
# Usar script de test
./scripts/test-holded-webhook.sh
```

**Checklist Paso 2.2:**
- [ ] Webhooks configurados en Holded
- [ ] Endpoint testeado
- [ ] Logs de webhook funcionando

---

## FASE 3: ACTUALIZACIÓN DE CÓDIGO

### 3.1 Actualizar Imports

Buscar y reemplazar en todo el proyecto:

```typescript
// ANTES
import type { Account, Order, Item } from '@/domain/ssot';

// DESPUÉS
import type { Account, Order, Item } from '@/domain/ssot.v7';
```

Ejecutar:
```bash
# Buscar todos los imports del SSOT antiguo
grep -r "from '@/domain/ssot'" src/

# Reemplazar automáticamente (con precaución)
find src/ -type f -name "*.ts*" -exec sed -i '' "s/from '@\/domain\/ssot'/from '@\/domain\/ssot.v7'/g" {} +
```

**Checklist Paso 3.1:**
- [ ] Imports actualizados
- [ ] Compilación sin errores
- [ ] Tests pasan

---

### 3.2 Actualizar Queries

#### **Cambios principales:**

**Orders:**
```typescript
// ANTES
const orders = await getOrders({ status: 'ABIERTO' });

// DESPUÉS - usar documentType
const estimates = await getOrders({ 
  documentType: 'ESTIMATE',
  status: 'ABIERTO'
});
```

**Accounts:**
```typescript
// ANTES
const accounts = await getAccounts({ tipo: 'HORECA' });

// DESPUÉS - usar segment
const accounts = await getAccounts({ 
  segment: 'HORECA',
  stage: 'ACTIVA'
});
```

**Checklist Paso 3.2:**
- [ ] Queries de orders actualizadas
- [ ] Queries de accounts actualizadas
- [ ] Queries de items actualizadas
- [ ] Testing de queries OK

---

### 3.3 Actualizar Componentes UI

Actualizar componentes clave uno por uno:

1. **AccountsPage** - Usar nuevos campos
2. **OrdersTable** - Filtrar por documentType
3. **Dashboard** - KPIs con nuevas queries
4. **Forms** - Validación con nuevos types

**Checklist Paso 3.3:**
- [ ] Componentes de accounts actualizados
- [ ] Componentes de orders actualizados
- [ ] Dashboards funcionando
- [ ] Forms validando correctamente

---

## FASE 4: TESTING Y GO-LIVE

### 4.1 Testing Funcional

```bash
# Run all tests
npm run test

# Run specific tests
npm run test:accounts
npm run test:orders
npm run test:holded-sync
```

### 4.2 Testing Manual

**Checklist de testing:**

- [ ] Crear account nueva
- [ ] Sincronización con Holded funciona
- [ ] Crear order (estimate)
- [ ] Webhook de Holded llega correctamente
- [ ] Dashboard muestra datos correctos
- [ ] Filtros funcionan
- [ ] Búsqueda funciona
- [ ] Exports funcionan

### 4.3 Formación de Equipo

- [ ] Documentar cambios para el equipo
- [ ] Sesión de formación programada
- [ ] Guía rápida creada

### 4.4 Go-Live

```bash
# Deploy a producción
npm run build
firebase deploy

# Verificar
npm run smoke-test
```

**Checklist Go-Live:**
- [ ] Deploy exitoso
- [ ] Smoke tests pasan
- [ ] Monitoreo activo
- [ ] Equipo notificado

---

## 🚨 TROUBLESHOOTING

### Problema: Webhooks no llegan

**Solución:**
1. Verificar URL en configuración Holded
2. Verificar logs: `firebase functions:log`
3. Testing manual con curl

### Problema: Sync inicial falla

**Solución:**
1. Verificar API key
2. Verificar límites de rate
3. Ejecutar en batches más pequeños

### Problema: Queries lentas

**Solución:**
1. Verificar índices están activos
2. Optimizar queries
3. Añadir índices compuestos si necesario

---

## 📚 RECURSOS

- **Documentación completa:** `SSOT_V7_COMPLETE.md`
- **TypeScript interfaces:** `src/domain/ssot.v7.ts`
- **Holded API docs:** `HOLDED_DATA_MODEL.md`
- **Integration plan:** `HOLDED_INTEGRATION_PLAN.md`

---

## ✅ RESUMEN FINAL

Al completar esta guía tendrás:

1. ✅ SSOT v7 implementado desde cero
2. ✅ Integración bidireccional con Holded
3. ✅ Datos sincronizados automáticamente
4. ✅ Código actualizado y funcionando
5. ✅ Sistema listo para producción

**Duración total estimada:** 12-17 días de trabajo

**Siguientes pasos después de go-live:**
- Monitoreo continuo
- Optimización basada en uso real
- Añadir features adicionales (enriquecimiento, etc.)

---

**Fin de la guía** 🎉
