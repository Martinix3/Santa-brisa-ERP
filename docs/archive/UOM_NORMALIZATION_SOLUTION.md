# Solución de Normalización UOM - Mantenimiento del SSOT

## Problema Identificado

Se detectó una **violación del SSOT (Single Source of Truth)** en el manejo de unidades de medida (UOM):

- **BOM (Bill of Materials)**: Usaba correctamente `uom: 'unit'` según el tipo `SalesUnit` del SSOT
- **ProductionOrder**: Usaba incorrectamente `baseUnit: 'uds'` que **NO** está definido en el tipo `Uom`
- **Datos en Firestore**: Contenían 'uds' en lugar de 'unit'

### Inconsistencia Detectada

```typescript
// ❌ ANTES - Violación del SSOT
BOM: { baseUnit: "L", items: [{ uom: "unit", qty: 0.5 }] }
ProductionOrder: { baseUnit: "uds", nominal: [{ uom: "uds", qty: 50 }] }
```

## Solución Implementada

### 1. Función de Normalización UOM (`src/domain/uom.ts`)

Se crearon funciones centralizadas para normalizar UOMs según los aliases definidos en SSOT:

```typescript
import { UOM_ALIASES } from "@/domain/ssot";

/**
 * Normaliza una UOM string a su valor canónico según SSOT.
 * Aplica los aliases definidos en UOM_ALIASES (e.g., 'uds' -> 'unit').
 */
export function normalizeUom(uom: string): Uom {
  const normalized = UOM_ALIASES[uom.toLowerCase()];
  return (normalized || uom) as Uom;
}

/**
 * Normaliza un objeto que contiene una propiedad 'uom'.
 */
export function normalizeUomInObject<T extends { uom: string }>(obj: T): T & { uom: Uom } {
  return {
    ...obj,
    uom: normalizeUom(obj.uom)
  };
}
```

### 2. Normalización en Production Actions (`src/server/actions/production.actions.ts`)

Se aplicó normalización en todos los puntos críticos:

#### a) `previewPlanning`
```typescript
// ✅ SSOT COMPLIANCE: Normalizar 'uds' -> 'unit'
const baseUnit: Uom = normalizeUom(stage === 'PRODUCCION' ? 'L' : 'uds');

const nominal = (bom.items || []).map((it: any) => ({
  itemId: it.itemId,
  role: (it.role ?? 'FORMULA') as 'FORMULA'|'PACKAGING'|'COST_ONLY',
  uom: normalizeUom(it.uom ?? baseUnit),
  qty: Number(((it.qty ?? 0) * plannedQty).toFixed(6)),
}));
```

#### b) `completeProductionOrder`
```typescript
// ✅ SSOT COMPLIANCE: Normalizar UOMs en outputs y consumptions
const normalizedOutputs = finalOutputs.map(o => ({ ...o, uom: normalizeUom(o.uom) }));
const normalizedConsumptions = finalConsumptions.map(c => ({ ...c, uom: normalizeUom(c.uom) }));

// Guardar con UOMs normalizados
batch.update(orderRef, {
  finalOutputs: normalizedOutputs,
  finalConsumptions: normalizedConsumptions,
});
```

### 3. Normalización en Goods Receipt (`src/server/actions/goods-receipt.actions.ts`)

Se aplicó normalización en la recepción de mercancías:

```typescript
// Al crear items
uom: normalizeUom(uom)

// Al crear lotes
uom: normalizeUom(currentItem.uom)

// En onHand, stockMoves y traceEvents
uom: normalizeUom(currentItem.uom)
```

**Funcionalidades confirmadas:**
- ✅ Normalización de UOMs al crear items nuevos
- ✅ Generación automática de números de lote cuando el proveedor no los proporciona (via `autoLot: true`)
- ✅ Normalización en todos los documentos: lots, onHand, stockMoves, traceEvents

### 4. Actualización de Tipos

Se actualizó el tipo de retorno de `previewPlanning` para aceptar `Uom` en lugar de un literal restrictivo:

```typescript
// ✅ ANTES: baseUnit: 'L'|'uds'  (Restrictivo e incorrecto)
// ✅ AHORA: baseUnit: Uom         (Correcto según SSOT)
```

## Beneficios

1. **Consistencia del SSOT**: Todos los UOMs ahora siguen el estándar definido en `src/domain/ssot.ts`
2. **Compatibilidad hacia atrás**: Los aliases permiten que 'uds' se normalice automáticamente a 'unit'
3. **Prevención de futuros errores**: La normalización centralizada previene inconsistencias
4. **Type Safety mejorado**: Los tipos TypeScript ahora reflejan correctamente el SSOT
5. **Generación automática de lotes**: El sistema puede generar lotes cuando el proveedor no los proporciona

## Migración de Datos Existentes

Para normalizar los datos ya existentes en Firestore, ejecuta:

```bash
# Previsualización (sin cambios)
npx tsx scripts/migrate-normalize-uoms.ts --dry-run

# Aplicar cambios
npx tsx scripts/migrate-normalize-uoms.ts
```

Este script actualizará:
- `productionOrders`: `baseUnit`, `nominal[].uom`, `reservations[].uom`, `finalOutputs[].uom`, `finalConsumptions[].uom`
- `billOfMaterials`: `baseUnit`, `items[].uom`
- `lots`: `uom`
- `onHand`: `uom`
- `stockMoves`: `uom`

## Checklist de Verificación

- [x] Crear funciones de normalización en `src/domain/uom.ts`
- [x] Aplicar normalización en `previewPlanning`
- [x] Aplicar normalización en `completeProductionOrder`
- [x] Aplicar normalización en `planProduction`
- [x] Aplicar normalización en `createGoodsReceipt`
- [x] Aplicar normalización en `createItem`
- [x] Actualizar tipos de retorno
- [x] Confirmar generación automática de lotes
- [ ] Ejecutar script de migración de datos
- [ ] Verificar que no hay errores TypeScript
- [ ] Probar creación de nueva orden de producción
- [ ] Probar completación de orden existente
- [ ] Probar recepción de mercancías con lote automático

## Referencias

- **SSOT Definition**: `src/domain/ssot.ts`
- **UOM Normalization**: `src/domain/uom.ts`
- **Production Actions**: `src/server/actions/production.actions.ts`
- **Goods Receipt Actions**: `src/server/actions/goods-receipt.actions.ts`
- **UOM Aliases**: `UOM_ALIASES = { uds: 'unit' }`
