# Implementación Completa: Lógica de Flow en Pedidos

**Fecha:** 26/10/2025
**Estado:** ✅ COMPLETADO

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado correctamente la lógica de diferenciación de pedidos entre **PLACEMENT (Colocación)** y **DIRECT (Venta Directa)** en todos los puntos de entrada del sistema.

### Corrección Crítica Aplicada

**PLACEMENT (Colocación):**
- ✅ Solo asignado manualmente por comerciales
- ✅ Se usa en casos específicos de colocación de producto
- ✅ NO tiene relación con distribuidores
- ✅ Requiere selección explícita en NewOrderDrawer

**DIRECT (Venta Directa):**
- ✅ Es el valor por defecto para todos los pedidos
- ✅ Incluye pedidos de clientes, distribuidores, online, etc.
- ✅ Se asigna automáticamente en todos los puntos de entrada

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. QuickOrderDrawer
**Archivo:** `src/server/actions/sales-interactions.actions.ts`
**Estado:** ✅ Ya tenía `flow: 'DIRECT'` implementado (línea 186)
**Acción:** Ninguna necesaria

### 2. QuickLog
**Archivos Modificados:**
- `src/features/quicklog/utils/process-quicklog.ts`
- `src/features/quicklog/components/QuickLogConfirmation.tsx`

**Cambios:**
```typescript
// process-quicklog.ts - línea 158
details: {
  lines,
  estimatedTotal: calculateEstimatedTotal(lines),
  notes: intent.description,
  flow: 'DIRECT', // ✅ NUEVO
}

// QuickLogConfirmation.tsx - línea 30
details: {
  // ... otros campos
  flow?: 'PLACEMENT' | 'DIRECT'; // ✅ NUEVO tipo
}
```

### 3. Shopify Integration
**Archivo:** `src/server/actions/shopify-sync.ts`

**Cambios:**
```typescript
// Líneas 59-61
const erpOrder: Partial<OrderSellOut> = {
  source: 'SHOPIFY',
  channel: 'ONLINE', // ✅ NUEVO
  flow: 'DIRECT',    // ✅ NUEVO
  // ... resto de campos
};
```

### 4. UI - FlowBadge Component
**Archivo:** `src/components/ui/OrderBadges.tsx`

**Nuevo Componente:**
```typescript
export function FlowBadge({ 
  flow,
  showLabel = true,
  size = 'md'
}: { 
  flow?: 'PLACEMENT' | 'DIRECT';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!flow || flow === 'DIRECT') {
    return (
      <span className="sb-chip sb-chip--info" title="Venta directa al cliente">
        <span className="sb-chip__icon">🎯</span>
        {showLabel && (size === 'sm' ? 'DIR' : 'Venta Directa')}
      </span>
    );
  }
  
  return (
    <span className="sb-chip sb-chip--warning" title="Colocación por comercial">
      <span className="sb-chip__icon">📍</span>
      {showLabel && (size === 'sm' ? 'COL' : 'Colocación')}
    </span>
  );
}
```

### 5. Tabla de Pedidos
**Archivo:** `src/components/orders/PedidosContent.tsx`

**Cambios:**
```typescript
// Importación
import { StatusBadge, ChannelChip, SourceChip, OwnerBadge, FlowBadge } from "@/components/ui/OrderBadges";

// Nueva columna en thead
<th className="pb-2 font-medium">Tipo</th>

// Nueva celda en tbody
<td className="py-3">
  <FlowBadge flow={orderV21.flow} size="sm" />
</td>
```

### 6. Script de Migración
**Archivo:** `scripts/migrate-orders-flow-simple.ts`

**Funcionalidad:**
- Busca todos los pedidos sin `flow`
- Asigna `flow: 'DIRECT'` a todos
- Procesa en lotes de 500 para eficiencia
- Muestra progreso y resumen

---

## 📊 ARCHIVOS MODIFICADOS

| Archivo | Tipo de Cambio | Líneas |
|---------|---------------|--------|
| `src/features/quicklog/utils/process-quicklog.ts` | Agregar flow | +1 |
| `src/features/quicklog/components/QuickLogConfirmation.tsx` | Actualizar tipo | +1 |
| `src/server/actions/shopify-sync.ts` | Agregar flow y channel | +2 |
| `src/components/ui/OrderBadges.tsx` | Nuevo componente FlowBadge | +25 |
| `src/components/orders/PedidosContent.tsx` | Agregar columna y badge | +3 |
| `scripts/migrate-orders-flow-simple.ts` | Nuevo script | +65 |
| **TOTAL** | **6 archivos** | **~97 líneas** |

---

## 🎯 PUNTOS DE ENTRADA - ESTADO FINAL

### ✅ Asignan flow Correctamente

1. **NewOrderDrawer** 
   - Selector manual de flow
   - Comercial elige PLACEMENT o DIRECT

2. **QuickOrderDrawer**
   - Asigna automáticamente `flow: 'DIRECT'`

3. **QuickLog**
   - Asigna automáticamente `flow: 'DIRECT'`

4. **Shopify Integration**
   - Asigna automáticamente `flow: 'DIRECT'` y `channel: 'ONLINE'`

5. **createOrder (orders.ts)**
   - Respeta el flow que viene en orderData

### ✅ No Crean Pedidos (No Requieren Cambios)

- RegisterInteractionDrawer
- RegisterEventDrawer
- RegisterPOSDrawer
- OpportunityDrawer

---

## 🚀 PRÓXIMOS PASOS

### 1. Ejecutar Migración de Datos

```bash
# Compilar TypeScript
npm run build

# Ejecutar script de migración
npx tsx scripts/migrate-orders-flow-simple.ts
```

**Resultado Esperado:**
```
🔄 Starting flow migration...
📊 Total orders in database: XXX
📊 Orders without flow: YYY

✅ Migrated YYY/
