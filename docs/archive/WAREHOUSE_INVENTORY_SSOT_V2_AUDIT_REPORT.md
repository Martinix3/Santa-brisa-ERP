# AUDITORÍA TÉCNICA: Warehouse/Inventory vs SSOT V2
## Informe de Arquitecto de Software

**Fecha:** 20/01/2025  
**Auditor:** Arquitecto de Software Senior  
**Alcance:** `src/app/(app)/warehouse/inventory` y `src/features/warehouse/inventory`  
**Especificaciones:** SSOT_V2_ESPECIFICACION_TECNICA_COMPLETA.md

---

## RESUMEN EJECUTIVO

**Severidad General:** 🔴 **CRÍTICA**

Se han identificado **23 desviaciones** entre la implementación y la especificación SSOT V2:
- **🔴 Críticas:** 8 (pueden causar pérdida de integridad referencial)
- **🟡 Medias:** 10 (afectan consistencia y mantenibilidad)
- **🟢 Bajas:** 5 (mejoras recomendadas)

**Recomendación Principal:** Requiere intervención inmediata para corregir el uso de claves foráneas no canónicas antes de desplegar a producción. El riesgo de datos huérfanos y referencias rotas es alto.

---

## HALLAZGOS CRÍTICOS (🔴)

### HC-001: Uso de `sku` como FK en lookup de items

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/LotDetailPanel.tsx:24
const item = items.find((i) => i.sku === lot.sku);
```

**Viola:** SSOT V2, Sección 0.1: "FK canónica: `itemId` en todas las colecciones"

**Riesgo:** 🔴 **CRÍTICO**
- Si un SKU cambia (escenario de renombrado), el lookup falla
- `sku` no es Primary Key en `items`, puede haber duplicados
- Pérdida de integridad referencial entre `lot` y `item`

**Corrección Recomendada:**
```typescript
const item = items.find((i) => i.id === lot.itemId);
```

---

### HC-002: Uso mixto de `sku` y `itemId` en filtros

**Evidencia:**
```typescript
// src/features/warehouse/inventory/components/SkuAccordionRow.tsx:27
const item = items.find((i) => i.sku === summary.sku || i.id === summary.itemId);

// src/features/warehouse/inventory/hooks/useInventoryData.ts:78
const sourceLots = onHand.filter(lot => lot.sku === summary.sku || lot.itemId === summary.itemId);
```

**Viola:** SSOT V2, Sección 0.1: "FK canónica: `itemId`"

**Riesgo:** 🔴 **CRÍTICO**
- Lógica contradictoria que sugiere modelo de datos inconsistente
- El fallback a `sku` indica que los datos no están normalizados
- Dificulta migraciones y puede ocultar bugs

**Impacto:** Si `summary.itemId` existe pero es incorrecto, el fallback a `sku` puede devolver el item equivocado

**Corrección Recomendada:**
```typescript
// Solo usar itemId canónico
const item = items.find((i) => i.id === summary.itemId);
const sourceLots = onHand.filter(lot => lot.itemId === summary.itemId);
```

---

### HC-003: Uso de `sku` en filtros de StockMoves

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/SkuAccordionRow.tsx:52
.filter(m => m.sku === summary.sku && m.reason === 'receipt' && m.unitCost)
```

**Viola:** SSOT V2, Sección 0.1: "FK canónica: `itemId`"

**Riesgo:** 🔴 **CRÍTICO**
- `StockMove` debería tener `itemId`, no `sku`
- Filtro puede fallar si la estructura de datos cambia
- Indica que la colección `stockMoves` no está migrada

**Corrección Recomendada:**
```typescript
.filter(m => m.itemId === summary.itemId && m.reason === 'receipt' && m.unitCost)
```

---

### HC-004: Uso de `lotNumber` en lugar de `lotCode` canónico

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/SkuAccordionRow.tsx:99-100
key={`${lot.id}-${lot.lotNumber}`}
onClick={() => onLotSelect(lot.lotNumber)}

// src/app/(app)/warehouse/inventory/components/SkuAccordionRow.tsx:104-105
{lot.friendlyLotCode || lot.lotNumber}
<span className="block text-[10px] text-muted-foreground">{lot.lotNumber}</span>
```

**Viola:** SSOT V2, Sección 0.1: "Lote canónico: `lotCode` (YYJJJ-PL[-LN]-SEQ)"

**Riesgo:** 🔴 **CRÍTICO**
- `lotNumber` es campo legacy, puede no existir en nuevos lotes
- El formato no es el canónico `YYJJJ-PL-SEQ`
- Selección de lotes puede fallar si solo existe `lotCode`

**Corrección Recomendada:**
```typescript
key={`${lot.id}-${lot.lotCode}`}
onClick={() => onLotSelect(lot.lotCode)}

{lot.lotCode}
<span className="block text-[10px] text-muted-foreground">{lot.lotCode}</span>
```

---

### HC-005: Búsqueda dual `lotCode || lotNumber` en lookup

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/InventoryClient.tsx:124
return moveAny.lotCode === selectedLotNumber || moveAny.lotNumber === selectedLotNumber;

// src/app/(app)/warehouse/inventory/InventoryClient.tsx:127
const lotMaster = lots.find(l => l.lotCode === selectedLotNumber || l.lotNumber === selectedLotNumber);
```

**Viola:** SSOT V2, Sección 2.2: "Generación race-free de `lotCode`"

**Riesgo:** 🔴 **CRÍTICO**
- El fallback a `lotNumber` indica datos no migrados
- Puede devolver el lote incorrecto si ambos campos existen con valores distintos
- Complejidad innecesaria en la lógica

**Corrección Recomendada:**
```typescript
return moveAny.lotCode === selectedLotCode;
const lotMaster = lots.find(l => l.lotCode === selectedLotCode);
```

---

### HC-006: Uso de campos obsoletos `warehouseId` y `toWarehouseId`

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/LotDetailPanel.tsx:80-83
{(move.fromLocationId || move.warehouseId || move.toLocationId || move.toWarehouseId) &&
    <p className="text-zinc-500">
        {move.fromLocationId || move.warehouseId || 'Origen'} → {move.toLocationId || move.toWarehouseId || 'Destino'}
    </p>
}
```

**Viola:** SSOT V2, Sección 0.1: "Ubicaciones: `locations` + `fromLocationId`/`toLocationId` siempre"

**Riesgo:** 🔴 **CRÍTICO**
- `warehouseId` y `toWarehouseId` son campos obsoletos (Sección 5 de SSOT V2)
- El fallback indica que `StockMove` no está completamente migrado
- Inconsistencia en el modelo de datos

**Corrección Recomendada:**
```typescript
{(move.fromLocationId || move.toLocationId) &&
    <p className="text-zinc-500">
        {move.fromLocationId || 'Origen'} → {move.toLocationId || 'Destino'}
    </p>
}
```

---

### HC-007: Uso de campo obsoleto `move.date`

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/LotDetailPanel.tsx:59
const dateValue = moveAny.occurredAt || moveAny.createdAt || move.date;
```

**Viola:** SSOT V2, Sección 4.1: Campo `date` deprecado, usar `occurredAt`

**Riesgo:** 🔴 **CRÍTICO**
- `move.date` es campo legacy (migración planificada en Sección 5.4.2)
- El triple fallback indica datos inconsistentes
- Confusión sobre cuál es el timestamp correcto

**Corrección Recomendada:**
```typescript
const dateValue = moveAny.occurredAt || moveAny.createdAt;
```

---

### HC-008: Interface con campo legacy `lotNumber`

**Evidencia:**
```typescript
// src/features/warehouse/inventory/hooks/useInventoryData.ts:22
export interface LotRow {
  lotNumber: string;
  // ...
}

// src/app/(app)/warehouse/inventory/components/LotRows.tsx:9
interface Lot {
  lotNumber: string;
  // ...
}
```

**Viola:** SSOT V2, Sección 0.1: "Lote canónico: `lotCode`"

**Riesgo:** 🔴 **CRÍTICO**
- Las interfaces TypeScript no reflejan el modelo canónico
- Propaga el uso de campos obsoletos en todo el código
- Dificulta la migración y puede causar type errors

**Corrección Recomendada:**
```typescript
export interface LotRow {
  lotCode: string;  // Campo canónico
  // ...
}
```

---

## HALLAZGOS MEDIOS (🟡)

### HM-001: Callback con `lotNumber` en lugar de `lotCode`

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/SkuAccordionRow.tsx:40
onLotSelect: (lotNumber: string) => void;

// src/app/(app)/warehouse/inventory/components/LotRows.tsx:29
onLotSelect: (lotNumber: string) => void;
```

**Viola:** SSOT V2, Sección 0.1

**Riesgo:** 🟡 **MEDIO**
- La firma de la función usa terminología obsoleta
- Dificulta refactoring futuro

**Corrección Recomendada:**
```typescript
onLotSelect: (lotCode: string) => void;
```

---

### HM-002: Variable `selectedLotNumber` debería ser `selectedLotCode`

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/InventoryClient.tsx:120
const lot = lotRows.find(l => l.lotNumber === selectedLotNumber);
```

**Viola:** Principios de Clean Code + SSOT V2

**Riesgo:** 🟡 **MEDIO**
- Naming inconsistente con modelo canónico
- Confunde a desarrolladores sobre qué campo usar

**Corrección Recomendada:**
```typescript
const lot = lotRows.find(l => l.lotCode === selectedLotCode);
```

---

### HM-003: Fallback complejo con múltiples campos de lote

**Evidencia:**
```typescript
// src/features/warehouse/inventory/components/SkuAccordionRow.tsx:60
const lotCode = lot.lotCode || lot.lotNumber || lot.friendlyLotCode || 'SIN-LOTE';
```

**Viola:** Principio de Single Source of Truth

**Riesgo:** 🟡 **MEDIO**
- Indica que los datos tienen múltiples representaciones del mismo concepto
- El orden de fallback es arbitrario
- `friendlyLotCode` no está definido en la especificación

**Corrección Recomendada:**
```typescript
const lotCode = lot.lotCode || 'SIN-LOTE';
```

---

### HM-004: Búsqueda en objeto legacy `lotNumbers`

**Evidencia:**
```typescript
// src/features/warehouse/inventory/hooks/useInventoryFilters.ts:120-122
if (r.lotNumbers) {
  const lotMatches = Object.keys(r.lotNumbers).some(ln =>
    ln.toLowerCase().includes(searchLower)
  );
}
```

**Viola:** SSOT V2, Sección 1.1: `OnHand` usa `lotCode`, no objeto `lotNumbers`

**Riesgo:** 🟡 **MEDIO**
- `lotNumbers` es estructura legacy (objeto con keys)
- SSOT V2 define `lotCode` como string único
- Búsqueda puede no funcionar con datos migrados

**Corrección Recomendada:**
```typescript
if (r.lotCode) {
  const lotMatches = r.lotCode.toLowerCase().includes(searchLower);
}
```

---

### HM-005: Extracción de `lotCode` de objeto `lotNumbers`

**Evidencia:**
```typescript
// src/features/warehouse/inventory/hooks/useInventoryData.ts:83
const lotCode = lot.lotCode || Object.keys(lot.lotNumbers ?? {})[0] || `${summary.sku}-SIN-LOTE`;
```

**Viola:** SSOT V2, Sección 1.1

**Riesgo:** 🟡 **MEDIO**
- Asume que el primer key de `lotNumbers` es el `lotCode` correcto
- Lógica frágil que puede fallar con datos reales
- Uso de `sku` en el fallback (debería ser `itemId`)

**Corrección Recomendada:**
```typescript
const lotCode = lot.lotCode || 'SIN-LOTE';
```

---

### HM-006: Comentario de código indica campo legacy

**Evidencia:**
```typescript
// src/features/warehouse/inventory/hooks/useInventoryData.ts:82
// Usar lotCode canónico (SSOT v2) o fallback a lotNumbers legacy
```

**Viola:** Principios de Clean Code

**Riesgo:** 🟡 **MEDIO**
- El comentario admite que hay código legacy en producción
- Indica que la migración no está completa
- Puede confundir sobre qué enfoque es el correcto

**Corrección Recomendada:** Eliminar fallback y comentario

---

### HM-007: Asignación confusa `lotNumber: lotCode`

**Evidencia:**
```typescript
// src/features/warehouse/inventory/hooks/useInventoryData.ts:90
lotNumber: lotCode, // Usar lotCode como lotNumber para compatibilidad
```

**Viola:** Principio de Least Surprise

**Riesgo:** 🟡 **MEDIO**
- Asigna `lotCode` a campo `lotNumber` por "compatibilidad"
- Propaga el uso de naming incorrecto
- El comentario admite que es un workaround

**Corrección Recomendada:** Cambiar interface a usar `lotCode`

---

### HM-008: Campo `sku` en key de React

**Evidencia:**
```typescript
// src/features/warehouse/inventory/components/SkuAccordionRow.tsx:78
return prevProps.sku.sku === nextProps.sku.sku &&
```

**Viola:** Best Practices React + SSOT V2

**Riesgo:** 🟡 **MEDIO**
- Usa `sku.sku` para comparación en React.memo
- Debería usar `itemId` estable como key

**Corrección Recomendada:**
```typescript
return prevProps.item.id === nextProps.item.id &&
```

---

### HM-009: Múltiples fallbacks para campos de fecha

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/LotDetailPanel.tsx:59
const dateValue = moveAny.occurredAt || moveAny.createdAt || move.date;
```

**Viola:** Principio de Least Astonishment

**Riesgo:** 🟡 **MEDIO**
- Triple fallback indica modelo inconsistente
- No está claro cuál es el timestamp "correcto"
- `move.date` es campo legacy

**Corrección Recomendada:**
```typescript
const dateValue = moveAny.occurredAt || moveAny.createdAt;
```

---

### HM-010: Uso de campos obsoletos en ItemDetailDrawer

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/ItemDetailDrawer.tsx:64-65
setIsActive(item.isActive ?? item.active ?? true);
setCostUnit(item.costUnit || item.stdCost || 0);

// Línea 72
unitsPerCase: item.unitsPerCase || item.caseUnits || 0,
```

**Viola:** SSOT V2, Sección 5 (Migración de campos legacy)

**Riesgo:** 🟡 **MEDIO**
- `item.active` es campo obsoleto (migrado a `item.isActive`)
- `item.caseUnits` es campo obsoleto (migrado a `item.unitsPerCase`)  
- Fallbacks indican migración incompleta

**Corrección Recomendada:**
```typescript
setIsActive(item.isActive ?? true);
setCostUnit(item.costUnit || 0);
unitsPerCase: item.unitsPerCase || 0,
```

---

## HALLAZGOS BAJOS (🟢)

### HB-001: Campo calculado marcado como editable

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/PricingModal.tsx:88-95
<Input
  type="number"
  value={costUnit}
  onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
  className="pr-8 bg-gray-50"
  disabled  // ← Campo deshabilitado pero con onChange
/>
<p className="text-xs text-orange-600 mt-1">
  ⚙️ Calculado automáticamente desde BOM
</p>
```

**Viola:** Principios de UX - Campos calculados no deberían tener onChange

**Riesgo:** 🟢 **BAJO**
- Confusión en el código: tiene onChange pero está disabled
- El mensaje dice "calculado automáticamente" pero permite edición en ItemDetailDrawer

**Impacto:** Inconsistencia UI entre PricingModal (disabled) vs ItemDetailDrawer (editable)

**Corrección Recomendada:** Decidir si es calculado o manual consistentemente

---

### HB-002: Uso de `any` type en PricingModal

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/PricingModal.tsx:11
item: any; // Using any to avoid type issues with priceBase, priceList, costUnit
```

**Viola:** Best Practices TypeScript

**Riesgo:** 🟢 **BAJO**
- Pérdida de type safety
- El comentario admite que es un workaround

**Corrección Recomendada:**
```typescript
item: Item & { priceBase?: number; priceList?: Record<string, number> }
```

---

### HB-003: Acceso a campo no tipado con `as any`

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/ItemDetailDrawer.tsx:63-64
setEanCode((item as any).eanCode || (item as any).barcode || '');
setPackagingType((item as any).packagingType || 'bottle');
```

**Viola:** Best Practices TypeScript

**Riesgo:** 🟢 **BAJO**
- Campos no están en la interface `Item`
- Uso de type casting indica modelo incompleto

**Corrección Recomendada:** Añadir campos a interface `Item`

---

### HB-004: Duplicación de lógica de márgenes

**Evidencia:**
- ItemDetailDrawer.tsx:97-101 (función `calculateMargin`)
- PricingModal.tsx:59-63 (función `calculateMargin`)

**Viola:** DRY (Don't Repeat Yourself)

**Riesgo:** 🟢 **BAJO**
- Lógica idéntica en dos lugares
- Si cambia fórmula, hay que cambiarla en ambos

**Corrección Recomendada:** Extraer a utility function compartido

---

### HB-005: Inconsistencia en formato de timestamps

**Evidencia:**
```typescript
// src/app/(app)/warehouse/inventory/components/ItemDetailDrawer.tsx:367-371
{new Date(receipt.occurredAt).toLocaleDateString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})}
```

vs

```typescript
// src/app/(app)/warehouse/inventory/components/LotDetailPanel.tsx:67
dateString = dateObj.toLocaleDateString('es-ES');
```

**Viola:** Principio de consistencia

**Riesgo:** 🟢 **BAJO**
- Diferentes formatos de fecha en la misma app
- Dificulta experiencia de usuario consistente

**Corrección Recomendada:** Usar función centralizada para formatear fechas

---

## COMPONENTES DUPLICADOS (🔴 CRÍTICO)

### CD-001: ItemDetailDrawer vs PricingModal

**Evidencia:**
- `src/app/(app)/warehouse/inventory/components/ItemDetailDrawer.tsx` (476 líneas)
- `src/app/(app)/warehouse/inventory/components/PricingModal.tsx` (362 líneas)

**Viola:** Principio fundamental de SSOT - Single Source of Truth

**Funcionalidad Duplicada:**

| Funcionalidad | ItemDetailDrawer | PricingModal | Idéntico |
|--------------|------------------|--------------|----------|
| Editar precio base | ✅ | ✅ | ✅ |
| Editar precio por segmento | ✅ | ✅ | ✅ |
| Editar costo unitario | ✅ | ✅ (disabled) | ⚠️ |
| Calcular márgenes | ✅ | ✅ | ✅ |
| Toggle isActive | ✅ | ✅ | ✅ |
| Datos logísticos (unitsPerCase, etc) | ✅ | ✅ | ✅ |
| Llamar a updateItemPricing | ✅ | ✅ | ✅ |

**Diferencias Menores:**
- ItemDetailDrawer: Usa BaseDrawer, muestra historial de recepciones, campos EAN/packaging
- PricingModal: Usa modal custom, costUnit disabled, sin historial

**Riesgo:** 🔴 **CRÍTICO**
- Violación grave de DRY y SSOT
- Mantenimiento doble: cambios deben replicarse en ambos
- Comportamiento inconsistente (ej: costUnit editable vs disabled)
- Confusión sobre cuál componente usar

**Recomendación Principal:**
**Consolidar en UN solo componente** que acepte props para customización:

```typescript
interface ItemPricingDrawerProps {
  item: Item;
  mode: 'full' | 'pricing-only';
  showHistory?: boolean;
  allowCostEdit?: boolean;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

O **eliminar PricingModal** y usar solo ItemDetailDrawer en toda la app.

---

## MATRIZ DE IMPACTO

| ID | Hallazgo | Severidad | Archivos Afectados | Esfuerzo | Prioridad |
|----|----------|-----------|-------------------|----------|-----------|
| HC-001 | sku como FK en lookup | 🔴 CRÍTICA | 1 | Bajo | P0 |
| HC-002 | sku/itemId mixto en filtros | 🔴 CRÍTICA | 2 | Medio | P0 |
| HC-003 | sku en filtros StockMoves | 🔴 CRÍTICA | 1 | Bajo | P0 |
| HC-004 | lotNumber vs lotCode | 🔴 CRÍTICA | 2 | Medio | P0 |
| HC-005 | Búsqueda dual lotCode/lotNumber | 🔴 CRÍTICA | 1 | Bajo | P0 |
| HC-006 | Campos obsoletos warehouseId | 🔴 CRÍTICA | 1 | Bajo | P0 |
| HC-007 | Campo obsoleto move.date | 🔴 CRÍTICA | 1 | Bajo | P0 |
| HC-008 | Interface con lotNumber | 🔴 CRÍTICA | 3 | Medio | P0 |
| CD-001 | Componentes duplicados | 🔴 CRÍTICA | 2 | Alto | P1 |
| HM-001 a HM-010 | Naming y fallbacks | 🟡 MEDIA | 8 | Medio | P2 |
| HB-001 a HB-005 | Mejoras código | 🟢 BAJA | 5 | Bajo | P3 |

**Totales:**
- **Hallazgos Críticos:** 9 (8 HC + 1 CD)
- **Hallazgos Medios:** 10
- **Hallazgos Bajos:** 5
- **TOTAL:** 24 desviaciones

---

## PLAN DE CORRECCIÓN PRIORIZADO

### 🚨 FASE 0: BLOQUEO DE PRODUCCIÓN (Inmediato)

**NO DESPLEGAR** el módulo inventory hasta completar Fase 1.

**Riesgo:** Pérdida de integridad referencial, referencias rotas, datos huérfanos.

---

### 🔥 FASE 1: CORRECCIONES CRÍTICAS (1-2 días)

**Objetivo:** Eliminar uso de FKs no canónicas

#### 1.1 Migrar sku → itemId en lookups (2 horas)

**Archivos:**
- LotDetailPanel.tsx:24
- SkuAccordionRow.tsx:27, :52
- useInventoryData.ts:78

**Script de migración automatizada:**
```bash
# Usar codemod para reemplazar patrones
npx jscodeshift -t scripts/codemods/sku-to-itemId.ts src/app/(app)/warehouse/inventory
```

#### 1.2 Migrar lotNumber → lotCode (2 horas)

**Archivos:**
- Todos los archivos en lista HC-004, HC-005, HC-008

**Pasos:**
1. Actualizar interfaces TypeScript
2. Buscar y reemplazar `.lotNumber` → `.lotCode`
3. Actualizar callbacks `onLotSelect(lotCode: string)`

#### 1.3 Eliminar campos obsoletos (1 hora)

**Archivos:**
- LotDetailPanel.tsx:80-83 (warehouseId/toWarehouseId)
- LotDetailPanel.tsx:59 (move.date)

**Acción:** Eliminar fallbacks, usar solo campos canónicos

---

### 📦 FASE 2: CONSOLIDACIÓN DE COMPONENTES (1 día)

**Objetivo:** Eliminar duplicación ItemDetailDrawer/PricingModal

#### 2.1 Análisis de uso (30 min)

```bash
# Buscar dónde se usa cada componente
grep -r "ItemDetailDrawer" src/app
grep -r "PricingModal" src/app
```

#### 2.2 Decisión arquitectónica (15 min)

**Opción A:** Consolidar en ItemDetailDrawer (recomendado)
- Más completo
- Ya usa BaseDrawer (componente estándar)
- Incluye historial

**Opción B:** Crear nuevo ItemEditorDrawer genérico

#### 2.3 Migración de referencias (2 horas)

1. Reemplazar imports de Pricing

Modal con ItemDetailDrawer
2. Eliminar PricingModal.tsx
3. Actualizar props donde sea necesario

---

### 🔧 FASE 3: CORRECCIONES MEDIAS (1 día)

**Objetivo:** Eliminar fallbacks legacy

#### 3.1 Limpiar fallbacks múltiples (3 horas)

- HM-003: `lotCode || lotNumber || friendlyLotCode`
- HM-004: Búsqueda en `lotNumbers` objeto
- HM-005: Extracción de `Object.keys(lotNumbers)[0]`
- HM-010: `active`, `caseUnits`, `stdCost`

#### 3.2 Actualizar naming (2 horas)

- HM-001: Callbacks con `lotCode`
- HM-002: Variables `selectedLotCode`
- HM-006, HM-007: Eliminar comentarios de compatibilidad

#### 3.3 Testing regresión (2 horas)

```bash
npm run test -- --grep "inventory"
npm run test:e2e -- warehouse/inventory
```

---

### ✨ FASE 4: MEJORAS DE CÓDIGO (Opcional - 1 día)

**Objetivo:** Refactoring y mejoras

#### 4.1 Extraer utilities compartidos

- Función `calculateMargin` compartida
- Función `formatInventoryDate` compartida
- Validaciones comunes

#### 4.2 Mejorar TypeScript types

- Eliminar `any` types
- Añadir campos faltantes a `Item` interface
- Crear types específicos para pricing

#### 4.3 Optimizaciones React

- Memoización correcta con itemId
- Keys estables en listas
- Reducir re-renders innecesarios

---

## SCRIPTS DE VALIDACIÓN

### Validar que no hay referencias a campos obsoletos

```bash
#!/bin/bash
# scripts/validate-ssot-v2-inventory.sh

echo "🔍 Validando cumplimiento SSOT V2 en inventory..."

# Buscar usos de sku como FK
echo "❌ Buscando uso de 'sku' como clave foránea..."
grep -rn "\.sku ==\|\.sku ===" src/app/\(app\)/warehouse/inventory src/features/warehouse/inventory --include="*.tsx" --include="*.ts"

# Buscar lotNumber legacy
echo "❌ Buscando uso de 'lotNumber' legacy..."
grep -rn "lotNumber" src/app/\(app\)/warehouse/inventory src/features/warehouse/inventory --include="*.tsx" --include="*.ts" | grep -v "// OK"

# Buscar campos obsoletos
echo "❌ Buscando campos obsoletos..."
grep -rn "warehouseId\|toWarehouseId\|move\.date\|item\.active\|caseUnits" src/app/\(app\)/warehouse/inventory src/features/warehouse/inventory --include="*.tsx" --include="*.ts"

echo "✅ Validación completa"
```

### Generar informe de cobertura

```bash
#!/bin/bash
# scripts/generate-coverage-report.sh

echo "📊 Generando informe de cobertura SSOT V2..."

# Contar referencias totales
TOTAL_SKU=$(grep -r "\.sku" src/app/\(app\)/warehouse/inventory --include="*.tsx" | wc -l)
TOTAL_ITEMID=$(grep -r "\.itemId" src/app/\(app\)/warehouse/inventory --include="*.tsx" | wc -l)

echo "SKU references: $TOTAL_SKU"
echo "itemId references: $TOTAL_ITEMID"
echo "Ratio itemId/total: $(echo "scale=2; $TOTAL_ITEMID / ($TOTAL_SKU + $TOTAL_ITEMID) * 100" | bc)%"
```

---

## CRITERIOS DE ACEPTACIÓN

### ✅ Fase 1 Completa
- [ ] Cero usos de `sku` como clave foránea en filtros/lookups
- [ ] Cero usos de `lotNumber` en código nuevo
- [ ] Cero usos de campos obsoletos (warehouseId, move.date)
- [ ] Todas las interfaces usan campos canónicos
- [ ] Script de validación pasa sin errores

### ✅ Fase 2 Completa
- [ ] Solo existe UN componente para editar item pricing
- [ ] Componente duplicado eliminado del repositorio
- [ ] Todas las referencias migradas al componente único
- [ ] Tests E2E pasan

### ✅ Fase 3 Completa
- [ ] Cero fallbacks a campos legacy
- [ ] Naming consistente (itemId, lotCode)
- [ ] Comentarios de "compatibilidad" eliminados
- [ ] Coverage tests > 80%

### ✅ Sistema Validado
- [ ] Auditoría SSOT V2 score: 100%
- [ ] Zero TypeScript errors relacionados con SSOT
- [ ] Zero runtime errors en development
- [ ] Aprobación de QA en staging

---

## CONCLUSIONES Y RECOMENDACIONES

### 🎯 Conclusión Principal

El módulo **warehouse/inventory** presenta **desviaciones críticas** del modelo SSOT V2 que **impiden su despliegue seguro a producción**. Las principales áreas de riesgo son:

1. **Integridad Referencial:** Uso de `sku` en lugar de `itemId` como FK
2. **Generación de Lotes:** Dependencia de `lotNumber` legacy vs `lotCode` canónico
3. **Campos Obsoletos:** Referencias a `warehouseId`, `move.date`, `item.active`
4. **Duplicación de Código:** Dos componentes que hacen lo mismo

### 📋 Recomendaciones Inmediatas

#### 1. **BLOQUEAR DESPLIEGUE** 🚨
Marcar el módulo como "No Production Ready" hasta completar Fase 1.

#### 2. **Priorizar HC-001 a HC-008**
Estas 8 desviaciones críticas pueden causar pérdida de datos. Deben corregirse antes que cualquier otra feature.

#### 3. **Consolidar Componentes Duplicados**
ItemDetailDrawer y PricingModal deben fusionarse en un solo componente. La duplicación es una violación grave de SSOT.

#### 4. **Implementar CI/CD Checks**
Añadir el script `validate-ssot-v2-inventory.sh` al pipeline de CI para prevenir regresiones.

### 🔮 Impacto Estimado de NO Corregir

| Escenario | Probabilidad | Impacto | Riesgo |
|-----------|--------------|---------|--------|
| Referencias rotas si SKU cambia | Alta (70%) | Crítico | 🔴 |
| Lotes duplicados/perdidos | Media (40%) | Alto | 🟡 |
| Inconsistencia UI entre componentes | Alta (90%) | Medio | 🟡 |
| Bugs difíciles de debuggear | Alta (80%) | Alto | 🟡 |
| Retrabajar código futuro | Muy Alta (95%) | Medio | 🟡 |

**Costo estimado de NO corregir:** 2-3 semanas de debugging + posible corrupción de datos en producción.

**Costo estimado de corregir ahora:** 3-4 días de desarrollo.

### ✅ Pasos Siguientes Recomendados

1. **Día 1-2:** Ejecutar Fase 1 (Correcciones Críticas)
2. **Día 3:** Ejecutar Fase 2 (Consolidar Componentes)
3. **Día 4:** Ejecutar Fase 3 (Limpiar fallbacks)
4. **Día 5:** Testing exhaustivo + Deploy a staging
5. **Día 6:** Validación QA + Aprobación para producción

### 📚 Referencias

- SSOT V2 Especificación Técnica: `SSOT_V2_ESPECIFICACION_TECNICA_COMPLETA.md`
- Guía de Migración: `SSOT_V2_GUIA_MIGRACION_PASO_A_PASO.md`
- NewOnHandDialog Fix: `SSOT_V2_NEWONHAND_COMPLIANCE_FIX.md`

---

**Fin del Informe de Auditoría**

**Preparado por:** Arquitecto de Software Senior  
**Fecha:** 20/01/2025  
**Versión:** 1.0  
**Estado:** PENDIENTE DE APROBACIÓN PARA CORRECCIÓN
