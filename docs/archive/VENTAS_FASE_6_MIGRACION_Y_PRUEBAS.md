# 📋 FASE 6: MIGRACIÓN Y PRUEBAS - MÓDULO DE VENTAS

**Fecha:** 26 de Octubre de 2025  
**Estado:** ✅ PLAN COMPLETO  
**Objetivo:** Guía completa de migración y pruebas del módulo de Ventas

---

## 🎯 RESUMEN DE MIGRACIÓN

### Campos a Migrar

| Campo Deprecado | Campo Nuevo | Acción |
|-----------------|-------------|--------|
| `distributorId` | `distributorPartyId` | Migrar valor |
| `items` | `lines` | Migrar array |
| Campos faltantes | `channel`, `customerVat`, etc. | Poblar desde Account/Party |

### Script de Migración
**Archivo:** `scripts/migrate-orders-v2.1.ts`

**NOTA:** El script existe pero requiere ajustes en imports antes de ejecutar.

---

## ✅ PLAN DE PRUEBAS COMPLETO

### FASE 1: Pruebas de UI (Manuales)

#### 1.1 Sidebar de Ventas ✓
```
□ Pipeline aparece en el menú
□ Orden correcto: Pipeline → Clientes → Pedidos → Analytics
□ Href principal es /ventas
□ Navegación funciona en cada sección
□ Sidebar se expande/colapsa correctamente
```

**Pasos:**
1. Abrir `/ventas`
2. Verificar sidebar
3. Click en cada item del menú
4. Verificar que navega correctamente

---

#### 1.2 Vista de Clientes ✓
```
□ Muestra lista compacta (una línea por cliente)
□ Filtra stages (excluye CERRADA/BAJA)
□ Iconos de estado correctos
□ Número de clientes coincide con Pipeline
□ Click abre drawer de cliente
□ Badges de estado visibles
```

**Pasos:**
1. Navegar a `/ventas/clientes`
2. Contar clientes mostrados
3. Navegar a `/ventas/pipeline`
4. Verificar que el número coincide
5. Click en un cliente
6. Verificar que abre drawer

---

#### 1.3 NewOrderDrawer ✓
```
□ Diseño con 4 tabs visibles
□ Tab "Información Básica" funciona
□ Tab "Líneas" funciona
□ Búsqueda de cliente con autocomplete
□ Búsqueda de producto con autocomplete
□ Campos de línea completos (Cantidad, Unidad, Precio, Descuento)
□ Preview de subtotal en tiempo real
□ Botón "Añadir al Pedido" funciona
□ Lista de líneas se muestra correctamente
□ Cálculo de subtotal correcto
□ Cálculo de descuentos correcto
□ Total del pedido correcto
□ Botón eliminar línea funciona
□ Botón "Limpiar todas" funciona
□ Badges dinámicos en header
□ Validaciones muestran errores
□ Modal crear cliente funciona
□ Footer fijo con total visible
```

**Pasos:**
1. Ir a `/ventas/pedidos`
2. Click "Nuevo Pedido"
3. Probar tab "Información Básica":
   - Buscar cliente
   - Seleccionar canal
4. Probar tab "Líneas":
   - Buscar producto "Santa Brisa"
   - Cantidad: 12
   - Unidad: Caja
   - Precio: 15.50
   - Descuento: 10%
   - Click "Añadir al Pedido"
   - Verificar que aparece en lista
   - Verificar subtotal: €167.40
5. Añadir otra línea
6. Verificar total acumulado
7. Eliminar una línea
8. Verificar que total se actualiza
9. Click "Limpiar todas"
10. Verificar que se vacía la lista

---

### FASE 2: Pruebas de Backend (Código)

#### 2.1 Order Service - Métodos Básicos

**Test 1: Generar DocNumber**
```typescript
import { orderService } from '@/services/canonical/order.service';

const docNum = await orderService.generateDocNumber();
console.assert(docNum.startsWith('PED-2025-'), 'DocNumber debe empezar con PED-2025-');
console.assert(docNum.length === 17, 'DocNumber debe tener 17 caracteres');
console.log('✓ DocNumber:', docNum);
```

**Test 2: Validar Pedido**
```typescript
const validOrder = {
  accountId: 'acc123',
  lines: [{ itemId: 'item1', name: 'Test', qty: 1, uom: 'unit', priceUnit: 10 }],
  status: 'open',
  currency: 'EUR',
};

const result = await orderService.validateOrder(validOrder);
console.assert(result.valid === true, 'Pedido válido debe pasar validación');
console.log('✓ Validación OK');
```

**Test 3: Validar Pedido Inválido**
```typescript
const invalidOrder = {
  // Falta accountId
  lines: [],  // Sin líneas
  status: 'open',
};

const result = await orderService.validateOrder(invalidOrder);
console.assert(result.valid === false, 'Pedido inválido debe fallar');
console.assert(result.errors.length > 0, 'Debe tener errores');
console.log('✓ Validación de errores OK:', result.errors);
```

---

#### 2.2 Order Service - Transiciones de Estado

**Test 1: Transiciones Válidas**
```typescript
// Crear pedido de prueba
const testOrderId = 'test_order_123';

// Test: open → confirmed
await orderService.updateOrderStatus(testOrderId, 'confirmed', 'user_test');
console.log('✓ open → confirmed OK');

// Test: confirmed → shipped
await orderService.updateOrderStatus(testOrderId, 'shipped', 'user_test');
console.log('✓ confirmed → shipped OK');

// Test: shipped → invoiced
await orderService.updateOrderStatus(testOrderId, 'invoiced', 'user_test');
console.log('✓ shipped → invoiced OK');

// Test: invoiced → paid
await orderService.updateOrderStatus(testOrderId, 'paid', 'user_test');
console.log('✓ invoiced → paid OK');
```

**Test 2: Transiciones Inválidas (Deben Fallar)**
```typescript
// Test: paid → open (INVÁLIDO)
try {
  await orderService.updateOrderStatus(testOrderId, 'open', 'user_test');
  console.log('✗ ERROR: Transición inválida no fue bloqueada');
} catch (error) {
  console.log('✓ paid → open bloqueada correctamente');
}

// Test: shipped → confirmed (INVÁLIDO - retroceso)
try {
  await orderService.updateOrderStatus(testOrderId, 'confirmed', 'user_test');
  console.log('✗ ERROR: Retroceso no fue bloqueado');
} catch (error) {
  console.log('✓ Retroceso bloqueado correctamente');
}
```

---

#### 2.3 Order Service - Audit Logs

**Test: Verificar Audit Logs**
```typescript
import { adminDb } from '@/server/firebase';

// Cambiar estado
await orderService.updateOrderStatus('order_test', 'confirmed', 'user_test');

// Verificar audit log
const logs = await adminDb.collection('auditLogs')
  .where('entity', '==', 'ORDER')
  .where('entityId', '==', 'order_test')
  .where('action', '==', 'STATUS_CHANGED')
  .get();

console.assert(logs.size > 0, 'Debe existir audit log');

const log = logs.docs[0].data();
console.assert(log.from === 'open', 'From debe ser open');
console.assert(log.to === 'confirmed', 'To debe ser confirmed');
console.assert(log.userId === 'user_test', 'UserId debe coincidir');
console.log('✓ Audit log correcto:', log);
```

---

#### 2.4 Order Service - Consultas

**Test: Get Orders By Status**
```typescript
const openOrders = await orderService.getOrdersByStatus('open');
console.log('✓ Pedidos abiertos:', openOrders.length);

const confirmedOrders = await orderService.getOrdersByStatus('confirmed');
console.log('✓ Pedidos confirmados:', confirmedOrders.length);
```

**Test: Get Orders By Account**
```typescript
const accountOrders = await orderService.getOrdersByAccount('account_test');
console.log('✓ Pedidos del cliente:', accountOrders.length);
```

**Test: Get Orders By Date Range**
```typescript
const startDate = '2025-10-01T00:00:00Z';
const endDate = '2025-10-31T23:59:59Z';

const orders = await orderService.getOrdersByDateRange(startDate, endDate);
console.log('✓ Pedidos en octubre:', orders.length);
```

---

###
