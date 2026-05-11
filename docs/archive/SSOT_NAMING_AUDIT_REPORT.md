# SSOT Naming Audit Report

**Fecha de Auditoría:** 2025-01-18  
**Versión SSOT:** v5 (UNIFIED & CORRECTED)  
**Estado:** ⚠️ Requiere Acción

---

## 📊 Resumen Ejecutivo

El análisis automático del SSOT ha detectado **12 violaciones de reglas duras** y **11 familias de nombres con variantes** que requieren revisión.

### Estadísticas del SSOT

| Métrica | Valor |
|---------|-------|
| Interfaces | 75 |
| Types | 72 |
| Enums (literales) | 44 |
| Campos únicos | 472 |
| Campos totales | 803 |
| Campos deprecated | 50 |

### Estado de Cumplimiento

| Categoría | Estado | Cuenta |
|-----------|--------|--------|
| ❌ Reglas duras violadas | CRÍTICO | 12 |
| ⚠️ Familias sin resolver | ADVERTENCIA | 11 |
| ℹ️ Campos sin marcar deprecated | INFORMATIVO | 10 |

---

## 🚨 Violaciones Críticas (Acción Requerida)

### 1. Campos `date` Genéricos (6 ocurrencias)

**Problema:** Uso de `date` genérico sin sufijo específico.

**Regla violada:** Evita "date" genérico suelto: prefiere `...At` o `...Date` específico

**Ubicaciones:**
- `DeliveryNote.date`
- `FinanceLink.date`
- `PaymentLink.date`
- `SocialMetrics.date`
- `WebAnalytics.date`
- `VelocityInput.date`

**Acción requerida:**
```typescript
// ❌ Actual
interface DeliveryNote {
  date: Timestamp;
}

// ✅ Recomendado
interface DeliveryNote {
  issueDate: ISODateString;
  /** @deprecated Use issueDate */
  date?: Timestamp;
}
```

**Impacto:** ALTO - Queries y transforms pueden fallar si se mezclan `date`, `...At` y `...Date`.

---

### 2. Objetos Expandidos + Id (3 ocurrencias)

**Problema:** Coexistencia de objeto expandido y FK en la misma entidad.

**Regla violada:** Evita objeto expandido junto a ...Id (usa solo Id en entidad)

**Ubicaciones:**
- `location` + `locationId` (OnHandView, Shipment)
- `priceList` + `priceListId` (Item, CustomerData)

**Acción requerida:**
```typescript
// ❌ Actual - Mezcla objeto y FK
interface OnHandView {
  locationId: string;
  // ... más adelante en otra interface
  location?: { lat: number; lng: number };
}

// ✅ Opción A - Solo FK en entidad
interface OnHandView {
  locationId: string;
}

// ✅ Opción B - Objeto expandido en DTO/View
interface OnHandViewExpanded extends OnHandView {
  location?: Location;  // Resuelto en capa repo
}
```

**Impacto:** MEDIO - Confusión en queries y lógica de negocio.

---

### 3. `distributorId` sin Deprecar (3 ocurrencias)

**Problema:** Uso de `distributorId` cuando debería ser `distributorPartyId`.

**Regla violada:** Usa distributorPartyId, no distributorId (para FK a Party)

**Ubicaciones:**
- `Account.distributorId`
- `OrderSellOut.distributorId`
- `TaskNew.distributorId`

**Acción requerida:**
```typescript
// ❌ Actual
interface Account {
  distributorId?: string;
  distributorPartyId?: string;  // Ya existe pero no está deprecado el otro
}

// ✅ Recomendado
interface Account {
  distributorPartyId?: string;
  /** @deprecated Use distributorPartyId */
  distributorId?: string;
}
```

**Impacto:** ALTO - Ambigüedad semántica (¿es Party o Distributor entity?).

---

## ⚠️ Familias de Nombres con Variantes (Revisar)

### Variantes Detectadas

| Stem | Variantes | Recomendación |
|------|-----------|---------------|
| `completed` | `completed`, `completedAt` | ✅ Permitir (boolean + timestamp) |
| `deliveryNote` | `deliveryNote`, `deliveryNoteId` | ✅ Ya en ALLOW |
| `due` | `dueAt`, `dueDate` | ⚠️ Unificar a `dueDate` |
| `end` | `endAt`, `endDate` | ✅ Ya en ALLOW |
| `external` | `external`, `externalId` | ⚠️ Clarificar uso |
| `location` | `location`, `locationId` | ❌ Revisar (ver punto 2) |
| `lot` | `lot`, `lotNumber` | ⚠️ Usar solo `lotNumber` |
| `order` | `order`, `orderId`, `orderNumber` | ✅ Ya en ALLOW |
| `priceList` | `priceList`, `priceListId` | ❌ Revisar (ver punto 2) |
| `receipt` | `receiptId`, `receiptNumber` | ✅ Ya en ALLOW |
| `reserved` | `reserved`, `reservedQty` | ⚠️ Unificar a `reservedQty` |
| `responsible` | `responsible`, `responsibleId` | ⚠️ Usar solo `responsibleId` |
| `shipment` | `shipmentId`, `shipmentNumber` | ✅ Ya en ALLOW |
| `start` | `startAt`, `startDate` | ✅ Ya en ALLOW |
| `target` | `target`, `targetQty`, `targetQuantity` | ❌ Unificar a `targetQty` |
| `tracking` | `tracking`, `trackingNumber` | ⚠️ Clarificar (¿objeto vs string?) |
| `updatedBy` | `updatedBy`, `updatedById` | ⚠️ Usar solo `updatedById` |

### Análisis Detallado

#### 1. `due`: `dueAt` vs `dueDate`

**Contexto:** Usado en facturas, pagos y tareas.

**Recomendación:** Unificar a `dueDate` para documentos financieros.

```typescript
// ✅ Recomendado
interface Invoice {
  dueDate: ISODateString;  // Fecha vencimiento documento
}

interface Task {
  dueAt: ISODateString;    // Timestamp límite tarea
}
```

#### 2. `reserved` vs `reservedQty`

**Recomendación:** Deprecar `reserved` (boolean implícito) y usar siempre `reservedQty`.

```typescript
// ❌ Actual
interface OnHandView {
  reserved?: number;       // Cantidad reservada
  reservedQty?: number;    // Duplicado
}

// ✅ Recomendado
interface OnHandView {
  reservedQty: number;
  /** @deprecated Use reservedQty */
  reserved?: number;
}
```

#### 3. `target` family

**Problema:** `target`, `targetQty`, `targetQuantity` (3 variantes).

**Recomendación:** Unificar a `targetQty`.

```typescript
// ❌ Mezcla
interface ProductionOrder {
  targetQuantity: number;  // Deprecar
}

interface PosTactic {
  target?: number;         // Ambiguo
}

// ✅ Unificado
interface ProductionOrder {
  targetQty: number;
  /** @deprecated Use targetQty */
  targetQuantity?: number;
}
```

---

## ℹ️ Campos Deprecated Sin Marcar (Informativo)

### Lista de Campos

| Campo | Línea | Contexto | Acción |
|-------|-------|----------|--------|
| `salesRepId` | 97 | Account | Añadir `@deprecated Use ownerId` |
| `quantity` | 447 | - | Añadir `@deprecated Use qty` |
| `sku` | 205, 298, 299, 319 | Múltiples | Añadir `@deprecated Use itemId` |
| `items` | 208, 295, 902, 904 | OrderSellOut, StockMove | Añadir `@deprecated Use lines` |

### Script de Corrección

```typescript
// Account
interface Account {
  ownerId: string;
  /** @deprecated Use ownerId */
  salesRepId?: string;
}

// OrderLine
interface OrderLine {
  itemId: string;
  qty: number;
  /** @deprecated Use itemId */
  sku?: string;
}

// OrderSellOut
interface OrderSellOut {
  lines: OrderLine[];
  /** @deprecated Use lines */
  items?: OrderLine[];
}
```

---

## 📋 Plan de Acción Priorizado

### Sprint 1 (Urgente - 1 semana)

**Objetivo:** Eliminar violaciones críticas

- [ ] **Tarea 1:** Deprecar campos `date` genéricos
  - Añadir `@deprecated Use issueDate` en DeliveryNote, FinanceLink, etc.
  - Crear campos canónicos: `issueDate`, `occurredAt`, `recordedAt`
  
- [ ] **Tarea 2:** Deprecar `distributorId`
  - Marcar como `@deprecated Use distributorPartyId` en Account, OrderSellOut, TaskNew
  - Verificar que `distributorPartyId` existe en todos los casos

- [ ] **Tarea 3:** Documentar convivencia location/priceList
  - Añadir comentarios JSDoc explicando el uso
  - Considerar migración a pattern DTO expandido

### Sprint 2 (Importante - 2 semanas)

**Objetivo:** Resolver familias de nombres

- [ ] **Tarea 4:** Unificar familia `reserved`
  - Deprecar `reserved` (boolean implícito)
  - Usar solo `reservedQty`

- [ ] **Tarea 5:** Unificar familia `target`
  - Deprecar `targetQuantity`
  - Deprecar `target` genérico
  - Usar solo `targetQty`

- [ ] **Tarea 6:** Clarificar familia `lot`
  - Usar solo `lotNumber` como FK/referencia
  - Objeto `Lot` completo solo cuando sea necesario

### Sprint 3 (Mejora - 3 semanas)

**Objetivo:** Completar documentación deprecated

- [ ] **Tarea 7:** Marcar todos los campos deprecated
  - salesRepId, quantity, sku, items
  - Añadir JSDoc con migración path

- [ ] **Tarea 8:** Actualizar ALLOW list del test
  - Añadir variantes conscientemente aceptadas
  - Documentar razón de cada excepción

- [ ] **Tarea 9:** Integrar en CI
  - Añadir test a GitHub Actions
  - Configurar como check obligatorio en PRs

---

## 🔧 Uso del Sistema de Auditoría

### Ejecutar Test Local

```bash
# Ejecutar test completo
npx vitest run tests/ssot-naming-audit.test.ts --reporter=verbose

# Ejecutar solo estadísticas
npx vitest run tests/ssot-naming-audit.test.ts -t "estadísticas"
```

### Interpretar Resultados

```
❌ REGLAS DURAS VIOLADAS:
  → Bloquean CI, deben corregirse

⚠️  FAMILIAS DE NOMBRES A RESOLVER:
  → Advertencia, añadir a ALLOW o unificar

ℹ️ CAMPOS DEPRECADOS SIN MARCAR:
  → Informativo, no bloquea pero debe corregirse
```

### Añadir Excepciones

Para aceptar conscientemente una familia de variantes:

```typescript
// En tests/ssot-naming-audit.test.ts
const ALLOW = new Set<string>([
  'order',        // ✅ orderId + orderNumber aceptado
  'shipment',     // ✅ shipmentId + shipmentNumber aceptado
  'due',          // ✅ dueAt (tareas) + dueDate (facturas) aceptado
]);
```

---

## 📈 Métricas de Progreso

### Estado Inicial (2025-01-18)

- ❌ Violaciones críticas: 12
- ⚠️ Familias sin resolver: 11
- ℹ️ Campos sin marcar: 10
- **Score de Calidad:** 65/100

### Objetivo Sprint 1

- ❌ Violaciones críticas: 0
- ⚠️ Familias sin resolver: 8
- ℹ️ Campos sin marcar: 10
- **Score de Calidad:** 80/100

### Objetivo Final (Sprint 3)

- ❌ Violaciones críticas: 0
- ⚠️ Familias sin resolver: 0-5 (conscientemente aceptadas)
- ℹ️ Campos sin marcar: 0
- **Score de Calidad:** 95/100

---

## 🔗 Referencias

- [SSOT Source Code](src/domain/ssot.ts)
- [Naming Policy](SSOT_NAMING_POLICY.md)
- [Test de Auditoría](tests/ssot-naming-audit.test.ts)
- [Script de Test (scripts/)](scripts/ssot-naming-audit.test.ts)

---

## 📝 Notas de Implementación

### Patrón de Migración Seguro

```typescript
// Paso 1: Añadir campo canónico + deprecar antiguo
interface Entity {
  canonicalField: Type;
  /** @deprecated Use canonicalField */
  oldField?: Type;
}

// Paso 2: Actualizar código nuevo para usar canonical
// (código antiguo sigue funcionando con oldField)

// Paso 3: Migrar datos en Firestore
// UPDATE entities SET canonicalField = oldField

// Paso 4: Actualizar código legacy

// Paso 5: Eliminar oldField (después de 2-3 sprints)
```

### Testing de Regresión

Antes de eliminar campos deprecated:

1. ✅ Verificar que no hay imports del campo antiguo
2. ✅ Buscar en toda la codebase: `grep -r "oldField"`
3. ✅ Verificar que los datos están migrados
4. ✅ Ejecutar tests de integración
5. ✅ Eliminar campo del SSOT

---

**Generado por:** Sistema de Auditoría Automática  
**Próxima revisión:** 2025-01-25  
**Responsable:** Equipo de Arquitectura
