# Migración: Unificación de Sistemas de Tareas

## 📋 Resumen

Unificamos dos sistemas de tareas duplicados en uno solo (`TaskNew`):
- ✅ **TaskNew** (SSOT general) → Sistema unificado
- ❌ **Task** (pipeline) → Deprecado, migrar a TaskNew

---

## 🎯 Cambios Realizados

### 1. SSOT (`src/domain/ssot.ts`)

#### TaskKind extendido
```typescript
// ANTES
export type TaskKind = 'GENERICA' | 'VISITA' | 'COBRO' | 'PEDIDO' | 'MARKETING';

// DESPUÉS  
export type TaskKind = 'GENERICA' | 'VISITA' | 'COBRO' | 'PEDIDO' | 'MARKETING' 
  | 'INTERACTION' | 'ORDER_PREP' | 'POS' | 'EVENT' | 'ADMIN';
```

#### TaskStatusNew extendido
```typescript
// ANTES
export type TaskStatusNew = 'BACKLOG' | 'DRAFT' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED' | 'PROGRAMADA';

// DESPUÉS
export type TaskStatusNew = 'BACKLOG' | 'DRAFT' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED' | 'PROGRAMADA' | 'SNOOZED';
```

#### Nueva interface Recurrence
```typescript
export interface Recurrence {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  byWeekday?: number[]; // 0=Monday, 6=Sunday
}
```

#### Campos añadidos a TaskNew
```typescript
export interface TaskNew {
  // ... campos existentes
  distributorId?: string;      // ← NUEVO (del pipeline)
  snoozeUntil?: string;        // ← NUEVO (del pipeline)
  recurrence?: Recurrence;     // ← NUEVO (del pipeline)
}
```

### 2. Zod Schemas (`src/domain/zod/task.ts`)

- ✅ `TaskKindEnum` extendido con tipos del pipeline
- ✅ `TaskStatusEnum` incluye `SNOOZED`
- ✅ `RecurrenceSchema` nuevo
- ✅ Campos opcionales agregados a `TaskSchema`

---

## 🔄 Plan de Migración

### FASE 1: Preparación ✅ COMPLETADO

- [x] Extender TaskKind en SSOT
- [x] Extender TaskStatusNew en SSOT
- [x] Agregar Recurrence interface
- [x] Agregar campos opcionales a TaskNew
- [x] Actualizar schemas Zod

### FASE 2: Migración de Actions (PENDIENTE)

**Archivo:** `src/features/sales/pipeline/pipeline.actions.ts`

#### Mapeo de Status
```typescript
// Pipeline Task Status → TaskNew Status
'todo'      → 'BACKLOG'
'doing'     → 'IN_PROGRESS'
'snoozed'   → 'SNOOZED'
'done'      → 'DONE'
'cancelled' → 'CANCELLED'
```

#### Mapeo de Kind
```typescript
// Pipeline Task Kind → TaskNew Kind
'interaction'  → 'INTERACTION'
'order_prep'   → 'ORDER_PREP'
'pos'          → 'POS'
'event'        → 'EVENT'
'admin'        → 'ADMIN'
```

#### Mapeo de Priority
```typescript
// Pipeline Task Priority → TaskNew Priority
'low'      → 'LOW'
'med'      → 'MEDIUM'
'high'     → 'HIGH'
'critical' → 'URGENT'
```

#### Actions a migrar:
```typescript
// src/features/sales/pipeline/pipeline.actions.ts

// ❌ DEPRECAR - Usar TaskNew
import { Task } from './pipeline.types';

// ✅ USAR NUEVO
import { TaskNew } from '@/domain/ssot';
import { CreateTaskSchema } from '@/domain/zod/task';

// Migrar todas las funciones:
- createTask() 
- completeTask()
- snoozeTask()
- createInteractionTask()
- createOrderPrepTask()
- createPOSTask()
- createEventTask()
- toggleObjective()
- updateAccountStage()
```

### FASE 3: Migración de Datos Firestore (PENDIENTE)

**Script:** `scripts/migrate-pipeline-tasks-to-tasknew.ts`

```typescript
// Pseudocódigo
async function migratePipelineTasks() {
  const pipelineTasks = await db.collection('tasks')
    .where('__pipelineTask', '==', true) // Si existe flag
    .get();
    
  for (const doc of pipelineTasks.docs) {
    const oldTask = doc.data();
    
    const newTask: TaskNew = {
      id: oldTask.id,
      kind: mapKind(oldTask.kind),
      status: mapStatus(oldTask.status),
      priority: mapPriority(oldTask.priority),
      // ... mapear resto de campos
      distributorId: oldTask.distributorId,
      snoozeUntil: oldTask.snoozeUntil,
      recurrence: oldTask.recurrence,
    };
    
    await db.collection('tasks').doc(newTask.id).set(newTask);
  }
}
```

### FASE 4: GlobalDragProvider (PENDIENTE)

**Objetivo:** Un solo sistema DnD para:
- Pipeline de Ventas (accounts entre stages)
- Proyectos (ideas → tareas, tareas → proyectos)
- Calendario (tareas → fechas)
- Dashboard (tareas entre estados)

**Estructura:**
```
src/features/dnd/
  ├── GlobalDragProvider.tsx  # Provider único
  ├── components.tsx           # Draggables/Droppables
  ├── utils.ts                 # makeDragId, parseDragId
  └── types.ts                 # DragKind, DROP_IDS
```

**Tipos unificados:**
```typescript
type DragKind = 'ACCOUNT' | 'TASK' | 'IDEA' | 'PROJECT';

export const DROP_IDS = {
  // Pipeline
  STAGE_POTENCIAL: 'stage:POTENCIAL',
  STAGE_SEGUIMIENTO: 'stage:SEGUIMIENTO',
  STAGE_ACTIVA: 'stage:ACTIVA',
  STAGE_FALLIDA: 'stage:FALLIDA',
  
  // Proyectos
  PROJECT_PREFIX: 'project:',
  NEW_PROJECT: 'project:new',
  IDEA_TO_TASK: 'idea:create-task',
  
  // Tareas
  TASK_BACKLOG: 'task:BACKLOG',
  TASK_IN_PROGRESS: 'task:IN_PROGRESS',
  TASK_DONE: 'task:DONE',
  
  // Calendario
  CALENDAR_DAY_PREFIX: 'calendar:',
} as const;
```

### FASE 5: Actualizar Pipeline UI (PENDIENTE)

**Archivo:** `src/features/sales/pipeline/components/PipelineBoard.tsx`

```tsx
// ANTES: Grid estático
<div className="grid grid-cols-4">
  {stages.map(stage => (
    <PipelineColumn accounts={...} />
  ))}
</div>

// DESPUÉS: Con DnD
import { GlobalDragProvider, DroppableZone, DraggableAccount } from '@/features/dnd';

<GlobalDragProvider currentUserId={userId}>
  <div className="grid grid-cols-4">
    {stages.map(stage => (
      <DroppableZone droppableId={`stage:${stage}`}>
        {accounts.map((acc, idx) => (
          <DraggableAccount id={acc.id} index={idx}>
            <AccountCard account={acc} />
          </DraggableAccount>
        ))}
      </DroppableZone>
    ))}
  </div>
</GlobalDragProvider>
```

---

## ⚠️ Breaking Changes

### Para código existente que usa `pipeline.types.Task`:

```typescript
// ❌ ANTES
import { Task } from '@/features/sales/pipeline/pipeline.types';

// ✅ AHORA
import { TaskNew as Task } from '@/domain/ssot';
```

### Ajustes necesarios:

1. **Status mapping:** `'todo'` → `'BACKLOG'`, `'doing'` → `'IN_PROGRESS'`
2. **Priority mapping:** `'med'` → `'MEDIUM'`, `'critical'` → `'URGENT'`
3. **Kind está en UPPERCASE:** `'interaction'` → `'INTERACTION'`

---

## 📊 Beneficios Post-Migración

1. **Una sola fuente de verdad** → Menos bugs
2. **DnD cross-feature** → Pipeline, Proyectos, Calendario
3. **Schemas unificados** → Validación consistente
4. **Actions consolidadas** → Menos código duplicado
5. **Compatible con sistema de proyectos** → `projectId` ya existe

---

## 🚀 Próximos Pasos

1. **Migrar `pipeline.actions.ts`** a usar TaskNew
2. **Crear script de migración de datos**
3. **Implementar GlobalDragProvider**
4. **Actualizar PipelineBoard con DnD**
5. **Testing completo**
6. **Deprecar `pipeline.types.Task`**

---

## 📝 Notas

- **Backward compatibility:** Los campos antiguos como `assigneeId` se mantienen mapeados
- **No se pierde funcionalidad:** Todos los campos del pipeline están en TaskNew
- **Recurrence:** Ahora disponible para TODAS las tareas, no solo pipeline
- **SNOOZED:** Nuevo estado útil para gestión de prioridades

---

## 🔗 Referencias

- SSOT: `src/domain/ssot.ts`
- Schemas: `src/domain/zod/task.ts`
- Pipeline Types (deprecado): `src/features/sales/pipeline/pipeline.types.ts`
- Pipeline Actions: `src/features/sales/pipeline/pipeline.actions.ts`
