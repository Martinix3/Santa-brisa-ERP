# 🔍 Auditoría Completa: Portal Distribuidor
## Análisis de Cumplimiento SSOT V2, Design System y Reglas de Negocio

**Fecha:** 21 de Octubre de 2025  
**Componente Auditado:** `src/components/dashboards/DashboardDistributor.tsx`  
**Ruta:** `/distributor/dashboard`

---

## 📋 Resumen Ejecutivo

### Estado General: ⚠️ REQUIERE REFACTORIZACIÓN COMPLETA

| Categoría | Estado | Cumplimiento |
|-----------|--------|--------------|
| **SSOT V2 Compliance** | 🔴 CRÍTICO | 0% |
| **Design System** | 🟡 PARCIAL | 40% |
| **Business Rules** | 🔴 CRÍTICO | 0% |
| **Architecture** | 🟡 PARCIAL | 30% |
| **Data Integration** | 🔴 CRÍTICO | 0% |

### Problemas Críticos Identificados

1. ❌ **Datos Mock**: Todo el dashboard usa datos hardcodeados
2. ❌ **No usa SSOT V2**: No hay integración con `OrderSellOut` real
3. ❌ **Violaciones Design System**: Múltiples componentes custom no estandarizados
4. ❌ **Sin Server Actions**: No hay conexión con backend
5. ❌ **Sin Validación de Rol**: No verifica que el usuario sea distribuidor
6. ❌ **Arquitectura Incorrecta**: No sigue el patrón establecido

---

## 🔴 VIOLACIONES CRÍTICAS DE SSOT V2

### 1. Estructura de Datos Incorrecta

**Problema:** El dashboard usa estructuras de datos inventadas que no existen en SSOT V2.1

```typescript
// ❌ INCORRECTO - Datos inventados
const myOrders = [
  { id: 'SB-2025-345', status: 'EN_TRANSITO', eta: 'Mañana 15:00', value: 2450, items: 48 }
];
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Usar OrderSellOut de SSOT V2.1
interface OrderSellOut {
  id: string;
  docNumber?: string;
  accountId: string;
  flow?: 'PLACEMENT' | 'DIRECT';
  distributorPartyId?: string;  // ← Clave para filtrar pedidos del distribuidor
  status: 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
  lines: OrderLine[];
  totalAmount?: number;
  // ... resto de campos SSOT V2.1
}
```

### 2. Estados de Pedido Incorrectos

**Problema:** Usa estados inventados que no existen en el schema

```typescript
// ❌ INCORRECTO
status: 'EN_TRANSITO' | 'PREPARACION' | 'ENTREGADO'
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Estados SSOT V2.1
status: 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost'
```

### 3. Sin Integración con Servicios Canónicos

**Problema:** No usa `order.service.ts` para obtener datos reales

```typescript
// ❌ INCORRECTO - Datos hardcodeados
const myOrders = [/* mock data */];
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Usar servicio canónico
import { orderService } from '@/services/canonical/order.service';

const orders = await orderService.queryOrders({
  distributorPartyId: currentUser.partyId,
  status: ['confirmed', 'shipped']
});
```

### 4. Sin Validación de Rol Distribuidor

**Problema:** No verifica que el usuario tenga rol de distribuidor

```typescript
// ❌ INCORRECTO - No valida rol
const { currentUser } = useData();
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Validar rol y partyId
const { currentUser } = useData();

if (!currentUser?.partyId || currentUser.role !== 'DISTRIBUIDOR') {
  return <AccessDenied />;
}
```

---

## 🟡 VIOLACIONES DEL DESIGN SYSTEM

### 1. Componentes Custom No Estandarizados

**Problema:** Usa componentes que no están en el Design System

```typescript
// ❌ INCORRECTO - Componentes custom
<KpiCard label="En preparación" value={ordersSummary.pending} variant="light" />
<ChartCard title="Sell-out últimas 4 semanas" data={sellOutData} />
<AlertsCard alerts={alerts} variant="light" />
```

**Análisis:**
- `KpiCard`: ✅ Existe en el DS (correcto)
- `ChartCard`: ❌ No existe en el DS (debe crearse o usar alternativa)
- `AlertsCard`: ✅ Existe en el DS (correcto)

### 2. Clases CSS Incorrectas

**Problema:** Usa clases que no están en el Design System

```typescript
// ❌ INCORRECTO - Clases inventadas
className="sb-kpi-badge px-2 py-0.5 text-xs bg-success/10 text-success"
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Usar badges del DS
className="sb-badge--success"
```

### 3. Estructura de Header Incorrecta

**Problema:** No sigue el patrón estándar del DS

```typescript
// ❌ INCORRECTO - Estructura custom
<div className="sb-header-glass p-5">
  <div className="flex items-center justify-between flex-wrap gap-4">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold">Portal Distribuidor</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Distribuidora Central Madrid
      </p>
    </div>
    <div className="flex gap-2">
      <button className="h-10 px-4 rounded-xl border...">...</button>
    </div>
  </div>
</div>
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Seguir patrón DS
<header className="sb-header-glass p-5">
  <h1>Portal Distribuidor</h1>
  <p className="text-muted-foreground">Distribuidora Central Madrid</p>
  <div className="mt-3 flex gap-2">
    <button className="sb-btn--secondary">Descargar catálogo</button>
    <button className="sb-btn--primary">Nuevo pedido</button>
  </div>
</header>
```

### 4. Tabs No Estandarizados

**Problema:** Implementación custom de tabs

```typescript
// ❌ INCORRECTO - Tabs custom
<button
  className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
    tab === t.key
      ? "bg-primary text-primary-foreground shadow-lg"
      : "border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80"
  }`}
>
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Usar sb-tabs del DS
<nav className="sb-tabs">
  <button className="sb-tab" aria-selected={tab === 'pedidos'}>
    <Package size={16} />
    Mis Pedidos
    <span className="sb-kpi-badge">128</span>
  </button>
</nav>
```

### 5. Tablas No Estandarizadas

**Problema:** No usa las clases de tabla del DS

```typescript
// ❌ INCORRECTO - Tabla custom
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="text-left text-muted-foreground border-b border-border/30">
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Usar sb-table del DS
<div className="sb-table-wrap">
  <table className="sb-table">
    <thead>
      <tr>
```

---

## 🔴 VIOLACIONES DE REGLAS DE NEGOCIO

### 1. No Filtra por distributorPartyId

**Problema:** No filtra pedidos por el distribuidor actual

```typescript
// ❌ INCORRECTO - Muestra todos los pedidos (mock)
const myOrders = [
  { id: 'SB-2025-345', status: 'EN_TRANSITO', ... }
];
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Filtrar por distributorPartyId
const orders = await orderService.queryOrders({
  distributorPartyId: currentUser.partyId,
  status: ['confirmed', 'shipped', 'invoiced']
});
```

### 2. No Implementa Sell-Out Reporting

**Problema:** La funcionalidad de subir sell-out no está implementada

```typescript
// ❌ INCORRECTO - Solo UI mock
<div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
  <p className="text-sm font-medium mb-1">
    Arrastra tu archivo CSV aquí o haz click para seleccionar
  </p>
</div>
```

**Debe implementar:**
- Upload de archivo CSV
- Validación de formato
- Parsing de datos
- Creación de registros `OrderSellOut` con `isSellOutReported: true`
- Feedback de éxito/error

### 3. No Muestra Datos Reales de Stock

**Problema:** Stock del distribuidor es mock

```typescript
// ❌ INCORRECTO - Datos inventados
const stockSummary = {
  totalValue: 18500,
  skus: 24,
  rotation: 45,
  coverage: 18
};
```

**Debe usar:**
- Colección `onHand` filtrada por `locationId` del distribuidor
- Cálculos reales de rotación y cobertura
- Integración con sistema de inventario

### 4. Material PLV No Integrado

**Problema:** Material PLV es mock sin backend

```typescript
// ❌ INCORRECTO - Lista hardcodeada
const plvMaterials = [
  { id: '1', name: 'Door stopper Santa Brisa', available: 50, requested: 0 }
];
```

**Debe implementar:**
- Colección `plvMaterials` en Firestore
- Sistema de solicitudes
- Tracking de disponibilidad
- Workflow de aprobación

### 5. Finanzas Sin Integración con Holded

**Problema:** Datos financieros son mock

```typescript
// ❌ INCORRECTO - Datos inventados
const financeSummary = {
  creditLimit: 50000,
  creditUsed: 12300,
  openInvoices: 3,
  bonusAvailable: 850
};
```

**Debe integrar:**
- API de Holded para límite de crédito
- Facturas abiertas reales
- Sistema de bonificaciones
- Cálculo de crédito disponible

---

## 🟡 PROBLEMAS DE ARQUITECTURA

### 1. No Usa Server Actions

**Problema:** Todo el código es client-side con datos mock

```typescript
// ❌ INCORRECTO - Client component con datos mock
"use client";
export default function DashboardDistributor() {
  const myOrders = [/* mock */];
```

**Debe ser:**

```typescript
// ✅ CORRECTO - Server component + Server actions
// page.tsx
import { getDistributorDashboardData } from '@/server/actions/distributor-dashboard';

export default async function DistributorDashboardPage() {
  const data = await getDistributorDashboardData();
  return <DistributorDashboardClient data={data} />;
}

// DistributorDashboardClient.tsx
"use client";
export function DistributorDashboardClient({ data }: Props) {
  // Render con datos reales
}
```

### 2. No Sigue Patrón de Componentes

**Problema:** Todo en un solo archivo monolítico

**Debe separarse en:**
```
src/
├── app/(app)/distributor/dashboard/
│   ├── page.tsx                          # Server component
│   └── DistributorDashboardClient.tsx    # Client component
├── features/distributor/
│   ├── components/
│   │   ├── DistributorOrdersTable.tsx
│   │   ├── SellOutUploader.tsx
│   │   ├── DistributorStockPanel.tsx
│   │   ├── PlvMaterialsPanel.tsx
│   │   └── DistributorFinancePanel.tsx
│   └── hooks/
│       └── useDistributorData.ts
└── server/actions/
    └── distributor-dashboard.ts
```

### 3. No Usa Contexto de Alertas

**Problema:** Alertas hardcodeadas en lugar de usar `AlertsProvider`

```typescript
// ❌ INCORRECTO - Alertas mock
const alerts = [
  { id: '1', type: 'warning', title: 'Pedido SB-2025-345 en tránsito' }
];
```

**Debe usar:**

```typescript
// ✅ CORRECTO - Usar AlertsProvider
import { useAlerts } from '@/components/alerts/AlertsProvider';

const { alerts } = useAlerts();
const distributorAlerts = alerts.filter(a => 
  a.context?.distributorPartyId === currentUser.partyId
);
```

---

## 📊 ANÁLISIS DETALLADO POR SECCIÓN

### Tab: Mis Pedidos

**Estado Actual:** 🔴 CRÍTICO

**Problemas:**
1. Datos mock hardcodeados
2. Estados incorrectos ('EN_TRANSITO', 'PREPARACION')
3. No usa `OrderSellOut` de SSOT V2.1
4. No filtra por `distributorPartyId`
5. Tabla no usa clases del DS

**Debe implementar:**
```typescript
// Server Action
export async function getDistributorOrders(distributorPartyId: string) {
  const orders = await orderService.queryOrders({
    distributorPartyId,
    status: ['confirmed', 'shipped', 'invoiced'],
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 50
  });
  
  return orders.map(order => ({
    id: order.id,
    docNumber: order.docNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    lineCount: order.lines.length,
    createdAt: order.createdAt,
    estimatedDelivery: calculateETA(order)
  }));
}
```

### Tab: Sell-Out

**Estado Actual:** 🔴 CRÍTICO

**Problemas:**
1. No hay funcionalidad real de upload
2. Gráficos con datos mock
3. No crea registros `OrderSellOut` con `isSellOutReported: true`
4. No valida formato CSV

**Debe implementar:**
```typescript
// Server Action
export async function uploadSellOutData(
  distributorPartyId: string,
  csvData: string
) {
  // 1. Validar formato CSV
  const parsed = parseCSV(csvData);
  validateSellOutFormat(parsed);
  
  // 2. Crear OrderSellOut por cada línea
  const orders = await Promise.all(
    parsed.map(row => orderService.createOrder({
      flow: 'PLACEMENT',
      distributorPartyId,
      isSellOutReported: true,
      accountId: row.accountId,
      lines: [{
        itemId: row.sku,
        quantity: row.quantity,
        unitPrice: row.price
      }],
      orderDate: row.date,
      source: 'MANUAL'
    }))
  );
  
  return { success: true, ordersCreated: orders.length };
}
```

### Tab: Mi Stock

**Estado Actual:** 🔴 CRÍTICO

**Problemas:**
1. Datos completamente inventados
2. No usa colección `onHand`
3. No calcula rotación ni cobertura real
4. No filtra por `locationId` del distribuidor

**Debe implementar:**
```typescript
// Server Action
export async function getDistributorStock(locationId: string) {
  const onHandRecords = await onHandService.queryOnHand({
    locationId,
    'qty.RELEASED': { '>': 0 }
  });
  
  return onHandRecords.map(record => ({
    itemId: record.itemId,
    lotCode: record.lotCode,
    quantity: record.qty.RELEASED,
    availableQty: record.availableQty,
    coverage: calculateCoverage(record),
    rotation: calculateRotation(record),
    status: getStockStatus(record)
  }));
}
```

### Tab: Material PLV

**Estado Actual:** 🔴 CRÍTICO

**Problemas:**
1. No existe colección en Firestore
2. No hay sistema de solicitudes
3. No hay workflow de aprobación

**Debe implementar:**
```typescript
// Schema
interface PlvMaterial {
  id: string;
  name: string;
  description: string;
  category: 'SIGNAGE' | 'DISPLAY' | 'PROMOTIONAL';
  availableQty: number;
  imageUrl?: string;
  createdAt: Timestamp;
}

interface PlvRequest {
  id: string;
  distributorPartyId: string;
  materialId: string;
  quantity: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SHIPPED';
  requestedAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
}
```

### Tab: Finanzas

**Estado Actual:** 🔴 CRÍTICO

**Problemas:**
1. No integra con Holded
2. Datos completamente inventados
3. No muestra facturas reales
4. No calcula crédito disponible

**Debe implementar:**
```typescript
// Server Action
export async function getDistributorFinances(distributorPartyId: string) {
  // 1. Obtener límite de crédito de Holded
  const creditInfo = await holdedClient.getCreditLimit(distributorPartyId);
  
  // 2. Obtener facturas abiertas
  const openInvoices = await orderService.queryOrders({
    distributorPartyId,
    billingStatus: ['pending', 'invoiced']
  });
  
  // 3. Calcular crédito usado
  const creditUsed = openInvoices.reduce((sum, order) => 
    sum + (order.totalAmount || 0), 0
  );
  
  return {
    creditLimit: creditInfo.limit,
    creditUsed,
    creditAvailable: creditInfo.limit - creditUsed,
    openInvoices: openInvoices.map(order => ({
      id: order.id,
      docNumber: order.docNumber,
      amount: order.totalAmount,
      dueDate: order.dueDate,
      status: order.billingStatus
    })),
    bonusAvailable: await calculateBonus(distributorPartyId)
  };
}
```

---

## 🎯 PLAN DE CORRECCIÓN PRIORIZADO

### Fase 1: Fundamentos Críticos (Semana 1)

**Prioridad: 🔴 CRÍTICA**

- [ ] Crear server actions en `src/server/actions/distributor-dashboard.ts`
- [ ] Implementar validación de rol distribuidor
- [ ] Integrar con `order.service.ts` para pedidos reales
- [ ] Filtrar pedidos por `distributorPartyId`
- [ ] Usar estados correctos de SSOT V2.1

### Fase 2: Design System Compliance (Semana 2)

**Prioridad: 🟡 ALTA**

- [ ] Refactorizar header con clases del DS
- [ ] Convertir tabs a `sb-tabs` estándar
- [ ] Usar `sb-table` para tablas
- [ ] Reemplazar badges custom por `sb-badge--*`
- [ ] Separar componentes monolíticos

### Fase 3: Funcionalidades Core (Semana 3-4)

**Prioridad: 🟡 ALTA**

- [ ] Implementar upload de sell-out CSV
- [ ] Integrar stock real con `onHand`
- [ ] Crear colección `plvMaterials`
- [ ] Implementar sistema de solicitudes PLV
- [ ] Integrar finanzas con Holded

### Fase 4: Optimizaciones (Semana 5)

**Prioridad: 🟢 MEDIA**

- [ ] Implementar caching de KPIs
- [ ] Añadir paginación en tablas
- [ ] Optimizar queries de Firestore
- [ ] Añadir loading states
- [ ] Implementar error boundaries

---

## 📝 CHECKLIST DE CUMPLIMIENTO

### SSOT V2 Compliance

- [ ] Usa `OrderSellOut` con estructura correcta
- [ ] Filtra por `distributorPartyId`
- [ ] Usa estados correctos (`status`, `billingStatus`)
- [ ] Integra con `order.service.ts`
- [ ] Respeta campos opcionales/requeridos
- [ ] Usa `flow: 'PLACEMENT'` para colocaciones
- [ ] Marca sell-out con `isSellOutReported: true`

### Design System Compliance

- [ ] Header usa `sb-header-glass`
- [ ] Tabs usan `sb-tabs` y `sb-tab`
- [ ] Botones usan `sb-btn--*`
- [ ] Tablas usan `sb-table-wrap` y `sb-table`
- [ ] Badges usan `sb-badge--*`
- [ ] Cards usan `sb-card-glass-light`
- [ ] No hay clases custom duplicando tokens

### Business Rules Compliance

- [ ] Valida rol de distribuidor
- [ ] Filtra datos por `distributorPartyId`
- [ ] Implementa upload de sell-out
- [ ] Integra con Holded para finanzas
- [ ] Usa `onHand` para stock real
- [ ] Implementa sistema PLV completo

### Architecture Compliance

- [ ] Usa server actions para datos
- [ ] Separa server/client components
- [ ] Componentes modulares y reutilizables
- [ ] Usa `AlertsProvider` para alertas
- [ ] Implementa error handling
- [ ] Añade loading states

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### 1. Crear Server Actions (HOY)

```bash
# Crear archivo de server actions
touch src/server/actions/distributor-dashboard.ts
```

### 2. Refactorizar Componente (MAÑANA)

```bash
# Crear estructura modular
mkdir -p src/features/distributor/components
mkdir -p src/features/distributor/hooks
```

### 3. Implementar Validación de Rol (MAÑANA)

```typescript
// Añadir guard en page.tsx
if (!currentUser?.partyId || currentUser.role !== 'DISTRIBUIDOR') {
  redirect('/access-denied');
}
```

### 4. Integrar Datos Reales (ESTA SEMANA)

- Conectar con `order.service.ts`
- Filtrar por `distributorPartyId`
- Usar estados SSOT V2.1

---

## 📊 MÉTRICAS DE ÉXITO

### Antes de la Refactorización

- ❌ 0% datos reales
- ❌ 0% SSOT V2 compliance
- ⚠️ 40% Design System compliance
- ❌ 0% business rules implementadas

### Después de la Refactorización (Objetivo)

- ✅ 100% datos reales
- ✅ 100% SSOT V2 compliance
- ✅ 100% Design System compliance
- ✅ 100% business rules implementadas

---

## 🎓 CONCLUSIÓN

El Portal Distribuidor actual es un **prototipo visual** que requiere **refactorización completa** para:

1. ✅ Cumplir con SSOT V2.1
2. ✅ Seguir el Design System
3. ✅ Implementar reglas de negocio
4. ✅ Integrar con backend real
5. ✅ Validar permisos correctamente

**Estimación de esfuerzo:** 4-5 semanas  
**Prioridad:** 🔴 CRÍTICA (bloquea funcionalidad de distribuidores)

**Recomendación:** Iniciar refactorización inmediatamente siguiendo el plan de corrección priorizado.
