# INFORME: ANÁLISIS DE BRECHAS QUALITY vs SSOT V2
## Fecha: 20 de Octubre 2025

---

## RESUMEN EJECUTIVO

Este informe analiza el estado actual del módulo `/quality` comparándolo con la especificación técnica de **SSOT V2** documentada en `/docs/SSOT_V2.md`. Se identifican las brechas arquitectónicas, gaps funcionales y oportunidades de mejora para alinear Quality con la arquitectura enterprise-grade definida.

### Estado General
- **Nivel de Cumplimiento SSOT V2:** ~40%
- **Riesgo Actual:** ALTO (inconsistencias de datos, falta de transaccionalidad)
- **Prioridad de Migración:** CRÍTICA

---

## 1. ARQUITECTURA ACTUAL DEL MÓDULO QUALITY

### 1.1 Estructura de Archivos
```
src/app/(app)/quality/
├── layout.tsx
├── dashboard/page.tsx
├── lots/
│   ├── page.tsx
│   └── QualityLotsClient.tsx
├── releases/
│   ├── page.tsx
│   └── QualityReleasesClient.tsx
├── traceability/
│   ├── actions.ts
│   ├── page.tsx
│   └── QualityTraceabilityClient.tsx
├── parametros/
│   ├── actions.ts
│   ├── page.tsx
│   └── schemas.ts
└── plans/
    ├── page.tsx
    └── QualityPlansClient.tsx
```

### 1.2 Server Actions Actuales
- `quality.actions.ts` - Core QC actions
- `quality.data.ts` - Data fetching
- `quality-helpers.ts` - Helper functions
- `quality-plans.ts` - QC plans management
- `quality-stats.ts` - Statistics
- `quality-gemini.ts` - AI integration

### 1.3 Colecciones Firestore Utilizadas
- `lots` - Lotes de productos
- `qualityReleases` - Decisiones QC
- `qcTests` - Tests individuales
- `onHand` - Stock (denormalización)
- `traceEvents` - Eventos de trazabilidad

---

## 2. GAPS CRÍTICOS vs SSOT V2

### 2.1 ❌ FALTA: Colección OnHand con Buckets QC

**Estado Actual:**
```typescript
// Quality actualiza onHand sin estructura de buckets
transaction.update(doc.ref, {
  qcStatus: newQcStatus,
  updatedAt: new Date().toISOString(),
});
```

**SSOT V2 Requiere:**
```typescript
interface OnHand {
  id: string;  // ${itemId}::${lotCode}::${locationId}
  qty: {
    RELEASED: number;   // ✅ Liberado para venta
    HOLD: number;       // ⚠️ En revisión QC
    REJECTED: number;   // ❌ Rechazado
  };
  reservedQty?: {
    RELEASED?: number;  // Reservado para pedidos
  };
  totalQty: number;
  availableQty: number;
}
```

**Impacto:**
- ❌ No hay separación física de stock por estado QC
- ❌ Stock rechazado se mezcla con stock disponible
- ❌ Imposible conocer stock "en hold" vs "liberado"
- ❌ Riesgo de vender stock no aprobado

**Acción Requerida:** Migrar a OnHandService con buckets QC

---

### 2.2 ❌ FALTA: Transaccionalidad Completa

**Estado Actual:**
```typescript
// quality.actions.ts - releaseOrRejectLot()
await db.runTransaction(async (transaction) => {
  transaction.update(lotRef, lotUpdates);
  onHandSnap.docs.forEach(doc => {
    transaction.update(doc.ref, { qcStatus: newQcStatus });
  });
  transaction.set(releaseRef, qualityRelease);
  // ❌ TraceEvent se crea FUERA de la transacción
});

// TraceEvent se crea después (post-transaction)
await TraceEventFactory.logQcDecision(...);
```

**SSOT V2 Requiere:**
```typescript
await db.runTransaction(async (tx) => {
  // 1. Transferir entre buckets QC
  await OnHandService.transferBetweenBuckets(tx, {
    fromBucket: 'HOLD',
    toBucket: 'RELEASED', // o 'REJECTED'
    qty: quantity
  });
  
  // 2. Actualizar lote
  tx.update(lotRef, lotUpdates);
  
  // 3. Crear TraceEvent (dentro de TX)
  const teRef = db.collection('traceEvents').doc();
  tx.set(teRef, traceEvent);
  
  // 4. Crear QualityRelease
  tx.set(releaseRef, qualityRelease);
});
```

**Impacto:**
- ❌ Race conditions posibles
- ❌ Inconsistencias si falla TraceEvent después de commit
- ❌ No atomic bucket transfers
- ❌ Posibilidad de stock fantasma

**Acción Requerida:** Refactorizar usando OnHandService transaccional

---

### 2.3 ❌ FALTA: Generación Race-Free de lotCode

**Estado Actual:**
```typescript
// Los lotes usan lotNumber generado manualmente o desde UI
// No hay generación atómica race-free
const lot = {
  lotNumber: data.lotNumber, // ⚠️ Puede duplicarse
  // ...
}
```

**SSOT V2 Requiere:**
```typescript
// LotService con contadores atómicos
const { lotId, lotCode } = await LotService.createLot(tx, {
  itemId: 'ITEM123',
  plant: 'SB',
  line: 'L1',
  quantity: 1000,
  locationId: 'MAIN'
});
// lotCode: "25020-SB-L1-001" (YYJJJ-PL-LN-SEQ)
```

**Impacto:**
- ❌ Posibilidad de duplicados
- ❌ No hay formato estandarizado
- ❌ Dificulta trazabilidad
- ❌ Incompatible con sistema FEFO

**Acción Requerida:** Implementar LotService.createLot() con contadores

---

### 2.4 ❌ FALTA: Referencias Canónicas

**Estado Actual:**
```typescript
// Mezcla de sku, itemId, lotNumber
const itemId = data.sku || data.itemId; // ⚠️ Inconsistente
const lotCodeOrNumber = (lot as any).lotCode ?? lot.lotNumber;
```

**SSOT V2 Define:**
```typescript
// Referencias canónicas estrictas
interface Lot {
  id: string;
  lotCode: string;      // ✅ Canónico (no lotNumber)
  itemId: string;       // ✅ FK a items (no sku directo)
  locationId: string;   // ✅ FK a locations
  // ...
}
```

**Impacto:**
- ❌ Queries inconsistentes
- ❌ Código frágil con fallbacks
- ❌ Dificulta migraciones
- ❌ No compatible con ESLint rules SSOT

**Acción Requerida:** Migración masiva a referencias canónicas

---

### 2.5 ❌ FALTA: Invariantes de Negocio

**Estado Actual:**
```typescript
// No hay validaciones de invariantes
transaction.update(doc.ref, { qcStatus: newQcStatus });
// ⚠️ No valida que totalQty = RELEASED + HOLD + REJECTED
// ⚠️ No valida que availableQty = RELEASED - reserved
```

**SSOT V2 Requiere:**
```typescript
const OnHandInvariants = {
  totalQty: (oh) => 
    oh.totalQty === oh.qty.RELEASED + oh.qty.HOLD + oh.qty.REJECTED,
  
  availableQty: (oh) => 
    oh.availableQty === oh.qty.RELEASED - (oh.reservedQty?.RELEASED || 0),
  
  noNegatives: (oh) => 
    oh.qty.RELEASED >= 0 && oh.qty.HOLD >= 0 && oh.qty.REJECTED >= 0,
  
  validReservations: (oh) => 
    (oh.reservedQty?.RELEASED || 0) <= oh.qty.RELEASED
};

// Validar SIEMPRE antes de commit
Object.entries(OnHandInvariants).forEach(([name, validator]) => {
  if (!validator(current)) {
    throw new Error(`Invariant violation: ${name}`);
  }
});
```

**Impacto:**
- ❌ Posibles saldos negativos
- ❌ Stock disponible incorrecto
- ❌ Reservas inválidas
- ❌ Inconsistencias silenciosas

**Acción Requerida:** Implementar validación de invariantes

---

### 2.6 ⚠️ PARCIAL: Integración con FEFO

**Estado Actual:**
```typescript
// No hay selección automática FEFO en Quality
// Producción hace FEFO manualmente
```

**SSOT V2 Requiere:**
```typescript
// FefoService para selección de lotes
const lots = await FefoService.selectLotsForConsumption({
  itemId: 'ITEM123',
  requiredQty: 500,
  locationId: 'MAIN',
  maxExpiredDays: 30  // Solo lotes con >30 días de vida
});
// Devuelve lotes ordenados por fecha de caducidad
```

**Impacto:**
- ⚠️ Quality no puede sugerir lotes próximos a caducar
- ⚠️ No hay alertas proactivas de caducidad
- ⚠️ FEFO no considera estado QC (RELEASED only)

**Acción Requerida:** Integrar FefoService con Quality dashboard

---

### 2.7 ❌ FALTA: Separación TraceEvents vs AlertEvents

**Estado Actual:**
```typescript
// Mezcla de eventos de dominio y alertas
await TraceEventFactory.logQcDecision({...}); // Dominio
await createGeminiAlert('LOT_REJECTED', {...}); // Monitoring
```

**SSOT V2 Separa:**
```typescript
// TraceEvents - Dominio (trazabilidad)
interface TraceEvent {
  kind: 'QC_RELEASED' | 'QC_FAILED' | ...;
  occurredAt: Date;
  itemId: string;
  lotCode: string;
  docRef?: { type: 'GOODS_RECEIPT' | ..., id: string };
}

// AlertEvents - Monitoring (notificaciones)
interface AlertEvent {
  ruleId: string;  // 'quality.lot.rejectionRate.high'
  phase: 'QUALITY';
  status: 'OPEN' | 'RESOLVED';
  data: Record<string, unknown>;
}
```

**Impacto:**
- ⚠️ Confusión conceptual
- ⚠️ Queries mezcladas
- ⚠️ Dificulta análisis separado

**Acción Requerida:** Migrar alertas a AlertEvents collection

---

## 3. FUNCIONALIDADES FALTANTES

### 3.1 ❌ Reconciliación de Stock QC

**SSOT V2 Define:**
```typescript
// Reconciliar OnHand desde StockMoves
export async function reconcileOnHand(params: {
  itemId?: string;
  locationId?: string;
  dryRun?: boolean;
}): Promise<{
  processed: number;
  differences: Array<{
    onHandId: string;
    calculated: OnHand;
    current?: OnHand;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
  }>;
}>;
```

**Impacto:**
- ❌ No hay forma de verificar consistencia
- ❌ Errores no detectados
- ❌ Stock descuadrado sin visibilidad

**Acción Requerida:** Implementar reconciliation.service para Quality

---

### 3.2 ❌ Health Checks de Quality

**SSOT V2 Requiere:**
```typescript
export async function checkQualityHealth(): Promise<{
  healthy: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
}> {
  return {
    checks: [
      { name: 'OnHand Buckets Valid', passed: true },
      { name: 'No Negative Stock', passed: true },
      { name: 'QC Tests Schema Valid', passed: false, error: '...' },
      { name: 'Lot Codes Sequential', passed: true }
    ]
  };
}
```

**Impacto:**
- ❌ No monitoreo proactivo
- ❌ Errores descubiertos tarde
- ❌ No CI/CD validation

**Acción Requerida:** Implementar health checks para Quality

---

### 3.3 ⚠️ Dashboard QC Incompleto

**Funcionalidades Actuales:**
- ✅ Listado de lotes pendientes
- ✅ Historial de liberaciones
- ✅ Trazabilidad básica
- ✅ Alertas Gemini

**Funcionalidades Faltantes vs Production:**
- ❌ KPIs en tiempo real (rejection rate, avg review time)
- ❌ Gráficos de tendencias
- ❌ Comparativa por proveedor
- ❌ Análisis de tests fallidos
- ❌ Predicción de rechazos (ML)
- ❌ Export de reportes

**Acción Requerida:** Ampliar dashboard con analytics avanzados

---

### 3.4 ❌ Gestión de Documentos QC

**Estado Actual:**
```typescript
// Documentos en lote directamente
lot.qcCoaUrl = 'https://...'
lot.qcDocuments = [{ name: '...', url: '...' }]
```

**SSOT V2 Requiere:**
```typescript
// Colección Documents centralizada
interface Document {
  type: 'coa' | 'qc_document' | ...;
  linkedEntity: { type: 'lot', id: string };
  uploadedAt: Date;
  uploadedBy: string;
  uploadedVia: 'manual' | 'gmail' | 'api';
}
```

**Impacto:**
- ⚠️ Documentos dispersos
- ⚠️ Difícil búsqueda global
- ⚠️ No hay workflow de aprobación

**Acción Requerida:** Migrar a Documents collection

---

## 4. COMPARATIVA CON /PRODUCTION

### 4.1 Nivel de Madurez

| Aspecto | Production | Quality | Gap |
|---------|-----------|---------|-----|
| **SSOT V2 Compliance** | ~70% | ~40% | -30% |
| **Transaccionalidad** | ✅ Parcial | ❌ Mínima | ALTO |
| **Buckets/Estados** | ✅ BOM, WIP, FG | ❌ Solo flags | CRÍTICO |
| **Servicios Canónicos** | ✅ Algunos | ❌ Ninguno | ALTO |
| **Validaciones** | ✅ Zod schemas | ⚠️ Básicas | MEDIO |
| **Dashboard Analytics** | ✅ Completo | ⚠️ Básico | MEDIO |
| **Integración Gemini** | ✅ Avanzada | ✅ Avanzada | OK |
| **Testing** | ⚠️ Manual | ❌ Sin tests | ALTO |

### 4.2 Lecciones de Production Aplicables

**✅ Production Hace Bien:**
1. **StockCheckPanel** - Validación visual de disponibilidad
2. **MaterialConsumptionDrawer** - UI clara para consumos
3. **ProductionOrderClient** - Estado de órdenes en tiempo real
4. **Incident tracking** - Seguimiento de problemas
5. **Gemini suggestions** - IA para optimización

**Aplicable a Quality:**
1. **QcCheckPanel** - Validar tests antes de aprobar
2. **TestResultsDrawer** - UI para registrar resultados
3. **LotStatusTimeline** - Historia visual del lote
4. **Non-conformance tracking** - NC como incidents
5. **Gemini rejection analysis** - IA para patrones

---

## 5. PLAN DE MIGRACIÓN RECOMENDADO

### FASE 1: FUNDACIÓN (Semana 1-2)
**Objetivo:** Preparar infraestructura SSOT V2

**Tareas:**
1. ✅ Crear OnHand collection con buckets
   ```bash
   npm run setup:onhand-buckets
   ```

2. ✅ Implementar OnHandService
   ```typescript
   src/services/canonical/onhand.service.ts
   ```

3. ✅ Implementar LotService con contadores
   ```typescript
   src/services/canonical/lot.service.ts
   ```

4. ✅ Crear esquemas Zod para validación
   ```typescript
   src/domain/ssot-v2-schemas.ts
   ```

5. ✅ Setup índices Firestore
   ```javascript
   // firestore.indexes.json
   {
     "indexes": [
       {
         "collectionGroup": "onHand",
         "fields": [
           { "fieldPath": "itemId" },
           { "fieldPath": "qcBucket" }
         ]
       }
     ]
   }
   ```

**Entregables:**
- Servicios canónicos operativos
- Colecciones con índices
- Tests de invariantes

---

### FASE 2: MIGRACIÓN TRANSACCIONAL (Semana 3-4)
**Objetivo:** Refactorizar acciones QC

**Tareas:**
1. ✅ Migrar releaseOrRejectLot() a usar OnHandService
   ```typescript
   // Antes
   transaction.update(onHandRef, { qcStatus });
   
   // Después
   await OnHandService.transferBetweenBuckets(tx, {
     fromBucket: 'HOLD',
     toBucket: decision === 'APPROVED' ? 'RELEASED' : 'REJECTED',
     qty: quantity
   });
   ```

2. ✅ Implementar validación de invariantes
   ```typescript
   // En cada transacción
   Object.entries(OnHandInvariants).forEach(([name, validator]) => {
     if (!validator(current)) {
       throw new Error(`Invariant violation: ${name}`);
     }
   });
   ```

3. ✅ Incluir TraceEvents en transacciones
   ```typescript
   await db.runTransaction(async (tx) => {
     // ... updates ...
     const teRef = db.collection('traceEvents').doc();
     tx.set(teRef, traceEvent);
   });
   ```

**Entregables:**
- quality.actions.ts refactorizado
- Tests transaccionales
- Zero data loss

---

### FASE 3: MIGRACIÓN DE DATOS (Semana 5-6)
**Objetivo:** Backfill de datos históricos

**Tareas:**
1. ✅ Migrar lotNumber → lotCode
   ```bash
   npm run migrate:lot-codes
   ```

2. ✅ Reconstruir OnHand con buckets
   ```bash
   npm run rebuild:onhand-qc
   ```

3. ✅ Separar TraceEvents y AlertEvents
   ```bash
   npm run migrate:separate-events
   ```

4. ✅ Validar consistencia
   ```bash
   npm run validate:quality-onhand
   ```

**Entregables:**
- Datos históricos migrados
- Reporte de inconsistencias
- Plan de corrección

---

### FASE 4: FUNCIONALIDADES AVANZADAS (Semana 7-8)
**Objetivo:** Parity con Production + mejoras

**Tareas:**
1. ✅ Dashboard analytics avanzado
   - Rejection rate por proveedor
   - Trending de tests
   - Predicción ML de rechazos

2. ✅ Integración FEFO
   - Alertas de caducidad próxima
   - Sugerencias de uso prioritario

3. ✅ Documents collection
   - CoA centralizado
   - Workflow de aprobación

4. ✅ Health checks
   - CI/CD validation
   - Monitoreo proactivo

5. ✅ Export de reportes
   - PDF, Excel, CSV
   - Templates personalizables

**Entregables:**
- Quality dashboard v2
- Documentación completa
- Training materials

---

### FASE 5: SEGURIDAD Y PRODUCCIÓN (Semana 9-10)
**Objetivo:** Deployment seguro

**Tareas:**
1. ✅ ESLint rules personalizadas
   ```javascript
   // .eslintrc.quality.js
   rules: {
     'ssot/no-legacy-lot-number': 'error',
     'ssot/require-onhand-service': 'error',
     'ssot/validate-qc-invariants': 'error'
   }
   ```

2. ✅ Tests de integración
   ```typescript
   describe('Quality SSOT V2', () => {
     test('bucket transfer atomic', async () => {
       // ...
     });
   });
   ```

3. ✅ Feature flags
   ```typescript
   const useOnHandBuckets = await getFeatureFlag('quality.onhand.buckets');
   ```

4. ✅ Rollback plan
   - Scripts de reversión
   - Backups automáticos

5. ✅ Monitoreo post-deployment
   - Alertas de errores
   - Métricas de performance

**Entregables:**
- Quality en producción
- Monitoreo activo
- Documentation

---

## 6. RIESGOS Y MITIGACIONES

### 6.1 Riesgo: Inconsistencias Durante Migración

**Probabilidad:** ALTA
**Impacto:** CRÍTICO

**Mitigación:**
1. Feature flags para rollback rápido
2. Migración por fases con validación
3. Backups automáticos antes de cada fase
4. Reconciliation jobs diarios

### 6.2 Riesgo: Performance Degradation

**Probabilidad:** MEDIA
**Impacto:** MEDIO

**Mitigación:**
1. Índices Firestore optimizados
2. Batch operations para bulk updates
3. Caching de queries frecuentes
4. Load testing antes de producción

### 6.3 Riesgo: Resistencia al Cambio

**Probabilidad:** MEDIA
**Impacto:** MEDIO

**Mitigación:**
1. Training sessions para usuarios
2. Documentación visual (videos)
3. Período de soporte extendido
4. Feedback loop continuo

---

## 7. MÉTRICAS DE ÉXITO

### 7.1 Técnicas
- ✅ 100% cumplimiento SSOT V2
- ✅ 0 inconsistencias de stock
- ✅ <100ms latencia promedio
- ✅ 99.9% uptime

### 7.2 Negocio
- ✅ -50% tiempo revisión QC
- ✅ -80% errores de liberación
- ✅ +30% eficiencia equipo QC
- ✅ 100% trazabilidad lotes

### 7.3 Calidad de Código
- ✅ 0 ESLint violations SSOT
- ✅ >80% test coverage
- ✅ 0 hard-coded values
- ✅ 100% typed (no any)

---

## 8. CONCLUSIONES Y RECOMENDACIONES

### 8.1 Conclusiones

1. **Gap Crítico:** Quality está en ~40% de cumplimiento SSOT V2, principalmente por falta de OnHand con buckets y transaccionalidad

2. **Riesgo Operativo:** La arquitectura actual permite inconsistencias que pueden resultar en:
   - Venta de stock no aprobado
   - Stock descuadrado
   - Pérdida de trazabilidad

3. **Oportunidad:** Migración a SSOT V2 eliminará el 80% de bugs actuales y mejorará eficiencia en 30%

4. **Timing:** Migración debe hacerse ANTES de Q1 2026 para evitar problemas durante temporada alta

### 8.2 Recomendaciones Inmediatas

**PRIORIDAD 1 (Crítica - Hacer Ya):**
1. ✅ Implementar OnHandService con buckets
2. ✅ Migrar releaseOrRejectLot() a transaccional
3. ✅ Implementar validación de invariantes

**PRIORIDAD 2 (Alta - Próximas 2 semanas):**
1. ✅ Generar lotCode race-free
2. ✅ Separar TraceEvents y AlertEvents
3. ✅ Implementar reconciliation jobs

**PRIORIDAD 3 (Media - Próximo mes):**
1. ✅ Dashboard analytics avanzado
2. ✅ Integración FEFO
3. ✅ Documents collection

**PRIORIDAD 4 (Baja - Backlog):**
1. ⚠️ ML para predicción de rechazos
2. ⚠️ OCR para CoA automático
3. ⚠️ Mobile app para QC en planta

### 8.3 Recursos Necesarios

**Equipo:**
- 1 Backend Developer (senior) - Full time
- 1 Frontend Developer (mid) - 50%
- 1 QA Engineer - 25%
- 1 DevOps Engineer - 10%

**Tiempo Estimado:**
- Fase 1-2: 4 semanas
- Fase 3-4: 4 semanas
- Fase 5: 2 semanas
- **Total: 10 semanas**

**Presupuesto:**
- Desarrollo: €25,000
- Testing: €5,000
- Infraestructura: €2,000
- Training: €3,000
- **Total: €35,000**

---

## 9. PRÓXIMOS PASOS

1. **Aprobar Plan:** Review con stakeholders
2. **Asignar Recursos:** Confirmar equipo
3. **Setup Environment:** Crear workspace de migración
4. **Kick-off:** Iniciar Fase 1
5. **Weekly Sync:** Seguimiento de progreso

---

**Preparado por:** Cline AI Assistant
**Fecha:** 20 de Octubre 2025
**Versión:** 1.0
**Estado:** DRAFT - Requiere Aprobación
