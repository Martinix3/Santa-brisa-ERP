# Recomendaciones Fase Siguiente - Sistema de Pedidos

## Mejoras Adicionales Sugeridas

### 1. 🔄 Server Actions para Cambios de Estado
**Prioridad: ALTA**
```typescript
// src/server/actions/orders.actions.ts
export async function updateOrderStatus(
  orderId: string, 
  newStatus: OrderStatus,
  userId: string
): Promise<ActionResult<OrderSellOut>>
```

**Beneficios:**
- Persistencia real de cambios de estado
- Validación server-side de transiciones
- Auditoría de cambios
- Notificaciones automáticas

### 2. 📊 Dashboard de Métricas de Calidad
**Prioridad: MEDIA**
```typescript
// Componente para mostrar métricas globales
<OrderQualityDashboard 
  orders={orders}
  showTrends={true}
  period="30d"
/>
```

**Métricas sugeridas:**
- Evolución de completitud promedio
- Pedidos críticos por período
- Tiempo promedio de resolución
- Distribución por canales

### 3. 🔍 Búsqueda Inteligente
**Prioridad: MEDIA**
```typescript
// Búsqueda por múltiples criterios
<OrderSmartSearch 
  onSearch={(results) => setFilteredOrders(results)}
  searchFields={['docNumber', 'customerName', 'customerVat']}
  fuzzySearch={true}
/>
```

### 4. 📱 Notificaciones Push
**Prioridad: MEDIA**
- Pedidos que requieren atención
- Cambios de estado importantes
- Alertas de completitud crítica
- Recordatorios de seguimiento

### 5. 📈 Exportación Avanzada
**Prioridad: BAJA**
```typescript
// Exportar con filtros aplicados
<OrderExportButton 
  orders={filteredOrders}
  formats={['excel', 'pdf', 'csv']}
  includeQualityMetrics={true}
/>
```

### 6. 🎯 Acciones en Lote (Bulk Actions)
**Prioridad: MEDIA**
```typescript
// Selección múltiple y acciones masivas
<OrderBulkActions 
  selectedOrders={selectedOrders}
  availableActions={['confirm', 'cancel', 'export']}
  onBulkAction={handleBulkAction}
/>
```

### 7. 🔄 Sincronización en Tiempo Real
**Prioridad: BAJA**
- WebSocket para actualizaciones live
- Indicadores de cambios recientes
- Conflictos de edición concurrente

### 8. 📋 Templates de Filtros
**Prioridad: BAJA**
```typescript
// Guardar y cargar configuraciones de filtros
<FilterTemplates 
  onSave={saveFilterTemplate}
  onLoad={loadFilterTemplate}
  templates={userFilterTemplates}
/>
```

## Implementación Recomendada

### Fase 1 (Inmediata - 1-2 días)
1. **Server Actions para Estados**
   - Crear `updateOrderStatus` action
   - Implementar validación de transiciones
   - Conectar con OrderRowQuickActions

2. **Búsqueda Básica**
   - Añadir campo de búsqueda en header
   - Implementar filtrado por texto

### Fase 2 (Corto plazo - 1 semana)
3. **Dashboard de Métricas**
   - Componente de estadísticas de calidad
   - Gráficos de tendencias
   - Alertas automáticas

4. **Notificaciones**
   - Sistema básico de alertas
   - Integración con AlertsWidget existente

### Fase 3 (Medio plazo - 2-3 semanas)
5. **Acciones en Lote**
   - Selección múltiple
   - Operaciones masivas
   - Confirmaciones de seguridad

6. **Exportación Avanzada**
   - Múltiples formatos
   - Filtros aplicados
   - Métricas incluidas

## Código de Ejemplo - Server Action

```typescript
// src/server/actions/orders.actions.ts
'use server';

import { db } from '@/server/firebase';
import { revalidatePath } from 'next/cache';
import type { OrderStatus, OrderSellOut } from '@/domain/ssot';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  open: ['confirmed', 'cancelled', 'lost'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['invoiced', 'cancelled'],
  invoiced: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
  lost: []
};

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string
): Promise<ActionResult<OrderSellOut>> {
  try {
    // Obtener pedido actual
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return { success: false, error: 'Pedido no encontrado' };
    }

    const currentOrder = orderDoc.data() as OrderSellOut;
    
    // Validar transición
    const validTransitions = VALID_TRANSITIONS[currentOrder.status] || [];
    if (!validTransitions.includes(newStatus)) {
      return { 
        success: false, 
        error: `Transición no válida de ${currentOrder.status} a ${newStatus}` 
      };
    }

    // Actualizar estado
    const updatedOrder: Partial<OrderSellOut> = {
      status: newStatus,
      updatedAt: new Date(),
      updatedBy: userId
    };

    await orderDoc.ref.update(updatedOrder);

    // Crear registro de auditoría
    await db.collection('orderStatusHistory').add({
      orderId,
      fromStatus: currentOrder.status,
      toStatus: newStatus,
      changedBy: userId,
      changedAt: new Date(),
      reason: 'Manual status change'
    });

    // Revalidar cache
    revalidatePath('/ventas');

    return { 
      success: true, 
      data: { ...currentOrder, ...updatedOrder } as OrderSellOut 
    };

  } catch (error) {
    console.error('Error updating order status:', error);
    return { 
      success: false, 
      error: 'Error interno del servidor' 
    };
  }
}
```

## Integración con Componente Existente

```typescript
// Actualizar OrderRowQuickActions para usar server action
import { updateOrderStatus } from '@/server/actions/orders.actions';

const handleAction = async (newStatus: OrderStatus) => {
  if (disabled) return;
  
  try {
    const result = await updateOrderStatus(order.id, newStatus, currentUserId);
    
    if (result.success) {
      // Mostrar notificación de éxito
      toast.success(`Estado cambiado a ${newStatus}`);
      // El componente se re-renderizará automáticamente por revalidatePath
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    console.error('Error changing order status:', error);
    toast.error('Error al cambiar el estado');
  }
};
```

## Priorización Sugerida

1. **🔴 CRÍTICO**: Server Actions (sin esto, los cambios no persisten)
2. **🟡 IMPORTANTE**: Búsqueda y Dashboard de métricas
3. **🟢 NICE-TO-HAVE**: Resto de funcionalidades

¿Te gustaría que implemente alguna de estas mejoras específicas?
