# Análisis: Diferenciación de Pedidos - Locación vs Venta Directa

**Fecha:** 26/10/2025
**Módulo:** Ventas / Pedidos
**Archivo Principal:** `src/components/orders/PedidosContent.tsx`

---

## 1. ESTADO ACTUAL DE LA LÓGICA

### 1.1 Campo de Diferenciación Principal: `flow`

El sistema utiliza el campo **`flow`** en el esquema `OrderSellOut` para diferenciar entre tipos de pedidos:

```typescript
flow: z.enum(['PLACEMENT', 'DIRECT']).optional()
```

**Valores:**
- `PLACEMENT` = Pedidos de locación (placement en distribuidor)
- `DIRECT` = Venta directa

### 1.2 Implementación en la UI

#### Tabs de Filtrado
```typescript
const tabs = [
  { key: "todos", label: "Todos" },
  { key: "directa", label: "Venta Directa", filter: flow === "DIRECT" },
  { key: "placement", label: "Placement", filter: flow === "PLACEMENT" }
]
```

#### Lógica de Filtrado
```typescript
if (activeTab === "directa") {
  orders = orders.filter((o) => o.flow === "DIRECT");
} else if (activeTab === "placement") {
  orders = orders.filter((o) => o.flow === "PLACEMENT");
}
```

### 1.3 Campos Relacionados

**Para PLACEMENT (Locación):**
- `distributorPartyId`: ID del distribuidor (REQUERIDO para PLACEMENT)
- `isSellOutReported`: Indica si el sell-out ha sido reportado
- `channel`: Típicamente "DISTRIBUTOR"

**Para DIRECT (Venta Directa):**
- `channel`: Puede ser "PRIVATE", "ONLINE", "HORECA", "CATERING"
- `ownerId` / `ownerName`: Responsable comercial

---

## 2. VALIDACIONES ACTUALES (SSOT V2.1)

### 2.1 Reglas de Negocio en Schemas

```typescript
// Validación: PLACEMENT requiere distributorPartyId
.refine(
  order => order.flow !== 'PLACEMENT' || order.distributorPartyId,
  'PLACEMENT flow requires distributorPartyId'
)
```

### 2.2 Reglas de Negocio en OrderSellOutRules

```typescript
distributorFlowConsistent: (order) => {
  if (order.flow === 'PLACEMENT') {
    if (!order.distributorPartyId) {
      return 'PLACEMENT flow requires distributorPartyId';
    }
    if (order.channel !== 'DISTRIBUTOR') {
      return 'PLACEMENT flow should use DISTRIBUTOR channel';
    }
  }
  
  if (order.channel === 'DISTRIBUTOR' && order.flow !== 'PLACEMENT') {
    return 'DISTRIBUTOR channel should use PLACEMENT flow';
  }
  
  return null;
}
```

---

## 3. PROBLEMAS IDENTIFICADOS

### 3.1 Visualización Insuficiente

❌ **Problema:** No hay indicador visual claro en la tabla que diferencie PLACEMENT vs DIRECT
- La columna "Canal" muestra el channel (DISTRIBUTOR, PRIVATE, etc.)
- Pero no hay un badge o indicador específico para el `flow`

### 3.2 Datos Opcionales

❌ **Problema:** El campo `flow` es opcional
```typescript
flow: z.enum(['PLACEMENT', 'DIRECT']).optional()
```

**Impacto:**
- Pedidos antiguos pueden no tener `flow` definido
- Los filtros pueden no funcionar correctamente para pedidos legacy
- Ambigüedad en la clasificación

### 3.3 Falta de Indicadores Visuales

❌ **Problema:** No hay diferenciación visual clara en:
- Filas de la tabla (color, icono, badge)
- KPIs separados por tipo de flow
- Resúmenes específicos

### 3.4 Información Incompleta en Tabs

⚠️ **Problema Menor:** Los tabs muestran el conteo pero no información adicional como:
- Facturación por tipo
- Distribuidores activos (para PLACEMENT)
- Comerciales activos (para DIRECT)

---

## 4. RECOMENDACIONES DE MEJORA

### 4.1 ALTA PRIORIDAD

#### A. Agregar Badge de Flow en la Tabla

**Ubicación:** Nueva columna o badge adicional en columna existente

```typescript
export function FlowBadge({ flow }: { flow?: 'PLACEMENT' | 'DIRECT' }) {
  if (!flow) return <span className="sb-chip sb-chip--default">Sin definir</span>;
  
  const flowConfig = {
    PLACEMENT: { 
      label: 'Locación', 
      className: 'sb-chip--purple',
      icon: '📍'
    },
    DIRECT: { 
      label: 'Venta Directa', 
      className: 'sb-chip--blue',
      icon: '🎯'
    }
  };
  
  const config = flowConfig[flow];
  return (
    <span className={`sb-chip ${config.className}`}>
      <span className="sb-chip__icon">{config.icon}</span>
      {config.label}
    </span>
  );
}
```

#### B. Hacer `flow` Obligatorio con Migración

**Paso 1:** Crear script de migración para pedidos legacy
```typescript
// scripts/migrate-orders-flow.ts
// Inferir flow basado en:
// - Si tiene distributorPartyId → PLACEMENT
// - Si channel === 'DISTRIBUTOR' → PLACEMENT
// - Resto → DIRECT
```

**Paso 2:** Actualizar schema
```typescript
flow: z.enum(['PLACEMENT', 'DIRECT']) // Quitar .optional()
```

#### C. Mejorar Visualización en Tabla

**Opción 1:** Agregar columna "Tipo"
```typescript
<th className="pb-2 font-medium">Tipo</th>
...
<td className="py-3">
  <FlowBadge flow={order.flow} />
</td>
```

**Opción 2:** Combinar con columna Canal
```typescript
<td className="py-3">
  <div className="flex gap-2">
    <FlowBadge flow={order.flow} />
    <ChannelChip channel={order.channel} />
  </div>
</td>
```

### 4.2 PRIORIDAD MEDIA

#### D. KPIs Separados por Flow

```typescript
const kpisByFlow = useMemo(() => {
  const placement = orders.filter(o => o.flow === 'PLACEMENT');
  const direct = orders.filter(o => o.flow === 'DIRECT');
  
  return {
    placement: {
      count: placement.length,
      revenue: placement.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      distributors: new Set(placement.map(o => o.distributorPartyId)).size
    },
    direct: {
      count: direct.length,
      revenue: direct.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      owners: new Set(direct.map(o => o.ownerId)).size
    }
  };
}, [orders]);
```

#### E. Información Adicional en Tabs

```typescript
<button className="...">
  <Package size={16} />
  Placement
  <span className="sb-kpi-badge">{placementCount}</span>
  <span className="text-xs text-muted-foreground">
    {formatCurrency(placementRevenue)}
  </span>
</button>
```

#### F. Filtros Avanzados por Distribuidor

Para pedidos PLACEMENT, agregar filtro por distribuidor:

```typescript
{activeTab === 'placement' && (
  <select className="..." onChange={(e) => setDistributorFilter(e.target.value)}>
    <option value="all">Todos los distribuidores</option>
    {distributors.map(d => (
      <option key={d.id} value={d.id}>{d.name}</option>
    ))}
  </select>
)}
```

### 4.3 PRIORIDAD BAJA

#### G. Indicadores Visuales en Filas

Agregar clase CSS condicional para diferenciar visualmente:

```typescript
<tr className={`hover:bg-secondary/30 cursor-pointer ${
  order.flow === 'PLACEMENT' ? 'border-l-4 border-l-purple-500' : 
  order.flow === 'DIRECT' ? 'border-l-4 border-l-blue-500' : ''
}`}>
```

#### H. Tooltips Informativos

```typescript
<FlowBadge 
  flow={order.flow} 
  tooltip={
    order.flow === 'PLACEMENT' 
      ? `Distribuidor: ${order.distributorName}` 
      : `Comercial: ${order.ownerName}`
  }
/>
```

---

## 5. PLAN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Mejoras Visuales Inmediatas (1-2 horas)
1. ✅ Crear componente `FlowBadge`
2. ✅ Agregar badge en tabla de pedidos
3. ✅ Actualizar estilos CSS

### Fase 2: Migración de Datos (2-3 horas)
1. ✅ Crear script de migración `migrate-orders-flow.ts`
2. ✅ Ejecutar en staging
3. ✅ Validar resultados
4. ✅ Ejecutar en producción
5. ✅ Hacer `flow` obligatorio en schema

### Fase 3: KPIs y Filtros Avanzados (3-4 horas)
1. ✅ Implementar KPIs separados por flow
2. ✅ Agregar información en tabs
3. ✅ Implementar filtro por distribuidor

### Fase 4: Refinamiento UX (2-3 horas)
1. ✅ Indicadores visuales en filas
2. ✅ Tooltips informativos
3. ✅ Testing y ajustes finales

**Tiempo Total Estimado:** 8-12 horas

---

## 6. CÓDIGO DE EJEMPLO COMPLETO

### 6.1 Nuevo Componente FlowBadge

```typescript
// src/components/ui/OrderBadges.tsx

export function FlowBadge({ 
  flow,
  showLabel = true,
  size = 'md'
}: { 
  flow?: 'PLACEMENT' | 'DIRECT';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!flow) {
    return (
      <span className="sb-chip sb-chip--default sb-chip--sm">
        <span className="sb-chip__icon">❓</span>
        {showLabel && 'Sin definir'}
      </span>
    );
  }
  
  const flowConfig = {
    PLACEMENT: { 
      label: 'Locación', 
      shortLabel: 'LOC',
      className: 'sb-chip--purple',
      icon: '📍',
      description: 'Pedido de locación en distribuidor'
    },
    DIRECT: { 
      label: 'Venta Directa', 
      shortLabel: 'DIR',
      className: 'sb-chip--blue',
      icon: '🎯',
      description: 'Venta directa al cliente final'
    }
  };
  
  const config = flowConfig[flow];
  const sizeClass = `sb-chip--${size}`;
  
  return (
    <span 
      className={`sb-chip ${config.className} ${sizeClass}`}
      title={config.description}
    >
      <span className="sb-chip__icon">{config.icon}</span>
      {showLabel && (size === 'sm' ? config.shortLabel : config.label)}
    </span>
  );
}
```

### 6.2 Actualización de PedidosContent.tsx

```typescript
// Agregar en la tabla, después de la columna "Pedido"
<th className="pb-2 font-medium">Tipo</th>

// En el tbody
<td className="py-3">
  <FlowBadge flow={order.flow} size="sm" />
</td>
```

### 6.3 Script de Migración

```typescript
// scripts/migrate-orders-flow.ts
import { db } from '@/server/firebase';
import { OrderSellOut } from '@/domain/ssot';

async function migrateOrdersFlow() {
  const ordersRef = db.collection('ordersSellOut');
  const snapshot = await ordersRef.where('flow', '==', null).get();
  
  console.log(`Found ${snapshot.size} orders without flow`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const order = doc.data() as OrderSellOut;
    
    // Inferir flow
    let flow: 'PLACEMENT' | 'DIRECT';
    
    if (order.distributorPartyId || order.channel === 'DISTRIBUTOR') {
      flow = 'PLACEMENT';
    } else {
      flow = 'DIRECT';
    }
    
    batch.update(doc.ref, { flow });
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} orders...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migration complete: ${count} orders updated`);
}

migrateOrdersFlow().catch(console.error);
```

---

## 7. VALIDACIÓN Y TESTING

### 7.1 Casos de Prueba

1. **Pedido PLACEMENT con distributorPartyId**
   - ✅ Debe mostrar badge "Locación"
   - ✅ Debe aparecer en tab "Placement"
   - ✅ Debe tener channel "DISTRIBUTOR"

2. **Pedido DIRECT sin distributorPartyId**
   - ✅ Debe mostrar badge "Venta Directa"
   - ✅ Debe aparecer en tab "Venta Directa"
   - ✅ Puede tener cualquier channel excepto DISTRIBUTOR

3. **Pedido legacy sin flow**
   - ✅ Debe mostrar badge "Sin definir"
   - ✅ Debe aparecer solo en tab "Todos"
   - ⚠️ Debe ser migrado

### 7.2 Queries de Validación

```typescript
// Contar pedidos sin flow
const ordersWithoutFlow = await db.collection('ordersSellOut')
  .where('flow', '==', null)
  .count()
  .get();

// Validar consistencia PLACEMENT
const invalidPlacement = await db.collection('ordersSellOut')
  .where('flow', '==', 'PLACEMENT')
  .where('distributorPartyId', '==', null)
  .get();

// Validar consistencia DISTRIBUTOR channel
const invalidDistributor = await db.collection('ordersSellOut')
  .where('channel', '==', 'DISTRIBUTOR')
  .where('flow', '!=', 'PLACEMENT')
  .get();
```

---

## 8. CONCLUSIONES

### Estado Actual
- ✅ La lógica de diferenciación existe y funciona
- ✅ Los filtros por tabs funcionan correctamente
- ⚠️ Falta visualización clara en la tabla
- ⚠️ Campo `flow` es opcional (datos legacy)

### Mejoras Críticas
1. **Agregar FlowBadge** en la tabla de pedidos
2. **Migrar datos legacy** para hacer `flow` obligatorio
3. **Mejorar KPIs** con información separada por tipo

### Impacto Esperado
- 📈 Mayor claridad visual para usuarios
- 🎯 Mejor toma de decisiones con KPIs separados
- 🔒 Datos más consistentes y confiables
- ⚡ Filtrado más preciso y rápido

---

**Próximos Pasos Recomendados:**
1. Revisar y aprobar este análisis
2. Implementar Fase 1 (mejoras visuales)
3. Ejecutar migración de datos
4. Implementar fases 3 y 4 según prioridad
