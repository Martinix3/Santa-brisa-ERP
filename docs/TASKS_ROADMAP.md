# Roadmap del Sistema de Tareas - Sprints 3-7

## Estado Actual ✅

- ✅ **Sprint 1**: Filtros + Calendario + Optimistic UI
- ✅ **Sprint 2**: Subtareas + Comentarios + Asignación
- ✅ **Validación**: Sistema completo con tests y docs
- ✅ **Panel Admin**: Variables del sistema configurables

---

## Sprint 3 — Integración Agenda/Visitas 📅

### Objetivo
Integrar tareas con el sistema de eventos/calendario para visitas programadas.

### 3.1. Crear "Visita" desde Tarea

**Feature**: Botón "Planificar visita" en TaskDrawer

```typescript
// src/features/tasks/components/TaskDrawer.tsx

<SBButton
  data-variant="secondary"
  onClick={() => openVisitPlannerDialog()}
  disabled={!task.accountId}
>
  <Calendar className="w-4 h-4 mr-2" />
  Planificar Visita
</SBButton>
```

**Flujo**:
1. Usuario click "Planificar visita"
2. Dialog se abre con:
   - Fecha/hora de visita
   - Duración (30min, 1h, 2h)
   - Notas adicionales
3. Al confirmar:
   ```typescript
   // Crear evento en calendar
   const event = await createEvent({
     title: `Visita: ${account.name}`,
     startAt: selectedDateTime,
     endAt: addMinutes(selectedDateTime, duration),
     kind: 'DEMO',
     accountId: task.accountId,
     createdById: userId,
   });
   
   // Actualizar tarea con eventId
   await updateTask({
     id: taskId,
     eventId: event.id,
     status: 'PROGRAMADA', // Cambiar a programada
   });
   ```

**Badge "tiene visita"**:
```tsx
{task.eventId && (
  <div className="flex items-center gap-1 text-xs text-blue-600">
    <Calendar className="w-3 h-3" />
    <span>Visita programada</span>
  </div>
)}
```

### 3.2. Sincronización "X días sin visita/pedido"

**Cloud Function**: `functions/src/automation/checkInactiveAccounts.ts`

```typescript
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./firebase-admin";

export const checkInactiveAccounts = onSchedule(
  {
    schedule: "0 9 * * *", // Diario a las 9 AM
    timeZone: "Europe/Madrid",
  },
  async (event) => {
    console.log("🤖 Running inactive accounts check...");

    // Obtener config del sistema
    const configSnap = await db.collection("systemConfig").doc("default").get();
    const config = configSnap.data();
    const DAYS_WITHOUT_ORDER = config?.businessRules?.alerts?.daysWithoutOrder || 45;
    const DAYS_WITHOUT_VISIT = config?.businessRules?.alerts?.daysWithoutVisit || 30;

    const now = new Date();
    const weekKey = getISOWeek(now); // Para deduplicación

    // Stream de cuentas activas
    const accountsSnap = await db
      .collection("contacts")
      .where("roles", "array-contains", "CUSTOMER")
      .where("status", "==", "ACTIVA")
      .get();

    let createdTasks = 0;

    for (const accountDoc of accountsSnap.docs) {
      const account = accountDoc.data();

      // 1. Check último pedido
      const lastOrderSnap = await db
        .collection("ordersSellOut")
        .where("accountId", "==", account.id)
        .orderBy("orderDate", "desc")
        .limit(1)
        .get();

      const lastOrder = lastOrderSnap.docs[0]?.data();
      const daysSinceOrder = lastOrder
        ? daysBetween(new Date(lastOrder.orderDate), now)
        : 999;

      if (daysSinceOrder >= DAYS_WITHOUT_ORDER) {
        const dedupeKey = `no-order-${account.id}-week-${weekKey}`;
        await upsertAutoTask({
          dedupeKey,
          title: `Visitar: ${account.displayName} (${daysSinceOrder}d sin pedido)`,
          desc: `Último pedido: ${lastOrder?.orderDate || "nunca"}`,
          kind: "VISITA",
          department: "VENTAS",
          source: "AUTO_RULE",
          assignedToId: account.customer?.ownerId || "default-owner",
          accountId: account.id,
          status: "BACKLOG",
          priority: daysSinceOrder >= 60 ? "HIGH" : "MEDIUM",
          dueAt: addDays(now, 2).toISOString(),
        });
        createdTasks++;
      }

      // 2. Check última visita (similar)
      const lastVisitSnap = await db
        .collection("interactions")
        .where("accountId", "==", account.id)
        .where("kind", "==", "VISITA")
        .where("status", "==", "done")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      const lastVisit = lastVisitSnap.docs[0]?.data();
      const daysSinceVisit = lastVisit
        ? daysBetween(new Date(lastVisit.createdAt), now)
        : 999;

      if (daysSinceVisit >= DAYS_WITHOUT_VISIT) {
        const dedupeKey = `no-visit-${account.id}-week-${weekKey}`;
        await upsertAutoTask({
          dedupeKey,
          title: `Contactar: ${account.displayName} (${daysSinceVisit}d sin visita)`,
          kind: "VISITA",
          department: "VENTAS",
          source: "AUTO_RULE",
          assignedToId: account.customer?.ownerId || "default-owner",
          accountId: account.id,
          status: "BACKLOG",
          priority: "MEDIUM",
          dueAt: addDays(now, 3).toISOString(),
        });
        createdTasks++;
      }
    }

    console.log(`✅ Created/updated ${createdTasks} auto tasks`);
    return { success: true, tasksCreated: createdTasks };
  }
);

// Helper: Upsert task con deduplicación
async function upsertAutoTask(data: TaskData & { dedupeKey: string }) {
  const { dedupeKey, ...taskData } = data;

  // Buscar tarea existente por dedupeKey
  const existingSnap = await db
    .collection("tasks")
    .where("source", "==", "AUTO_RULE")
    .where("accountId", "==", taskData.accountId)
    .where("status", "in", ["BACKLOG", "IN_PROGRESS"])
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    // Actualizar existente
    const taskRef = existingSnap.docs[0].ref;
    await taskRef.update({
      ...taskData,
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Crear nueva
    const ref = db.collection("tasks").doc();
    await ref.set({
      id: ref.id,
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
```

**Deployment**:
```bash
firebase deploy --only functions:checkInactiveAccounts
```

**Cloud Scheduler** (automático con `onSchedule`):
- Cron: `0 9 * * *` (diario 9 AM)
- Timezone: Europe/Madrid

---

## Sprint 4 — Seguridad, Índices y Rendimiento 🔒

### 4.1. Reglas Firestore Avanzadas

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isTeam() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return request.auth.token.role == 'admin';
    }
    
    function isOwner(assignedToId) {
      return request.auth.uid == assignedToId;
    }
    
    function isManagerOf(dept) {
      // Check if user manages this department
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return userDoc.data.managedDepartments != null 
          && dept in userDoc.data.managedDepartments;
    }
    
    match /tasks/{id} {
      // Read: Admin ve todo, Manager ve su dept, Owner ve sus tareas
      allow read: if isTeam() && (
        isAdmin() 
        || isManagerOf(resource.data.department) 
        || isOwner(resource.data.assignedToId)
      );
      
      // Create: Cualquier user autenticado
      allow create: if isTeam();
      
      // Update/Delete: Admin o owner
      allow update, delete: if isTeam() && (
        isAdmin() 
        || isOwner(resource.data.assignedToId)
      );
    }
  }
}
```

### 4.2. Índices Compuestos

**firestore.indexes.json**:
```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedToId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "department", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedToId", "order": "ASCENDING" },
        { "fieldPath": "priorityRank", "order": "DESCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Deploy**:
```bash
firebase deploy --only firestore:indexes
```

### 4.3. Paginación + Virtualización

**Hook de paginación**:
```typescript
// src/features/tasks/hooks/usePaginatedTasks.ts

export function usePaginatedTasks(userId: string, pageSize = 50) {
  const [tasks, setTasks] = useState<TaskNew[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  async function loadMore() {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    let query = db
      .collection("tasks")
      .where("assignedToId", "==", userId)
      .orderBy("dueAt", "asc")
      .limit(pageSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snap = await query.get();
    const newTasks = snap.docs.map(d => d.data() as TaskNew);
    
    setTasks(prev => [...prev, ...newTasks]);
    setLastDoc(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length === pageSize);
    setLoading(false);
  }
  
  useEffect(() => {
    loadMore();
  }, []);
  
  return { tasks, loading, hasMore, loadMore };
}
```

**UI con react-virtual**:
```typescript
// src/features/tasks/components/VirtualTaskList.tsx

import { useVirtualizer } from "@tanstack/react-virtual";

export function VirtualTaskList({ tasks }: { tasks: TaskNew[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TaskCard task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Sprint 5 — Notificaciones y Recordatorios 🔔

### 5.1. Recordatorios (FCM/Email)

**Cloud Function**: `functions/src/notifications/taskReminders.ts`

```typescript
export const sendTaskReminders = onSchedule(
  {
    schedule: "0 8 * * *", // Diario a las 8 AM
    timeZone: "Europe/Madrid",
  },
  async (event) => {
    const today = new Date().toISOString().split("T")[0];
    
    // Tareas vencen hoy y no completadas
    const tasksSnap = await db
      .collection("tasks")
      .where("dueAt", ">=", today)
      .where("dueAt", "<", today + "T23:59:59")
      .where("status", "in", ["BACKLOG", "IN_PROGRESS", "PROGRAMADA"])
      .get();
    
    for (const taskDoc of tasksSnap.docs) {
      const task = taskDoc.data();
      
      // Get user's FCM token
      const userDoc = await db.collection("users").doc(task.assignedToId).get();
      const fcmToken = userDoc.data()?.fcmToken;
      
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: "Tarea pendiente hoy",
            body: task.title,
          },
          data: {
            taskId: task.id,
            type: "TASK_REMINDER",
          },
        });
      }
      
      // También enviar email si preferido
      const email = userDoc.data()?.email;
      if (email && userDoc.data()?.emailNotifications) {
        await sendEmail({
          to: email,
          subject: "Recordatorio: Tarea pendiente hoy",
          html: `<p>Tu tarea <strong>${task.title}</strong> vence hoy.</p>`,
        });
      }
    }
  }
);
```

### 5.2. Snooze (Posponer)

**Action**:
```typescript
// src/features/tasks/actions.ts

export async function snoozeTask(
  taskId: string,
  duration: "1d" | "3d" | "1w"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const taskRef = db.collection("tasks").doc(taskId);
    const task = (await taskRef.get()).data() as TaskNew;
    
    const currentDue = task.dueAt ? new Date(task.dueAt) : new Date();
    let newDue: Date;
    
    switch (duration) {
      case "1d":
        newDue = addDays(currentDue, 1);
        break;
      case "3d":
        newDue = addDays(currentDue, 3);
        break;
      case "1w":
        newDue = addDays(currentDue, 7);
        break;
    }
    
    await taskRef.update({
      dueAt: newDue.toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
```

**UI Button**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Posponer</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => snoozeTask(task.id, "1d")}>
      1 día
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => snoozeTask(task.id, "3d")}>
      3 días
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => snoozeTask(task.id, "1w")}>
      1 semana
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Sprint 6 — Calidad de Vida (A11y + Teclado + Tests) ⌨️

### 6.1. Accesibilidad

**ARIA Roles y Labels**:
```tsx
// TaskCard.tsx

<div 
  role="article"
  aria-label={`Tarea: ${task.title}`}
  aria-busy={optimisticUpdate}
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  <h3 id={`task-title-${task.id}`}>{task.title}</h3>
  <p aria-labelledby={`task-title-${task.id}`}>{task.desc}</p>
</div>
```

**Focus Trap en Drawer**:
```typescript
// TaskDrawer.tsx

import { useFocusTrap } from "@/hooks/useFocusTrap";

export function TaskDrawer({ open }: Props) {
  const trapRef = useFocusTrap(open);
  
  return (
    <div ref={trapRef} role="dialog" aria-modal="true">
      {/* contenido */}
    </div>
  );
}
```

### 6.2. Atajos de Teclado

```typescript
// src/hooks/useTaskHotkeys.ts

import { useHotkeys } from "react-hotkeys-hook";

export function useTaskHotkeys() {
  // N: Nueva tarea
  useHotkeys("n", () => {
    openTaskDrawer();
  });
  
  // F: Filtros
  useHotkeys("f", () => {
    openFilters();
  });
  
  // K/J: Navegación
  useHotkeys("k", () => {
    selectPreviousTask();
  });
  
  useHotkeys("j", () => {
    selectNextTask();
  });
  
  // Enter: Abrir tarea seleccionada
  useHotkeys("enter", () => {
    openSelectedTask();
  });
  
  // Esc: Cerrar drawer
  useHotkeys("esc", () => {
    closeDrawer();
  });
}
```

### 6.3. Tests

**Tests Unitarios**:
```typescript
// src/features/tasks/utils/dateFilters.spec.ts

import { describe, it, expect } from "vitest";
import { groupCountsByDate, isThisWeek } from "./dateFilters";

describe("dateFilters", () => {
  it("agrupa tareas por fecha", () => {
    const tasks = [
      { id: "1", dueAt: "2025-10-14T10:00:00" },
      { id: "2", dueAt: "2025-10-14T15:00:00" },
      { id: "3", dueAt: "2025-10-15T10:00:00" },
    ];
    
    const grouped = groupCountsByDate(tasks);
    
    expect(grouped.get("2025-10-14")).toBe(2);
    expect(grouped.get("2025-10-15")).toBe(1);
  });
  
  it("detecta si una fecha es esta semana", () => {
    const today = new Date("2025-10-17");
    
    expect(isThisWeek("2025-10-17", today)).toBe(true);
    expect(isThisWeek("2025-10-20", today)).toBe(true);
    expect(isThisWeek("2025-10-10", today)).toBe(false);
  });
});

// src/features/tasks/utils/filters.spec.ts

describe("applyFilters", () => {
  const tasks = [
    { id: "1", department: "VENTAS", status: "IN_PROGRESS" },
    { id: "2", department: "MARKETING", status: "DONE" },
    { id: "3", department: "VENTAS", status: "BACKLOG" },
  ];
  
  it("filtra por departamento", () => {
    const filtered = applyFilters(tasks, { dept: "VENTAS" });
    
    expect(filtered).toHaveLength(2);
    expect(filtered.every(t => t.department === "VENTAS")).toBe(true);
  });
  
  it("filtra por múltiples criterios", () => {
    const filtered = applyFilters(tasks, {
      dept: "VENTAS",
      status: "IN_PROGRESS",
    });
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });
});
```

**Tests E2E** (Playwright):
```typescript
// e2e/tasks.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Sistema de Tareas", () => {
  test("crear nueva tarea", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Click nueva tarea
    await page.click('button:has-text("Nueva tarea")');
    
    // Llenar formulario
    await page.fill('input[name="title"]', "Tarea de prueba E2E");
    await page.selectOption('select[name="department"]', "VENTAS");
    
    // Guardar
    await page.click('button:has-text("Crear Tarea")');
    
    // Verificar aparece en lista
    await expect(page.locator("text=Tarea de prueba E2E")).toBeVisible();
  });
  
  test("filtrar por departamento", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Abrir filtros
    await page.click('button:has-text("Filtros")');
    
    // Seleccionar VENTAS
    await page.click('button:has-text("VENTAS")');
    
    // Verificar solo muestra VENTAS
    const tasks = await page.locator('[data-department]').all();
    for (const task of tasks) {
      const dept = await task.getAttribute("data-department");
      expect(dept).toBe("VENTAS");
    }
  });
  
  test("calendario filtra kanban", async ({ page }) => {
    await page.goto("/calendario");
    
    // Click en día específico
    await page.click('[data-date="2025-10-17"]');
    
    // Verificar solo muestra tareas de ese día
    const visibleTasks = await page.locator('[data-due-date]').all();
    for (const task of visibleTasks) {
      const dueDate = await task.getAttribute("data-due-date");
      expect(dueDate?.startsWith("2025-10-17")).toBe(true);
    }
  });
});
```

---

## Sprint 7 — Marketing y Campañas 🎯

### 7.1. Campañas → Tareas en Lote

**Feature**: "Crear plan de campaña"

```typescript
// src/features/campaigns/actions.ts

export async function createCampaignPlan(campaignId: string) {
  const campaign = await getCampaign(campaignId);
  
  const taskTemplates = [
    {
      title: `[${campaign.title}] Preparar material de ventas`,
      department: "VENTAS",
      dueAt: subDays(campaign.startAt, 7),
    },
    {
      title: `[${campaign.title}] Planificar logística`,
      department: "LOGISTICA",
      dueAt: subDays(campaign.startAt, 5),
    },
    {
      title: `[${campaign.title}] Review QA de materiales`,
      department: "CALIDAD",
      dueAt: subDays(campaign.startAt, 3),
    },
    {
      title: `[${campaign.title}] Brief a equipo comercial`,
      department: "VENTAS",
      dueAt: subDays(campaign.startAt, 1),
    },
  ];
  
  const batch = db.batch();
  
  for (const template of taskTemplates) {
    const ref = db.collection("tasks").doc();
    batch.set(ref, {
      id: ref.id,
      ...template,
      campaignId: campaign.id,
      kind: "MARKETING",
      source: "CAMPAIGN",
      status: "BACKLOG",
      assignedToId: getOwnerForDept(template.department),
      createdById: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  await batch.commit();
}
```

### 7.2. PLV Vinculado

**Dashboard de PLV por Campaña**:
```typescript
// src/app/(app)/marketing/campaigns/[id]/page.tsx

export default async function CampaignDetailPage({ params }: Props) {
  const campaign = await getCampaign(params.id);
  
  // Get PLV materials vinculados
  const plvMaterials = await db
    .collection("plv_material")
    .where("campaignId", "==", params.id)
    .get();
  
  // Get tasks de la campaña
  const tasks = await db
    .collection("tasks")
    .where("campaignId", "==", params.id)
    .get();
  
  return (
    <div className="space-y-6">
      <CampaignHeader campaign={campaign} />
      
      <section>
        <h2>Material PLV</h2>
        <PLVInventoryTable materials={plvMaterials.docs.map(d => d.data())} />
      </section>
      
      <section>
        <h2>Tareas de Campaña</h2>
        <TaskList tasks={tasks.docs.map(d => d.data())} />
      </section>
      
      <section>
        <h2>KPIs</h2>
        <CampaignKPIs campaignId={campaign.id} />
      </section>
    </div>
  );
}
```

---

## Resumen de Prioridades

### Impacto Alto + Esfuerzo Medio:
1. ✅ Sprint 3: Integración Agenda/Visitas
2. ✅ Sprint 4: Seguridad y Rendimiento
3. ✅ Sprint 5: Notificaciones

### Impacto Medio + Esfuerzo Bajo:
4. Sprint 6: A11y + Teclado
5. Sprint 7: Marketing

### Orden Sugerido:
```
Sprint 3 → Sprint 4 → Sprint 5 → Sprint 6 → Sprint 7
```

---

## Comandos Útiles

```bash
# Deploy functions
firebase deploy --only functions

# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy rules
firebase deploy --only firestore:rules

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

---

**Última actualización**: 2025-10-13  
**Versión**: 1.0.0  
**Próximo Sprint**: Sprint 3 (Integración Agenda/Visitas)
