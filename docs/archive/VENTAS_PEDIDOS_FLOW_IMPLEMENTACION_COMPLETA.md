# Plan de Implementación: Lógica de Flow en Todos los Puntos de Entrada

**Fecha:** 26/10/2025
**Objetivo:** Asegurar que todos los puntos de entrada de pedidos apliquen correctamente la lógica de `flow` (PLACEMENT vs DIRECT)

---

## 1. PUNTOS DE ENTRADA IDENTIFICADOS

### ✅ Implementado Correctamente
1. **NewOrderDrawer** (`src/ui/drawers/drawers/NewOrderDrawer.tsx`)
   - ✅ Tiene selector de `flow` con valores DIRECT y PLACEMENT
   - ✅ Muestra campo de distribuidor cuando flow === 'PLACEMENT'
   - ✅ Aplica validaciones de negocio con `OrderSellOutRules`

### ❌ Requiere Implementación
2. **QuickOrderDrawer** (`src/ui/drawers/drawers/QuickOrderDrawer.tsx`)
   - ❌ No asigna `flow` al crear pedidos
   - ❌ No tiene lógica para detectar si es PLACEMENT o DIRECT

3. **QuickLog** (`src/features/quicklog/utils/process-quicklog.ts`)
   - ❌ No asigna `flow` al procesar pedidos
   - ❌ No detecta si el pedido es para distribuidor o venta directa

4. **Account Drawer** (creación de pedidos desde cuenta)
   - ❌ Necesita revisar si existe y aplicar lógica

5. **RegisterPOSDrawer** (`src/ui/drawers/drawers/RegisterPOSDrawer.tsx`)
   - ❌ Si crea pedidos, necesita asignar `flow`

6. **Shopify Integration** (importación de pedidos)
   - ❌ Pedidos de Shopify deben tener flow = 'DIRECT'

7. **Holded Integration** (sincronización de pedidos)
   - ❌ Necesita inferir `flow` basado en datos de Holded

---

## 2. LÓGICA DE INFERENCIA DE FLOW

### Reglas de Negocio

```typescript
/**
 * Infiere el flow de un pedido basado en sus características
 */
function inferOrderFlow(order: Partial<OrderSellOut>, account?: Account): 'PLACEMENT' | 'DIRECT' {
  // 1. Si tiene distributorPartyId → PLACEMENT
  if (order.distributorPartyId) {
    return 'PLACEMENT';
  }
  
  // 2. Si channel es DISTRIBUTOR → PLACEMENT
  if (order.channel === 'DISTRIBUTOR') {
    return 'PLACEMENT';
  }
  
  // 3. Si la cuenta es de tipo DISTRIBUIDOR → PLACEMENT
  if (account?.segment === 'DISTRIBUIDOR' || account?.type === 'DISTRIBUIDOR') {
    return 'PLACEMENT';
  }
  
  // 4. Por defecto → DIRECT
  return 'DIRECT';
}
```

### Matriz de Decisión

| Condición | Flow | Notas |
|-----------|------|-------|
| `distributorPartyId` presente | PLACEMENT | Siempre es placement |
| `channel === 'DISTRIBUTOR'` | PLACEMENT | Canal de distribuidor |
| `account.segment === 'DISTRIBUIDOR'` | PLACEMENT | Cuenta es distribuidor |
| `source === 'SHOPIFY'` | DIRECT | Shopify siempre es venta directa |
| `channel === 'ONLINE'` | DIRECT | Online siempre es venta directa |
| Resto de casos | DIRECT | Por defecto |

---

## 3. IMPLEMENTACIÓN POR COMPONENTE

### 3.1 QuickOrderDrawer

**Archivo:** `src/ui/drawers/drawers/QuickOrderDrawer.tsx`

**Cambios Necesarios:**

```typescript
// 1. Importar función de inferencia
import { inferOrderFlow } from '@/lib/order-helpers';

// 2. Al crear el pedido, inferir flow
const handleSave = async () => {
  const account = await getAccount(accountId);
  
  const orderToSave: Partial<OrderSellOut> = {
    accountId,
    lines,
    status: 'open',
    currency: 'EUR',
    source: 'MANUAL',
    // NUEVO: Inferir flow
    flow: inferOrderFlow({ accountId, channel }, account),
    // Si es PLACEMENT y la cuenta es distribuidor, asignar distributorPartyId
    distributorPartyId: account?.segment === 'DISTRIBUIDOR' ? account.partyId : undefined,
    channel: account?.segment === 'HORECA' ? 'HORECA' : 
             account?.segment === 'DISTRIBUIDOR' ? 'DISTRIBUTOR' : 'PRIVATE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await onSave(orderToSave);
};
```

**Estimación:** 30 minutos

---

### 3.2 QuickLog

**Archivo:** `src/features/quicklog/utils/process-quicklog.ts`

**Cambios Necesarios:**

```typescript
// En la función convertIntentToActions, al crear pedido:

case 'CREATE_ORDER':
  const lines = extractOrderLines(intent);
  
  // NUEVO: Detectar si es para distribuidor
  const isDistributor = detectDistributorMention(intent.originalInput);
  const flow = isDistributor ? 'PLACEMENT' : 'DIRECT';
  
  actions.push({
    type: 'PEDIDO',
    date: intent.dueDate || new Date().toISOString(),
    details: {
      lines,
      estimatedTotal: calculateEstimatedTotal(lines),
      notes: intent.description,
      // NUEVO: Incluir flow
      flow,
      // Si es PLACEMENT, intentar extraer nombre de distribuidor
      distributorName: isDistributor ? extractDistributorName(intent.originalInput) : undefined,
    },
  });
  break;

// Nueva función helper
function detectDistributorMention(text: string): boolean {
  const distributorKeywords = [
    'distribuidor',
    'placement',
    'locación',
    'colocación',
    'para distribuir',
  ];
  
  const textLower = text.toLowerCase();
  return distributorKeywords.some(keyword => textLower.includes(keyword));
}

function extractDistributorName(text: string): string | undefined {
  // Buscar patrones como "para [nombre]" o "distribuidor [nombre]"
  const patterns = [
    /(?:para|distribuidor)\s+([A-Z][a-zA-Z\s]+)/,
    /placement\s+(?:en|con)\s+([A-Z][a-zA-Z\s]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}
```

**Archivo:** `src/features/quicklog/components/QuickLogConfirmation.tsx`

**Cambios Necesarios:**

```typescript
// Mostrar badge de flow en el resumen
{action.type === 'PEDIDO' && (
  <div className="space-y-2">
    {/* NUEVO: Mostrar flow */}
    <div className="flex items-center gap-2">
      <FlowBadge flow={action.details.flow} size="sm" />
      {action.details.distributorName && (
        <span className="text-xs text-muted-foreground">
          Distribuidor: {action.details.distributorName}
        </span>
      )}
    </div>
    
    {/* Resto del contenido... */}
  </div>
)}
```

**Estimación:** 1 hora

---

### 3.3 Account Drawer

**Investigación Necesaria:**
1. Verificar si existe un drawer para crear pedidos desde la vista de cuenta
2. Si existe, aplicar la misma lógica que QuickOrderDrawer

**Estimación:** 30 minutos (si existe)

---

### 3.4 RegisterPOSDrawer

**Archivo:** `src/ui/drawers/drawers/RegisterPOSDrawer.tsx`

**Acción:** Revisar si este drawer crea pedidos. Si no, no requiere cambios.

**Estimación:** 15 minutos (revisión)

---

### 3.5 Shopify Integration

**Archivo:** `src/server/integrations/shopify/*` (buscar donde se crean pedidos)

**Cambios Necesarios:**

```typescript
// Al importar pedidos de Shopify
const orderFromShopify: Partial<OrderSellOut> = {
  // ... otros campos
  source: 'SHOPIFY',
  channel: 'ONLINE',
  flow: 'DIRECT', // NUEVO: Shopify siempre es venta directa
};
```

**Estimación:** 30 minutos

---

### 3.6 Holded Integration

**Archivo:** `src/server/integrations/holded/*` (buscar donde se sincronizan pedidos)

**Cambios Necesarios:**

```typescript
// Al sincronizar pedidos de Holded
const orderFromHolded: Partial<OrderSellOut> = {
  // ... otros campos
  source: 'HOLDED',
  // NUEVO: Inferir flow basado en datos de Holded
  flow: inferFlowFromHoldedData(holdedOrder),
};

function inferFlowFromHoldedData(holdedOrder: any): 'PLACEMENT' | 'DIRECT' {
  // Si Holded tiene campo que indica distribuidor
  if (holdedOrder.isDistributor || holdedOrder.customerType === 'DISTRIBUTOR') {
    return 'PLACEMENT';
  }
  
  // Por defecto DIRECT
  return 'DIRECT';
}
```

**Estimación:** 45 minutos

---

## 4. ARCHIVO HELPER COMPARTIDO

**Crear:** `src/lib/order-helpers.ts`

```typescript
// src/lib/order-helpers.ts
import type { OrderSellOut, Account } from '@/domain/ssot';

/**
 * Infiere el flow de un pedido basado en sus características
 */
export function inferOrderFlow(
  order: Partial<OrderSellOut>, 
  account?: Account | null
): 'PLACEMENT' | 'DIRECT' {
  // 1. Si tiene distributorPartyId → PLACEMENT
  if (order.distributorPartyId) {
    return 'PLACEMENT';
  }
  
  // 2. Si channel es DISTRIBUTOR → PLACEMENT
  if (order.channel === 'DISTRIBUTOR') {
    return 'PLACEMENT';
  }
  
  // 3. Si la cuenta es de tipo DISTRIBUIDOR → PLACEMENT
  if (account) {
    if (account.segment === 'DISTRIBUIDOR' || 
        (account as any).type === 'DISTRIBUIDOR') {
      return 'PLACEMENT';
    }
  }
  
  // 4. Si source es SHOPIFY → DIRECT (siempre)
  if (order.source === 'SHOPIFY') {
    return 'DIRECT';
  }
  
  // 5. Si channel es ONLINE → DIRECT (siempre)
  if (order.channel === 'ONLINE') {
    return 'DIRECT';
  }
  
  // 6. Por defecto → DIRECT
  return 'DIRECT';
}

/**
 * Valida que el flow sea consistente con otros campos del pedido
 */
export function validateFlowConsistency(order: Partial<OrderSellOut>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (order.flow === 'PLACEMENT') {
    if (!order.distributorPartyId) {
      errors.push('PLACEMENT flow requires distributorPartyId');
    }
    if (order.channel && order.channel !== 'DISTRIBUTOR') {
      errors.push('PLACEMENT flow should use DISTRIBUTOR channel');
    }
  }
  
  if (order.channel === 'DISTRIBUTOR' && order.flow !== 'PLACEMENT') {
    errors.push('DISTRIBUTOR channel requires PLACEMENT flow');
  }
  
  if (order.source === 'SHOPIFY' && order.flow !== 'DIRECT') {
    errors.push('Shopify orders must be DIRECT flow');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Auto-corrige el flow basado en otros campos
 */
export function autoCorrectFlow(order: Partial<OrderSellOut>): Partial<OrderSellOut> {
  const correctedOrder = { ...order };
  
  // Auto-corregir flow
  if (!correctedOrder.flow) {
    correctedOrder.flow = inferOrderFlow(correctedOrder);
  }
  
  // Auto-corregir channel si flow es PLACEMENT
  if (correctedOrder.flow === 'PLACEMENT' && correctedOrder.channel !== 'DISTRIBUTOR') {
    correctedOrder.channel = 'DISTRIBUTOR';
  }
  
  return correctedOrder;
}
```

**Estimación:** 30 minutos

---

## 5. ACTUALIZACIÓN DE SCHEMAS

**Archivo:** `src/domain/ssot-v2-plus-schemas.ts`

**Cambio:** Hacer `flow` obligatorio (después de migración de datos)

```typescript
// ANTES
flow: z.enum(['PLACEMENT', 'DIRECT']).optional()

// DESPUÉS (tras migración)
flow: z.enum(['PLACEMENT', 'DIRECT'])
```

---

## 6. SCRIPT DE MIGRACIÓN DE DATOS

**Crear:** `scripts/migrate-orders-flow-complete.ts`

```typescript
// scripts/migrate-orders-flow-complete.ts
import { db } from '@/server/firebase';
import { inferOrderFlow } from '@/lib/order-helpers';
import type { OrderSellOut, Account } from '@/domain/ssot';

async function migrateAllOrdersFlow() {
  console.log('🔄 Starting complete flow migration...');
  
  // 1. Obtener todos los pedidos sin flow
  const ordersRef = db.collection('ordersSellOut');
  const snapshot = await ordersRef.where('flow', '==', null).get();
  
  console.log(`📊 Found ${snapshot.size} orders without flow`);
  
  // 2. Obtener todas las cuentas para referencia
  const accountsSnapshot = await db.collection('accounts').get();
  const accountsMap = new Map<string, Account>();
  accountsSnapshot.docs.forEach(doc => {
    accountsMap.set(doc.id, doc.data() as Account);
  });
  
  // 3. Procesar en lotes
  const batch = db.batch();
  let count = 0;
  let placementCount = 0;
  let directCount = 0;
  
  for (const doc of snapshot.docs) {
    const order = doc.data() as OrderSellOut;
    const account = order.accountId ? accountsMap.get(order.accountId) : undefined;
    
    // Inferir flow
    const flow = inferOrderFlow(order, account);
    
    // Actualizar
    batch.update(doc.ref, { 
      flow,
      updatedAt: new Date().toISOString()
    });
    
    count++;
    if (flow === 'PLACEMENT') placementCount++;
    if (flow === 'DIRECT') directCount++;
    
    // Commit cada 500 documentos
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✅ Migrated ${count} orders...`);
    }
  }
  
  // Commit final
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log('\n📈 Migration Summary:');
  console.log(`   Total migrated: ${count}`);
  console.log(`   PLACEMENT: ${placementCount} (${((placementCount/count)*100).toFixed(1)}%)`);
  console.log(`   DIRECT: ${directCount} (${((directCount/count)*100).toFixed(1)}%)`);
  console.log('\n✅ Migration complete!');
}

migrateAllOrdersFlow().catch(console.error);
```

**Estimación:** 30 minutos

---

## 7. TESTING

### 7.1 Tests Unitarios

**Crear:** `tests/order-flow-inference.test.ts`

```typescript
import { inferOrderFlow, validateFlowConsistency } from '@/lib/order-helpers';

describe('Order Flow Inference', () => {
  it('should infer PLACEMENT when distributorPartyId is present', () => {
    const order = { distributorPartyId: 'DIST-001' };
    expect(inferOrderFlow(order)).toBe('PLACEMENT');
  });
  
  it('should infer PLACEMENT when channel is DISTRIBUTOR', () => {
    const order = { channel: 'DISTRIBUTOR' as const };
    expect(inferOrderFlow(order)).toBe('PLACEMENT');
  });
  
  it('should infer PLACEMENT when account is distributor', () => {
    const order = { accountId: 'ACC-001' };
    const account = { id: 'ACC-001', segment: 'DISTRIBUIDOR' } as any;
    expect(inferOrderFlow(order, account)).toBe('PLACEMENT');
  });
  
  it('should infer DIRECT for Shopify orders', () => {
    const order = { source: 'SHOPIFY' as const };
    expect(inferOrderFlow(order)).toBe('DIRECT');
  });
  
  it('should infer DIRECT for ONLINE channel', () => {
    const order = { channel: 'ONLINE' as const };
    expect(inferOrderFlow(order)).toBe('DIRECT');
  });
  
  it('should default to DIRECT', () => {
    const order = {};
    expect(inferOrderFlow(order)).toBe('DIRECT');
  });
});

describe('Flow Consistency Validation', () => {
  it('should validate PLACEMENT requires distributorPartyId', () => {
    const order = { flow: 'PLACEMENT' as const };
    const result = validateFlowConsistency(order);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('PLACEMENT flow requires distributorPartyId');
  });
  
  it('should validate DISTRIBUTOR channel requires PLACEMENT', () => {
    const order = { 
      flow: 'DIRECT' as const, 
      channel: 'DISTRIBUTOR' as const 
    };
    const result = validateFlowConsistency(order);
    expect(result.valid).toBe(false);
  });
});
```

**Estimación:** 1 hora

### 7.2 Tests de Integración

**Checklist Manual:**

- [ ] Crear pedido desde NewOrderDrawer con flow DIRECT
- [ ] Crear pedido desde NewOrderDrawer con flow PLACEMENT
- [ ] Crear pedido desde QuickOrderDrawer (debe inferir flow)
- [ ] Crear pedido desde QuickLog mencionando distribuidor
- [ ] Crear pedido desde QuickLog sin mencionar distribuidor
- [ ] Importar pedido de Shopify (debe ser DIRECT)
- [ ] Verificar que pedidos migrados tienen flow correcto
- [ ] Verificar visualización de FlowBadge en tabla de pedidos

**Estimación:** 2 horas

---

## 8. RESUMEN DE ESTIMACIONES

| Tarea | Tiempo Estimado |
|-------|----------------|
| QuickOrderDrawer | 30 min |
| QuickLog | 1 hora |
| Account Drawer (si existe) | 30 min |
| RegisterPOSDrawer (revisión) | 15 min |
| Shopify Integration | 30 min |
| Holded Integration | 45 min |
| Archivo Helper | 30 min |
| Script de Migración | 30 min |
| Tests Unitarios | 1 hora |
| Tests de Integración | 2 horas |
| **TOTAL** | **7-8 horas** |

---

## 9. PLAN DE EJECUCIÓN

### Fase 1: Preparación (1.5 horas)
1. ✅ Crear `src/lib/order-helpers.ts` con funciones de inferencia
2. ✅ Crear tests unitarios
3. ✅ Validar que tests pasan

### Fase 2: Implementación en Drawers (2 horas)
1. ✅ Actualizar QuickOrderDrawer
2. ✅ Actualizar QuickLog
3. ✅ Revisar Account Drawer
4. ✅ Revisar RegisterPOSDrawer

### Fase 3: Integraciones (1.5 horas)
1. ✅ Actualizar Shopify integration
2. ✅ Actualizar Holded integration

### Fase 4: Migración de Datos (1 hora)
1. ✅ Ejecutar script de migración en staging
2. ✅ Validar resultados
3. ✅ Ejecutar en producción

### Fase 5: Testing y Validación (2 horas)
1. ✅ Tests de integración manual
2. ✅ Validación en producción
3. ✅ Hacer `flow` obligatorio en schema

---

## 10. CRITERIOS DE ÉXITO

✅ **Completado cuando:**

1. Todos los puntos de entrada asignan `flow` correctamente
2. La función `inferOrderFlow` está probada y funciona
3. Todos los pedidos existentes tienen `flow` asignado
4. El campo `flow` es obligatorio en el schema
5. Los tests unitarios y de integración pasan
6. La visualización en la tabla mu
