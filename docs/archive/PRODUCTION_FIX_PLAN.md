# 🔧 PLAN DE CORRECCIÓN INMEDIATA - MÓDULO PRODUCCIÓN

**Fecha de inicio:** 18 de Octubre de 2025  
**Duración estimada:** 1-2 días  
**Objetivo:** Alinear módulo de producción con SSOT y corregir bugs críticos

---

## 📋 CHECKLIST DE EJECUCIÓN

### FASE 1: PREPARACIÓN (30 min)
- [ ] Crear rama `fix/production-ssot-alignment`
- [ ] Backup de archivos a modificar
- [ ] Revisar SSOT actual en `src/domain/ssot.ts`

### FASE 2: SSOT - DEFINIR TIPOS FALTANTES (2-3h)
- [ ] Añadir `ProductionShortage` type
- [ ] Añadir `ProductionReservation` type  
- [ ] Añadir `ProductionOutput` type
- [ ] Añadir `ProductionConsumption` type
- [ ] Añadir `ProductionIncident` type
- [ ] Actualizar `ProductionOrder` interface
- [ ] Hacer `BillOfMaterial.items.role` requerido

### FASE 3: EXECUTION - MIGRAR CAMPOS DEPRECATED (1-2h)
- [ ] Reemplazar `outputSku` → `outputItemId`
- [ ] Reemplazar `outputQty` → `targetQuantity`
- [ ] Reemplazar `uom` → `baseUnit`
- [ ] Eliminar campo custom `plannedDate`
- [ ] Usar `scheduledFor` del SSOT
- [ ] Actualizar tipos en `ActiveFormState`

### FASE 4: BOM - CORREGIR BUGS (1h)
- [ ] Importar componente `SBDialog`
- [ ] Unificar variable `setCreateOpen`
- [ ] Validar campo `role` con default

### FASE 5: DASHBOARD - DATOS REALES (2h)
- [ ] Eliminar array hardcodeado de tareas
- [ ] Integrar `data?.tasks` real
- [ ] Persistir análisis IA en localStorage

### FASE 6: TESTING Y VALIDACIÓN (1h)
- [ ] Verificar compilation sin errores
- [ ] Test manual de flujo completo
- [ ] Validar que datos se guardan correctamente

---

## 🎯 CAMBIOS DETALLADOS POR ARCHIVO

### 1. `src/domain/ssot.ts` ⚙️

**Cambios a realizar:**

```typescript
// ============================================
// AÑADIR ESTOS TIPOS AL FINAL DE LA SECCIÓN 2
// ============================================

// Production-specific types (más específicos que any[])
export type ProductionShortage = {
  itemId: string;
  itemName?: string;
  required: number;
  available: number;
  shortfall: number;
  locationId?: string;
};

export type ProductionReservation = {
  itemId: string;
  itemName?: string;
  lotNumber: string;
  qty: number;
  uom: Uom;
  locationId: string;
  reservedAt: ISODateString;
  reservedBy?: string;
};

export type ProductionOutput = {
  itemId: string;
  lotNumber: string;
  qty: number;
  uom: Uom;
  toLocationId: string;
  qcStatus?: QcStatus;
  createdAt: ISODateString;
};

export type ProductionConsumption = {
  itemId: string;
  itemName?: string;
  lotNumber: string;
  qty: number;
  uom: Uom;
  fromLocationId: string;
  consumedAt: ISODateString;
  batchNumber?: string;
};

export type ProductionIncident = {
  id: string;
  kind: 'QUALITY' | 'EQUIPMENT' | 'MATERIAL' | 'SAFETY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  reportedAt: ISODateString;
  reportedBy: string;
  resolvedAt?: ISODateString;
  resolution?: string;
};

// ============================================
// ACTUALIZAR ProductionOrder
// ============================================

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  /** @deprecated Use orderNumber */
  code?: string;
  
  bomId: string;
  
  // ✅ CAMPOS CANÓNICOS (NO deprecated)
  outputItemId: string;
  targetQuantity: number;
  baseUnit: Uom;
  
  // ❌ CAMPOS DEPRECATED (mantener para compatibilidad)
  /** @deprecated Use outputItemId */
  outputSku?: string;
  /** @deprecated Use targetQuantity */
  outputQty?: number;
  /** @deprecated Use baseUnit */
  uom?: Uom;
  
  status: ProductionStatus;
  
  createdAt: Timestamp;
  scheduledFor?: Timestamp;
  responsibleId?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  
  pauseLog?: {
    pausedAt: Timestamp;
    resumedAt?: Timestamp;
    reason?: string;
  }[];
  
  execution?: {
    finishedAt?: Timestamp;
    goodUnits?: number;
    durationHours?: number;
    efficiency?: number;
  };
  
  costing?: {
    actual?: {
      perUnit?: number;
      yieldLossPct?: number;
      totalCost?: number;
    };
  };
  
  // ✅ TIPADO CORRECTO (ya no any[])
  shortages?: ProductionShortage[];
  reservations?: ProductionReservation[];
  incidents?: ProductionIncident[];
  finalOutputs?: ProductionOutput[];
  finalConsumptions?: ProductionConsumption[];
  
  journal?: JournalEntry[];
  checks?: boolean[];
  updatedAt?: Timestamp;
  
  bottlenecks?: {
    id: string;
    area: string;
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedAction?: string;
    detectedAt: ISODateString;
  }[];
}

// ============================================
// ACTUALIZAR BillOfMaterial
// ============================================

export interface BillOfMaterial {
  id: string;
  outputItemId: string;
  name: string;
  stage?: ProductionStage;
  batchSize: number;
  baseUnit: Uom;
  items: {
    itemId: string;
    qty: number;
    uom: Uom;
    role: 'FORMULA' | 'PACKAGING' | 'COST_ONLY';  // ✅ YA NO OPCIONAL
  }[];
  isActive?: boolean;
  version?: number;
  previousVersionId?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}
```

**Validación:**
```bash
# Verificar que compile sin errores
npm run type-check
```

---

### 2. `src/app/(app)/production/execution/page.tsx` 🔄

**Búscar y reemplazar:**

```typescript
// ❌ ANTES
const outputSku = order.outputSku ?? '';
const outputQty = order.outputQty ?? 1;

// ✅ DESPUÉS
const outputSku = order.outputItemId ?? '';
const outputQty = order.targetQuantity ?? 1;
```

```typescript
// ❌ ANTES
type ActiveFormState = {
  shortages: any[];
  requiredLots: any[];
  journal?: any[];
  plannedDate?: string;  // ❌ Campo custom
};

// ✅ DESPUÉS
import type { 
  ProductionShortage, 
  ProductionReservation, 
  JournalEntry 
} from '@/domain/ssot';

type ActiveFormState = {
  order: ProductionOrder | null;
  planningBom: RecipeBom | null;
  finalOutput: FormOutput;
  realConsumption: FormConsumptionLine[];
  stockOk: boolean;
  shortages: ProductionShortage[];      // ✅ Tipado correcto
  requiredLots: ProductionReservation[]; // ✅ Tipado correcto
  responsibleId?: string;
  protocolChecks?: boolean[];
  incidentText?: string;
  incidentSeverity?: 'LOW' | 'MEDIUM' | 'HIGH';
  journal?: JournalEntry[];              // ✅ Tipado correcto
  // ❌ ELIMINAR plannedDate, usar scheduledFor del order
};
```

```typescript
// ❌ ANTES
setActiveForm({
  // ...
  finalOutput: {
    sku: bom.outputItemId,
    qty: 1,
    uom: toUom(bom.stage === "ENVASADO" ? "unit" : "L"),
    toLocationId: 'FG/MAIN',
    lotNumber: ''
  },
  // ...
  plannedDate: new Date().toISOString().slice(0, 10)  // ❌
});

// ✅ DESPUÉS
setActiveForm({
  // ...
  finalOutput: {
    sku: bom.outputItemId,
    qty: 1,
    uom: toUom(bom.stage === "ENVASADO" ? "unit" : "L"),
    toLocationId: 'FG/MAIN',
    lotNumber: ''
  },
  // ...
  // Usar scheduledFor directamente en el order cuando se cree
});
```

**En el handler de planificación:**

```typescript
// ✅ ACTUALIZAR
const handleProgram = async () => {
  if (!activeForm?.planningBom) return;
  const planQty = activeForm.finalOutput.qty ?? 1;
  if (planQty <= 0) {
    toast.error("La cantidad debe ser mayor que cero.");
    return;
  }

  const res = await planProduction({
    bomId: activeForm.planningBom.id,
    qty: planQty,
    scheduledFor: activeForm.order?.scheduledFor, // ✅ Usar scheduledFor
    reservations: activeForm.requiredLots,
    idempotencyKey: crypto.randomUUID()
  });

  if (res.ok) {
    toast.success("Orden planificada exitosamente");
    setActiveForm(null);
  } else {
    toast.error(res.message ?? "No se pudo planificar");
  }
};
```

---

### 3. `src/features/production/execution/components/ActiveOrderPanel.tsx` 🔧

**Actualizar input de fecha:**

```typescript
// ❌ ANTES
<Input 
  type="date" 
  value={activeForm?.order?.scheduledFor?.slice(0, 10) || activeForm.plannedDate || ...}
  onChange={e => {
    if (activeForm.order) {
      setFormValue('order', {...activeForm.order, scheduledFor: e.target.value});
    } else {
      setFormValue('plannedDate', e.target.value);  // ❌
    }
  }}
/>

// ✅ DESPUÉS
<Input 
  type="date" 
  value={activeForm?.order?.scheduledFor?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
  onChange={e => {
    if (activeForm.order) {
      setFormValue('order', {...activeForm.order, scheduledFor: e.target.value});
    } else {
      // Para nueva planificación, guardar temporalmente en el form
      setFormValue('scheduledFor', e.target.value);
    }
  }}
/>
```

**Actualizar tipos de imports:**

```typescript
import type { 
  ProductionOrder,
  ProductionShortage,
  ProductionReservation,
  JournalEntry,
  BillOfMaterial as RecipeBom,
  Item,
  Uom
} from '@/domain/ssot';
```

---

### 4. `src/app/(app)/production/bom/page.tsx` 🐛

**Fix 1: Importar SBDialog**

```typescript
// ✅ AÑADIR AL INICIO
import {
  Dialog as SBDialog,
  DialogContent as SBDialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
```

**Fix 2: Unificar variable de estado**

```typescript
// ❌ ANTES
const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
// ... luego usa setCreateOpen() que no existe

// ✅ DESPUÉS - OPCIÓN 1: Renombrar
const [createOpen, setCreateOpen] = useState(false);

// O OPCIÓN 2: Actualizar todas las referencias
// Buscar: setCreateOpen
// Reemplazar: setCreateDrawerOpen
```

**Fix 3: Validar role con default**

```typescript
// ✅ AÑADIR en la función addLine
const addLine = (role: "FORMULA" | "PACKAGING") => {
  const newItems = [
    ...(fm.values.items || []), 
    { 
      sku: "", 
      qty: 0, 
      uom: "uds" as Uom, 
      role  // ✅ Siempre presente
    }
  ];
  fm.set("items", newItems);
};
```

---

### 5. `src/app/(app)/production/dashboard/page.tsx` 📊

**Eliminar tareas hardcodeadas:**

```typescript
// ❌ ANTES
const teamAlerts = [
  { 
    id: 'team-task-1', 
    type: 'critical' as const, 
    title: 'Iniciar producción lote SB-MAR-2025-001',
    // ... hardcoded
  },
];

// ✅ DESPUÉS
const [tasks, setTasks] = useState<TaskNew[]>([]);
const [loadingTasks, setLoadingTasks] = useState(true);

useEffect(() => {
  async function loadTasks() {
    setLoadingTasks(true);
    // Obtener tareas del departamento PRODUCCION
    const productionTasks = data?.tasks?.filter(
      t => t.department === 'PRODUCCION' && 
           t.status !== 'DONE' &&
           t.status !== 'CANCELLED'
    ) || [];
    setTasks(productionTasks);
    setLoadingTasks(false);
  }
  
  if (data?.tasks) {
    loadTasks();
  }
}, [data?.tasks]);

// Convertir tareas a formato de AlertsCard
const teamAlerts = tasks.map(task => ({
  id: task.id,
  type: task.priority === 'URGENT' ? 'critical' as const : 
        task.priority === 'HIGH' ? 'warning' as const : 'info' as const,
  title: task.title,
  description: `${task.desc || ''} · ${task.assignedToId || 'Sin asignar'}`,
  actionLabel: 'Ver tarea'
}));
```

**Persistir análisis IA:**

```typescript
// ✅ AÑADIR
const AI_ANALYSIS_KEY = 'production_ai_analysis';
const AI_ANALYSIS_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Al cargar componente
useEffect(() => {
  const stored = localStorage.getItem(AI_ANALYSIS_KEY);
  if (stored) {
    try {
      const { analysis, timestamp } = JSON.parse(stored);
      const age = Date.now() - timestamp;
      if (age < AI_ANALYSIS_TTL) {
        setAiAnalysis(analysis);
      } else {
        localStorage.removeItem(AI_ANALYSIS_KEY);
      }
    } catch (e) {
      console.error('Error loading AI analysis from cache:', e);
    }
  }
}, []);

// Al analizar
const handleAnalyzeProduction = async () => {
  setLoadingAI(true);
  try {
    const result = await analyzeProduction();
    if (result.success && result.analysis) {
      setAiAnalysis(result.analysis);
      
      // ✅ Persistir en localStorage
      localStorage.setItem(AI_ANALYSIS_KEY, JSON.stringify({
        analysis: result.analysis,
        timestamp: Date.now()
      }));
      
      toast.success("Análisis completado");
    }
  } catch (error) {
    console.error('Error analyzing production:', error);
  } finally {
    setLoadingAI(false);
  }
};
```

---

### 6. `src/features/production/execution/helpers.ts` 🔧

**Mover helper toUom:**

```typescript
// ✅ AÑADIR
/**
 * Normaliza variantes de UOM a tipos canónicos
 */
export function normalizeUom(u: string | Uom | "UNIT" | "uds"): Uom {
  const normalized = String(u).toLowerCase();
  
  if (normalized === "unit" || normalized === "uds") return "unit";
  if (normalized === "l") return "L";
  if (normalized === "ml") return "mL";
  if (normalized === "kg") return "kg";
  if (normalized === "g") return "g";
  if (normalized === "bottle") return "bottle";
  if (normalized === "case") return "case";
  
  // Default fallback
  return u as Uom;
}
```

---

## 🧪 TESTING CHECKLIST

Después de cada cambio, verificar:

### Tests de Compilación
```bash
npm run type-check
npm run build
```

### Tests Manuales

1. **BOM Page**
   - [ ] Crear nueva receta (Producción)
   - [ ] Crear nueva receta (Envasado)
   - [ ] Crear producto nuevo desde diálogo
   - [ ] Validación de balance funciona
   - [ ] Guardar receta sin errores

2. **Execution Page**
   - [ ] Seleccionar BOM para planificar
   - [ ] Verificar fecha programada se guarda
   - [ ] Stock check muestra shortages correctos
   - [ ] Iniciar orden
   - [ ] Pausar/reanudar orden
   - [ ] Registrar consumo real
   - [ ] Finalizar orden
   - [ ] Ver resumen pre-finalización

3. **Dashboard**
   - [ ] Tareas reales se muestran
   - [ ] Análisis IA funciona
   - [ ] Análisis IA persiste al recargar
   - [ ] KPIs muestran datos correctos

---

## 📦 COMMIT STRATEGY

```bash
# Commit 1: SSOT types
git add src/domain/ssot.ts
git commit -m "feat(ssot): add production-specific types

- Add ProductionShortage, ProductionReservation types
- Add ProductionOutput, ProductionConsumption types
- Add ProductionIncident type
- Update ProductionOrder with typed arrays
- Make BillOfMaterial.items.role required"

# Commit 2: Execution migration
git add src/app/(app)/production/execution/
git add src/features/production/execution/
git commit -m "fix(production): migrate execution to SSOT canonical fields

- Replace outputSku → outputItemId
- Replace outputQty → targetQuantity
- Replace custom plannedDate → scheduledFor
- Update ActiveFormState with proper types
- Remove any[] types"

# Commit 3: BOM fixes
git add src/app/(app)/production/bom/page.tsx
git commit -m "fix(bom): correct component imports and state management

- Import SBDialog components
- Fix setCreateOpen variable naming
- Add role default value validation"

# Commit 4: Dashboard improvements
git add src/app/(app)/production/dashboard/page.tsx
git commit -m "feat(dashboard): integrate real tasks and persist AI analysis

- Replace hardcoded tasks with data.tasks
- Add localStorage persistence for AI analysis
- Add 24h TTL for cached analysis"

# Commit 5: Helpers
git add src/features/production/execution/helpers.ts
git commit -m "refactor(helpers): add normalizeUom utility

- Centralize UOM normalization logic
- Support common UOM variants"
```

---

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Breaking changes en SSOT | Media | Mantener campos deprecated por compatibilidad |
| Datos corruptos en producción | Baja | Validar antes de guardar, transaction safety |
| Performance issues con localStorage | Baja | TTL de 24h, limpieza automática |
| Tipos incorrectos causan runtime errors | Media | Type-check antes de commit, tests manuales exhaustivos |

---

## 📞 SOPORTE

Si encuentras problemas durante la implementación:

1. **Type errors:** Verificar imports desde `@/domain/ssot`
2. **Runtime errors:** Revisar que campos deprecated siguen presentes
3. **Data loss:** Los campos deprecated se mantienen para compatibilidad
4. **Tests failing:** Asegurar que mock data usa campos canónicos

---

## ✅ DEFINITION OF DONE

- [ ] Todos los archivos compilan sin errores TypeScript
- [ ] No hay warnings de tipos `any` en production module
- [ ] Tests manuales pasan completamente
- [ ] Campos deprecated marcados con `@deprecated`
- [ ] Commit messages siguen conventional commits
- [ ] PR creado con descripción detallada
- [ ] Code review aprobado
- [ ] Deploy a staging exitoso

---

**Tiempo estimado total:** 6-8 horas de trabajo efectivo  
**Complejidad:** Media  
**Impact:** Alto - Mejora significativa de type safety y alineación con SSOT
