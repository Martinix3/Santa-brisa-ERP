# FASE 2 - PROYECTOS VISUALES

**Branch:** `feature/fase-2-proyectos`  
**Duración estimada:** 2-3 días  
**Estado:** 🚧 EN PROGRESO

---

## 🎯 Objetivos

- ✅ KPIs avanzados con métricas clave
- 🚧 Visualización Kanban con drag & drop
- ⏳ Timeline visual con milestones
- ⏳ Resource Planning (carga por persona)
- ⏳ Budget Tracker (presupuesto vs actual)
- ⏳ Export básico (Excel + PDF)
- ⏳ Alertas automáticas

---

## 📊 Progreso General

**Día 1:** 75% completo
- [x] Extender SSOT con campos mínimos
- [x] Server action `getProjectsKPIs()`
- [x] Header con 4 KPI cards
- [ ] Componente Kanban

**Día 2:** Pendiente
- [ ] Timeline visual
- [ ] Resource allocation
- [ ] Budget tracker

**Día 3:** Pendiente
- [ ] Sistema de alertas
- [ ] Export Excel/PDF
- [ ] Testing y polish

---

## 🧱 Cambios en SSOT

### Nuevos campos en `Project`:

```typescript
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'REVIEW' | 'COMPLETED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  // ... campos existentes
  
  // Fechas y timeline
  startAt?: ISODateString;
  endAt?: ISODateString;
  deadline?: ISODateString;
  
  // Status y prioridad
  status: ProjectStatus;
  priority?: ProjectPriority;
  impactScore?: number;          // 1-10
  
  // Equipo
  resourceAllocation?: {
    userId: string;
    hoursAllocated: number;
    role: 'LEAD' | 'MEMBER' | 'REVIEWER';
  }[];
  
  // Presupuesto
  budget?: number;
  actualCost?: number;
  
  // Tracking
  estimatedHours?: number;
  lastProgressUpdate?: ISODateString;
  statusChangedAt?: ISODateString;
  
  // Milestones
  milestones?: {
    id: string;
    title: string;
    date: ISODateString;
    done: boolean;
  }[];
}
```

---

## 📈 KPIs Implementados

### Server Action: `getProjectsKPIs()`

**Ubicación:** `src/server/actions/projects.ts`

**Retorna:**
```typescript
{
  activeCount: number;        // Proyectos activos (PLANNING, ACTIVE, ON_HOLD, REVIEW)
  onTimePercentage: number;   // % con lastProgressUpdate <= deadline
  budgetVariance: number;     // Promedio (actualCost - budget) / budget * 100
  avgProgress: number;        // Progreso ponderado por estimatedHours o budget
}
```

**Cálculos:**

1. **Activos:** `count(status ∈ {PLANNING, ACTIVE, ON_HOLD, REVIEW})`
2. **On-time %:** `(proyectos on-time / proyectos con deadline) * 100`
3. **Budget variance %:** `avg((actualCost - budget) / budget * 100)`
4. **Progreso medio:** `sum(progress * weight) / sum(weight)`
   - Weight = `estimatedHours || budget || 1`

---

## 🎨 UI - Design System Aplicado

### Header con KPIs

**Clases usadas:**
- `sb-header-glass` - Header con glassmorphism
- `sb-btn sb-btn--primary` - Botón Nuevo Proyecto
- `sb-select` - Filtros de departamento y status

**KPI Cards:**
```tsx
<KpiCard
  label="ACTIVOS"
  value="24"
  variant="dark"
/>

<KpiCard
  label="ON-TIME %"
  value="85%"
  variant="light"
  trend="up"
  icon={<TrendingUp />}
/>
```

**Variantes:**
- `dark` - Fondo oscuro (para KPIs destacados)
- `light` - Fondo claro (para métricas)
- `subtle` - Muy sutil (para info secundaria)

**Trends:**
- `up` - Verde (bueno)
- `neutral` - Amarillo (normal)
- `down` - Rojo (alerta)

---

## 🗂️ Próximas Features

### 1. Kanban Board (Día 1 - Pendiente)

**Componente:** `src/components/projects/ProjectKanban.tsx`

**Columnas:**
```
PLANNING → ACTIVE → ON_HOLD → REVIEW → COMPLETED
```

**Librería:** `@dnd-kit/core` (ya en package.json)

**Features:**
- Drag & drop entre columnas
- Actualizar `status` y `statusChangedAt`
- Refrescar KPIs al mover

**Classes:**
- `sb-card-glass-light` para columnas
- `hover-raise` para efecto elevation
- `pressable` para cards draggables

---

### 2. Timeline Visual (Día 2)

**Componente:** `src/components/projects/ProjectTimeline.tsx`

**Estructura:**
- Barra horizontal por proyecto
- `startAt` → `deadline`
- Puntos para `milestones`
- Color según status

---

### 3. Resource Planning (Día 2)

**Componente:** `src/components/projects/ResourceAllocation.tsx`

**Muestra:**
- Lista de usuarios con hoursAllocated
- Badge si sobrecarga (>40h/semana)
- Progress bar de utilización

---

### 4. Budget Tracker (Día 2)

**Componente:** `src/components/projects/BudgetTracker.tsx`

**Incluye:**
- Card "Budget vs Actual"
- Badge si >10% over
- Mini chart (opcional con ChartCard)

---

### 5. Alertas (Día 3)

**Server Action:** `checkProjectAlerts()`

**Tipos:**
- **Overdue:** `deadline < today && !COMPLETED`
- **Overbudget:** `actualCost > budget * 1.1`
- **Estancado:** `lastProgressUpdate > 7 días`
- **Sobre-asignación:** `user con >40h`

**Guardar en:** `alerts` collection con `department="PROJECTS"`

---

### 6. Export (Día 3)

**Excel:**
- Librería: `xlsx` (SheetJS)
- Lista proyectos con campos clave + KPIs
- Botón en header

**PDF:**
- Librería: `react-pdf` o `jspdf`
- Ficha de proyecto con resumen + KPIs
- Timeline simple (no Gantt completo)

---

## ✅ Criterios de Done

### Funcionales:
- [x] KPIs calculan correctamente desde Firestore
- [ ] Kanban: drag & drop persiste y refresca KPIs
- [ ] Timeline: visible en página y drawer con milestones
- [ ] Resources: muestra carga y marca sobrecarga (>40h)
- [ ] Budget: card "vs Actual" + badge si >10% over
- [ ] Export: Excel (lista) y PDF (ficha) funcionan
- [ ] Alertas: se crean automáticamente en `alerts`

### Performance:
- [ ] Grid de 50 proyectos sin jank
- [ ] Timeline render <100ms
- [ ] Drag & drop fluido

### UX:
- [x] Responsive mobile (KPIs)
- [x] Loading states en KPIs
- [ ] Error boundaries
- [ ] Drag & drop con fallback teclado (a11y)

---

## 📦 Estructura de Archivos

```
src/
├── domain/
│   └── ssot.ts                     # ✅ Extendido
│
├── server/actions/
│   └── projects.ts                 # ✅ KPIs implementados
│                                   # ⏳ checkProjectAlerts()
│
├── components/projects/            # ⏳ Nuevos componentes
│   ├── ProjectKanban.tsx
│   ├── ProjectTimeline.tsx
│   ├── ResourceAllocation.tsx
│   ├── BudgetTracker.tsx
│   └── ExportButtons.tsx
│
└── app/(app)/proyectos/
    └── page.tsx                    # ✅ Header + KPIs completo
```

---

## 🚀 Commits Planeados

**Commit 1 (Día 1):**
```
feat: Phase 2 - Projects Visual Intelligence (Day 1)

SSOT & KPIs:
- Extended Project interface
