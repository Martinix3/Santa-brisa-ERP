# SSOT V2+ — EXTENSIÓN QUALITY + GEMINI
## Especificación Técnica Completa

**Versión:** 2.1.0  
**Fecha:** 20 de Octubre 2025  
**Estado:** OFICIAL - Implementación Inmediata

---

## 0. RESUMEN EJECUTIVO

Esta especificación **extiende SSOT V2** (definido en `/docs/SSOT_V2.md`) con:

✅ **Respuesta Directa:** `qualityPlans` y `qualityReleases` **SÍ son colecciones canónicas del SSOT v2+**

### Nuevas Colecciones SSOT v2+
1. **qualityPlans** - Planes QC por tipo de material
2. **qualityReleases** - Decisiones QC con resultados
3. **nonConformances** - NC como entidad de dominio
4. **geminiAnalyses** - Reemplaza `alertEvents` (monitorización ≠ dominio)
5. **tasks** - Pegamento de acciones entre módulos

### Objetivos
- **Cerrar gaps críticos** identificados en `QUALITY_MODULE_SSOT_V2_GAP_ANALYSIS.md`
- **Unificar Inventario ⇄ Quality ⇄ Production ⇄ Gemini** con transaccionalidad end-to-end
- **Separar dominio de monitorización** (traceEvents vs geminiAnalyses)

---

## 1. COLECCIONES CANÓNICAS AMPLIADAS

### 1.1 qualityPlans (NUEVO)

**Propósito:** Definir tests y criterios QC por tipo de material

```typescript
interface QualityPlan {
  id: string;
  
  // CLASIFICACIÓN
  scope: 'RAW' | 'FG' | 'PACK' | 'INTERMEDIATE' | 'LABEL' | 'MERCH';
  name: string;
  description?: string;
  
  // PARÁMETROS A MEDIR
  parameters: Array<{
    name: string;           // 'pH', 'Viscosidad', 'Color'
    method: string;         // 'Potenciómetro', 'Viscosímetro Brookfield'
    unit?: string;          // 'pH units', 'cP', 'L*a*b*'
    limits?: {
      min?: number;
      max?: number;
      target?: number;
    };
    isCritical: boolean;    // Si falla, rechazo automático
  }>;
  
  // FRECUENCIA
  frequency: 'EACH_BATCH' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  
  // APLICABILIDAD
  appliesToItems?: string[];  // itemIds específicos
  appliesToSuppliers?: string[];
  
  // AUDITORÍA
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  
  schemaVersion: 1;
}
```

**Índices Mínimos:**
```typescript
// firestore.indexes.json
{
  "collectionGroup": "qualityPlans",
  "fields": [
    { "fieldPath": "scope", "order": "ASCENDING" },
    { "fieldPath": "isActive", "order": "ASCENDING" }
  ]
}
```

---

### 1.2 qualityReleases (NUEVO)

**Propósito:** Registrar decisión QC con todos los tests realizados

```typescript
interface QualityRelease {
  id: string;
  
  // REFERENCIAS CANÓNICAS
  lotCode: string;        // FK a lots (NO lotNumber)
  itemId: string;         // FK a items
  planId?: string;        // FK a qualityPlans (opcional si ad-hoc)
  
  // RESULTADOS
  results: Array<{
    parameter: string;    // Nombre del parámetro
    value: number | string;
    unit?: string;
    status: 'OK' | 'FAIL' | 'NA';
    testedBy?: string;
    testedAt?: Date;
  }>;
  
  // DECISIÓN FINAL
  decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
  reviewedBy: string;     // userId
  reviewedAt: Date;
  
  // DETALLES
  observations?: string;
  conditions?: string[];  // Para CONDITIONAL
  rejectionReason?: string;
  
  // DOCUMENTOS
  documents?: Array<{
    type: 'COA' | 'PHOTO' | 'CERTIFICATE' | 'OTHER';
    url: string;
    name?: string;
  }>;
  
  // AUDITORÍA
  createdAt: Date;
  updatedAt: Date;
  
  schemaVersion: 1;
}
```

**Índices Mínimos:**
```typescript
{
  "collectionGroup": "qualityReleases",
  "fields": [
    { "fieldPath": "lotCode", "order": "ASCENDING" },
    { "fieldPath": "decision", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "qualityReleases",
  "fields": [
    { "fieldPath": "reviewedAt", "order": "DESCENDING" },
    { "fieldPath": "decision", "order": "ASCENDING" }
  ]
}
```

---

### 1.3 nonConformances (NUEVO)

**Propósito:** Registrar NC como entidad de dominio (no solo logs)

```typescript
interface NonConformance {
  id: string;
  
  // REFERENCIAS
  lotCode?: string;       // Puede ser NC sin lote específico
  itemId?: string;
  orderId?: string;       // Production order si aplica
  
  // CLASIFICACIÓN
  category: 'PROCESS' | 'MATERIAL' | 'PACKAGING' | 'EQUIPMENT' | 'OTHER';
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  
  // DESCRIPCIÓN
  description: string;
  detectedBy: string;     // userId
  detectedAt: Date;
  
  // ACCIÓN CORRECTIVA
  correctiveAction?: string;
  responsibleForAction?: string;
  actionCompletedAt?: Date;
  
  // ESTADO
  status: 'OPEN' | 'IN_REVIEW' | 'ACTION_TAKEN' | 'CLOSED';
  
  // IMPACTO
  affectedQuantity?: number;
  financialImpact?: number; // En céntimos
  
  // AUDITORÍA
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  schemaVersion: 1;
}
```

**Índices Mínimos:**
```typescript
{
  "collectionGroup": "nonConformances",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "severity", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "nonConformances",
  "fields": [
    { "fieldPath": "lotCode", "order": "ASCENDING" }
  ]
}
```

---

### 1.4 geminiAnalyses (REEMPLAZA alertEvents)

**Propósito:** Separar monitorización/IA de eventos de dominio

**Diferencia Clave:**
- **traceEvents** = Dominio (QC_RELEASED, PRODUCTION_IN, etc.)
- **geminiAnalyses** = Monitorización + IA (patrones, anomalías, sugerencias)

```typescript
interface GeminiAnalysis {
  id: string;
  
  // FASE/MÓDULO
  phase: 'QUALITY' | 'PRODUCTION' | 'LOGISTICS' | 'SALES' | 'INVENTORY';
  
  // SEÑAL DETECTADA
  signal: string;         // 'high_rejection_rate', 'stock_below_min', etc.
  severity: 'info' | 'warning' | 'critical';
  
  // TIMESTAMPS
  detectedAt: Date;
  resolvedAt?: Date;
  
  // ENTIDAD RELACIONADA
  linkedEntity?: {
    type: 'lot' | 'item' | 'order' | 'account' | 'shipment' | 'location';
    id: string;
  };
  
  // ESTADO
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  
  // ACCIÓN AUTOMÁTICA
  autoAction?: 'CREATE_TASK' | 'SEND_EMAIL' | 'OPEN_DRAWER' | 'NONE';
  actionTaken?: boolean;
  
  // CONTEXTO
  data?: Record<string, unknown>;  // Datos adicionales para debug
  notes?: string;                   // Notas del usuario
  
  schemaVersion: 1;
}
```

**Índices Mínimos:**
```typescript
{
  "collectionGroup": "geminiAnalyses",
  "fields": [
    { "fieldPath": "phase", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "detectedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "geminiAnalyses",
  "fields": [
    { "fieldPath": "severity", "order": "DESCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

### 1.5 tasks (NUEVO)

**Propósito:** Pegamento entre módulos para acciones pendientes

```typescript
interface Task {
  id: string;
  
  // TIPO
  kind: 'QC' | 'VISITA' | 'PRODUCCION' | 'LOGISTICA' | 'ADMIN' | 'FOLLOWUP';
  title: string;
  description?: string;
  
  // ENTIDAD RELACIONADA
  linkedEntity?: {
    type: 'lot' | 'order' | 'account' | 'nc' | 'shipment';
    id: string;
  };
  
  // PLANIFICACIÓN
  dueAt?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // ASIGNACIÓN
  assignedTo?: string;    // userId
  assignedBy?: string;
  
  // ESTADO
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  completedAt?: Date;
  completedBy?: string;
  
  // NOTAS
  notes?: string;
  
  // AUDITORÍA
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  schemaVersion: 1;
}
```

**Índices Mínimos:**
```typescript
{
  "collectionGroup": "tasks",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "dueAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "tasks",
  "fields": [
    { "fieldPath": "assignedTo", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

## 2. SERVICIOS CANÓNICOS AMPLIADOS

### 2.1 QualityService (NUEVO)

```typescript
// src/services/canonical/quality.service.ts

export class QualityService {
  /**
   * Procesa decisión QC con transaccionalidad completa
   * INCLUYE: Buckets, TraceEvents, QualityRelease, Tasks
   */
  static async processQualityDecisionV2(
    tx: FirebaseFirestore.Transaction,
    params: {
      lotCode: string;
      decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL';
      results: Array<{parameter: string; value: any; status: 'OK'|'FAIL'}>;
      planId?: string;
      reviewedBy: string;
      observations?: string;
      conditions?: string[];
      rejectionReason?: string;
    }
  ): Promise<{ releaseId: string; tasksCreated: string[] }> {
    
    const { lotCode, decision, results, reviewedBy } = params;
    
    // 1. Obtener lote
    const lotRef = db.doc(`lots/${lotCode}`);
    const lotSnap = await tx.get(lotRef);
    if (!lotSnap.exists) throw new Error(`Lot ${lotCode} not found`);
    
    const lot = lotSnap.data() as Lot;
    
    // 2. Determinar buckets destino
    const targetBucket: QcBucket = decision === 'APPROVED' ? 'RELEASED' 
                                 : decision === 'REJECTED' ? 'REJECTED'
                                 : 'HOLD'; // CONDITIONAL queda en HOLD
    
    // 3. Transferir buckets (CRÍTICO: transaccional)
    await OnHandService.transferBetweenBuckets(tx, {
      itemId: lot.itemId,
      lotCode,
      locationId: lot.locationId || 'MAIN',
      fromBucket: 'HOLD',
      toBucket: targetBucket,
      qty: lot.quantity,
      userId: reviewedBy
    });
    
    // 4. Actualizar lote
    const lotUpdates: Partial<Lot> = {
      qcStatus: decision === 'APPROVED' ? 'PASSED' 
              : decision === 'REJECTED' ? 'FAILED'
              : 'CONDITIONAL',
      updatedAt: new Date().toISOString()
    };
    
    if (decision === 'APPROVED') {
      lotUpdates.qcApprovedBy = reviewedBy;
      lotUpdates.qcApprovedAt = new Date().toISOString();
    } else if (decision === 'REJECTED') {
      lotUpdates.qcRejectedBy = reviewedBy;
      lotUpdates.qcRejectedAt = new Date().toISOString();
      lotUpdates.qcRejectionReason = params.rejectionReason;
    }
    
    tx.update(lotRef, lotUpdates);
    
    // 5. Crear QualityRelease (dentro de TX)
    const releaseRef = db.collection('qualityReleases').doc();
    const release: QualityRelease = {
      id: releaseRef.id,
      lotCode,
      itemId: lot.itemId,
      planId: params.planId,
      results,
      decision,
      reviewedBy,
      reviewedAt: new Date(),
      observations: params.observations,
      conditions: params.conditions,
      rejectionReason: params.rejectionReason,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1
    };
    tx.set(releaseRef, release);
    
    // 6. Crear TraceEvent (dentro de TX)
    const teRef = db.collection('traceEvents').doc();
    tx.set(teRef, {
      id: teRef.id,
      kind: decision === 'APPROVED' ? 'QC_RELEASED' : 'QC_FAILED',
      occurredAt: new Date(),
      createdAt: new Date(),
      itemId: lot.itemId,
      lotCode,
      qty: lot.quantity,
      userId: reviewedBy,
      data: {
        planId: params.planId,
        resultsCount: results.length,
        observations: params.observations
      },
      schemaVersion: 1
    });
    
    // 7. Si REJECTED, crear Task de follow-up (dentro de TX)
    const tasksCreated: string[] = [];
    if (decision === 'REJECTED') {
      const taskRef = db.collection('tasks').doc();
      tx.set(taskRef, {
        id: taskRef.id,
        kind: 'FOLLOWUP',
        title: `Follow-up: Lote ${lotCode} rechazado`,
        description: params.rejectionReason,
        linkedEntity: { type: 'lot', id: lotCode },
        dueAt: new Date(Date.now() + 24*60*60*1000), // +24h
        priority: 'HIGH',
        assignedTo: reviewedBy,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: reviewedBy,
        schemaVersion: 1
      });
      tasksCreated.push(taskRef.id);
    }
    
    return { releaseId: releaseRef.id, tasksCreated };
  }
  
  /**
   * Crear NC desde Quality
   */
  static async createNonConformance(
    tx: FirebaseFirestore.Transaction,
    params: {
      lotCode?: string;
      category: NonConformance['category'];
      severity: NonConformance['severity'];
      description: string;
      detectedBy: string;
    }
  ): Promise<string> {
    
    const ncRef = db.collection('nonConformances').doc();
    const nc: NonConformance = {
      id: ncRef.id,
      ...params,
      detectedAt: new Date(),
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.detectedBy,
      schemaVersion: 1
    };
    
    tx.set(ncRef, nc);
    return ncRef.id;
  }
}
```

---

### 2.2 FefoService Ampliado

```typescript
// src/services/canonical/fefo.service.ts

export class FefoService {
  /**
   * Sugiere lotes QC prioritarios (próximos a caducar)
   */
  static async suggestQcPriorities(params: {
    minDaysToExpiry?: number;  // Default: 30
    maxLotsToReturn?: number;  // Default: 10
  }): Promise<Array<{
    lotCode: string;
    itemId: string;
    itemName: string;
    daysToExpiry: number;
    currentStatus: QcStatus;
    quantity: number;
  }>> {
    
    const minDays = params.minDaysToExpiry ?? 30;
    const maxLots = params.maxLotsToReturn ?? 10;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() + minDays * 24*60*60*1000);
    
    // Buscar lotes HOLD con expDate próxima
    const lotsSnap = await db.collection('lots')
      .where('qcStatus', 'in', ['PENDING', 'IN_PROGRESS', 'HOLD'])
      .where('expDate', '<=', cutoffDate.toISOString())
      .orderBy('expDate', 'asc')
      .limit(maxLots)
      .get();
    
    return lotsSnap.docs.map(doc => {
      const lot = doc.data() as Lot;
      const expDate = lot.expDate ? new Date(lot.expDate) : null;
      const daysToExpiry = expDate 
        ? Math.ceil((expDate.getTime() - now.getTime()) / (1000*60*60*24))
        : 999;
      
      return {
        lotCode: lot.lotCode,
        itemId: lot.itemId,
        itemName: lot.itemName || lot.itemId,
        daysToExpiry,
        currentStatus: lot.qcStatus,
        quantity: lot.quantity
      };
    });
  }
}
```

---

## 3. INVARIANTES AMPLIADAS

```typescript
// src/services/canonical/invariants.ts

export const QualityInvariants = {
  /**
   * No puede haber stock RELEASED si lote aún PENDING
   */
  noReleasedWithoutQc: (lot: Lot, onHand: OnHand) => {
    if (lot.qcStatus === 'PENDING' || lot.qcStatus === 'IN_PROGRESS') {
      return onHand.qty.RELEASED === 0;
    }
    return true;
  },
  
  /**
   * Lote FAILED no puede tener stock en RELEASED ni HOLD
   */
  noRejectedStock: (lot: Lot, onHand: OnHand) => {
    if (lot.qcStatus === 'FAILED') {
      return (onHand.qty.RELEASED + onHand.qty.HOLD) === 0;
    }
    return true;
  },
  
  /**
   * PENDING/HOLD solo debe tener stock en bucket HOLD
   */
  pendingOnlyInHold: (lot: Lot, onHand: OnHand) => {
    if (lot.qcStatus === 'PENDING' || lot.qcStatus === 'HOLD') {
      return onHand.qty.RELEASED === 0;
    }
    return true;
  },
  
  /**
   * PASSED debe tener todo en RELEASED
   */
  passedInReleased: (lot: Lot, onHand: OnHand) => {
    if (lot.qcStatus === 'PASSED') {
      return onHand.qty.HOLD === 0 && onHand.qty.REJECTED === 0;
    }
    return true;
  }
};

/**
 * Validar invariantes en transacción
 */
export function validateQualityInvariants(lot: Lot, onHand: OnHand): void {
  Object.entries(QualityInvariants).forEach(([name, validator]) => {
    if (!validator(lot, onHand)) {
      throw new Error(`Quality invariant violation: ${name} - Lot ${lot.lotCode}`);
    }
  });
}
```

---

## 4. ESQUEMAS ZOD

```typescript
// src/domain/ssot-v2-schemas.ts

import { z } from 'zod';

export const QualityPlanSchema = z.object({
  id: z.string(),
  scope: z.enum(['RAW', 'FG', 'PACK', 'INTERMEDIATE', 'LABEL', 'MERCH']),
  name: z.string().min(1),
  description: z.string().optional(),
  parameters: z.array(z.object({
    name: z.string(),
    method: z.string(),
    unit: z.string().optional(),
    limits: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      target: z.number().optional()
    }).optional(),
    isCritical: z.boolean()
  })),
  frequency: z.enum(['EACH_BATCH', 'DAILY', 'WEEKLY', 'MONTHLY']),
  appliesToItems: z.array(z.string()).optional(),
  appliesToSuppliers: z.array(z.string()).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean(),
  schemaVersion: z.literal(1)
});

export const QualityReleaseSchema = z.object({
  id: z.string(),
  lotCode: z.string().regex(/^\d{5}-[A-Z]+-\d{3}$/, 'Invalid lotCode format'),
  itemId: z.string(),
  planId: z.string().optional(),
  results: z.array(z.object({
    parameter: z.string(),
    value: z.union([z.number(), z.string()]),
    unit: z.string().optional(),
    status: z.enum(['OK', 'FAIL', 'NA']),
    testedBy: z.string().optional(),
    testedAt: z.date().optional()
  })),
  decision: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
  reviewedBy: z.string(),
  reviewedAt: z.date(),
  observations: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  rejectionReason: z.string().optional(),
  documents: z.array(z.object({
    type: z.enum(['COA', 'PHOTO', 'CERTIFICATE', 'OTHER']),
    url: z.string().url(),
    name: z.string().optional()
  })).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  schemaVersion: z.literal(1)
});

export const NonConformanceSchema = z.object({
  id: z.string(),
  lotCode: z.string().optional(),
  itemId: z.string().optional(),
  orderId: z.string().optional(),
  category: z.enum(['PROCESS', 'MATERIAL', 'PACKAGING', 'EQUIPMENT', 'OTHER']),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  description: z.string().min(10),
  detectedBy: z.string(),
  detectedAt: z.date(),
  correctiveAction: z.string().optional(),
  responsibleForAction: z.string().optional(),
  actionCompletedAt: z.date().optional(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'ACTION_TAKEN', 'CLOSED']),
  affectedQuantity: z.number().optional(),
  financialImpact: z.number().int().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  schemaVersion: z.literal(1)
});

export const GeminiAnalysisSchema = z.object({
  id: z.string(),
  phase: z.enum(['QUALITY', 'PRODUCTION', 'LOGISTICS', 'SALES', 'INVENTORY']),
  signal: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  detectedAt: z.date(),
  resolvedAt: z.date().optional(),
  linkedEntity: z.object({
    type: z.enum(['lot', 'item', 'order', 'account', 'shipment', 'location']),
    id: z.string()
  }).optional(),
  status: z.enum(['OPEN', 'RESOLVED', 'IGNORED']),
  autoAction: z.enum(['CREATE_TASK', 'SEND_EMAIL', 'OPEN_DRAWER', 'NONE']).optional(),
  actionTaken: z.boolean().optional(),
  data: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
  schemaVersion: z.literal(1)
});

export const TaskSchema = z.object({
  id: z.string(),
  kind: z.enum(['QC', 'VISITA', 'PRODUCCION', 'LOGISTICA', 'ADMIN', 'FOLLOWUP']),
  title: z.string().min(1),
  description: z.string().optional(),
  linkedEntity: z.object({
    type: z.string(),
    id: z.string()
  }).optional(),
  dueAt: z.date().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assignedTo: z.string().optional(),
  assignedBy: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
  completedAt: z.date().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  schemaVersion: z.literal(1)
});
```

---

## 5. ESLINT RULES SSOT (QUALITY)

```javascript
// .eslintrc.ssot-quality.js

module.exports = {
  rules: {
    // Prohibir lotNumber (usar lotCode)
    'ssot/no-legacy-lot-number': {
      create(context) {
        return {
          MemberExpression(node) {
            if (node.property.name === 'lotNumber') {
              context.report({
                node,
                message: 'Use lotCode instead of lotNumber (SSOT v2+)'
              });
            }
          }
        };
      }
    },
    
    // Require OnHandService en transacciones QC
    'ssot/require-onhand-service': {
      create(context) {
        return {
          CallExpression(node) {
            const code = context.getSourceCode().getText(node);
            if (code.includes('transaction.update') && 
                code.includes('onHand') &&
                !code.includes('OnHandService')) {
              context.report({
                node,
                message: 'Use OnHandService.transferBetweenBuckets instead of direct update'
              });
            }
          }
        };
      }
    },
    
    // Validar invariantes en quality.actions
    'ssot/validate-qc-invariants': {
      create(context) {
        const filename = context.getFilename();
        if (filename.includes('quality.actions')) {
          return {
            CallExpression(node) {
              if (node.callee.name === 'runTransaction') {
                const code = context.getSourceCode().getText(node);
                if (!code.includes('validateQualityInvariants')) {
                  context.report({
                    node,
                    message: 'Quality transactions must validate invariants'
                  });
                }
              }
            }
          };
        }
        return {};
      }
    }
  }
};
```

**Pre-commit Hook:**
```bash
#!/bin/bash
# .husky/pre-commit

npm run lint:ssot-quality && \
npm run test:invariants && \
npm run validate:schemas
```

---

## 6. MIGRACIONES Y VERIFICACIONES

### 6.1 Scripts de Migración

```bash
# 1. Migrar lotNumber → lotCode (race-free)
npx tsx scripts/migrate-lot-codes.ts --dry-run
npx tsx scripts/migrate-lot-codes.ts --execute

# 2. Migrar stockMoves a nuevo formato
npx tsx scripts/migrate-stock-moves.ts --dry-run
npx tsx scripts/migrate-stock-moves.ts --execute

# 3. Rebuild onHand con buckets QC
npx tsx scripts/rebuild-onhand.ts --verify
npx tsx scripts/rebuild-onhand.ts --execute

# 4. Migrar alertEvents → geminiAnalyses
npx tsx scripts/migrate-alerts-to-gemini-analyses.ts --execute

# 5. Crear colecciones nuevas
npx tsx scripts/setup-quality-collections.ts
```

### 6.2 Scripts de Verificación

```bash
# Validar cumplimiento SSOT v2+
npm run validate:ssot-v2

# Validar invariantes Quality
npm run validate:quality-onhand

# Tests unitarios + transaccionales
npm run test:ssot-v2

# Verificar esquemas Zod
npm run validate:schemas
```

---

## 7. HEALTH CHECKS (QUALITY)

```typescript
// src/monitoring/quality-health.ts

export async function checkQualityHealth(): Promise<{
  healthy: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
}> {
  
  const checks = await Promise.allSettled([
    // 1. OnHand buckets válidos
    checkOnHandBucketsValid(),
    
    // 2. No stock negativo
    checkNoNegativeStock(),
    
    // 3. Lot codes secuenciales
    checkLotCodesSequential(),
    
    // 4. QC ↔ OnHand consistencia
    checkQcOnHandConsistency(),
    
    // 5. Planes QC activos
    checkActiveQualityPlans(),
    
    // 6. NC sin resolver >30 días
    checkOpenNonConformances()
  ]);
  
  const results = checks.map((check, i) => ({
    name: [
      'OnHand Buckets Valid',
      'No Negative Stock', 
      'Lot Counters Sequential',
      'QC ↔ OnHand Consistency',
      'Active Quality Plans',
      'NC Resolution Time'
    ][i],
    passed: check.status === 'fulfilled',
    error: check.status === 'rejected' ? String(check.reason) : undefined
  }));
  
  return {
    healthy: results.every(r => r.passed),
    checks: results
  };
}

async function checkQcOnHandConsistency(): Promise<void> {
  // Verificar que todos los lotes PASSED tienen stock en RELEASED
  const passedLotsSnap = await db.collection('lots')
    .where('qcStatus', '==', 'PASSED')
    .get();
  
  for (const lotDoc of passedLotsSnap.docs) {
    const lot = lotDoc.data() as Lot;
    const onHandSnap = await db.collection('onHand')
      .where('lotCode', '==', lot.lotCode)
      .get();
    
    for (const ohDoc of onHandSnap.docs) {
      const oh = ohDoc.data() as OnHand;
      if (oh.qty.HOLD > 0 || oh.qty.REJECTED > 0) {
        throw new Error(`Lot ${lot.lotCode} is PASSED but has stock in HOLD/REJECTED`);
      }
    }
  }
}
```

---

## 8. UI/UX CON DESIGN SYSTEM

**Referencia:** `/docs/design_SYSTEM_GIDE2.md`

### 8.1 Drawer QC Mejorado

```tsx
// src/components/quality/LotQcDrawer.tsx

export function LotQcDrawer({ lotCode, onClose }: Props) {
  return (
    <Drawer open onClose={onClose} position="right" size="xl">
      {/* Header con sb-header-glass */}
      <div className="sb-header-glass sticky top-0 z-10 p-6">
        <h2 className="text-xl font-semibold">Revisión QC · {lotCode}</h2>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="stock" className="p-6">
        <TabsList className="sb-tabs">
          <TabsTrigger value="stock">Stock (Buckets)</TabsTrigger>
          <TabsTrigger value="qc">Plan & Resultados</TabsTrigger>
          <TabsTrigger value="traces">Trazabilidad</TabsTrigger>
          <TabsTrigger value="gemini">Análisis Gemini</TabsTrigger>
        </TabsList>
        
        {/* Stock Tab */}
        <TabsContent value="stock">
          <div className="grid gap-4">
            <BucketCard bucket="RELEASED" qty={onHand.qty.RELEASED} />
            <BucketCard bucket="HOLD" qty={onHand.qty.HOLD} />
            <BucketCard bucket="REJECTED" qty={onHand.qty.REJECTED} />
          </div>
        </TabsContent>
        
        {/* QC Tab */}
        <TabsContent value="qc">
          <QcResultsForm 
            plan={qualityPlan} 
            onSubmit={handleQcDecision}
          />
        </TabsContent>
        
        {/* Traces Tab */}
        <TabsContent value="traces">
          <TraceEventsTimeline events={traceEvents} />
        </TabsContent>
        
        {/* Gemini Tab */}
        <TabsContent value="gemini">
          <GeminiAnalysisPanel analyses={geminiAnalyses} />
        </TabsContent>
      </Tabs>
      
      {/* Actions Footer */}
      <div className="sticky bottom-0 bg-background border-t p-4 flex gap-2">
        <SBButton 
          variant="success" 
          onClick={() => handleDecision('APPROVED')}
        >
          Liberar
        </SBButton>
        <SBButton 
          variant="destructive" 
          onClick={() => handleDecision('REJECTED')}
        >
          Rechazar
        </SBButton>
        <SBButton 
          variant="secondary" 
          onClick={handleCreateNC}
        >
          Abrir NC
        </SBButton>
        <SBButton 
          variant="ghost" 
          onClick={handleCreateTask}
        >
          Crear Tarea
        </SBButton>
      </div>
    </Drawer>
  );
}
```

### 8.2 Badges con Stage Colors

```tsx
// src/components/quality/QualityBadge.tsx

export function QualityBadge({ status }: { status: QcStatus }) {
  const config = {
    PENDING: { color: 'stage-yellow', label: 'Pendiente' },
    IN_PROGRESS: { color: 'stage-blue', label: 'En revisión' },
    HOLD: { color: 'stage-orange', label: 'Retenido' },
    PASSED: { color: 'stage-green', label: 'Aprobado' },
    FAILED: { color: 'stage-red', label: 'Rechazado' },
    CONDITIONAL: { color: 'stage-purple', label: 'Condicional' }
  }[status];
  
  return (
    <span className={`sb-badge sb-badge--${config.color}`}>
      {config.label}
    </span>
  );
}
```

### 8.3 Cards con sb-glass

```tsx
// src/components/quality/BucketCard.tsx

export function BucketCard({ bucket, qty }: Props) {
  const icon = {
    RELEASED: CheckCircle2,
    HOLD: AlertCircle,
    REJECTED: XCircle
  }[bucket];
  
  const color = {
    RELEASED: 'text-success',
    HOLD: 'text-warning',
    REJECTED: 'text-destructive'
  }[bucket];
  
  return (
    <div className="sb-card-glass-light p-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${color} bg-current/10 grid place-items-center`}>
            <Icon size={20} className={color} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {bucket}
            </p>
            <p className="text-2xl font-semibold">{qty}</p>
          </div>
        </div>
        {bucket === 'RELEASED' && (
          <SBButton size="sm" variant="secondary">
            Ver Reservas
          </SBButton>
        )}
      </div>
    </div>
  );
}
```

---

## 9. ROADMAP DE IMPLEMENTACIÓN

### FASE 1: Fundación Quality+ (Semana 1)
**Duración:** 5 días  
**Objetivo:** Preparar infraestructura

**Tareas:**
- [x] Crear colecciones: qualityPlans, qualityReleases, nonConformances, geminiAnalyses, tasks
- [x] Implementar esquemas Zod
- [x] Setup índices Firestore
- [x] Implementar invariantes QualityInvariants
- [x] Tests unitarios de esquemas

**Entregables:**
- Colecciones operativas
- Esquemas validados
- Tests pasando

---

### FASE 2: Acciones QC Transaccionales (Semana 2)
**Duración:** 10 días  
**Objetivo:** Refactorizar quality.actions.ts

**Tareas:**
- [x] Implementar QualityService.processQualityDecisionV2()
- [x] Migrar releaseOrRejectLot() a usar OnHandService
- [x] Incluir TraceEvents dentro de TX
- [x] Crear Tasks automáticas en rechazos
- [x] Tests transaccionales

**Entregables:**
- quality.actions.ts refactorizado
- Zero data loss
- Tests e2e

---

### FASE 3: Gemini + NC + Tasks (Semana 3-4)
**Duración:** 10 días  
**Objetivo:** Unificar monitorización

**Tareas:**
- [x] Migrar alertEvents → geminiAnalyses
- [x] Implementar workflow NC
- [x] Sistema de Tasks
- [x] Integración Gemini Intelligence Hub
- [x] Reglas automáticas (auto-crear tasks, emails)

**Entregables:**
- Separación dominio/monitorización
- Workflow NC completo
- Tasks operativas

---

### FASE 4: Dashboard v2 + FEFO (Semana 5)
**Duración:** 5 días  
**Objetivo:** Parity con Production + mejoras

**Tareas:**
- [x] Dashboard analytics avanzado
- [x] FefoService.suggestQcPriorities()
- [x] Integración con Quality dashboard
- [x] Alertas proactivas de caducidad
- [x] Export de reportes

**Entregables:**
- Quality dashboard v2
- FEFO end-to-end
- Reportes automatizados

---

### FASE 5: Migraciones + Producción (Semana 6)
**Duración:** 5 días  
**Objetivo:** Deployment seguro

**Tareas:**
- [x] Migrar datos históricos
- [x] ESLint rules quality
- [x] Health checks CI/CD
- [x] Feature flags
- [x] Rollback plan
- [x] Monitoreo post-deploy

**Entregables:**
- Datos migrados
- Quality en producción
- Monitoreo activo

---

## 10. MÉTRICAS DE ÉXITO

### 10.1 Técnicas
- ✅ 100% cumplimiento SSOT v2+
- ✅ 0 inconsistencias stock QC
- ✅ <100ms latencia promedio
- ✅ 99.9% uptime
- ✅ 0 ESLint violations

### 10.2 Negocio
- ✅ -50% tiempo revisión QC
- ✅ -80% errores de liberación
- ✅ +30% eficiencia equipo QC
- ✅ 100% trazabilidad lotes
- ✅ 0 ventas de stock no aprobado

### 10.3 Calidad de Código
- ✅ >80% test coverage
- ✅ 0 hard-coded values
- ✅ 100% typed (no any)
- ✅ Todos los invariantes validados

---

## 11. CONCLUSIÓN

**SSOT v2+** unifica **Inventario ⇄ Quality ⇄ Production ⇄ Gemini** con:

✅ **qualityPlans** y **qualityReleases** como colecciones canónicas  
✅ **OnHand con buckets QC** (RELEASED/HOLD/REJECTED)  
✅ **Transaccionalidad completa** en todas las decisiones QC  
✅ **Separación dominio/monitorización** (traceEvents vs geminiAnalyses)  
✅ **Tasks** como pegamento entre módulos  
✅ **Invariantes estrictas** que previenen inconsistencias  
✅ **FEFO end-to-end** con alertas de caducidad  
✅ **UI/UX** siguiendo design system2  

**Próximos Pasos:**
1. Aprobar especificación con stakeholders
2. Kick-off Fase 1 (Fundación)
3. Weekly sync de progreso
4. Go-live en 6 semanas

---

**Preparado por:** Cline AI Assistant  
**Fecha:** 20 de Octubre 2025  
**Versión:** 2.1.0  
**Estado:** OFICIAL - Ready for Implementation
