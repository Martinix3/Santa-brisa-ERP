# Santa Brisa — Dashboard, Pipeline y Pedidos
## Plan de Implementación Detallado

---

## 📋 Resumen Ejecutivo

Este documento establece el plan de implementación completo para el módulo **Dashboard, Pipeline y Pedidos** de Santa Brisa ERP/CRM, estructurado en **6 sprints de 2 semanas** cada uno (12 semanas totales).

### Objetivos del Proyecto

1. ✅ Implementar Dashboard ejecutivo y personal con KPIs en tiempo real
2. ✅ Crear Pipeline Kanban con alertas IA contextuales
3. ✅ Desarrollar Hub de Pedidos unificado (DIRECT + PLACEMENT)
4. ✅ Construir Portal de Distribuidor con gestión autónoma
5. ✅ Integrar Gemini Intelligence para alertas automáticas
6. ✅ Conectar integraciones externas (Shopify, Holded, Sendcloud)

### Métricas de Éxito

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| **Tiempo de respuesta** | < 2s para dashboards | Lighthouse Performance |
| **Cobertura de tests** | > 80% | Jest + Playwright |
| **Alertas IA precisas** | > 85% relevancia | Feedback usuarios |
| **Adopción usuarios** | > 90% equipo comercial | Analytics |
| **Reducción tareas manuales** | > 60% | Comparativa pre/post |

---

## 🗓️ Cronograma General

```
Sprint 1-2: Fundamentos y Dashboard     (Semanas 1-4)
Sprint 3-4: Pipeline y Alertas IA       (Semanas 5-8)
Sprint 5-6: Hub Pedidos y Portal        (Semanas 9-12)
```

### Hitos Principales

| Hito | Fecha | Entregable |
|------|-------|------------|
| **H1: Dashboard MVP** | Semana 4 | Dashboard ejecutivo + personal funcional |
| **H2: Pipeline Kanban** | Semana 8 | Pipeline con alertas IA operativo |
| **H3: Hub Pedidos** | Semana 12 | Sistema completo en producción |

---

## 🚀 Sprint 1: Fundamentos y Arquitectura Base (Semanas 1-2)

### Objetivos
- Establecer arquitectura técnica sólida
- Configurar servicios canónicos
- Preparar infraestructura de datos

### Tareas Detalladas

#### 1.1 Setup Técnico (Día 1-2)
```bash
# Crear estructura de directorios
mkdir -p src/app/\(app\)/ventas/{dashboard,pedidos,pipeline}
mkdir -p src/components/{orders,alerts,dashboard}
mkdir -p src/server/actions/ventas
mkdir -p src/features/ventas/{dashboard,pipeline,orders}

# Configurar rutas Next.js App Router
touch src/app/\(app\)/ventas/page.tsx
touch src/app/\(app\)/ventas/pedidos/page.tsx
touch src/app/\(app\)/pipeline/page.tsx
```

**Entregables:**
- [x] Estructura de directorios creada
- [ ] Rutas Next.js configuradas
- [ ] Configuración TypeScript actualizada

#### 1.2 Servicios Canónicos (Día 3-5)
```typescript
// Extender order.service.ts con métodos específicos
class OrderService {
  // Nuevos métodos para Dashboard
  async getOrdersByDateRange(from: string, to: string): Promise<OrderSellOut[]>
  async getOrdersByOwner(ownerId: string): Promise<OrderSellOut[]>
  async getOrdersByChannel(channel: Channel): Promise<OrderSellOut[]>
  
  // Nuevos métodos para KPIs
  async calculateSellInTotal(dateRange): Promise<number>
  async calculateSellOutTotal(dateRange): Promise<number>
  async getTopAccounts(limit: number): Promise<Account[]>
  
  // Nuevos métodos para Pipeline
  async getOrdersByAccountStage(stage: Stage): Promise<OrderSellOut[]>
  async getInactiveAccounts(days: number): Promise<Account[]>
}
```

**Entregables:**
- [ ] `order.service.ts` extendido con métodos KPI
- [ ] Tests unitarios para servicios (>80% cobertura)
- [ ] Documentación de API interna

#### 1.3 Índices Firestore (Día 6-7)
```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "ordersSellOut",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ordersSellOut",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channel", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "accounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "stage", "order": "ASCENDING" },
        { "fieldPath": "lastInteractionAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Entregables:**
- [ ] Índices Firestore creados
- [ ] Queries optimizadas validadas
- [ ] Documentación de performance

#### 1.4 Server Actions Base (Día 8-10)
```typescript
// src/server/actions/ventas-dashboard.ts
'use server';

export async function getDashboardKPIs(userId: string, role: UserRole) {
  // Implementar lógica según rol
  if (role === 'admin') {
    return getExecutiveKPIs();
  } else if (role === 'comercial') {
    return getPersonalKPIs(userId);
  }
}

export async function getExecutiveKPIs() {
  const [sellIn, sellOut, topAccounts, alerts] = await Promise.all([
    orderService.calculateSellInTotal(last30Days),
    orderService.calculateSellOutTotal(last30Days),
    orderService.getTopAccounts(10),
    alertService.getCriticalAlerts()
  ]);
  
  return { sellIn, sellOut, topAccounts, alerts };
}

export async function getPersonalKPIs(userId: string) {
  // KPIs personales del comercial
}
```

**Entregables:**
- [ ] Server actions para Dashboard
- [ ] Server actions para Pipeline
- [ ] Server actions para Pedidos
- [ ] Validación de permisos por rol

### Criterios de Aceptación Sprint 1
- ✅ Estructura de proyecto completa
- ✅ Servicios canónicos extendidos y testeados
- ✅ Índices Firestore optimizados
- ✅ Server actions base implementadas
- ✅ Tests unitarios >80% cobertura

---

## 📊 Sprint 2: Dashboard Ejecutivo y Personal (Semanas 3-4)

### Objetivos
- Implementar Dashboard ejecutivo con KPIs globales
- Crear Dashboard personal para comerciales
- Integrar gráficos y visualizaciones

### Tareas Detalladas

#### 2.1 Dashboard Ejecutivo UI (Día 1-3)
```typescript
// src/app/(app)/ventas/page.tsx
export default async function VentasPage() {
  const user = await getCurrentUser();
  
  if (user.role === 'admin') {
    return <ExecutiveDashboard />;
  } else if (user.role === 'comercial') {
    return <PersonalDashboard userId={user.id} />;
  }
}

// src/features/ventas/dashboard/ExecutiveDashboard.tsx
export function ExecutiveDashboard() {
  const { data: kpis } = useSWR('/api/dashboard/executive', fetcher);
  
  return (
    <div className="dashboard-grid">
      <KPICard title="Sell-in" value={kpis.sellIn} trend="+12%" />
      <KPICard title="Sell-out" value={kpis.sellOut} trend="+8%" />
      <TopAccountsTable accounts={kpis.topAccounts} />
      <MixComercialChart data={kpis.byChannel} />
      <AlertsWidget alerts={kpis.alerts} />
    </div>
  );
}
```

**Entregables:**
- [ ] Componente `ExecutiveDashboard`
- [ ] Componentes KPI Cards reutilizables
- [ ] Tabla Top Accounts con ordenación
- [ ] Gráfico Mix Comercial (Recharts)

#### 2.2 Dashboard Personal UI (Día 4-6)
```typescript
// src/features/ventas/dashboard/PersonalDashboard.tsx
export function PersonalDashboard({ userId }: { userId: string }) {
  const { data: kpis } = useSWR(`/api/dashboard/personal/${userId}`, fetcher);
  
  return (
    <div className="personal-dashboard">
      <ActivitySummary 
        calls={kpis.callsToday}
        visits={kpis.visitsThisWeek}
        emails={kpis.emailsSent}
      />
      <MyOrdersCard orders={kpis.myOrdersThisMonth} />
      <MyAccountsCard accounts={kpis.myActiveAccounts} />
      <TasksList tasks={kpis.tasksOverdue} />
      <UpcomingVisits visits={kpis.upcomingVisits} />
    </div>
  );
}
```

**Entregables:**
- [ ] Componente `PersonalDashboard`
- [ ] Widget de actividad diaria
- [ ] Lista de tareas pendientes
- [ ] Calendario de visitas próximas

#### 2.3 Gráficos y Visualizaciones (Día 7-8)
```typescript
// src/components/dashboard/MixComercialChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function MixComercialChart({ data }: { data: Record<Channel, number> }) {
  const chartData = Object.entries(data).map(([channel, value]) => ({
    channel,
    value,
    fill: CHANNEL_COLORS[channel]
  }));
  
  return (
    <BarChart data={chartData}>
      <XAxis dataKey="channel" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="value" />
    </BarChart>
  );
}
```

**Entregables:**
- [ ] Gráfico Mix Comercial (Barras)
- [ ] Gráfico Sell-in vs Sell-out (Líneas)
- [ ] Gráfico Tendencias (Área)
- [ ] Componentes responsive

#### 2.4 Integración Tiempo Real (Día 9-10)
```typescript
// src/hooks/useDashboardRealtime.ts
export function useDashboardRealtime(userId: string, role: UserRole) {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'ordersSellOut'), where('ownerId', '==', userId)),
      (snapshot) => {
        // Recalcular KPIs en tiempo real
        const updatedKPIs = calculateKPIsFromSnapshot(snapshot);
        setKpis(updatedKPIs);
      }
    );
    
    return unsubscribe;
  }, [userId]);
  
  return kpis;
}
```

**Entregables:**
- [ ] Hook `useDashboardRealtime`
- [ ] Actualización automática de KPIs
- [ ] Optimización de queries Firestore
- [ ] Manejo de estados de carga

### Criterios de Aceptación Sprint 2
- ✅ Dashboard ejecutivo funcional con KPIs reales
- ✅ Dashboard personal operativo para comerciales
- ✅ Gráficos interactivos y responsive
- ✅ Actualización en tiempo real
- ✅ Performance < 2s carga inicial

---

## 🎯 Sprint 3: Pipeline Kanban (Semanas 5-6)

### Objetivos
- Implementar vista Kanban por etapas
- Drag & drop de cuentas
- Filtros y búsqueda avanzada

### Tareas Detalladas

#### 3.1 Vista Kanban Base (Día 1-3)
```typescript
// src/app/(app)/pipeline/page.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';

export default function PipelinePage() {
  const { accounts, moveAccount } = usePipeline();
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="pipeline-kanban">
        <KanbanColumn stage="POTENCIAL" accounts={accounts.potencial} />
        <KanbanColumn stage="SEGUIMIENTO" accounts={accounts.seguimiento} />
        <KanbanColumn stage="ACTIVA" accounts={accounts.activa} />
        <KanbanColumn stage="FALLIDA" accounts={accounts.fallida} />
      </div>
    </DndContext>
  );
}
```

**Entregables:**
- [ ] Componente `PipelineKanban`
- [ ] Columnas por etapa (POTENCIAL, SEGUIMIENTO, ACTIVA, FALLIDA)
- [ ] Cards de cuenta con información clave
- [ ] Layout responsive

#### 3.2 Drag & Drop (Día 4-5)
```typescript
// src/features/pipeline/hooks/usePipeline.ts
export function usePipeline() {
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const accountId = active.id as string;
    const newStage = over.id as Stage;
    
    // Actualizar en Firestore
    await updateAccountStage(accountId, newStage);
    
    // Optimistic update
    mutate();
  };
  
  return { accounts, handleDragEnd };
}
```

**Entregables:**
- [ ] Drag & drop funcional con @dnd-kit
- [ ] Actualización optimista (optimistic UI)
- [ ] Validación de transiciones de etapa
- [ ] Animaciones suaves

#### 3.3 Filtros y Búsqueda (Día 6-7)
```typescript
// src/features/pipeline/components/PipelineFilters.tsx
export function PipelineFilters() {
  const [filters, setFilters] = useState<PipelineFilters>({
    ownerId: null,
    segment: null,
    region: null,
    search: ''
  });
  
  return (
    <div className="pipeline-filters">
      <SearchInput value={filters.search} onChange={handleSearch} />
      <Select label="Comercial" options={owners} />
      <Select label="Segmento" options={segments} />
      <Select label="Región" options={regions} />
    </div>
  );
}
```

**Entregables:**
- [ ] Barra de filtros completa
- [ ] Búsqueda por nombre de cuenta
- [ ] Filtro por comercial responsable
- [ ] Filtro por segmento y región

#### 3.4 Detalle de Cuenta (Día 8-10)
```typescript
// src/components/accounts/AccountDrawer.tsx
export function AccountDrawer({ accountId }: { accountId: string }) {
  const { data: account } = useSWR(`/api/accounts/${accountId}`);
  
  return (
    <Drawer>
      <AccountHeader account={account} />
      <Tabs>
        <Tab label="Información">
          <AccountInfo account={account} />
        </Tab>
        <Tab label="Pedidos">
          <AccountOrders accountId={accountId} />
        </Tab>
        <Tab label="Interacciones">
          <AccountInteractions accountId={accountId} />
        </Tab>
        <Tab label="Alertas">
          <AccountAlerts accountId={accountId} />
        </Tab>
      </Tabs>
    </Drawer>
  );
}
```

**Entregables:**
- [ ] Drawer de detalle de cuenta
- [ ] Tabs con información completa
- [ ] Historial de pedidos
- [ ] Historial de interacciones

### Criterios de Aceptación Sprint 3
- ✅ Pipeline Kanban funcional con 4 columnas
- ✅ Drag & drop operativo y fluido
- ✅ Filtros y búsqueda funcionando
- ✅ Detalle de cuenta completo
- ✅ Performance < 1s para cambios de etapa

---

## 🔔 Sprint 4: Alertas IA y Gemini Integration (Semanas 7-8)

### Objetivos
- Integrar Gemini Intelligence Hub
- Implementar alertas automáticas contextuales
- Sistema de notificaciones

### Tareas Detalladas

#### 4.1 Gemini Analyzers (Día 1-3)
```typescript
// src/server/gemini/analyzers/pipeline-analyzer.ts
export class PipelineAnalyzer extends BaseAnalyzer {
  async analyzeAccount(account: Account): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Detectar inactividad
    if (daysSinceLastOrder(account) > 60) {
      alerts.push({
        type: 'ACCOUNT_INACTIVE',
        severity: 'HIGH',
        accountId: account.id,
        message: `${account.name} sin pedido en 60+ días`,
        suggestedActions: [
          { label: 'Programar visita', action: 'CREATE_TASK' },
          { label: 'Enviar email', action: 'SEND_EMAIL' }
        ]
      });
    }
    
    // Detectar pagos vencidos
    if (hasOverduePayments(account)) {
      alerts.push({
        type: 'PAYMENT_OVERDUE',
        severity: 'CRITICAL',
        accountId: account.id,
        message: `Pago vencido: ${account.overdueAmount}€`
      });
    }
    
    return alerts;
  }
}
```

**Entregables:**
- [ ] `PipelineAnalyzer` implementado
- [ ] Detección de cuentas inactivas
- [ ] Detección de pagos vencidos
- [ ] Detección de consignas elevadas

#### 4.2 Sistema de Alertas (Día 4-6)
```typescript
// src/components/alerts/AlertsWidget.tsx
export function AlertsWidget() {
  const { alerts } = useAlerts();
  
  return (
    <div className="alerts-widget">
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDismiss={() => dismissAlert(alert.id)}
          onConvertToTask={() => convertToTask(alert)}
          onSnooze={() => snoozeAlert(alert.id)}
        />
      ))}
    </div>
  );
}
```

**Entregables:**
- [ ] Componente `AlertsWidget`
- [ ] Cards de alerta con acciones
- [ ] Conversión de alerta a tarea
- [ ] Sistema de snooze (posponer)

#### 4.3 Alertas en Pipeline (Día 7-8)
```typescript
// src/features/pipeline/components/AccountCard.tsx
export function AccountCard({ account }: { account: Account }) {
  const { alerts } = useAccountAlerts(account.id);
  
  return (
    <Card>
      <AccountHeader account={account} />
      {alerts.length > 0 && (
        <AlertBadges alerts={alerts} />
      )}
      <AccountStats account={account} />
    </Card>
  );
}
```

**Entregables:**
- [ ] Badges de alerta en cards de cuenta
- [ ] Indicadores visuales por severidad
- [ ] Tooltip con detalle de alerta
- [ ] Acciones rápidas desde card

#### 4.4 Notificaciones Push (Día 9-10)
```typescript
// src/lib/notifications/push.ts
export async function sendPushNotification(userId: string, alert: Alert) {
  if (alert.severity === 'CRITICAL') {
    await sendNotification({
      userId,
      title: alert.message,
      body: alert.description,
      data: { alertId: alert.id, accountId: alert.accountId }
    });
  }
}
```

**Entregables:**
- [ ] Sistema de notificaciones push
- [ ] Configuración de preferencias por usuario
- [ ] Notificaciones solo para alertas críticas
- [ ] Deep linking a cuenta/alerta

### Criterios de Aceptación Sprint 4
- ✅ Gemini analyzers generando alertas automáticas
- ✅ AlertsWidget funcional en Dashboard
- ✅ Alertas visibles en Pipeline
- ✅ Notificaciones push operativas
- ✅ >85% relevancia de alertas (feedback usuarios)

---

## 📦 Sprint 5: Hub de Pedidos (Semanas 9-10)

### Objetivos
- Implementar gestión unificada de pedidos
- Creación manual de pedidos
- Filtros avanzados por flow, channel, status

### Tareas Detalladas

#### 5.1 Vista Principal Pedidos (Día 1-3)
```typescript
// src/app/(app)/ventas/pedidos/page.tsx
export default function PedidosPage() {
  return (
    <div className="pedidos-hub">
      <PedidosFilters />
      <PedidosTable />
      <CreateOrderButton />
    </div>
  );
}

// src/components/orders/PedidosTable.tsx
export function PedidosTable() {
  const { orders, isLoading } = useOrders();
  
  return (
    <DataTable
      columns={orderColumns}
      data={orders}
      onRowClick={handleRowClick}
      sortable
      paginated
    />
  );
}
```

**Entregables:**
- [ ] Página `/ventas/pedidos`
- [ ] Tabla de pedidos con columnas configurables
- [ ] Paginación y ordenación
- [ ] Loading states

#### 5.2 Filtros Avanzados (Día 4-5)
```typescript
// src/components/orders/PedidosFilters.tsx
export function PedidosFilters() {
  const [filters, setFilters] = useState<OrderFilters>({
    flow: null,
    channel: null,
    status: null,
    ownerId: null,
    dateFrom: null,
    dateTo: null
  });
  
  return (
    <div className="pedidos-filters">
      <Select label="Flow" options={['DIRECT', 'PLACEMENT']} />
      <Select label="Channel" options={channels} />
      <Select label="Status" options={statuses} />
      <Select label="Comercial" options={owners} />
      <DateRangePicker from={filters.dateFrom} to={filters.dateTo} />
    </div>
  );
}
```

**Entregables:**
- [ ] Filtros por flow (DIRECT, PLACEMENT)
- [ ] Filtros por channel (PRIVATE, DISTRIBUTOR, ONLINE, HORECA, CATERING)
- [ ] Filtros por status (open, confirmed, shipped, invoiced, paid)
- [ ] Filtro por comercial responsable
- [ ] Filtro por rango de fechas

#### 5.3 Creación Manual de Pedidos (Día 6-8)
```typescript
// src/components/orders/CreateOrderDrawer.tsx
export function CreateOrderDrawer() {
  const [formData, setFormData] = useState<CreateOrderInput>({
    flow: 'DIRECT',
    channel: null,
    accountId: null,
    lines: []
  });
  
  const handleSubmit = async () => {
    const order = await createOrder(formData);
    toast.success('Pedido creado correctamente');
    router.push(`/ventas/pedidos/${order.id}`);
  };
  
  return (
    <Drawer>
      <Form onSubmit={handleSubmit}>
        <SelectAccount value={formData.accountId} />
        <SelectFlow value={formData.flow} />
        <SelectChannel value={formData.channel} />
        <OrderLinesEditor lines={formData.lines} />
        <Button type="submit">Crear Pedido</Button>
      </Form>
    </Drawer>
  );
}
```

**Entregables:**
- [ ] Drawer de creación de pedido
- [ ] Selector de cuenta (con búsqueda)
- [ ] Selector de flow y channel
- [ ] Editor de líneas de pedido
- [ ] Validación de formulario
- [ ] Enriquecimiento automático de datos

#### 5.4 Detalle y Edición de Pedido (Día 9-10)
```typescript
// src/components/orders/OrderDetailDrawer.tsx
export function OrderDetailDrawer({ orderId }: { orderId: string }) {
  const { data: order } = useSWR(`/api/orders/${orderId}`);
  
  return (
    <Drawer>
      <OrderHeader order={order} />
      <Tabs>
        <Tab label="Detalles">
          <OrderDetails order={order} />
        </Tab>
        <Tab label="Líneas">
          <OrderLines lines={order.lines} />
        </Tab>
        <Tab label="Logística">
          <OrderLogistics order={order} />
        </Tab>
        <Tab label="Facturación">
          <OrderBilling order={order} />
        </Tab>
      </Tabs>
      <OrderActions order={order} />
    </Drawer>
  );
}
```

**Entregables:**
- [ ] Drawer de detalle de pedido
- [ ] Vista de líneas de pedido
- [ ] Información logística (Sendcloud)
- [ ] Información de facturación (Holded)
- [ ] Acciones: Editar, Confirmar, Cancelar

### Criterios de Aceptación Sprint 5
- ✅ Hub de pedidos funcional con tabla completa
- ✅ Filtros avanzados operativos
- ✅ Creación manual de pedidos funcionando
- ✅ Detalle y edición de pedidos
- ✅ Enriquecimiento automático de datos

---

## 🏢 Sprint 6: Portal Distribuidor y Finalización (Semanas 11-12)

### Objetivos
- Implementar Portal de Distribuidor
- Integrar sincronización Holded/Shopify/Sendcloud
- Testing end-to-end y deployment

### Tareas Detalladas

#### 6.1 Portal Distribuidor (Día 1-4)
```typescript
// src/app/(app)/distribuidor/portal/page.tsx
export default async function DistributorPortalPage() {
  const user = await getCurrentUser();
  
  if (user.role !== 'distribuidor') {
    redirect('/');
  }
  
  return (
    <div className="distributor-portal">
      <DistributorKPIs distributorId={user.partyId} />
      <DistributorOrders distributorId={user.partyId} />
      <DistributorDocuments distributorId={user.partyId} />
      <DistributorPreferences distributorId={user.partyId} />
    </div>
  );
}
```

**Entregables:**
- [ ] Página `/distribuidor/portal`
- [ ] KPIs específicos del distribuidor
- [ ] Lista de pedidos filtrados por `distributorPartyId`
- [ ] Gestión de documentos y notas
- [ ] Preferencias de comunicación

#### 6.2 Sincronización Holded (Día 5-6)
```typescript
// src/server/integrations/holded/sync-orders.ts
export async function syncOrderToHolded(orderId: string) {
  const order = await orderService.getById(orderId);
  
  // Crear/actualizar en Holded
  const holdedOrder = await holdedClient.createOrder({
    contactId: order.holdedContactId,
    lines: order.lines.map(line => ({
      name: line.name,
      units: line.qty,
      price: line.priceUnit
    })),
    status: mapStatusToHolded(order.status)
  });
  
  // Actualizar en ERP
  await orderService.update(orderId, {
    holdedOrderId: holdedOrder.id,
    syncedToHolded: true,
    lastSyncAt: new Date().toISOString()
  });
}
```

**Entregables:**
- [ ] Sincronización bidireccional con Holded
- [ ] Mapeo de estados ERP ↔ Holded
- [ ] Manejo de errores y reintentos
- [ ] Logs de sincronización

#### 6.3 Integración Sendcloud (Día 7-8)
```typescript
// src/server/integrations/sendcloud/create-shipment.ts
export async function createSendcloudShipment(orderId: string) {
  const order = await orderService.getById(orderId);
  
  const parcel = await sendcloudClient.createParcel({
    name: order.customerName,
    address: order.shippingAddress.street,
    city: order.shippingAddress.city,
    postal_code: order.shippingAddress.zip,
    country: order.shippingAddress.countryCode,
    weight: calculateWeight(order.lines),
    order_number: order.docNumber
  });
  
  // Actualizar pedido con tracking
  await orderService.update(orderId, {
    sendcloudParcelId: parcel.id,
    trackingCode: parcel.tracking_number,
    trackingUrl: parcel.tracking_url
  });
}
```

**Entregables:**
- [ ] Creación de envíos en Sendcloud
- [ ] Actualización de tracking en pedidos
- [ ] Webhook para estados de envío
- [ ] Generación de etiquetas

#### 6.4 Testing E2E (Día 9-10)
```typescript
// tests/e2e/dashboard.spec.ts
test('Dashboard ejecutivo muestra KPIs correctos', async ({ page }) => {
  await page.goto('/ventas');
  
  // Verificar KPIs visibles
  await expect(page.locator('[data-testid="sell-in-kpi"]')).toBeVisible();
  await expect(page.locator('[data-testi
