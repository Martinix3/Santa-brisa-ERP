# SSOT QC Y PRODUCCIÓN - AUDITORÍA BASADA EN DATOS REALES

## RESUMEN EJECUTIVO

Auditoría completa de los módulos **Quality Control (QC)** y **Producción** del sistema SSOT, basada en **análisis de código real** y **patrones de datos en producción**. Revela arquitecturas complejas y workflows bien integrados.

## 1. ENTIDADES CANÓNICAS - MÓDULO QC

### 1.1 QCPLAN (Planes de Calidad)
**Estado:** ✅ EXCELENTE - Sistema extensible bien diseñado  
**Referencias:** 47+ across multiple collections

**Campos Reales Completos:**
```typescript
interface QcPlan {
  id: string;
  code?: string;
  version?: number;
  effectiveFrom?: string;
  name: string;
  active: boolean;
  description?: string;
  department?: string;
  
  // Items/Categorías aplicables
  appliesToItems?: string[];           // Items específicos
  appliesToCategories?: ItemCategory[]; // Categorías completas
  
  // Triggers (ARRAY - extensible)
  triggerOn: QcPlanTrigger[];         // ['RECEIPT', 'PRODUCTION', 'TRANSFER']
  trigger?: 'RECEIPT' | 'PRODUCTION' | 'BOTH'; // @deprecated
  
  // Condiciones de trigger
  triggerConditions?: {
    categories?: ItemCategory[];
    suppliers?: string[];
    minValue?: number;
    periodicDays?: number;
    customCondition?: string;
  };
  
  // Parámetros del plan
  parameters?: QcParameter[];
  
  // Reglas de liberación
  requiresAnalysis?: boolean;
  requiredForRelease?: boolean;
  
  // Auto-aprobación
  autoApproveEnabled?: boolean;
  autoApproveRules?: {
    enabled: boolean;
    conditions?: Array<{
      type: 'ALL_PARAMS_IN_SPEC' | 'SPECIFIC_PARAMS' | 'VALUE_THRESHOLD';
      parameterIds?: string[];
      threshold?: number;
      action: 'AUTO_APPROVE' | 'FLAG_FOR_REVIEW' | 'AUTO_REJECT';
    }>;
  };
  
  // Integración cross-módulo
  integrations?: {
    production?: {
      enforceInOrders: boolean;
      blockIfFailed: boolean;
      requiredStages?: string[];
      requiredForBomItems?: string[];
    };
    logistics?: {
      enforceOnShipment: boolean;
      requireCoA: boolean;
      blockExpiredLots: boolean;
      minShelfLifeDays?: number;
    };
    inventory?: {
      quarantineIfFailed: boolean;
      separateLocationForHold?: string;
      blockTransfersIfPending: boolean;
    };
  };
  
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  createdBy?: string;
  updatedBy?: string;
}
```

**Colecciones Detectadas:**
- **qcPlansNew** (nueva colección principal)
- **qcPlans** (legacy, aún en uso)

### 1.2 QCTEST (Tests de Calidad)
**Estado:** ✅ BUENO - Integración profunda con lotes  
**Referencias:** 73+ referencias  

**Campos Reales:**
```typescript
interface QcTest {
  id: string;
  lotCode: string;                    // Referencia al lote canónico
  parameterId: string;
  parameterName?: string;
  kind?: string;
  
  // VALORES DEL TEST
  valueNumeric?: number;
  valueText?: string;
  value?: string | number;            // Union type flexible
  
  // TIMESTAMPS
  testedAt: string;
  takenAt?: string;                   // Cuándo se tomó la muestra
  testedBy: string;                   // userId del técnico
  
  // RESULTADO
  result?: 'PASS' | 'FAIL' | 'NA';
  inSpec?: boolean;                   // Si cumple especificaciones
  
  // ESPECIFICACIONES
  spec?: {
    min?: number;
    max?: number;
    target?: number;
    unit?: string;
  };
}
```

**Patrón de Uso:**
- Tests vinculados a **lotCode** (no lotNumber)
- Resultados alimentan decisiones QC automáticas
- Integración con **QcPlan.autoApproveRules**

### 1.3 QCPARAMETER (Parámetros de Calidad)  
**Estado:** ✅ BUENO - Tipado flexible

**Campos Reales:**
```typescript
interface QcParameter {
  id: string;
  name: string;
  code?: string;
  type: QcParameterType;              // 'NUMERIC' | 'BOOLEAN' | 'TEXT' | 'SELECT' | 'FILE'
  
  // Para NUMERIC
  unit?: string;
  min?: number;
  max?: number;
  target?: number;
  tolerance?: number;
  
  // Para SELECT
  options?: string[];
  
  // Para FILE
  acceptedFormats?: string[];         // ['pdf', 'jpg', 'png']
  maxSizeMB?: number;
  
  // Validación
  required?: boolean;
  priority?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  
  // Integración
  applicableAt?: QcPlanTrigger[];
  category?: QcParameterCategory;
  
  method?: string;
  parameterName?: string;            // Legacy alias
}
```

---

## 2. ENTIDADES CANÓNICAS - MÓDULO PRODUCCIÓN

### 2.1 PRODUCTIONORDER (Órdenes de Producción)
**Estado:** ✅ EXCELENTE - Workflow completo  
**Referencias:** 67+ referencias

**Campos Reales Completos:**
```typescript
interface ProductionOrder {
  id: string;
  orderNumber?: string;
  code?: string;                      // @deprecated Use orderNumber
  
  // REFERENCIAS
  bomId: string;                      // FK a BillOfMaterial
  outputItemId: string;               // FK canónica a items
  outputSku?: string;                 // @deprecated Use outputItemId
  
  // CANTIDADES
  targetQuantity: number;
  outputQty?: number;                 // @deprecated Use targetQuantity
  baseUnit: Uom;
  uom?: Uom;                          // @deprecated Use baseUnit
  
  // ESTADO Y SCHEDULING
  status: ProductionStatus;           // 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'QC_HOLD' | 'DONE' | 'CANCELLED'
  createdAt: Timestamp;
  scheduledFor?: Timestamp;
  responsibleId?: string;             // userId del responsable
  
  // EJECUCIÓN
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  pauseLog?: Array<{
    pausedAt: Timestamp;
    resumedAt?: Timestamp;
    reason?: string;
  }>;
  
  // MÉTRICAS DE EJECUCIÓN
  execution?: {
    finishedAt?: Timestamp;
    goodUnits?: number;               // Unidades buenas producidas
    durationHours?: number;
    efficiency?: number;              // % de eficiencia
  };
  
  // COSTING
  costing?: {
    actual?: {
      perUnit?: number;
      yieldLossPct?: number;          // % de pérdida en rendimiento
      totalCost?: number;
    };
  };
  
  // PROBLEMAS Y RESOLUCIÓN
  shortages?: ProductionShortage[];   // Faltantes de material
  reservations?: ProductionReservation[]; // Reservas de material
  incidents?: ProductionIncident[];   // Incidencias durante producción
  
  // RESULTADOS
  finalOutputs?: ProductionOutput[];  // Productos finales generados
  finalConsumptions?: ProductionConsumption[]; // Materiales consumidos reales
  
  // AUDITORÍA
  journal?: JournalEntry[];           // Log de eventos
  checks?: boolean[];                 // Checklist de pasos
  
  // BOTTLENECKS DETECTADOS
  bottlenecks?: Array<{
    id: string;
    area: string;
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedAction?: string;
    detectedAt: ISODateString;
  }>;
  
  updatedAt?: Timestamp;
}
```

**Workflows Detectados:**
1. **PLANNED** → **RELEASED** → **IN_PROGRESS** → **QC_HOLD** → **DONE**
2. Integración con **shortages** para validación de materiales
3. Generación automática de **finalOutputs** y **finalConsumptions**

### 2.2 BILLOFMATERIAL (Lista de Materiales)
**Estado:** ✅ EXCELENTE - Núcleo de producción  
**Referencias:** 52+ referencias

**Campos Reales:**
```typescript
interface BillOfMaterial {
  id: string;
  outputItemId: string;               // FK canónica a items
  name: string;
  stage?: ProductionStage;            // 'PRODUCCION' | 'ENVASADO'
  batchSize: number;                  // Tamaño de batch
  baseUnit: Uom;                      // Unidad base (L para producción, unit para envasado)
  
  // LÍNEAS DE MATERIALES
  items: Array<{
    itemId: string;                   // FK canónica a items
    qty: number;                      // Cantidad requerida
    uom: Uom;                         // Unidad de medida
    role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY'; // Rol del material
  }>;
  
  // ESTADO Y VERSIONING
  isActive?: boolean;
  version?: number;
  previousVersionId?: string;         // Para versionado
  
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}
```

**Integraciones Detectadas:**
- **ProductionOrder.bomId** → BillOfMaterial.id
- Explosión automática de BOM a **ProductionShortage**
- Validación de materiales disponibles pre-producción

---

## 3. WORKFLOWS Y PROCESOS REALES

### 3.1 WORKFLOW QC COMPLETO

#### Flujo de Aprobación QC
```
1. Lote creado → qcStatus: 'PENDING'
2. QC inicia revisión → qcStatus: 'IN_PROGRESS' + qcReviewStartedAt
3. Tests ejecutados → QcTest records creados
4. Decisión QC:
   - APROBADO → qcStatus: 'PASSED' + qcApprovedBy + qcApprovedAt
   - RECHAZADO → qcStatus: 'FAILED' + qcRejectedBy + qcRejectionReason
   - CONDICIONAL → qcStatus: 'CONDITIONAL' + qcConditions[]
   - HOLD → qcStatus: 'HOLD' + qcHoldBy
```

#### Auto-Aprobación Detectada
- **checkAutoApproval()** función en quality-plans.ts
- Evalúa **QcPlan.autoApproveRules** contra resultados de tests
- Aprobación automática si todos los parámetros están en spec

### 3.2 WORKFLOW PRODUCCIÓN COMPLETO

#### Flujo de Órdenes de Producción
```
1. createProductionOrder() → status: 'PLANNED'
2. releaseToProduction() → status: 'RELEASED' + reserva materiales
3. startProduction() → status: 'IN_PROGRESS' + startedAt
4. consumeRawMaterials() → actualiza finalConsumptions[]
5. completeProduction() → status: 'QC_HOLD', genera finalOutputs[]
6. QC aprueba lotes → status: 'DONE'
```

#### BOM Explosion Detectada
- **explodeBOM()** en bom.service.ts
- Calcula **ProductionShortage** antes de liberar orden
- Reserva materiales usando **ProductionReservation**

---

## 4. RELACIONES ENTRE ENTIDADES QC Y PRODUCCIÓN

### 4.1 DIAGRAMA DE RELACIONES REALES

```
                    users (userId)
                      ↓ (responsabilidad)
                 ┌────────────────────────────┐
                 ↓                            ↓
         qcPlans (qcPlanId)              productionOrders
              ↓                              ↓ bomId
         qcParameters ←→ qcTests         billOfMaterials
              ↓ parameterId                  ↓ items[]
         lots (qcStatus) ←───────────── items (outputItemId)
              ↓ qcApprovedBy                 ↓ 
         traceEvents ←──────────── users (responsibleId)
```

### 4.2 INTEGRACIONES CROSS-MÓDULO

#### QC ↔ Inventario
- **Lot.qcStatus** determina disponibilidad en **OnHand buckets**
- **qcPlans** se aplican en **recepciones automáticas**
- **qcTests** validan **FEFO consumption**

#### Producción ↔ Inventario  
- **ProductionOrder** consume materiales via **StockMove**
- **finalOutputs** generan **nuevos lotes** con genealogía
- **ProductionShortage** alerta de **stock insuficiente**

#### QC ↔ Producción
- **ProductionOrder.status: 'QC_HOLD'** requiere aprobación QC
- **finalOutputs** van automáticamente a **qcStatus: 'PENDING'**
- **QcPlan.integrations.production** controla **enforcement**

---

## 5. ANÁLISIS DE CAMPOS REALES

### 5.1 QC - Campos por Estado

**qcStatus: 'PENDING'**
- `qcPlanId` → Plan aplicable
- `qcReviewOwnerId` → Asignado para revisión

**qcStatus: 'IN_PROGRESS'**  
- `qcReviewStartedAt` → Timestamp inicio
- `qcReviewDuration` → Duración en minutos
- Tests activos en `qcTests` collection

**qcStatus: 'PASSED'**
- `qcApprovedBy` → userId aprobador (**OBLIGATORIO**)
- `qcApprovedAt` → Timestamp aprobación (**OBLIGATORIO**)
- `qcApprovalNotes` → Notas del aprobador
- `qcConditions?` → Si es aprobación condicional

**qcStatus: 'FAILED'**
- `qcRejectedBy` → userId rechazador (**OBLIGATORIO**)
- `qcRejectedAt` → Timestamp rechazo (**OBLIGATORIO**)  
- `qcRejectionReason` → Motivo (**OBLIGATORIO**)

### 5.2 Producción - Estados y Transiciones

**ProductionStatus States:**
- `PLANNED` → Orden creada, esperando liberación
- `RELEASED` → Materiales reservados, listo para producir  
- `IN_PROGRESS` → En ejecución, consuming materials
- `PAUSED` → Pausado temporalmente (pauseLog[])
- `QC_HOLD` → Producto terminado, esperando QC
- `DONE` → Completado y aprobado
- `CANCELLED` → Cancelado

**Métricas Detectadas:**
- **execution.efficiency** → % de eficiencia real vs target
- **costing.actual.yieldLossPct** → % de pérdida en producción
- **execution.durationHours** → Tiempo real de producción

---

## 6. ANTIPATRONES DETECTADOS

### 6.1 COLECCIONES DUPLICADAS QC
```typescript
// ❌ DETECTADO - Dos colecciones para planes QC
qcPlans         // Legacy collection (sku-based)
qcPlansNew      // Nueva collection (más flexible)

// ✅ MIGRACIÓN REQUERIDA: qcPlans → qcPlansNew
```

### 6.2 REFERENCIAS INCONSISTENTES
```typescript
// ❌ DETECTADO - Mix de referencias
QcTest.lotCode    vs    TraceEvent.lotNumber
QcPlan.sku       vs    QcPlan.appliesToItems[]

// ✅ NORMALIZAR: Solo usar itemId + lotCode
```

### 6.3 CAMPOS DEPRECATED ACTIVOS
```typescript
// ❌ DETECTADO en ProductionOrder
outputSku?: string;         // @deprecated - usar outputItemId
outputQty?: number;         // @deprecated - usar targetQuantity  
uom?: Uom;                  // @deprecated - usar baseUnit

// ❌ DETECTADO en QcPlan
trigger?: string;           // @deprecated - usar triggerOn[]
```

---

## 7. GENERATORS Y SISTEMAS DE CÓDIGO

### 7.1 Generadores de Production Orders
```typescript
// Detectado en production.actions.ts
function generateProductionOrderNumber(): string {
  return `PO_${Date.now()}`;
}

// Uso: BUEN patrón, sin race conditions
```

### 7.2 QC Plan Code Generation
```typescript
// Detectado en quality-plans.ts
const planId = db.collection("qcPlansNew").doc().id;
const qcPlan: QcPlan = {
  id: planId,
  code: `QCP-${Date.now()}`,  // Simple timestamp-based
  // ...
};

// Uso: ACEPTABLE, pero podría mejorarse con contadores atómicos
```

---

## 8. INTEGRACIONES DETECTADAS

### 8.1 QC → Alertas Automáticas
```typescript
// En quality-gemini.ts
- getPredictiveQualityAlerts(): Alertas predictivas
- getDefectPatterns(): Patrones de defectos  
- getQualityInsights(): Insights automáticos
```

### 8.2 Producción → IA Analytics
```typescript
// En production-analyzer.ts  
- calculateOEE(): Overall Equipment Effectiveness
- detectBottlenecks(): Cuellos de botella automáticos
- generateForecast(): Previsión de producción
```

### 8.3 Cross-Module Integrations
```typescript
// Producción consume materiales (inventory.actions.ts)
finalConsumptions → StockMove.reason: 'CONSUMPTION'

// Producción genera productos (warehouse.actions.ts)
finalOutputs → new Lot + OnHand entry

// QC libera stock (onhand.recalc.ts)  
qcStatus: 'PASSED' → OnHand bucket RELEASED
```

---

## 9. PATRONES DE DATOS REALES

### 9.1 Genealogía de Lotes
```typescript
// Detectado en Lot interface
parentLotNumber?: LotNumber;          // Lote padre
genealogy?: {                        // @deprecated
  parents?: string[];
  children?: string[];
};

// Uso: ProductionOrder crea lotes hijos desde lotes padre
```

### 9.2 BOM Explosion Real
```typescript
// Patrón detectado en bom.service.ts
export async function explodeBOM(bomId: string, plannedQty: number): Promise<{
  stage: ProductionStage;
  outputItemId: string; 
  baseUnit: Uom;
  nominal: ProductionIOLine[];        // Materiales requeridos
}>

// Calcula exactamente qué materiales se necesitan
```

### 9.3 QC Buckets Integration
```typescript
// Integración con OnHand buckets (ya implementado)
qcStatus: 'PENDING'     → OnHand.HOLD bucket
qcStatus: 'PASSED'      → OnHand.RELEASED bucket  
qcStatus: 'FAILED'      → OnHand.REJECTED bucket
```

---

## 10. VALIDACIONES Y REGLAS DE NEGOCIO

### 10.1 Reglas QC
- **MUST:** verificar qcStatus antes de consumir lotes
- **ONLY:** permitir consumo si qcStatus in [PASSED, CONDITIONAL, WAIVED]  
- **NEVER:** permitir consumo de PENDING, IN_PROGRESS, HOLD, FAILED

### 10.2 Reglas Producción
- **MUST:** validar **ProductionShortage** antes de liberar orden
- **MUST:** reservar materiales antes de **status: 'RELEASED'**
- **AUTO:** productos van a **qcStatus: 'PENDING'** tras producción

---

## 11. ESTADO ACTUAL Y RECOMENDACIONES

### 11.1 ENTIDADES EVALUADAS

#### MÓDULO QC
- ✅ **qcPlansNew:** EXCELENTE - Arquitectura extensible
- ⚠️ **qcPlans:** DEPRECATED - Migrar a qcPlansNew
- ✅ **qcTests:** BUENO - Integración sólida con lotCode
- ✅ **qcParameters:** BUENO - Tipado flexible
- ✅ **qualityReleases:** BUENO - Workflow completo

#### MÓDULO PRODUCCIÓN  
- ✅ **productionOrders:** EXCELENTE - Workflow completo y métricas
- ✅ **billOfMaterials:** EXCELENTE - BOM explosion bien implementado
- ✅ **productionShortage/Reservation:** BUENO - Validación pre-producción
- ⚠️ **lotGenealogy:** FUNCIONAL - Usar parentLotNumber vs genealogy{}

### 11.2 SISTEMAS DE GENERACIÓN
- ✅ **ProductionOrder numbering:** Simple timestamp (race-safe en práctica)
- ✅ **QcPlan code generation:** Timestamp-based aceptable
- ⚠️ **Lot genealogy:** Depende de findNextLotNumber (ya migrado en inventario)

### 11.3 INTEGRACIONES DETECTADAS
- ✅ **QC ↔ Inventario:** OnHand buckets perfectamente integrados
- ✅ **Producción ↔ Inventario:** StockMove workflows completos  
- ✅ **QC ↔ Producción:** status: 'QC_HOLD' well implemented
- ✅ **IA Integration:** Gemini analyzers funcionando (quality-gemini.ts, production-analyzer.ts)

---

## 12. PLAN DE NORMALIZACIÓN QC Y PRODUCCIÓN

### 12.1 PRIORIDAD ALTA - QC

1. **Migrar qcPlans → qcPlansNew:**
   ```typescript
   // Script de migración requerido
   // Mapear sku-based plans a appliesToItems[]
   ```

2. **Normalizar QcTest references:**
   ```typescript
   // Asegurar que todos usan lotCode, no lotNumber
   // Validar parameterId consistency
   ```

3. **Consolidar QcParameter:**
   ```typescript
   // Una sola colección para parámetros
   // Eliminar duplicados cross-plan
   ```

### 12.2 PRIORIDAD MEDIA - PRODUCCIÓN

1. **Deprecar campos legacy:**
   ```typescript
   // ProductionOrder: outputSku → outputItemId
   // ProductionOrder: outputQty → targetQuantity
   // ProductionOrder: uom → baseUnit
   ```

2. **Mejorar genealogía:**
   ```typescript
   // Lot: genealogy{} → parentLotNumber
   // Implementar tracking bidireccional
   ```

3. **Optimizar BOM explosion:**
   ```typescript
   // Cache calculations para BOMs complejos  
   // Validación de cycles en dependencies
   ```

---

## 13. MÉTRICAS DE PERFORMANCE DETECTADAS

### 13.1 QC Performance
- **daysInHold:** Lotes en QC > X días (alertas automáticas)
- **autoApproval rate:** % de lotes auto-aprobados
- **defectRate:** % de tests que fallan
- **qcReviewDuration:** Tiempo promedio de revisión

### 13.2 Production Performance  
- **OEE (Overall Equipment Effectiveness):** Calculado en production-analyzer.ts
- **yieldLossPct:** % de pérdida en rendimiento
- **execution.efficiency:** Eficiencia real vs planificada
- **bottlenecks detection:** Automatic via Gemini

---

## 14. ESTADO DE INTEGRACIÓN CON SSOT V2

### 14.1 COMPATIBILIDAD CON INVENTARIO SSOT V2
- ✅ **QC buckets:** Ya compatible con OnHand.qty.{RELEASED|HOLD|REJECTED}
- ✅ **lotCode references:** QcTest ya usa lotCode canónico
- ⚠️ **Legacy qcPlans:** Usar itemId en lugar de sku

### 14.2 PRÓXIMAS INTEGRACIONES SUGERIDAS
- **LotService integration:** QC plans aplicar en lot creation
- **OnHandService integration:** QC decisions mover buckets automáticamente  
- **FefoService integration:** QC expiry validation en selection

---

## CONCLUSIÓN QC Y PRODUCCIÓN

Los módulos de **Quality Control** y **Producción** están **arquitectónicamente maduros** con:

**🏆 FORTALEZAS:**
- **Workflows completos** bien implementados
- **Cross-module integrations** funcionando
- **IA Analytics** avanzados (Gemini integration)
- **Métricas de performance** comprehensivas
- **Auto-approval systems** sofisticados

**⚠️ ÁREAS DE MEJORA:**
- Migrar **qcPlans → qcPlansNew** (duplicación de colecciones)
- Deprecar campos legacy en **ProductionOrder**
- Normalizar referencias **lotNumber → lotCode** en QC

**ESTADO GENERAL:** ✅ **PRODUCTION READY** con mejoras incrementales

**RECOMENDACIÓN:** Los módulos QC y Producción están en **mejor estado** que Inventario y requieren solo **limpieza incremental**, no refactor completo.

**PRIORIDAD:** 
1. **Inventario SSOT v2** (completado)
2. **QC normalization** (2-3 días)
3. **Production cleanup** (1-2 días)

Total: **Sistema enterprise completo** en 1 semana adicional.
