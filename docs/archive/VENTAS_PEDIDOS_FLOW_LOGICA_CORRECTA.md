# Lógica Correcta de Flow: PLACEMENT vs DIRECT

**Fecha:** 26/10/2025
**Corrección Importante:** PLACEMENT solo viene de comerciales, NO de distribuidores

---

## ⚠️ CORRECCIÓN CRÍTICA

### ❌ INCORRECTO (Asunción Anterior)
```typescript
// ESTO ESTÁ MAL
if (order.distributorPartyId) return 'PLACEMENT';
if (order.channel === 'DISTRIBUTOR') return 'PLACEMENT';
if (account?.segment === 'DISTRIBUIDOR') return 'PLACEMENT';
```

### ✅ CORRECTO (Lógica Real del Negocio)

**PLACEMENT (Colocación):**
- Solo viene de **comerciales de Santa Brisa**
- Es cuando un comercial coloca producto en un cliente
- NO tiene relación con distribuidores
- Es venta directa gestionada por el equipo comercial

**DIRECT (Venta Directa):**
- Pedidos normales de clientes
- Pedidos online (Shopify)
- Pedidos de distribuidores
- Cualquier pedido que NO sea colocación de comerciales

---

## 🎯 LÓGICA CORRECTA DE INFERENCIA

### Regla Simple

```typescript
/**
 * PLACEMENT solo se asigna manualmente por comerciales
 * TODO lo demás es DIRECT por defecto
 */
function inferOrderFlow(order: Partial<OrderSellOut>): 'PLACEMENT' | 'DIRECT' {
  // Si ya tiene flow asignado, respetarlo
  if (order.flow) {
    return order.flow;
  }
  
  // Por defecto, TODO es DIRECT
  // PLACEMENT solo se asigna manualmente en NewOrderDrawer
  return 'DIRECT';
}
```

---

## 📍 PUNTOS DE ENTRADA Y SU LÓGICA

### 1. ✅ NewOrderDrawer (YA CORRECTO)
**Estado:** Implementado correctamente

```typescript
// Tiene selector manual de flow
<select value={formData.flow || ''} onChange={(e) => handleInputChange('flow', e.target.value)}>
  <option value="DIRECT">Venta Directa</option>
  <option value="PLACEMENT">Placement</option>
</select>

// El comercial elige manualmente si es PLACEMENT o DIRECT
```

**✅ No requiere cambios** - El comercial decide explícitamente.

---

### 2. ❌ QuickOrderDrawer (REQUIERE CORRECCIÓN)
**Estado:** No asigna flow

**Archivo:** `src/ui/drawers/drawers/QuickOrderDrawer.tsx`

**Cambio Necesario:**

```typescript
// Al crear el pedido
const orderToSave: Partial<OrderSellOut> = {
  accountId,
  lines,
  status: 'open',
  currency: 'EUR',
  source: 'MANUAL',
  // NUEVO: Siempre DIRECT en pedidos rápidos
  flow: 'DIRECT',
  // Inferir channel basado en el account
  channel: inferChannelFromAccount(account),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

**Razón:** QuickOrderDrawer es para pedidos rápidos normales, no para colocaciones. Las colocaciones se hacen desde NewOrderDrawer donde el comercial puede elegir explícitamente.

---

### 3. ❌ QuickLog (REQUIERE CORRECCIÓN)
**Estado:** No asigna flow

**Archivo:** `src/features/quicklog/utils/process-quicklog.ts`

**Cambio Necesario:**

```typescript
case 'CREATE_ORDER':
  const lines = extractOrderLines(intent);
  
  actions.push({
    type: 'PEDIDO',
    date: intent.dueDate || new Date().toISOString(),
    details: {
      lines,
      estimatedTotal: calculateEstimatedTotal(lines),
      notes: intent.description,
      // NUEVO: Siempre DIRECT desde QuickLog
      flow: 'DIRECT',
    },
  });
  break;
```

**Razón:** QuickLog es para registro rápido de actividades. Las colocaciones (PLACEMENT) requieren un proceso más formal con NewOrderDrawer.

---

### 4. ✅ Shopify Integration
**Estado:** Debe ser DIRECT

```typescript
const orderFromShopify: Partial<OrderSellOut> = {
  // ... otros campos
  source: 'SHOPIFY',
  channel: 'ONLINE',
  flow: 'DIRECT', // Shopify siempre es venta directa
};
```

---

### 5. ✅ Holded Integration
**Estado:** Debe ser DIRECT

```typescript
const orderFromHolded: Partial<OrderSellOut> = {
  // ... otros campos
  source: 'HOLDED',
  flow: 'DIRECT', // Holded siempre es venta directa
};
```

---

## 🔄 MIGRACIÓN DE DATOS

### Script Simplificado

```typescript
// scripts/migrate-orders-flow-simple.ts
import { db } from '@/server/firebase';

async function migrateOrdersFlow() {
  console.log('🔄 Starting flow migration...');
  
  // Obtener todos los pedidos sin flow
  const ordersRef = db.collection('ordersSellOut');
  const snapshot = await ordersRef.where('flow', '==', null).get();
  
  console.log(`📊 Found ${snapshot.size} orders without flow`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const order = doc.data();
    
    // REGLA SIMPLE: Todo es DIRECT por defecto
    // PLACEMENT solo se asigna manualmente
    const flow = 'DIRECT';
    
    batch.update(doc.ref, { 
      flow,
      updatedAt: new Date().toISOString()
    });
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✅ Migrated ${count} orders...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`\n✅ Migration complete: ${count} orders set to DIRECT`);
  console.log('ℹ️  PLACEMENT orders must be set manually by sales team');
}

migrateOrdersFlow().catch(console.error);
```

---

## 📋 RESUMEN DE CAMBIOS NECESARIOS

### Cambios Mínimos Requeridos

| Componente | Acción | Tiempo |
|------------|--------|--------|
| QuickOrderDrawer | Asignar `flow: 'DIRECT'` | 5 min |
| QuickLog | Asignar `flow: 'DIRECT'` | 5 min |
| Shopify Integration | Asignar `flow: 'DIRECT'` | 5 min |
| Holded Integration | Asignar `flow: 'DIRECT'` | 5 min |
| Script Migración | Ejecutar script simple | 10 min |
| **TOTAL** | **30 minutos** |

### NO Requieren Cambios

- ✅ **NewOrderDrawer** - Ya permite selección manual
- ✅ **RegisterInteractionDrawer** - No crea pedidos
- ✅ **RegisterEventDrawer** - No crea pedidos
- ✅ **RegisterPOSDrawer** - No crea pedidos
- ✅ **OpportunityDrawer** - No crea pedidos

---

## 🎯 FLUJO DE TRABAJO CORRECTO

### Para Comerciales

1. **Pedido Normal (DIRECT):**
   - Usar QuickOrderDrawer desde account
   - O usar NewOrderDrawer y seleccionar "Venta Directa"

2. **Colocación (PLACEMENT):**
   - **SOLO** usar NewOrderDrawer
   - Seleccionar explícitamente "Placement"
   - Completar información adicional si es necesaria

### Para QuickLog

- **Todos los pedidos desde QuickLog son DIRECT**
- Si un comercial quiere registrar una colocación, debe:
  1. Usar QuickLog para la nota/interacción
  2. Luego ir a NewOrderDrawer para crear el pedido PLACEMENT

---

## 📊 VISUALIZACIÓN

### En la Tabla de Pedidos

```typescript
// Mostrar badge de flow
<td className="py-3">
  <FlowBadge flow={order.flow} />
</td>

// FlowBadge component
export function FlowBadge({ flow }: { flow?: 'PLACEMENT' | 'DIRECT' }) {
  if (!flow || flow === 'DIRECT') {
    return (
      <span className="sb-chip sb-chip--blue">
        <span className="sb-chip__icon">🎯</span>
        Venta Directa
      </span>
    );
  }
  
  return (
    <span className="sb-chip sb-chip--purple">
      <span className="sb-chip__icon">📍</span>
      Colocación
    </span>
  );
}
```

### En Filtros

```typescript
// Tab para filtrar por flow
<button
  onClick={() => setFlowFilter('PLACEMENT')}
  className={flowFilter === 'PLACEMENT' ? 'active' : ''}
>
  📍 Colocaciones ({placementCount})
</button>

<button
  onClick={() => setFlowFilter('DIRECT')}
  className={flowFilter === 'DIRECT' ? 'active' : ''}
>
  🎯 Venta Directa ({directCount})
</button>
```

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Todos los pedidos tienen `flow` asignado
2. ✅ QuickOrderDrawer asigna `flow: 'DIRECT'`
3. ✅ QuickLog asigna `flow: 'DIRECT'`
4. ✅ NewOrderDrawer permite selección manual
5. ✅ Integraciones (Shopify, Holded) asignan `flow: 'DIRECT'`
6. ✅ FlowBadge se muestra en tabla de pedidos
7. ✅ Filtros por flow funcionan correctamente

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Paso 1: Actualizar QuickOrderDrawer (5 min)
```typescript
// src/ui/drawers/drawers/QuickOrderDrawer.tsx
// Línea ~XX: Al crear orderToSave
flow: 'DIRECT',
```

### Paso 2: Actualizar QuickLog (5 min)
```typescript
// src/features/quicklog/utils/process-quicklog.ts
// En case 'CREATE_ORDER':
flow: 'DIRECT',
```

### Paso 3: Actualizar Integraciones (10 min)
```typescript
// Shopify y Holded
flow: 'DIRECT',
```

### Paso 4: Ejecutar Migración (10 min)
```bash
npm run migrate:orders-flow
```

### Paso 5: Verificar (5 min)
- Crear pedido desde QuickOrderDrawer → debe ser DIRECT
- Crear pedido desde QuickLog → debe ser DIRECT
- Crear pedido desde NewOrderDrawer → puede elegir
- Ver tabla de pedidos → badges correctos

**Tiempo Total: 35 minutos**

---

## 📝 NOTAS IMPORTANTES

1. **PLACEMENT es excepcional:** Solo comerciales lo usan para casos específicos
2. **DIRECT es la norma:** 95%+ de pedidos son DIRECT
3. **No auto-inferir PLACEMENT:** Nunca inferir automáticamente, siempre manual
4. **Distribuidores NO son PLACEMENT:** Pedidos de distribuidores son DIRECT normal

---

**Documento actualizado:** 26/10/2025  
**Versión:** 2.0 (Corregida)  
**Estado:** Listo para implementación
