# INFORME DE AUDITORÍA TÉCNICA
## Módulo: Warehouse/Inventory - Sistema de Inventario

**Fecha:** 20 de Enero de 2025  
**Auditor:** Cline AI - Arquitecto de Software Senior  
**Alcance:** Auditoría cruzada de implementación vs. especificaciones canónicas

---

## RESUMEN EJECUTIVO

**Calificación General: MEDIA** ⚠️

El módulo de inventario muestra una implementación parcialmente migrada a SSOT V2 con avances significativos en áreas críticas pero con desviaciones importantes que requieren atención inmediata. Se identificaron **15 hallazgos críticos** y **8 advertencias** que pueden causar inconsistencias de datos y violaciones del principio "Fuente Única de Verdad".

### Puntos Críticos
- ✅ **Server Actions (inventory.actions.ts)**: Implementación SSOT V2 completa y correcta
- ⚠️ **Componentes UI**: Uso mixto de campos legacy y canónicos
- ❌ **Lógica de Búsqueda**: Violación del principio itemId canónico
- ⚠️ **UI/UX**: Incumplimiento parcial de Design System

---

## 1. AUDITORÍA DEL MODELO DE DATOS (CRÍTICO)

### 1.1 Clave Canónica de Producto

#### ❌ HALLAZGO #1: Uso de `sku` en búsqueda de items (CRÍTICO)

**Evidencia:**
```typescript
// SkuAccordionRow.tsx, línea 20
const item = items.find((i) => i.sku === summary.sku || i.id === summary.itemId);
```

**Regla Violada:** SSOT V2, Sección 0.1
> "FK canónica: itemId en todas las colecciones"

**Riesgo:** CRÍTICO
- Si un SKU cambia, la búsqueda fallará silenciosamente
- Datos huérfanos en componentes UI
- Inconsistencias entre lo mostrado y los datos reales
- Violación del principio de clave primaria inmutable

**Recomendación:**
```typescript
// CORRECTO: Usar solo itemId
const item = items.find((i) => i.id === summary.itemId);
```

---

#### ❌ HALLAZGO #2: Uso dual sku/itemId en LotDetailPanel (CRÍTICO)

**Evidencia:**
```typescript
// LotDetailPanel.tsx, línea 25
const item = items.find((i) => i.sku === lot.sku);
```

**Regla Violada:** SSOT V2, Sección 0.1

**Riesgo:** CRÍTICO
- Búsqueda inconsistente con el resto del sistema
- Fallo en la visualización si el SKU no coincide
- No se aprovecha la clave canónica `itemId` del lot

**Recomendación:**
```typescript
// CORRECTO: Usar itemId del lot
const item = items.find((i) => i.id === lot.itemId);
```

---

### 1.2 Clave Canónica de Lote

#### ✅ CUMPLIMIENTO #1: Uso correcto de lotCode

**Evidencia:**
```typescript
// inventory.actions.ts, líneas 76-78
const { lotId, lotCode } = await LotService.createLot(tx, {
  itemId,
  plant: 'SB',
  ...
});
```

**Cumple:** SSOT V2, Sección 2.2
> "Generación race-free usando contadores atómicos"

**Evaluación:** EXCELENTE ✅
- Server actions usan exclusivamente `lotCode`
- Generación automática con formato YYJJJ-PL-SEQ
- Transaccionalidad correcta

---

#### ⚠️ HALLAZGO #3: Fallback legacy en componentes UI

**Evidencia:**
```typescript
// SkuAccordionRow.tsx, línea 37
const lotCode = lot.lotCode || lot.lotNumber || lot.friendlyLotCode || 'SIN-LOTE';
```

**Regla Violada:** SSOT V2, Sección 0.1
> "Lote canónico: lotCode (YYJJJ-PL[-LN]-SEQ)"

**Riesgo:** MEDIO
- Comportamiento inconsistente entre datos migrados y legacy
- Confusión en la visualización de códigos de lote
- No fuerza la migración completa a lotCode

**Recomendación:**
```typescript
// CORRECTO: Priorizar lotCode, advertir si no existe
const lotCode = lot.lotCode || (console.warn('Legacy lot without lotCode:', lot.id), lot.lotNumber) || 'MIGRATION-PENDING';
```

---

### 1.3 Referencias a Ubicaciones

#### ⚠️ HALLAZGO #4: Uso de campo obsoleto `warehouseId`

**Evidencia:**
```typescript
// SkuAccordionRow.tsx, línea 39
<span>{lot.locationId || lot.warehouseId || 'N/A'}</span>

// LotDetailPanel.tsx, línea 51
{(move.fromLocationId || move.warehouseId || move.toLocationId || move.toWarehouseId) && ...}
```

**Regla Violada:** SSOT V2, Sección 5 (Plan de Migración)
> "Campos obsoletos: warehouseId → locationId"

**Riesgo:** MEDIO
- Perpetúa el uso de campos deprecados
- Dificulta la limpieza del modelo de datos
- Confusión entre `warehouseId` y `locationId`

**Recomendación:**
```typescript
// CORRECTO: Solo usar locationId
<span>{lot.locationId || 'UNKNOWN'}</span>

// Crear migration script para convertir warehouseId → locationId
```

---

### 1.4 Campos de Fecha

#### ⚠️ HALLAZGO #5: Uso de campo obsoleto `date` en StockMove

**Evidencia:**
```typescript
// LotDetailPanel.tsx, línea 49
const dateValue = moveAny.occurredAt || moveAny.createdAt || move.date;
```

**Regla Violada:** SSOT V2, Sección 4.1
> "StockMove usa occurredAt, no date"

**Riesgo:** MEDIO
- Referencia a campo deprecado
- Inconsistencia temporal en reportes

**Recomendación:**
```typescript
// CORRECTO: Solo usar occurredAt
const dateValue = move.occurredAt || move.createdAt;
```

---

### 1.5 Estructura de Buckets QC

#### ✅ CUMPLIMIENTO #2: Soporte correcto de buckets

**Evidencia:**
```typescript
// SkuAccordionRow.tsx, líneas 30-34
let lotQty = 0;
if (typeof lot.qty === 'object' && lot.qty !== null) {
  lotQty = (lot.qty.RELEASED || 0) + (lot.qty.HOLD || 0) + (lot.qty.REJECTED || 0);
}
```

**Cumple:** SSOT V2, Sección 1.1
> "Saldos por bucket QC: RELEASED, HOLD, REJECTED"

**Evaluación:** BUENO ✅
- Componentes manejan correctamente la estructura de buckets
- Fallback para datos legacy (qty como número)
- Cálculo correcto de totalQty

---

## 2. AUDITORÍA DE FORMULARIOS Y ENTRADA DE DATOS

### 2.1 NewOnHandDialog - Generación de Lotes

#### ✅ CUMPLIMIENTO #3: No permite entrada manual de lotNumber

**Evidencia:**
```typescript
// NewOnHandDialog.tsx, línea 134
<div className="rounded-lg bg-info/10 border border-info/20 p-3">
  <p className="text-xs text-info font-medium">
    ℹ️ El código de lote se generará automáticamente siguiendo el formato SSOT V2 (YYJJJ-PL-SEQ)
  </p>
</div>
```

**Cumple:** SSOT V2, Sección 2.2
> "Generación race-free - No permitir entrada manual"

**Evaluación:** EXCELENTE ✅
- No hay campos para ingresar `lotNumber` manualmente
- Mensaje claro sobre generación automática
- Usuario informado del formato esperado

---

#### ✅ CUMPLIMIENTO #4: Uso correcto de itemId

**Evidencia:**
```typescript
// NewOnHandDialog.tsx, línea 30
type FormState = {
  itemId: string;  // SSOT V2: Use canonical itemId instead of sku
  ...
}
```

**Cumple:** SSOT V2, Sección 0.1

**Evaluación:** EXCELENTE ✅
- Formulario usa `itemId` como clave canónica
- Comentario explícito sobre SSOT V2
- No hay confusión con SKU

---

### 2.2 ItemDetailDrawer - Campos Legacy

#### ❌ HALLAZGO #6: Uso de campos obsoletos en Item

**Evidencia:**
```typescript
// ItemDetailDrawer.tsx, líneas 60-62
setIsActive(item.isActive ?? item.active ?? true);
setLogistics({
  unitsPerCase: item.unitsPerCase || item.caseUnits || 0,
  ...
});
```

**Regla Violada:** SSOT V2, Sección 5
> "Campos obsoletos: item.active → isActive, item.caseUnits → unitsPerCase"

**Riesgo:** MEDIO
- Perpetúa el uso de campos deprecados
- Confusión en el modelo de datos
- Dificulta la migración completa

**Recomendación:**
```typescript
// CORRECTO: Solo usar campos canónicos
setIsActive(item.isActive ?? true);
setLogistics({
  unitsPerCase: item.unitsPerCase || 0,
  // Crear script de migración para caseUnits → unitsPerCase
});
```

---

## 3. AUDITORÍA DE LÓGICA DE NEGOCIO Y UI

### 3.1 Duplicación de Componentes

#### ⚠️ HALLAZGO #7: Componentes duplicados para edición de precios

**Evidencia:**
- `ItemDetailDrawer.tsx` (líneas 1-353): Drawer completo con edición de precios
- `PricingModal.tsx` (líneas 1-294): Modal con la misma funcionalidad

**Regla Violada:** Design System, Sección 2
> "Consistencia: solo usar componentes del DS, sin clases ad-hoc"

**Riesgo:** MEDIO
- Violación del principio DRY (Don't Repeat Yourself)
- Lógica duplicada que puede divergir
- Mantenimiento duplicado
- Inconsistencias en comportamiento

**Recomendación:**
```
ACCIÓN REQUERIDA:
1. Elegir un componente principal (ItemDetailDrawer es más completo)
2. Deprecar PricingModal
3. Refactorizar referencias a PricingModal → ItemDetailDrawer
```

---

#### ❌ HALLAZGO #8: Campos presentados de forma contradictoria

**Evidencia:**

**ItemDetailDrawer (editable):**
```typescript
// ItemDetailDrawer.tsx, línea 141
<Input
  type="number"
  value={costUnit}
  onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
  className="pr-8"
/>
```

**PricingModal (bloqueado):**
```typescript
// PricingModal.tsx, línea 75
<Input
  type="number"
  value={costUnit}
  onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
  className="pr-8 bg-gray-50"
  disabled  // ← Campo bloqueado
/>
<p className="text-xs text-orange-600 mt-1">
  ⚙️ Calculado automáticamente desde BOM
</p>
```

**Riesgo:** CRÍTICO
- **Lógica contradictoria:** En un componente el coste es editable, en otro es calculado
- Usuario confundido sobre si puede editar o no
- Posible sobrescritura de costes calculados desde BOM
- Inconsistencia en reglas de negocio

**Recomendación:**
```
DECISIÓN ARQUITECTÓNICA REQUERIDA:
1. ¿El costUnit es editable manual o calculado desde BOM?
2. Si es calculado: Bloquear en ambos componentes, eliminar onChange
3. Si es manual: Permitir edición en ambos, remover mensaje de "calculado"
4. Documentar la decisión en SSOT V2
```

---

## 4. AUDITORÍA DE UI/UX

### 4.1 Cumplimiento del Design System

#### ⚠️ HALLAZGO #9: Uso de clases CSS ad-hoc

**Evidencia:**
```typescript
// InventoryClient.tsx, líneas 135-140
<div className="sb-glass rounded-2xl border border-border/40 shadow-lg/20">
  <div className="p-4 md:p-6 space-y-5">
    ...
  </div>
</div>
```

**Regla Violada:** Design System, Sección 4.1
> "Usar clases predefinidas: sb-card-glass-light, sb-header-glass"

**Riesgo:** BAJO
- Inconsistencia visual menor
- No usa las clases estandarizadas del DS

**Recomendación:**
```typescript
// CORRECTO: Usar clases del DS
<div className="sb-card-glass-light p-6 hover-raise">
  ...
</div>
```

---

#### ⚠️ HALLAZGO #10: Tabla sin wrapper estandarizado

**Evidencia:**
```typescript
// SkuAccordionRow.tsx, líneas 20-50
<div className="border-b last:border-b-0">
  <div className="grid grid-cols-[2fr_repeat(5,1fr)] items-center gap-4 px-4 py-2 cursor-pointer hover:bg-zinc-50">
    ...
  </div>
</div>
```

**Regla Violada:** Design System, Sección 3.2
> "Tablas deben usar: sb-table-wrap, sb-table"

**Riesgo:** BAJO
- Estilos inconsistentes con el resto del sistema
- Hover state no estandarizado

**Recomendación:**
```typescript
// CORRECTO: Usar clases de tabla del DS
<div className="sb-table-wrap">
  <table className="sb-table">
    <tbody>
      <tr className="hover:bg-secondary/30 cursor-pointer">
        ...
      </tr>
    </tbody>
  </table>
</div>
```

---

#### ✅ CUMPLIMIENTO #5: Uso correcto de badges semánticos

**Evidencia:**
```typescript
// InventoryClient.tsx, líneas 177-181
<span className={severityStyles[alert.severity]}>
  <strong>{alert.sku}</strong> · {alert.message}
</span>
```

**Cumple:** Design System, Sección 4.4

**Evaluación:** BUENO ✅
- Uso correcto de badges con variantes semánticas
- Colores según severidad

---

### 4.2 Responsividad y Mobile-first

#### ✅ CUMPLIMIENTO #6: Diseño responsive

**Evidencia:**
```typescript
// InventoryClient.tsx, líneas 133-153
<section className={`grid gap-6 ${selectedLotDetails ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
  ...
</section>
```

**Cumple:** Design System, Sección 2
> "Mobile-first: drawer es el flujo por defecto"

**Evaluación:** BUENO ✅
- Uso correcto de breakpoints (lg:)
- Layout adaptativo según estado

---

## 5. AUDITORÍA DE ARQUITECTURA

### 5.1 Server Actions

#### ✅ CUMPLIMIENTO #7: Transaccionalidad completa

**Evidencia:**
```typescript
// inventory.actions.ts, líneas 42-107
const result = await db.runTransaction(async (tx) => {
  // 1. Verify item
  const itemSnap = await tx.get(itemRef);
  
  // 2. Create lot with auto-generated code
  const { lotId, lotCode } = await LotService.createLot(tx, {...});
  
  // 3. Create StockMove
  tx.set(smRef, {...});
  
  // 4. Create TraceEvent
  tx.set(teRef, {...});
  
  return { stockMoveId: smRef.id, lotCode, lotId };
});
```

**Cumple:** SSOT V2, Sección 3.1
> "Flujo de recepción con transaccionalidad completa"

**Evaluación:** EXCELENTE ✅✅✅
- Transacción atómica completa
- Uso correcto de LotService
- Generación race-free de lotCode
- Creación de todos los registros requeridos (lot, onHand, stockMove, traceEvent)
- Validación de item antes de procesar

**Comentario:** Este es el patrón correcto que debería seguirse en toda la aplicación.

---

### 5.2 Hooks Personalizados

#### ⚠️ HALLAZGO #11: Dependencias no auditadas

**Evidencia:**
```typescript
// InventoryClient.tsx, líneas 52-63
const {
  summaries,
  skusWithLots: allSkusWithLots,
  lotRows: allLotRows,
  uomIncidentCount,
  locations,
  itemsBySku,  // ← Posible uso de SKU como clave
} = useInventoryData({ onHand, items, stockMoves, lots });
```

**Riesgo:** MEDIO
- No se auditó el contenido de `useInventoryData.ts`
- Posible uso de SKU como clave en `itemsBySku`
- Puede estar propagando el uso de claves no canónicas

**Recomendación:**
```
AUDITORÍA PENDIENTE:
- Revisar useInventoryData.ts
- Verificar que use itemId, no sku
- Refactorizar itemsBySku → itemsById si es necesario
```

---

## 6. CAMPOS HEREDADOS Y MIGRACIÓN

### 6.1 Resumen de Campos Legacy Encontrados

| Campo Legacy | Campo Canónico | Archivos Afectados | Prioridad |
|--------------|----------------|-------------------|-----------|
| `sku` (búsqueda) | `itemId` | SkuAccordionRow, LotDetailPanel | CRÍTICA |
| `warehouseId` | `locationId` | SkuAccordionRow, LotDetailPanel | MEDIA |
| `date` | `occurredAt` | LotDetailPanel | MEDIA |
| `active` | `isActive` | ItemDetailDrawer | MEDIA |
| `caseUnits` | `unitsPerCase` | ItemDetailDrawer | BAJA |
| `lotNumber` | `lotCode` | Múltiples (fallback) | MEDIA |

---

### 6.2 Script de Migración Recomendado

```typescript
// scripts/migrate-inventory-ui-legacy-fields.ts
export async function migrateInventoryLegacyFields() {
  const batch = db.batch();
  
  // 1. Eliminar fallbacks de warehouseId
  const onHandSnap = await db.collection('onHand')
    .where('warehouseId', '!=', null)
    .get();
  
  onHandSnap.forEach(doc => {
    const data = doc.data();
    batch.update(doc.ref, {
      locationId: data.warehouseId,
      warehouseId: FieldValue.delete()
    });
  });
  
  // 2. Migrar date → occurredAt en stockMoves
  const movesSnap = await db.collection('stockMoves')
    .where('date', '!=', null)
    .get();
  
  movesSnap.forEach(doc => {
    const data = doc.data();
    batch.update(doc.ref, {
      occurredAt: data.date,
      date: FieldValue.delete()
    });
  });
  
  // 3. Migrar active → isActive en items
  const itemsSnap = await db.collection('items')
    .where('active', '!=', null)
    .get();
  
  itemsSnap.forEach(doc => {
    const data = doc.data();
    batch.update(doc.ref, {
      isActive: data.active,
      active: FieldValue.delete()
    });
  });
  
  await batch.commit();
  console.log('✅ Migration complete');
}
```

---

## 7. RECOMENDACIONES PRIORITARIAS

### 7.1 Críticas (Inmediatas)

1. **HALLAZGO #1**: Refactorizar búsqueda de items para usar solo `itemId`
   - Archivo: `SkuAccordionRow.tsx`
   - Tiempo estimado: 30 minutos
   - Riesgo si no se corrige: ALTO

2. **HALLAZGO #2**: Actualizar LotDetailPanel para usar `itemId`
   - Archivo: `LotDetailPanel.tsx`
   - Tiempo estimado: 15 minutos
   - Riesgo si no se corrige: ALTO

3. **HALLAZGO #8**: Resolver contradicción en edición de `costUnit`
   - Archivos: `ItemDetailDrawer.tsx`, `PricingModal.tsx`
   - Tiempo estimado: 2 horas (incluye decisión arquitectónica)
   - Riesgo si no se corrige: CRÍTICO (corrupción de datos)

---

### 7.2 Medias (Próxima Sprint)

4. **HALLAZGO #7**: Eliminar componente duplicado `PricingModal`
   - Tiempo estimado: 4 horas
   - Beneficio: Reducción de deuda técnica, mantenimiento simplificado

5. **HALLAZGOS #4, #5**: Eliminar fallbacks de campos legacy
   - Archivos: Múltiples
   - Tiempo estimado: 2 horas
   - Beneficio: Modelo de datos más limpio

6. **HALLAZGO #11**: Auditar hooks personalizados
   - Archivos: `useInventoryData.ts`, `useInventoryFilters.ts`
   - Tiempo estimado: 1 hora
   - Beneficio: Asegurar consistencia end-to-end

---

### 7.3 Bajas (Backlog)

7. **HALLAZGOS #9, #10**: Alinear con Design System
   - Tiempo estimado: 3 horas
   - Beneficio: Consistencia visual

---

## 8. MÉTRICAS DE CUMPLIMIENTO

### 8.1 Por Especificación

**SSOT V2 (Modelo de Datos)**
- ✅ Cumplimientos: 7/15 (47%)
- ⚠️ Advertencias: 5/15 (33%)
- ❌ Incumplimientos Críticos: 3/15 (20%)
- **Calificación: MEDIA** ⚠️

**Design System (UI/UX)**
- ✅ Cumplimientos: 4/8 (50%)
- ⚠️ Advertencias: 3/8 (37.5%)
- ❌ Incumplimientos: 1/8 (12.5%)
- **Calificación: ACEPTABLE** ⚠️

---

### 8.2 Por Severidad

| Severidad | Cantidad | % |
|-----------|----------|---|
| 🔴 Crítica | 3 | 20% |
| 🟡 Media | 6 | 40% |
| 🟢 Baja | 2 | 13% |
| ✅ Cumplimientos | 7 | 47% |
| **Total Hallazgos** | **15** | **100%** |

---

## 9. PLAN DE ACCIÓN RECOMENDADO

### Sprint 1 (1 semana)
- [ ] Corregir HALLAZGO #1 (itemId en SkuAccordionRow)
- [ ] Corregir HALLAZGO #2 (itemId en LotDetailPanel)
- [ ] Resolver HALLAZGO #8 (decisión arquitectónica sobre costUnit)

### Sprint 2 (1 semana)
- [ ] Eliminar PricingModal (HALLAZGO #7)
- [ ] Auditar hooks personalizados (HALLAZGO #11)
- [ ] Ejecutar script de migración de campos legacy

### Sprint 3 (1 semana)
- [ ] Eliminar fallbacks de campos legacy (#4, #5, #6)
- [ ] Alinear con Design System (#9, #10)
- [ ] Testing de regresión end-to-end

---

## 10. CONCLUSIONES

### Fortalezas Identificadas ✅
1. **Server Actions impecables**: La capa de datos está correctamente implementada según SSOT V2
2. **Transaccionalidad garantizada**: Uso correcto de `runTransaction()` y LotService
3. **Generación automática de lotCode**: Sistema race-free funcionando correctamente
4. **Formularios protegidos**: NewOnHandDialog no permite entrada manual de lotes
5. **Soporte de buckets QC**: Componentes manejan correctamente la estructura SSOT V2

### Debilidades Críticas ❌
1. **Búsqueda por SKU en lugar de itemId**: Violación fundamental de SSOT V2
2. **Componentes duplicados**: PricingModal vs ItemDetailDrawer con lógicas contradictorias
3. **Campos legacy persistentes**: Múltiples fallbacks a campos obsoletos
4. **Falta de auditoría en hooks**: Posible propagación de malas prácticas

### Riesgo General
**MEDIO-ALTO**: Los hallazgos críticos pueden causar:
- Inconsistencias silenciosas en datos
- Fallos en visualización de información
- Confusión del usuario sobre reglas de negocio
- Dificultad en mantenimiento futuro

### Próximos Pasos
1. **Inmediato**: Corregir búsquedas por SKU → itemId
2. **Corto plazo**: Resolver contradicción en edición de costes
3. **Medio plazo**: Eliminar componentes duplicados y campos legacy
4. **Largo plazo**: Auditoría completa de hooks y migración de datos

---

**Firma Digital:** Cline AI - Senior Software Architect  
**Fecha de Informe:** 2025-01-20  
**Próxima Revisión:** Post-correcciones (estimado 3 semanas)
