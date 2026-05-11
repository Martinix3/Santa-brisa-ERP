# Fase 1.5 - Reparación de Módulos Pendientes

**Fecha:** 19 de Enero de 2025  
**Objetivo:** Reparar y consolidar Marketing, Shippings (Logistics) y Tasks antes de Fase 2  
**Prioridad:** ALTA - Prerequisito para Fase 2

---

## 🎯 MÓDULOS A REPARAR

1. **Marketing** - Gestión de campañas, eventos, POS tactics
2. **Shippings/Logistics** - Envíos, tracking, carriers
3. **Tasks** - Sistema unificado de tareas

---

## 🔍 ANÁLISIS INICIAL

### 1. Módulo Marketing

**Archivos Principales:**
- `src/server/actions/marketing.ts`
- `src/app/(app)/marketing/events-activations/page.tsx`
- `src/server/actions/pos-tactics.service.ts`

**Problemas Detectados (según auditorías):**
- ⚠️ Santa Brain crea `marketingEvents` y `posTactics` sin métricas ROI ni estados
- ⚠️ No hay automatización de reposición POS
- ⚠️ No hay evaluación ROI
- ⚠️ QuickLog solo guarda notas sin estructura
- ⚠️ No hay dashboards/alertas integrados

**Qué Necesita:**
- [ ] Schema extendido con métricas (coste, ROI, estatus, resultado)
- [ ] Estados del lifecycle (PLANNED, ACTIVE, COMPLETED, ANALYZING, CLOSED)
- [ ] Cálculo de ROI automático
- [ ] Integración con TraceEventFactory
- [ ] Tasks de seguimiento automáticas
- [ ] Dashboard de ROI por campaña

---

### 2. Módulo Shippings/Logistics

**Archivos Principales:**
- `src/server/actions/logistics.actions.ts`
- `src/app/(app)/envios/tracking/[code]/page.tsx`
- `src/app/api/shipment/[shipmentId]/picking-slip/route.ts`
- `src/app/api/shipment/[shipmentId]/delivery-note/route.ts`

**Problemas Detectados:**
- ⚠️ No se detectaron acciones específicas de preparación/etiquetado
- ⚠️ Automatizaciones Sendcloud no visibles
- ⚠️ No hay `alertKey`/`taskKey` para incidentes logísticos
- ⚠️ Mapeo a lotes es manual
- ⚠️ Falta validación QC antes de enviar

**Qué Necesita:**
- [ ] Integrar validateLotConsumption() antes de crear shipments
- [ ] TraceEventFactory.logShipment() estandarizado
- [ ] Webhooks Sendcloud → TraceEvents + tasks
- [ ] Smart carrier selection (peso, destino, SLA, coste)
- [ ] Gestión de incidencias con workflow
- [ ] Dashboard OTIF (On Time In Full)

---

### 3. Módulo Tasks

**Archivos Principales:**
- `src/features/tasks/actions.ts`
- `src/features/tasks/mutations.ts`
- `src/features/tasks/components/TaskDrawer.tsx`
- `src/features/sales/pipeline/pipeline.actions.v2.ts`

**Problemas Detectados:**
- ⚠️ Coexisten tasks legacy y TaskNew
- ⚠️ Santa Brain genera tasks con formato legacy
- ⚠️ No hay unificación completa
- ⚠️ Falta dashboard consolidado
- ⚠️ No hay métricas de tasks automáticas vs manuales

**Qué Necesita:**
- [ ] Migración completa a TaskNew
- [ ] Deprecar Task legacy
- [ ] Santa Brain usa TaskNew exclusivamente
- [ ] Dashboard unificado de tasks
- [ ] Métricas: auto vs manual, completion rate, avg time
- [ ] Integración con GeminiInsights (Fase 2)

---

## 📋 PLAN DE REPARACIÓN

### TRACK 1: Módulo Marketing (2-3 días)

#### Paso 1: Extender Schema
```typescript
// En SSOT o types/marketing.ts
export interface MarketingEvent {
  id: string;
  title: string;
  kind: EventKind; // DEMO, FERIA, FORMACION, OTRO
  
  // Lifecycle
  status: 'PLANNED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'ANALYZING' | 'CLOSED' | 'CANCELLED';
  
  // Fechas
  startAt: ISODateString;
  endAt?: ISODateString;
  
  // Presupuesto
  budget?: number;
  actualSpend?: number;
  
  // Métricas
  metrics?: {
    attendees?: number;
    samplesDistributed?: number;
    leadsGenerated?: number;
    ordersAttributed?: number;
    revenueAttributed?: number;
  };
  
  // ROI
  roi?: {
    investment: number;  // budget + actualSpend
    revenue: number;     // revenueAttributed
    roi: number;         // (revenue - investment) / investment * 100
    paybackDays?: number;
  };
  
  // Metadata
  accountId?: string;
  city?: string;
  ownerUserId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PosTactic {
  id: string;
  accountId: string;
  
  // Lifecycle
  status: PosTacticStatus; // planned, approved, scheduled, delivered, active, closed, cancelled
  
  // Material
  tacticCode?: string;
  catalogItemId?: string;  // FK a posCostCatalog
  description?: string;
  customDesc?: string;
  
  // Cantidades y costes
  qtyPlanned?: number;
  qtyInstalled?: number;
  estCost?: number;
  actualCost: number;
  
  // Fechas
  plannedDate?: ISODateString;
  installedAt?: ISODateString;
  removedAt?: ISODateString;
  
  // Performance
  executionScore: number; // 0-100
  result?: {
    baselineSales?: number;     // Ventas antes
    periodSales?: number;       // Ventas durante
    upliftUnits?: number;       // Incremento unidades
    upliftPct?: number;         // % incremento
    roi?: number;               // ROI calculado
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  
  // Tracking
  taskId?: string;  // Task de instalación/seguimiento
  campaignId?: string;  // Vinculado a campaña
  photos?: string[];  // Fotos antes/después
  
  createdAt: ISODateString;
  createdById: string;
  updatedAt: ISODateString;
}
```

#### Paso 2: Server Actions
```typescript
// src/server/actions/marketing.actions.ts

export async function createMarketingEvent(data: CreateEventInput): Promise<MarketingEvent> {
  // Validar input
  // Crear evento
  // TraceEventFactory.create({ kind: 'SALE', phase: 'SALE', ... })
  // Crear task de seguimiento
  // Return
}

export async function updateEventMetrics(
  eventId: string,
  metrics: EventMetrics
): Promise<MarketingEvent> {
  // Actualizar métricas
  // Calcular ROI
  // TraceEvent de actualización
  // Return
}

export async function closeEvent(
  eventId: string,
  finalMetrics: EventMetrics
): Promise<MarketingEvent> {
  // Cerrar evento
  // Calcular ROI final
  // Generar reporte
  // Return
}

export async function installPosTactic(data: InstallPosInput): Promise<PosTactic> {
  // Validar cuenta
  // Consumir material (con validateLotConsumption si aplica)
  // Crear registro POS
  // TraceEvent
  // Crear task de seguimiento (verificar después de X días)
  // Return
}

export async function measurePosImpact(
  posTacticId: string,
  salesData: SalesComparison
): Promise<PosResult> {
  // Comparar ventas baseline vs periodo
  // Calcular uplift
  // Calcular ROI
  // Update PosTactic.result
  // Return
}
```

#### Paso 3: Dashboard Marketing
```typescript
// Página: /marketing/dashboard

interface MarketingDashboard {
  summary: {
    activeEvents: number;
    activePOS: number;
    monthlySpend: number;
    monthlyROI: number;
  };
  
  events: {
    upcoming: MarketingEvent[];
    active: MarketingEvent[];
    needsAnalysis: MarketingEvent[];
  };
  
  pos: {
    installed: PosTactic[];
    needsMeasurement: PosTactic[];
    topPerformers: PosTactic[];
  };
  
  roi: {
    byEventType: Record<EventKind, { spend: number; revenue: number; roi: number }>;
    byAccount: Array<{ accountId: string; totalSpend: number; totalROI: number }>;
    trend: ChartData;
  };
}
```

---

### TRACK 2: Módulo Shippings/Logistics (3-4 días)

#### Paso 1: Flujo Completo de Envíos

```typescript
// src/server/actions/logistics.actions.ts

export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  // 1. Validar pedido existe y está confirmado
  const order = await getOrder(input.orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.status !== 'confirmed') throw new Error('Pedido no confirmado');
  
  // 2. Asignar lotes según FEFO
  const lotAssignments = await assignLotsFefo(order.lines);
  
  // 3. ✅ CRÍTICO: Validar QC de lotes asignados
  for (const assignment of lotAssignments) {
    const lot = await getLot(assignment.lotNumber);
    validateLotConsumption(lot); // Bloquea si no aprobado
  }
  
  // 4. Crear shipment
  const shipment: Shipment = {
    id: generateId('ship'),
    shipmentNumber: await generateShipmentNumber(),
    orderId: input.orderId,
    partyId: order.partyId,
    accountId: order.accountId,
    mode: determineShipmentMode(order),
    status: 'picking',
    lines: order.lines.map(line => ({
      itemId: line.itemId,
      name: line.name,
      qty: line.qty,
      uom: line.uom,
      lotNumber: lotAssignments.find(a => a.itemId === line.itemId)?.lotNumber
    })),
    customerName: order.customerName,
    // ... address fields
    createdAt: now,
    updatedAt: now
  };
  
  // 5. Persistir
  await db.collection('shipments').doc(shipment.id).set(shipment);
  
  // 6. ✅ TraceEventFactory
  await TraceEventFactory.logShipment({
    shipmentId: shipment.id,
    orderId: order.id,
    customerName: order.customerName,
    lotNumbers: lotAssignments.map(a => a.lotNumber),
    data: { shipmentNumber: shipment.shipmentNumber }
  });
  
  // 7. Crear task de preparación
  await createTask({
    kind: 'ORDER_PREP',
    title: `Preparar envío ${shipment.shipmentNumber}`,
    shipmentId: shipment.id,
    priority: 'MEDIUM',
    department: 'ALMACEN'
  });
  
  return shipment;
}

export async function generatePickingSlip(shipmentId: string): Promise<PDF> {
  // Generar PDF con:
  // - Datos del pedido
  // - Líneas con lotes asignados (FEFO)
  // - Ubicaciones de almacén
  // - Espacio para firmas
  // - QR code para tracking
}

export async function validateShipment(
  shipmentId: string,
  validation: ShipmentValidation
): Promise<void> {
  // Inspector valida:
  // - Todos los items preparados
  // - Cantidades correctas
  // - Inspección visual OK
  // - Packaging adecuado
  
  // Actualizar status: picking → ready_to_ship
  // TraceEvent de validación
  // Generar albarán
}

export async function createShippingLabel(
  shipmentId: string,
  carrierPreference?: string
): Promise<ShippingLabel> {
  // Si Sendcloud:
  //   - Smart carrier selection (peso, destino, coste, SLA)
  //   - Generar etiqueta via API
  //   - Solicitar recogida automática
  //   - Configurar webhooks
  
  // Si otro carrier:
  //   - Template PDF de etiqueta
  //   - Email automático solicitando recogida
  
  // TraceEvent de etiqueta generada
  // Actualizar shipment con trackingCode
}

export async function handleSendcloudWebhook(
  event: SendcloudWebhookEvent
): Promise<void> {
  // Parse webhook
  // Actualizar status del shipment
  // TraceEvent del cambio de estado
  // Si delivered → crear task de feedback
  // Si exception → crear task de gestión incidencia
  // Notificar cliente
}
```

#### Paso 2: Gestión de Incidencias
```typescript
export async function reportShipmentIncident(
  shipmentId: string,
  incident: IncidentData
): Promise<Incident> {
  // Crear registro de incidencia
  // TraceEvent
  // Crear task urgente de resolución
  // Notificar stakeholders
  // Si necesario: re-route o reenvío
}
```

#### Paso 3: KPIs Logísticos
```typescript
export async function calculateLogisticsKPIs(
  dateRange: DateRange
): Promise<LogisticsKPIs> {
  return {
    otif: calculateOTIF(shipments), // On Time In Full
    avgPreparationTime: calculateAvgTime(shipments, 'picking'),
    carrierPerformance: groupBy(shipments, 'carrier').map(calculateSLA),
    costPerShipment: calculateAvgCost(shipments),
    exceptionRate: (exceptions / total) * 100
  };
}
```

---

### TRACK 3: Módulo Tasks (2-3 días)

#### Problema Principal
**Coexisten 2 sistemas:**
- Task legacy (`status: 'todo' | 'done' | 'cancelled'`)
- TaskNew (`status: TaskStatusNew`)

**Santa Brain** genera tasks legacy  
**Pipeline** usa TaskNew

#### Solución: Unificación Completa

```typescript
// 1. Migrar TODAS las creaciones de tasks a TaskNew

// ANTES (en Santa Brain):
await db.collection('tasks').add({
  title: 'Seguimiento',
  status: 'todo',  // ❌ Legacy
  kind: 'visita'   // ❌ Minúsculas
});

// DESPUÉS:
import { createPipelineTask } from '@/features/sales/pipeline/pipeline.actions.v2';

await createPipelineTask({
  kind: 'VISITA',  // ✅ SSOT
  title: 'Seguimiento',
  status: 'BACKLOG',  // ✅ TaskStatusNew
  priority: 'MEDIUM',
  department: 'VENTAS',
  source: 'AUTO_RULE',
  assignedToId: userId,
  accountId: accountId,
  dueAt: nextWeek
});
```

#### Paso 1: Deprecar Task Legacy
```typescript
// src/domain/ssot.ts - Ya existe TaskNew

// Marcar como deprecated:
/** @deprecated Use TaskNew instead */
export interface Task {
  id: string;
  title: string;
  dueAt: string;
  status: TaskStatus; // 'todo' | 'done' | 'cancelled'
}

// Migrar colecciones:
// tasks (legacy) → tasks_new (o renombrar)
```

#### Paso 2: Service Unificado de Tasks
```typescript
// src/server/tasks/task.service.ts

export class TaskService {
  async createTask(input: CreateTaskInput): Promise<TaskNew> {
    // Validar con Zod
    const validated = CreateTaskSchema.parse(input);
    
    // Calcular campos derivados
    const task: TaskNew = {
      ...validated,
      id: generateId('task'),
      status: validated.status || 'BACKLOG',
      priorityRank: computePriorityRank(validated),
      slaBucket: computeSlaBucket(validated.dueAt),
      progress: 0,
      createdAt: now,
      updatedAt: now
    };
    
    // Persistir
    await db.collection('tasks').doc(task.id).set(task);
    
    // TraceEvent (opcional para tasks importantes)
    if (task.priority === 'URGENT' || task.source === 'AUTO_RULE') {
      await TraceEventFactory.create({
        kind: 'ALERT',
        phase: phaseFromDepartment(task.department),
        title: `Task creada: ${task.title}`,
        details: `Task ${task.kind} generada automáticamente`,
        data: { taskId: task.id, source: task.source }
      });
    }
    
    return task;
  }
  
  async completeTask(
    taskId: string,
    outcome: TaskOutcome,
    data?: CompleteTaskData
  ): Promise<TaskNew> {
    // Validar outcome según kind
    // Actualizar task
    // Crear eventos/entidades según outcome
    // TraceEvent
    // Return
  }
}
```

#### Paso 3: Migración de Santa Brain
```typescript
// En cada service de Santa Brain que crea tasks,
// usar TaskService unificado

// src/server/santa-brain/services/task.service.ts
import { TaskService } from '@/server/tasks/task.service';

export class SantaBrainTaskService {
  constructor(private taskService: TaskService) {}
  
  async createAutomaticTasks(
    classification: Classification,
    account: Account,
    results: ProcessResult[]
  ): Promise<TaskNew[]> {
    const tasks: TaskNew[] = [];
    
    // Si outcome=NEXT_VISIT
    if (classification.nextAction === 'VISIT') {
      tasks.push(await this.taskService.createTask({
        kind: 'VISITA',
        title: `Visitar ${account.name}`,
        accountId: account.id,
        assignedToId: account.ownerId,
        department: 'VENTAS',
        source: 'AUTO_RULE',
        dueAt: classification.suggestedDate || addDays(new Date(), 7)
      }));
    }
    
    // Si menciona cobro pendiente
    if (classification.entities.amounts.some(a => a.type === 'pending')) {
      tasks.push(await this.taskService.createTask({
        kind: 'COBRO',
        title: `Cobro pendiente ${account.name}`,
        accountId: account.id,
        assignedToId: account.ownerId,
        department: 'VENTAS',
        source: 'AUTO_RULE',
        priority: 'HIGH'
      }));
    }
    
    return tasks;
  }
}
```

#### Paso 4: Dashboard Consolidado
```typescript
// Página: /tasks/dashboard

interface TasksDashboard {
  summary: {
    total: number;
    byStatus: Record<TaskStatusNew, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
    dueToday: number;
  };
  
  sources: {
    manual: number;
    autoRule: number;
    event: number;
    campaign: number;
    integration: number;
  };
  
  performance: {
    avgCompletionTime: number;  // horas
    completionRate: number;      // %
    autoTaskSuccessRate: number; // % de tasks auto que fueron útiles
  };
  
  byUser: Array<{
    userId: string;
    userName: string;
    assigned: number;
    completed: number;
    overdue: number;
  }>;
}
```

---

## 🎯 PRIORIZACIÓN

### Orden Recomendado

**1. Tasks (Día 1-3)** - Crítico para todo lo demás
- Unificar a TaskNew
- Service centralizado
- Migrar Santa Brain
- Dashboard

**2. Logistics (Día 4-7)** - Crítico para operación
- Validación QC en envíos
- TraceEvents
- Sendcloud integration
- Incident management

**3. Marketing (Día 8-10)** - Importante pero menos crítico
- Schema con ROI
- Server actions
- Dashboard

---

## ✅ CHECKLIST DE REPARACIÓN

### Tasks Module
- [ ] Deprecar Task legacy
- [ ] TaskService unificado creado
- [ ] Santa Brain migrado a TaskNew
- [ ] Dashboard de tasks implementado
- [ ] Tests de task creation

### Logistics Module  
- [ ] validateLotConsumption() en createShipment()
- [ ] TraceEventFactory.logShipment() integrado
- [ ] Webhooks Sendcloud configurados
- [ ] Smart carrier selection implementado
- [ ] Incident management con workflow
- [ ] Dashboard OTIF

### Marketing Module
- [ ] Schema extendido con ROI y status
- [ ] Server actions completas
- [ ] Cálculo de ROI automático
- [ ] Tasks de seguimiento automáticas
- [ ] Dashboard de ROI

---

## 📊 IMPACTO ESPERADO

### Post-Reparación

| Módulo | Antes | Después |
|--------|-------|---------|
| **Tasks** | 2 sistemas mezclados | 1 sistema unificado |
| **Logistics** | Sin validación QC | Validación obligatoria |
| **Marketing** | Sin ROI tracking | ROI automático |

### Métricas Objetivo

- **Tasks:** 100% TaskNew (0% legacy)
- **Logistics:** 0% envíos sin QC, OTIF >95%
- **Marketing:** ROI calculado en 100% eventos

---

## 🔜 DESPUÉS DE REPARACIÓN

Una vez completada Fase 1.5, estarás listo para:

**Fase 2 - Inteligencia:**
- Santa Brain refactor (con tasks unificadas)
- Gemini NLP (con marketing/logistics data limpia)
- QuickLog Evolution (con toda la base sólida)

---

**Plan de reparación creado. ¿Empezamos con el módulo de Tasks?** 

Es el más crítico porque afecta a todos los demás (Santa Brain, marketing, logistics todos crean tasks).
