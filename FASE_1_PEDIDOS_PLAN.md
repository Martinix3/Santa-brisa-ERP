# 📋 FASE 1: PEDIDOS INTELIGENTES - Plan de Implementación

**Fecha:** 14/01/2025  
**Estado:** Análisis completo - Listo para implementar  
**Duración estimada:** 3-4 días

---

## 🔍 ANÁLISIS VISUAL ACTUAL

### ❌ Problemas Encontrados

#### 1. **Inconsistencias en `/ventas/pedidos/page.tsx`**

**Problemas:**
- ✗ KPIs usan estructura incorrecta (no siguen `.sb-kpi` de components.css)
- ✗ Tabs usan clases Tailwind inline en lugar de `.sb-tabs`
- ✗ Status badges mezclados (algunos usan `sb-badge`, otros Tailwind)
- ✗ Cards no usan `.sb-card` completo (faltan header/content/footer)
- ✗ Botones inconsistentes (mix de `.sb-btn` y Tailwind)
- ✗ Filtros no usan `.sb-input` / `.sb-select`

**Ejemplo actual (incorrecto):**
```tsx
// KPI - NO sigue el design system
<div className="sb-kpi">
  <div className="sb-kpi__value">{kpis.total}</div>
  <div className="sb-kpi__label">📦 TOTAL PEDIDOS</div>
</div>

// Status - Mezcla estilos
<span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
  {getStatusLabel(order.status)}
</span>
```

**Debería ser:**
```tsx
// KPI - Estructura correcta del design system
<div className="sb-kpi">
  <div className="sb-kpi__value">{kpis.total}</div>
  <div className="sb-kpi__label">📦 TOTAL PEDIDOS</div>
</div>

// Status - Usar sistema de badges unificado
<span className={`sb-badge ${getStatusBadgeClass(order.status)}`}>
  {getStatusLabel(order.status)}
</span>
```

#### 2. **Inconsistencias en Drawer `/@drawer/(.)ventas/pedidos/[id]/page.tsx`**

**Problemas:**
- ✗ Header custom no usa `.sb-drawer__header`
- ✗ Secciones no usan `.sb-section`
- ✗ Líneas de pedido no usan estructura de cards
- ✗ Footer actions mezcladas
- ✗ Información técnica usa grid Tailwind en lugar de sb-section

**Ejemplo actual (incorrecto):**
```tsx
<div className="p-6 border-b border-border/30 bg-secondary/10">
  <div className="flex items-center justify-between mb-4">
    <span className={`px-3 py-1.5 rounded-full...`}>
```

**Debería ser:**
```tsx
<div className="sb-drawer__header sb-header-glass">
  <div className="sb-badge sb-badge--primary">
```

---

## ✅ PLAN DE MEJORA - FASE 1

### **Tarea 1.1: Refactor Visual Completo** (1 día)

#### A. Actualizar `/ventas/pedidos/page.tsx`

**1. Header y Toolbar**
```tsx
<div className="sb-page">
  <div className="sb-page__header">
    <div>
      <h1 className="sb-page__title">
        <ShoppingCart className="h-6 w-6" />
        Pedidos
      </h1>
      <p className="sb-page__subtitle">
        Gestión de pedidos de venta directa y colocación
      </p>
    </div>
    <div className="sb-actions">
      <button className="sb-btn sb-btn--ghost">
        <Download size={16} />
        Exportar
      </button>
      <button className="sb-btn sb-btn--primary">
        <Plus size={16} />
        Nuevo Pedido
      </button>
    </div>
  </div>
```

**2. Tabs (usar sistema unificado)**
```tsx
<div className="sb-tabs">
  <button
    className={`sb-tab ${activeTab === 'direct' ? 'aria-selected' : ''}`}
    aria-selected={activeTab === 'direct'}
    onClick={() => setActiveTab('direct')}
  >
    <ShoppingCart size={16} />
    Venta Directa
    <span className="sb-badge sb-badge--primary">{directOrders.length}</span>
  </button>
  <button
    className={`sb-tab ${activeTab === 'placement' ? 'aria-selected' : ''}`}
    aria-selected={activeTab === 'placement'}
    onClick={() => setActiveTab('placement')}
  >
    <TrendingUp size={16} />
    Colocación
    <span className="sb-badge">{placementOrders.length}</span>
  </button>
</div>
```

**3. KPIs (estructura correcta)**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  <div className="sb-kpi">
    <div className="sb-kpi__value">{kpis.total}</div>
    <div className="sb-kpi__label">TOTAL PEDIDOS</div>
  </div>
  {/* ... más KPIs ... */}
</div>
```

**4. Filtros**
```tsx
<SBCard>
  <div className="sb-card__content">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <input
        type="text"
        className="sb-input"
        placeholder="Buscar pedidos..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />
      <select className="sb-select" value={filters.status} onChange={...}>
        <option value="all">Todos los estados</option>
        {/* ... opciones ... */}
      </select>
      <input type="date" className="sb-input" />
      <input type="date" className="sb-input" />
    </div>
  </div>
</SBCard>
```

**5. Status Badges (sistema unificado)**
```tsx
// Crear función helper
function getStatusBadgeClass(status: string): string {
  const classes = {
    open: 'sb-badge--primary',
    confirmed: 'sb-badge--success',
    shipped: 'sb-pill--primary',
    invoiced: 'sb-pill--success',
    paid: 'sb-badge--success',
    cancelled: 'sb-badge--destructive',
  };
  return `sb-badge ${classes[status] || ''}`;
}

// Uso
<span className={getStatusBadgeClass(order.status)}>
  {getStatusLabel(order.status)}
</span>
```

**6. Cards de Pedidos**
```tsx
<SBCard className="hover-raise">
  <div className="sb-card__header">
    <div className="flex items-center gap-3">
      <h3 className="sb-card__title">
        {order.docNumber || `#${order.id.substring(0, 8)}`}
      </h3>
      <span className={getStatusBadgeClass(order.status)}>
        {getStatusLabel(order.status)}
      </span>
    </div>
    <div className="sb-actions">
      <button className="sb-btn sb-btn--sm sb-btn--ghost">
        Cambiar Status
      </button>
      {canGenerateShipment(order) && (
        <button className="sb-btn sb-btn--sm sb-btn--primary">
          Generar Envío
        </button>
      )}
    </div>
  </div>
  
  <div className="sb-card__content">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Info del pedido */}
    </div>
  </div>
  
  {order.lines && order.lines.length > 0 && (
    <div className="sb-card__footer">
      <div className="flex flex-wrap gap-2">
        {order.lines.slice(0, 3).map((line, idx) => (
          <span key={idx} className="sb-badge">
            {line.qty} × {line.itemId}
          </span>
        ))}
      </div>
    </div>
  )}
</SBCard>
```

#### B. Actualizar Drawer `/@drawer/(.)ventas/pedidos/[id]/page.tsx`

**1. Header**
```tsx
<EntityDrawerShell
  title={order.docNumber || `Pedido #${order.id.substring(0, 8)}`}
  subtitle={`${order.flow === 'PLACEMENT' ? 'Colocación' : 'Venta Directa'}`}
  onClose={() => router.back()}
>
  {/* Contenido */}
  <div className="sb-drawer__header sb-header-glass">
    <div className="flex items-center justify-between">
      <span className={getStatusBadgeClass(order.status)}>
        {getStatusLabel(order.status)}
      </span>
      <div className="text-right">
        <p className="text-2xl font-bold">
          {(order.totalAmount || 0).toFixed(2)} {order.currency}
        </p>
      </div>
    </div>
  </div>
```

**2. Secciones con sb-section**
```tsx
<div className="space-y-4 p-4">
  {/* Líneas del pedido */}
  <div className="sb-section">
    <h3 className="sb-section__title">
      <Package size={18} />
      Productos ({order.lines?.length || 0})
    </h3>
    <div className="space-y-2">
      {order.lines?.map((line, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
          {/* Contenido línea */}
        </div>
      ))}
    </div>
  </div>

  {/* Notas */}
  {order.notes && (
    <div className="sb-section">
      <h4 className="sb-section__title">Notas</h4>
      <p className="text-sm text-muted-foreground">{order.notes}</p>
    </div>
  )}
</div>
```

**3. Footer con acciones**
```tsx
<div className="sb-drawer__footer">
  <div className="sb-actions">
    {getAvailableActions(order).map(action => (
      <button
        key={action.id}
        className={`sb-btn ${action.variant}`}
        onClick={action.handler}
      >
        {action.icon}
        {action.label}
      </button>
    ))}
  </div>
</div>
```

---

### **Tarea 1.2: Workflow de Status** (1 día)

#### A. Agregar campos a SSOT

```typescript
// En src/domain/ssot.ts
export interface OrderSellOut {
  // ... campos existentes ...
  
  // NUEVOS CAMPOS FASE 1
  statusHistory?: StatusHistoryEntry[];
  workflowMetadata?: {
    confirmedAt?: string;
    confirmedBy?: string;
    shippedAt?: string;
    shippedBy?: string;
    invoicedAt?: string;
    invoicedBy?: string;
    paidAt?: string;
    paidBy?: string;
  };
  
  // Campos calculados
  grossMargin?: number;        // Margen bruto
  etaDays?: number;            // Días estimados de entrega
  fulfillmentPct?: number;     // % cumplimiento
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  userId: string;
  notes?: string;
}
```

#### B. Server Actions para Workflow

```typescript
// src/server/actions/orders-workflow.ts
"use server";

import { adminDb as db } from "@/server/firebase";
import type { OrderStatus } from "@/domain/ssot";

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  notes?: string
) {
  try {
    const orderRef = db.collection("ordersSellOut").doc(orderId);
    const order = await orderRef.get();
    
    if (!order.exists) {
      return { success: false, error: "Pedido no encontrado" };
    }
    
    const data = order.data();
    const now = new Date().toISOString();
    
    // Validar transición de status
    if (!isValidStatusTransition(data.status, newStatus)) {
      return { success: false, error: "Transición de status inválida" };
    }
    
    // Preparar actualización
    const statusHistory = data.statusHistory || [];
    statusHistory.push({
      status: newStatus,
      timestamp: now,
      userId,
      notes
    });
    
    const workflowMetadata = data.workflowMetadata || {};
    
    // Actualizar timestamps según status
    if (newStatus === "confirmed") {
      workflowMetadata.confirmedAt = now;
      workflowMetadata.confirmedBy = userId;
    } else if (newStatus === "shipped") {
      workflowMetadata.shippedAt = now;
      workflowMetadata.shippedBy = userId;
    } else if (newStatus === "invoiced") {
      workflowMetadata.invoicedAt = now;
      workflowMetadata.invoicedBy = userId;
    } else if (newStatus === "paid") {
      workflowMetadata.paidAt = now;
      workflowMetadata.paidBy = userId;
    }
    
    // Actualizar documento
    await orderRef.update({
      status: newStatus,
      statusHistory,
      workflowMetadata,
      updatedAt: now
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, error: "Error al actualizar status" };
  }
}

function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    open: ["confirmed", "cancelled", "lost"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["invoiced", "cancelled"],
    invoiced: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
    lost: []
  };
  
  return validTransitions[from]?.includes(to) || false;
}

export async function getOrderHistory(orderId: string) {
  try {
    const order = await db.collection("ordersSellOut").doc(orderId).get();
    
    if (!order.exists) {
      return { success: false, error: "Pedido no encontrado" };
    }
    
    const data = order.data();
    return {
      success: true,
      history: data.statusHistory || []
    };
  } catch (error) {
    console.error("Error getting order history:", error);
    return { success: false, error: "Error al obtener historial" };
  }
}
```

#### C. UI para Cambiar Status

```tsx
// src/components/orders/StatusChangeDialog.tsx
"use client";

import { useState } from "react";
import { updateOrderStatus } from "@/server/actions/orders-workflow";
import type { OrderStatus } from "@/domain/ssot";

interface StatusChangeDialogProps {
  orderId: string;
  currentStatus: OrderStatus;
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function StatusChangeDialog({
  orderId,
  currentStatus,
  userId,
  onSuccess,
  onClose
}: StatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  
  const availableStatuses = getAvailableStatuses(currentStatus);
  
  async function handleSubmit() {
    setLoading(true);
    const result = await updateOrderStatus(orderId, newStatus, userId, notes);
    
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      alert(result.error);
    }
    
    setLoading(false);
  }
  
  return (
    <div className="sb-dialog-container">
      <div className="sb-dialog">
        <div className="sb-dialog__header">
          <h3 className="sb-dialog__title">Cambiar Status</h3>
        </div>
        
        <div className="sb-dialog__body">
          <div className="space-y-4">
            <div>
              <label className="sb-label">Nuevo Status</label>
              <select
                className="sb-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              >
                {availableStatuses.map(status => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="sb-label">Notas (opcional)</label>
              <textarea
                className="sb-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar comentarios..."
              />
            </div>
          </div>
        </div>
        
        <div className="sb-dialog__footer">
          <button
            className="sb-btn sb-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="sb-btn sb-btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getAvailableStatuses(current: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    open: ["confirmed", "cancelled", "lost"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["invoiced", "cancelled"],
    invoiced: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
    lost: []
  };
  
  return transitions[current] || [];
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    open: "Abierto",
    confirmed: "Confirmado",
    shipped: "Enviado",
    invoiced: "Facturado",
    paid: "Pagado",
    cancelled: "Cancelado",
    lost: "Perdido"
  };
  return labels[status];
}
```

---

### **Tarea 1.3: Shopify Mock Integration** (0.5 día)

```typescript
// src/server/integrations/shopify/mock.ts
export async function syncShopifyOrder(orderId: string) {
  // Simulación de sincronización
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    shopifyOrderId: `SH-${Date.now()}`,
    syncedAt: new Date().toISOString()
  };
}

export async function webhookShopifyOrderCreated(data: any) {
  // Mock webhook handler
  console.log("Shopify webhook received:", data);
  
  // Crear pedido en Firestore
  // ...
  
  return { success: true };
}
```

---

### **Tarea 1.4: Auto-generación Orden Logística** (0.5 día)

```typescript
// src/server/actions/logistics-auto.ts
"use server";

import { adminDb as db } from "@/server/firebase";

export async function generateShipmentFromOrder(orderId: string, userId: string) {
  try {
    const orderRef = db.collection("ordersSellOut").doc(orderId);
    const order = await orderRef.get();
    
    if (!order.exists) {
      return { success: false, error: "Pedido no encontrado" };
    }
    
    const orderData = order.data();
    
    // Validar que el pedido esté confirmado
    if (orderData.status !== "confirmed") {
      return { success: false, error: "Solo se pueden generar envíos de pedidos confirmados" };
    }
    
    // Crear shipment
    const shipmentRef = db.collection("shipments").doc();
    const shipmentId = shipmentRef.id;
    
    await shipmentRef.set({
      id: shipmentId,
      orderId: orderId,
      accountId: orderData.accountId,
      status: "pending",
      lines: orderData.lines,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString()
    });
    
    // Actualizar pedido
    await orderRef.update({
      shipmentId: shipmentId,
      status: "shipped",
      updatedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      shipmentId
    };
  } catch (error) {
    console.error("Error generating shipment:", error);
    return { success: false, error: "Error al generar envío" };
  }
}
```

---

## 📅 CRONOGRAMA

**Día 1:** Refactor visual completo (Tarea 1.1)
- Mañana: `/ventas/pedidos/page.tsx`
- Tarde: Drawer `[id]/page.tsx`

**Día 2:** Workflow de status (Tarea 1.2)
- Mañana: SSOT + Server actions
- Tarde: UI componentes + testing

**Día 3:** Integraciones (Tareas 1.3 + 1.4)
- Mañana: Shopify mock
- Tarde: Auto-generación logística

**Día 4:** Testing y polish
- Mañana: Testing completo
- Tarde: Bug fixes + documentación

---

## ✅ CRITERIOS DE ÉXITO

- [ ] UI totalmente consistente con `components.css`
- [ ] Todos los componentes usan clases `sb-*`
- [ ] Workflow de status funcional con historial
- [ ] Shopify mock simulando sync
- [ ] Auto-generación de shipments
- [ ] Build sin errores
- [ ] Testing completo

---

**Siguiente paso:** Toggle to Act mode para comenzar implementación
