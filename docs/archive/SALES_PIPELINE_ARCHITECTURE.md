# PIPELINE DE VENTAS INTELIGENTE - Arquitectura Completa

## Resumen Ejecutivo

Sistema de pipeline de ventas mobile-first diseñado para manejar **70+ cuentas por stage** con:
- ✅ Tasks unificados (única colección para todo)
- ✅ Filtrado inteligente multi-criterio
- ✅ Priorización automática
- ✅ Quick actions desde pipeline
- ✅ Drag & drop entre stages
- ✅ Automatismos idempotentes
- ✅ Integración con agenda personal

---

## 1. Arquitectura de Datos

### 1.1 Tasks (Colección única)

**Firestore:** `tasks`

```typescript
interface Task {
  id: string;
  kind: 'interaction' | 'order_prep' | 'pos' | 'event' | 'admin';
  title: string;
  desc?: string;
  
  // Relaciones
  accountId?: string;
  distributorId?: string;
  orderId?: string;
  
  // Asignación
  assigneeId: string;
  teamId?: string;
  
  // Planificación
  dueAt?: ISODateString;
  snoozeUntil?: ISODateString;
  recurrence?: Recurrence;
  
  // Estado
  status: 'todo' | 'doing' | 'snoozed' | 'done' | 'cancelled';
  priority: 'low' | 'med' | 'high' | 'critical';
  tags?: string[];
  objective?: boolean;
  zone?: string;
  
  // Timestamps
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  doneAt?: ISODateString;
}
```

**Índices recomendados:**
```
- status + assigneeId + dueAt
- accountId + status
- objective + assigneeId
- zone + status
- tags (array-contains)
- createdAt (desc)
```

### 1.2 Pipeline Account View (Denormalizado)

```typescript
interface PipelineAccountView {
  // Identity
  id: string;
  name: string;
  
  // Classification
  stage: Stage;
  segment: Segment;
  
  // Location
  city?: string;
  province?: string;
  
  // Ownership
  salesRepId: string;
  salesRepName: string;
  distributorId?: string;
  
  // Activity (30d)
  totalOrders30d: number;
  totalRevenue30d: number;
  lastOrderDate?: ISODateString;
  lastInteractionDate?: ISODateString;
  
  // Tasks
  openTasksCount: number;
  nextTaskDueAt?: ISODateString;
  nextTaskTitle?: string;
  
  // Flags
  isObjective: boolean;
  isTargeted: boolean;
  
  // Intelligence
  priorityScore: number; // 0-100
  alerts: PipelineAlert[];
  
  // Stats
  daysSinceLastContact: number;
  daysSinceLastOrder: number;
}
```

---

## 2. Server Actions Implementados

### 2.1 Gestión de Tasks

**Crear Task:**
```typescript
createTask({
  kind: 'interaction',
  title: 'Seguimiento comercial',
  accountId: 'acc123',
  assigneeId: 'user456',
  dueAt: '2025-10-17T00:00:00.000Z',
  priority: 'med',
  tags: ['seguimiento'],
})
// → { ok: true, taskId: '...' }
```

**Completar Task:**
```typescript
completeTask({
  taskId: 'task789',
  userId: 'user456',
})
// → { ok: true }
```

**Snooze Task:**
```typescript
snoozeTask({
  taskId: 'task789',
  untilISO: '2025-10-12T00:00:00.000Z',
  userId: 'user456',
})
// → { ok: true }
```

### 2.2 Quick Actions

**Desde AccountCard del pipeline:**

| Acción | Función | Task creado |
|--------|---------|-------------|
| Interacción | `createInteractionTask()` | `kind:'interaction'`, due:+7d |
| Pedido | `createOrderPrepTask()` | `kind:'order_prep'`, priority:high |
| POS | `createPOSTask()` | `kind:'pos'`, tag:'pos' |
| Evento | `createEventTask()` | `kind:'event'`, aparece en agenda |
| Target | `toggleObjective()` | Marca cuenta + crea task mensual |

### 2.3 Drag & Drop

```typescript
updateAccountStage({
  accountId: 'acc123',
  fromStage: 'POTENCIAL',
  toStage: 'SEGUIMIENTO',
  userId: 'user456',
})
// → Actualiza stage + auto-crea task si aplica
```

**Automatismos al cambiar stage:**
- → `SEGUIMIENTO`: Crea task "Seguimiento en 7 días"
- → `ACTIVA`: (future) Programar revisión mensual
- → `FALLIDA`: (future) Encuesta de pérdida

### 2.4 Batch Operations

```typescript
batchCompleteTasksForOrder('order123')
// → Cierra todos los tasks `order_prep` del pedido
```

---

## 3. Automatismos (Reglas)

### 3.1 Sin contacto >30 días

**Cron: 1×/día**

```typescript
// Para cada cuenta con lastInteractionAt > 30 días:
createTask({
  kind: 'interaction',
  title: 'Contactar (inactivo 30 días)',
  accountId,
  assigneeId: account.salesRepId,
  priority: 'high',
  tags: ['autogen', 'nocontact30', dedupeKey],
  dueAt: now + 48h,
})
```

**Idempotencia:** `dedupeKey = rule:nocontact30:{accountId}:{yearMonth}`

### 3.2 Pedido facturado

**Trigger: order.status → FACTURADO**

```typescript
// Cierra tasks de preparación
batchCompleteTasksForOrder(orderId)

// Crea task post-venta (opcional)
createTask({
  kind: 'interaction',
  title: 'Seguimiento post-venta',
  accountId,
  assigneeId,
  dueAt: now + 7d,
  tags: ['postventa', orderId],
})
```

### 3.3 Objetivo mensual

**Al marcar cuenta como objetivo:**

```typescript
toggleObjective({ accountId, on: true, userId })
// → accounts.isObjective = true
// → Crea task mensual (idempotente por mes)
```

---

## 4. UI Components (Estructura)

### 4.1 Layout del Pipeline

```
┌─────────────────────────────────────────────────────┐
│  PipelineToolbar                                    │
│  [Filtros] [Búsqueda] [KPIs globales]              │
├─────────────────────────────────────────────────────┤
│  Stages (horizontal scroll)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │POTENCIAL │ │SEGUIMIENTO│ │ ACTIVA  │            │
│  │  72 ctas │ │  45 ctas  │ │ 23 ctas │            │
│  │  24K €   │ │  18K €    │ │ 31K €   │            │
│  ├──────────┤ ├──────────┤ ├──────────┤            │
│  │ Card 1   │ │ Card 1    │ │ Card 1   │            │
│  │ Card 2   │ │ Card 2    │ │ Card 2   │            │
│  │ Card 3   │ │ ...       │ │ ...      │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
```

### 4.2 AccountCard

```tsx
<AccountCard account={account} onClick={openInspector}>
  {/* Header */}
  <h3>{account.name}</h3>
  <div className="badges">
    {account.isObjective && <Star />}
    {account.priorityScore > 80 && <Flame />}
  </div>
  
  {/* Info */}
  <p>{account.segment} · {account.city} · {account.salesRepName}</p>
  <p>Última visita: {formatDate(account.lastInteractionDate)}</p>
  <p>{account.orderCount90d} pedidos · {formatCurrency(account.totalRevenue30d)}</p>
  
  {/* Next task */}
  {account.nextTaskTitle && (
    <p>Próxima: {account.nextTaskTitle}</p>
  )}
  
  {/* Alerts */}
  {account.alerts.map(alert => (
    <Chip severity={alert.severity}>{alert.message}</Chip>
  ))}
  
  {/* Quick actions (hover/swipe) */}
  <div className="quick-actions">
    <button onClick={() => createInteractionTask({accountId})}>
      Interacción
    </button>
    <button onClick={() => createOrderPrepTask({accountId})}>
      Pedido
    </button>
    <button onClick={() => toggleObjective({accountId, on: !account.isObjective})}>
      {account.isObjective ? 'Quitar target' : 'Marcar target'}
    </button>
  </div>
</AccountCard>
```

### 4.3 AccountInspector (Panel lateral)

```tsx
<Drawer open={!!selected} onClose={() => setSelected(null)}>
  <AccountInspector account={selected}>
    {/* Header */}
    <h2>{selected.name}</h2>
    <p>{selected.segment} · {selected.city}</p>
    
    {/* Quick actions */}
    <div className="actions">
      <button onClick={handleCall}>Llamar</button>
      <button onClick={handleNote}>Nota</button>
      <button onClick={handleOrder}>Pedido</button>
      <button onClick={handleVisit}>Visita</button>
    </div>
    
    {/* Open tasks */}
    <section>
      <h3>Tareas pendientes ({openTasks.length})</h3>
      {openTasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={() => completeTask({taskId: task.id, userId})}
          onSnooze={(until) => snoozeTask({taskId: task.id, untilISO: until, userId})}
        />
      ))}
    </section>
    
    {/* Santabrain suggestions */}
    <section>
      <h3>Santabrain sugiere:</h3>
      {suggestions.map(s => (
        <SuggestionCard suggestion={s} />
      ))}
    </section>
    
    {/* Recent activity */}
    <section>
      <h3>Actividad reciente</h3>
      {interactions.map(i => (
        <InteractionItem interaction={i} />
      ))}
    </section>
  </AccountInspector>
</Drawer>
```

### 4.4 PipelineToolbar

```tsx
<PipelineToolbar>
  {/* Filtros */}
  <ChipFilter
    label="Comercial"
    options={salesReps}
    value={filters.salesRepIds}
    onChange={(ids) => setFilters({...filters, salesRepIds: ids})}
  />
  
  <ChipFilter
    label="Distribuidor"
    options={distributors}
    value={filters.distributorIds}
    onChange={(ids) => setFilters({...filters, distributorIds: ids})}
  />
  
  <ChipFilter
    label="Zona"
    options={cities}
    value={filters.cities}
    onChange={(cities) => setFilters({...filters, cities})}
  />
  
  <Toggle
    label="Solo objetivos"
    checked={filters.onlyObjectives}
    onChange={(on) => setFilters({...filters, onlyObjectives: on})}
  />
  
  {/* Búsqueda */}
  <SearchInput
    placeholder="Buscar cuenta..."
    value={filters.searchQuery}
    onChange={(q) => setFilters({...filters, searchQuery: q})}
  />
  
  {/* KPIs globales */}
  <div className="global-stats">
    <StatCard
      label="Valor pipeline"
      value={formatCurrency(stats.totalRevenue30d)}
    />
    <StatCard
      label="Cuentas activas"
      value={stats.totalAccounts}
    />
    <StatCard
      label="Sin contacto >30d"
      value={stats.accountsWithoutContact30d}
      severity="warning"
    />
  </div>
</PipelineToolbar>
```

---

## 5. Mobile-First UX

### 5.1 Layout móvil

- **Tabs arriba** → Stages horizontales (swipe)
- **Cards verticales** dentro de cada stage
- **Swipe lateral en card** → Quick actions
- **Tap card** → Abre drawer inferior (AccountInspector)
- **Filtros** → Drawer superior

### 5.2 Gestos

| Gesto | Acción |
|-------|--------|
| Tap card | Abrir inspector |
| Swipe left en card | Quick actions |
| Swipe right en card | Marcar objetivo |
| Swipe down en stage | Refresh |
| Long press card | Drag & drop |

---

## 6. Priorización Automática

### 6.1 Fórmula `priorityScore`

```typescript
priorityScore = 
  + (objective ? 30 : 0)                    // Target mensual
  + (daysSinceLastContact > 30 ? 25 : 0)    // Sin contacto
  + (daysSinceLastContact > 60 ? 10 : 0)    // Muy inactivo
  + (openTasksCount > 0 ? 15 : 0)           // Tareas pendientes
  + (daysSinceLastOrder < 7 ? 10 : 0)       // Cliente activo
  + (totalRevenue30d / 1000)                // Valor pipeline
  + (alerts.length * 5)                     // Alertas activas
```

**Rango:** 0-100

**Visualización:**
- 80-100: 🔥🔥🔥 (crítico)
- 60-79: 🔥🔥 (alto)
- 40-59: 🔥 (medio)
- 0-39: · (bajo)

### 6.2 Alertas

```typescript
interface PipelineAlert {
  type: 'no_contact' | 'no_order' | 'pending_action' | 'opportunity' | 'risk';
  severity: 'low' | 'medium' | 'high';
  message: string;
  daysCount?: number;
  actionable?: boolean;
}
```

**Ejemplos:**
- `{type: 'no_contact', severity: 'high', message: 'Sin contacto 45 días', daysCount: 45}`
- `{type: 'pending_action', severity: 'medium', message: '3 tareas vencidas'}`
- `{type: 'opportunity', severity: 'low', message: 'Oportunidad: nuevo evento'}`

---

## 7. Integración con Agenda Personal

### 7.1 Calendar View

**Vista en `/personal`:**

```typescript
interface CalendarDay {
  date: 'YYYY-MM-DD';
  tasks: Task[];
  overdue: number;
  today: number;
  upcoming: number;
}
```

**Query:**
```typescript
// Tasks del usuario para hoy y futuros
db.collection('tasks')
  .where('assigneeId', '==', userId)
  .where('status', 'in', ['todo', 'doing'])
  .where('dueAt', '>=', today)
  .orderBy('dueAt', 'asc')
```

### 7.2 Notificaciones

**Badge en header:**
```typescript
// Tareas vencidas + tareas de hoy
count(tasks where assigneeId=me and (
  dueAt < today or
  (dueAt >= today and dueAt < tomorrow) or
  (snoozeUntil <= now)
))
```

---

## 8. Checklist de Implementación

### Backend ✅
- [x] Types (`pipeline.types.ts`)
- [x] Server actions (`pipeline.actions.ts`)
- [x] Validadores Zod
- [ ] Service para compute pipeline view
- [ ] Reglas automáticas (cron)
- [ ] Tests

### Firestore
- [ ] Crear colección `tasks`
- [ ] Índices compuestos
- [ ] Migrar `accounts.isObjective`
- [ ] Security rules

### Frontend
- [ ] `PipelineLayout` component
- [ ] `PipelineToolbar` con filtros
- [ ] `StageColumn` component
- [ ] `AccountCard` component
- [ ] `AccountInspector` drawer
- [ ] `TaskItem` component
- [ ] Drag & drop con `dnd-kit`
- [ ] Mobile swipe gestures

### Automatismos
- [ ] Cron job "sin contacto 30d"
- [ ] Trigger "pedido facturado"
- [ ] Trigger "stage → SEGUIMIENTO"
- [ ] Batch "objetivos mensuales"

---

## 9. Próximos Pasos

1. **Implementar service** `computePipelineView()` que:
   - Fetch accounts con filtros
   - Join con tasks, orders, interactions
   - Calcula metrics, alerts, priorityScore
   - Cache en memoria/Redis

2. **Crear UI components** siguiendo el diseño glass de SBHeader

3. **Deploy inicial** con funcionalidad básica:
   - Ver pipeline por stages
   - Filtrar por comercial/zona
   - Click para ver detalle
   - Crear task manual

4. **Iterar** añadiendo:
   - Drag & drop
   - Quick actions
   - Santabrain suggestions
   - Automatismos

---

## 10. Archivos Clave

1. `src/features/sales/pipeline/pipeline.types.ts` - Types completos
2. `src/features/sales/pipeline/pipeline.actions.ts` - Server actions
3. `src/features/sales/pipeline/pipeline.service.ts` - Compute view (pendiente)
4. `SALES_PIPELINE_ARCHITECTURE.md` - Este documento

---

**Estado:** ✅ Backend implementado, UI pendiente
**Fecha:** 2025-10-10
**Versión:** 1.0

Sistema diseñado para escalar a 70+ cuentas por stage con performance óptima, filtrado inteligente y acción rápida desde mobile.
