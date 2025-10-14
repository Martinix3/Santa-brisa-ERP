# 🏪 FASE 3: ACCOUNTS INTELIGENTES - PLAN DE IMPLEMENTACIÓN

**Fecha Inicio:** 15/01/2025  
**Duración Estimada:** 2 días  
**Estado:** 📋 PLANIFICACIÓN  
**Dependencias:** Fase 1 (Pedidos workflow)

---

## 🎯 OBJETIVOS

Transformar el módulo de Accounts/Cuentas en un sistema inteligente production-ready con:

1. **KPIs avanzados por cuenta** - Ventas, visitas, pipeline, engagement (con signals para IA)
2. **Timeline completo** - Todas las interacciones con desduplicación y lazy loading
3. **Vista 360° mejorada** - Header con KPIs + Tabs + Acciones rápidas
4. **Búsqueda Algolia** - Instant search con facets (owner, distribuidor, territory, health)
5. **Saved Views** - Vistas predefinidas por territorio/comercial/riesgo
6. **Tabs Direct/Placement** - Separación total como en pedidos
7. **Cards con tint por stage** - Visual minimalista con colores sutiles
8. **Performance optimizada** - Cache, índices, virtualización
9. **AI-ready** - Signals y placeholders para Fase 6
10. **Integración total** - Con pedidos, tareas, interactions, proyectos

---

## 📊 ARQUITECTURA

### Estructura de Datos (SSOT)

El `Account` ya existe en SSOT, extenderemos con campos calculados **production-ready**:

```typescript
type Account = {
  // Campos existentes...
  id: string;
  name: string;
  flow: CommercialFlow;           // 'DIRECT' | 'PLACEMENT'
  flowOverride?: boolean;         // ⭐ Para casos mixtos
  ownerId: string;                // Comercial asignado
  distributorPartyId?: string;    // Si PLACEMENT
  territory?: Territory;
  segment?: AccountSegment;
  stage: Stage;                   // ACTIVA | SEGUIMIENTO | POTENCIAL | etc
  
  // Nuevos campos calculados (server-side)
  totalRevenue?: number;          // Total ventas históricas
  ytdRevenue?: number;            // Ventas año actual (normalizado por tamaño)
  lastOrderDate?: string;         // Último pedido
  avgOrderValue?: number;         // Ticket promedio
  orderCount?: number;            // Total pedidos
  interactionCount?: number;      // Total interacciones "de valor"
  lastInteractionDate?: string;   // Última interacción real
  pipelineValue?: number;         // Valor en pipeline
  tasksPending?: number;          // Tareas pendientes
  engagementScore?: number;       // Score 0-100 (normalizado)
  
  // Health con motivos
  health?: {
    status: 'excellent' | 'good' | 'at_risk' | 'critical';
    motivos: string[];            // ⭐ [">90d sin pedido", "baja respuesta"]
    lastChecked: string;
  };
  
  // Signals para Santa Brain (Fase 6)
  signals?: Array<{               // ⭐ AI-ready
    type: string;                 // "no_orders_90d", "low_engagement", etc
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
};
```

### Regla única de Flow

```typescript
// Prioridad:
// 1. Si existe account.flow → usar ese
// 2. Si flowOverride === true → respetar flow manual
// 3. Si no, inferir por % de pedidos con distributorId
//    - Si >80% tienen distributorId → PLACEMENT
//    - Si <20% tienen distributorId → DIRECT
//    - Si entre 20-80% → Cuenta MIXTA (requiere flowOverride)
```

### Server Actions

```typescript
// src/server/actions/accounts.ts

/**
 * Obtener KPIs de una cuenta
 */
export async function getAccountKPIs(accountId: string): Promise<{
  success: boolean;
  data?: {
    revenue: {
      total: number;
      ytd: number;
      lastOrder: string;
      avgOrder: number;
      trend: 'up' | 'down' | 'stable';
    };
    engagement: {
      interactionCount: number;
      lastInteraction: string;
      averageFrequency: number; // días entre interacciones
      score: number; // 0-100
    };
    pipeline: {
      value: number;
      dealCount: number;
      conversionRate: number;
    };
    health: {
      status: 'excellent' | 'good' | 'at_risk' | 'critical';
      indicators: string[];
      recommendations: string[];
    };
  };
}>;

/**
 * Obtener timeline completo de cuenta
 */
export async function getAccountTimeline(accountId: string): Promise<{
  success: boolean;
  data?: TimelineEvent[];
}>;

type TimelineEvent = {
  id: string;
  type: 'ORDER' | 'INTERACTION' | 'TASK' | 'VISIT' | 'EMAIL' | 'NOTE' | 'PROJECT';
  date: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  relatedId?: string; // ID del pedido, tarea, etc.
};

/**
 * Obtener pedidos de cuenta
 */
export async function getAccountOrders(
  accountId: string,
  filters?: { status?: string; dateFrom?: string; dateTo?: string }
): Promise<{
  success: boolean;
  data?: Order[];
}>;

/**
 * Obtener tareas de cuenta
 */
export async function getAccountTasks(
  accountId: string,
  filters?: { status?: string; assignedTo?: string }
): Promise<{
  success: boolean;
  data?: Task[];
}>;

/**
 * Búsqueda y filtrado avanzado de cuentas
 */
export async function searchAccounts(filters: {
  query?: string;
  territory?: Territory;
  segment?: AccountSegment;
  status?: string;
  minRevenue?: number;
  maxRevenue?: number;
  engagementLevel?: 'high' | 'medium' | 'low';
  hasOrders?: boolean;
  hasTasks?: boolean;
}): Promise<{
  success: boolean;
  data?: Account[];
}>;
```

---

## 🎨 COMPONENTES UI

### 1. AccountsPage (Lista con Tabs Direct/Placement)

**Ubicación:** `src/app/(app)/ventas/cuentas/page.tsx`

**Features:**
- Header con título y acciones globales
- **Tabs de flujo comercial** (igual que pedidos):
  - Tab "Venta Directa" (flow='DIRECT')
  - Tab "Colocación" (flow='PLACEMENT')
  - Badge con count en cada tab
- **KPIs del tab activo** (4 cards, datos filtrados por tab)
- Barra de búsqueda
- Filtros múltiples (Territory, Segment, Stage)
- Lista/Grid de tarjetas de cuentas **del tab activo**
- Cada tarjeta muestra: Name, Territory, Last Order, YTD Revenue, Engagement Score
- Click → Abre AccountDrawer

**Layout:**
```
┌─────────────────────────────────────────┐
│ Header Glass                            │
│ 📍 Cuentas                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [Venta Directa 45] [Colocación 23]     │ ← Tabs
└─────────────────────────────────────────┘

┌─────────────┬──────────┬──────────┬──────────┐
│ KPI: Total  │ Revenue  │Engagement│  Health  │ ← KPIs del tab activo
└─────────────┴──────────┴──────────┴──────────┘

🔍 [Buscar...] [Territory ▼] [Segment ▼] [Stage ▼]

┌──────┬──────┬──────┬──────┐
│ Card │ Card │ Card │ Card │ (Grid 4 cols)
│  🏪  │  🏪  │  🏪  │  🏪  │ ← Solo del tab activo
└──────┴──────┴──────┴──────┘
```

**Separación por Flow:**
```typescript
// En AccountsPage
const [activeTab, setActiveTab] = useState<'direct' | 'placement'>('direct');

// Separar cuentas por flow
const { directAccounts, placementAccounts } = useMemo(() => {
  const direct = accounts.filter(a => a.flow === 'DIRECT');
  const placement = accounts.filter(a => a.flow === 'PLACEMENT');
  return { directAccounts: direct, placementAccounts: placement };
}, [accounts]);

// Trabajar con accounts del tab activo
const accountsToShow = activeTab === 'direct' ? directAccounts : placementAccounts;
```

### 2. AccountKPIs Component

**Ubicación:** `src/components/accounts/AccountKPIs.tsx`

**Features:**
- 4 KPI cards: Revenue, Engagement, Pipeline, Health
- Cada card con trend indicator
- Click en card expande detalles

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <KpiCard 
    label="REVENUE YTD"
    value="€45K"
    trend="up"
    variant="dark"
  />
  <KpiCard 
    label="ENGAGEMENT"
    value="8.5/10"
    trend="stable"
    variant="light"
  />
  <KpiCard 
    label="PIPELINE"
    value="€12K"
    variant="light"
  />
  <KpiCard 
    label="HEALTH"
    value="Good"
    variant="subtle"
    icon={<CheckCircle />}
  />
</div>
```

### 3. AccountTimeline Component

**Ubicación:** `src/components/accounts/AccountTimeline.tsx`

**Features:**
- Timeline vertical con eventos ordenados por fecha (más reciente primero)
- Iconos según tipo: 🛒 Orders, 💬 Interactions, ✅ Tasks, 📧 Emails, 📝 Notes
- Click en evento → Navega al detalle (e.g., order drawer)
- Infinite scroll o paginación
- Filtros por tipo de evento

```
┌─────────────────────────────┐
│ Timeline de Actividad       │
├─────────────────────────────┤
│ 🛒 15/01/2025               │
│    Pedido #1234             │
│    €2,500 - Completado      │
├─────────────────────────────┤
│ 💬 12/01/2025               │
│    Visita comercial         │
│    Reunión con gerente      │
├─────────────────────────────┤
│ ✅ 10/01/2025               │
│    Tarea: Seguimiento       │
│    Completada por Juan      │
└─────────────────────────────┘
```

### 4. AccountOrdersTab Component

**Ubicación:** `src/components/accounts/AccountOrdersTab.tsx`

**Features:**
- Tabla de pedidos de la cuenta
- Columnas: #, Date, Status, Total, Actions
- Filtros: Status, Date Range
- Click en pedido → Abre OrderDrawer
- Botón "Nuevo Pedido" para esta cuenta

### 5. AccountTasksTab Component

**Ubicación:** `src/components/accounts/AccountTasksTab.tsx`

**Features:**
- Lista de tareas relacionadas con la cuenta
- Filtros: Status (Pending/Completed), Assigned To
- Crear nueva tarea para la cuenta
- Marcar como completada inline

### 6. AccountDrawer (Vista 360°)

**Ubicación:** `src/app/(app)/@drawer/(.)ventas/cuentas/[id]/page.tsx`

**Features:**
- Header con nombre cuenta + **Flow badge prominente**
- **Si es PLACEMENT:** Info del distribuidor en header
- AccountKPIs (4 cards)
- Tabs: Timeline | Orders | Tasks | Documents | Settings
- Drawer usa EntityDrawerShell del sistema

**Layout:**
```
┌──────────────────────────────────────────┐
│ [X] Cuenta: Super Mercado Norte          │
│     🏪 VENTA DIRECTA   Territory: NORTE │
│     🟢 ACTIVE                            │
├──────────────────────────────────────────┤
│ [Si PLACEMENT: Distribuidor: XYZ S.L.]  │ ← Condicional
├──────────────────────────────────────────┤
│ [KPI Cards Grid]                         │
├──────────────────────────────────────────┤
│ [Timeline|Orders|Tasks|Docs|⚙️]         │
├──────────────────────────────────────────┤
│                                          │
│ [Tab Content Here]                       │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

**Flow Badge:**
```tsx
<div className="flex items-center gap-2">
  <span className={
    account.flow === 'DIRECT' 
      ? 'sb-badge sb-badge--primary' 
      : 'sb-badge sb-badge--warning'
  }>
    {account.flow === 'DIRECT' ? '🏪 VENTA DIRECTA' : '📦 COLOCACIÓN'}
  </span>
  <span className="sb-badge">{account.segment}</span>
</div>

{account.flow === 'PLACEMENT' && account.distributorPartyId && (
  <div className="mt-2 p-3 bg-secondary/20 rounded-lg">
    <p className="text-sm text-muted-foreground">A través de:</p>
    <p className="font-medium">{distributorName}</p>
  </div>
)}
```

---

## 📋 TAREAS DETALLADAS

### Día 1 (4-5 horas)

**Mañana:**

1. **Extender server actions** (2h)
   - `src/server/actions/accounts.ts`
   - Implementar `getAccountKPIs()`
   - Implementar `getAccountTimeline()`
   - Implementar `getAccountOrders()`
   - Implementar `getAccountTasks()`
   - Implementar `searchAccounts()`

2. **AccountKPIs component** (1h)
   - Crear `src/components/accounts/AccountKPIs.tsx`
   - 4 KPI cards con design system
   - Integrar con `getAccountKPIs()`

**Tarde:**

3. **AccountTimeline component** (1.5h)
   - Crear `src/components/accounts/AccountTimeline.tsx`
   - Timeline vertical con iconos por tipo
   - Click para navegar a detalles
   - Loading states

4. **AccountsPage refactor con Tabs** (1h)
   - Actualizar `src/app/(app)/ventas/cuentas/page.tsx`
   - Implementar tabs Direct/Placement (patrón de pedidos)
   - Separar cuentas por flow
   - KPIs filtrados por tab activo
   - Búsqueda y filtros dentro de cada tab
   - Grid de tarjetas del tab activo

### Día 2 (4-5 horas)

**Mañana:**

5. **AccountOrdersTab** (1h)
   - Crear `src/components/accounts/AccountOrdersTab.tsx`
   - Tabla de pedidos
   - Filtros y acciones
   - Integración con OrderDrawer

6. **AccountTasksTab** (1h)
   - Crear `src/components/accounts/AccountTasksTab.tsx`
   - Lista de tareas
   - Crear/completar inline

**Tarde:**

7. **AccountDrawer completo con Flow** (2h)
   - Actualizar `src/app/(app)/@drawer/(.)ventas/cuentas/[id]/page.tsx`
   - Header con Flow badge prominente
   - Condicional: Si PLACEMENT mostrar distribuidor
   - AccountKPIs
   - Sistema de tabs
   - Integrar Timeline, Orders, Tasks tabs
   - Loading y error states

8. **Testing final** (0.5h)
   - Verificar navegación
   - Verificar integración con pedidos
   - Verificar performance con muchos eventos

---

## 🎨 DESIGN SYSTEM

Usar componentes existentes:

- `sb-header-glass` - Header de página
- `sb-card-glass-light` - Tarjetas de cuenta
- `sb-tabs` - Sistema de tabs
- `KpiCard` - KPIs (ya existe en shared)
- `sb-input`, `sb-select` - Búsqueda y filtros
- `EntityDrawerShell` - Base del drawer

---

## 🔗 INTEGRACIONES

### Con Pedidos (Fase 1)
- Timeline muestra pedidos de la cuenta **del mismo flow**
- Tab Orders lista pedidos **filtrados por flow de la cuenta**
- Badge visual en cada pedido (DIRECT/PLACEMENT)
- Click → Abre OrderDrawer
- Crear nuevo pedido con cuenta + flow pre-seleccionados

### Con Tareas (Existente)
- Timeline muestra tareas
- Tab Tasks lista tareas de cuenta
- Crear/completar tareas inline

### Con Interactions (Existente)
- Timeline muestra interacciones (visitas, llamadas, emails)
- Engagement score basado en frecuencia

### Con Distribuidores (Solo PLACEMENT)
- Si account.flow === 'PLACEMENT':
  - Mostrar info del distribuidor en drawer header
  - Opcional: Tab "Distribuidor" con detalles
  - Histórico de relación con distribuidor

### Con Proyectos (Fase 2 - Opcional)
- Si una cuenta está vinculada a proyecto, mostrar en tab separado

---

## 📊 CÁLCULOS DE KPIS

### Revenue KPIs
```typescript
// Total histórico
totalRevenue = sum(orders.total where orders.accountId === accountId)

// YTD (Year to Date)
ytdRevenue = sum(orders.total where 
  orders.accountId === accountId AND 
  orders.createdAt >= startOfYear)

// Avg Order Value
avgOrderValue = totalRevenue / orderCount

// Trend
trend = ytdRevenue > ytdRevenueLastYear ? 'up' : 
        ytdRevenue < ytdRevenueLastYear ? 'down' : 'stable'
```

### Engagement Score
```typescript
// Factores:
// - Frecuencia de interacciones (peso: 40%)
// - Pedidos recientes (peso: 30%)
// - Tareas completadas (peso: 20%)
// - Respuesta a emails (peso: 10%)

interactionFrequency = interactionCount / daysSinceFirstInteraction
recentOrders = orderCount (last 90 days)
completedTasks = tasksCompleted / totalTasks

engagementScore = (
  (interactionFrequency * 40) +
  (recentOrders / 10 * 30) +
  (completedTasks * 20) +
  (emailResponseRate * 10)
) // Normalizar a 0-100
```

### Health Status
```typescript
// excellent: engagementScore > 80 AND recentOrders > 0
// good: engagementScore > 60
// at_risk: engagementScore < 40 OR daysSinceLastOrder > 90
// critical: engagementScore < 20 OR daysSinceLastOrder > 180
```

---

## 🔍 BÚSQUEDA ALGOLIA

### Índice: `accounts`

```typescript
{
  objectID: string;           // account.id
  name: string;               // searchable
  flow: 'DIRECT' | 'PLACEMENT';
  
  // Owner & Distributor
  ownerId: string;            // filterOnly facet
  ownerName: string;          // searchable + facet
  distributorId?: string;     // filterOnly facet
  distributorName?: string;   // searchable + facet
  
  // Facets
  segment: string;
  stage: string;
  territory: string;
  tags: string[];
  
  // Health & Risk
  healthStatus: string;       // facet: excellent|good|at_risk|critical
  riskLevel: string;          // facet: low|medium|high
  
  // Ranking
  ytdRevenue: number;
  engagementScore: number;
  lastOrderDate: number;      // timestamp
}
```

### Configuración Algolia:

```typescript
// Facets
attributesForFaceting: [
  'flow',
  'filterOnly(ownerId)',
  'ownerName',
  'filterOnly(distributorId)',
  'distributorName',
  'segment',
  'stage',
  'territory',
  'healthStatus',
  'riskLevel',
  'tags'
]

// Searchable
searchableAttributes: [
  'name',
  'distributorName',
  'ownerName',
  'tags'
]

// Ranking
customRanking: [
  'desc(engagementScore)',
  'desc(ytdRevenue)',
  'desc(lastOrderDate)'
]
```

### Replicas para Sorting:

```
accounts                   → Relevancia (default)
accounts_revenue_desc      → Por revenue
accounts_engagement_desc   → Por engagement
accounts_name_asc          → Alfabético
```

---

## 🔖 SAVED VIEWS

### Preset Views:

```typescript
const PRESET_VIEWS: SavedView[] = [
  // Por Owner
  {
    id: 'mis-cuentas',
    name: '👤 Mis Cuentas',
    filters: { ownerId: [currentUser.id] }
  },
  {
    id: 'mis-direct-activas',
    name: '🟢 Mis Direct - Activas',
    filters: { 
      ownerId: [currentUser.id],
      flow: ['DIRECT'],
      stage: ['ACTIVA']
    }
  },
  
  // Por Flujo + Territory
  {
    id: 'direct-norte',
    name: '🏪 Direct Norte',
    filters: { 
      flow: ['DIRECT'],
      territory: ['NORTE']
    }
  },
  {
    id: 'placement-madrid',
    name: '📦 Placement Madrid',
    filters: {
      flow: ['PLACEMENT'],
      territory: ['MADRID']
    }
  },
  
  // Por Riesgo
  {
    id: 'alto-riesgo',
    name: '🔴 Alto Riesgo',
    filters: {
      healthStatus: ['at_risk', 'critical']
    },
    sort: 'engagement'
  },
  {
    id: 'excelente-health',
    name: '🟢 Excelente Health',
    filters: {
      healthStatus: ['excellent']
    }
  },
  
  // Por Segmento
  {
    id: 'horeca-activas',
    name: '🍽️ HORECA - Activas',
    filters: {
      segment: ['HORECA'],
      stage: ['ACTIVA']
    }
  },
  {
    id: 'retail-seguimiento',
    name: '🏪 RETAIL - Seguimiento',
    filters: {
      segment: ['RETAIL'],
      stage: ['SEGUIMIENTO']
    }
  },
  
  // Por Valor
  {
    id: 'alto-valor',
    name: '💎 Alto Valor (Top 20)',
    filters: {},
    sort: 'revenue'
  },
  {
    id: 'top-engagement',
    name: '⭐ Top Engagement',
    filters: {},
    sort: 'engagement'
  }
];
```

### Saved Views UI:

```tsx
<div className="flex items-center gap-2 mb-4">
  <select
    value={currentView}
    onChange={loadView}
    className="sb-select"
  >
    <option value="">Todas las cuentas</option>
    <optgroup label="Predefinidas">
      {PRESET_VIEWS.map(view => (
        <option key={view.id} value={view.id}>
          {view.name}
        </option>
      ))}
    </optgroup>
    <optgroup label="Mis vistas">
      {userSavedViews.map(view => (
        <option key={view.id} value={view.id}>
          {view.name}
        </option>
      ))}
    </optgroup>
  </select>
  
  <button
    onClick={saveCurrentView}
    className="sb-btn sb-btn--ghost"
  >
    💾 Guardar vista
  </button>
</div>
```

---

## 🎨 ACCOUNTCARD CON TINT POR STAGE

```tsx
// AccountCard - Cards blancas con tint sutil
const getCardClass = (stage: Stage) => {
  const baseClass = 'sb-card-glass-light p-5 hover-raise transition-all';
  
  switch (stage) {
    case 'ACTIVA':
      return `${baseClass} bg-green-50/30`;      // Tint verde muy sutil
    case 'SEGUIMIENTO':
      return `${baseClass} bg-blue-50/30`;       // Tint azul muy sutil
    case 'POTENCIAL':
      return `${baseClass} bg-yellow-50/30`;     // Tint amarillo muy sutil
    case 'FALLIDA':
      return `${baseClass} bg-red-50/30`;        // Tint rojo muy sutil
    case 'CERRADA':
      return `${baseClass} bg-gray-50/20`;       // Tint gris muy sutil
    case 'BAJA':
      return `${baseClass} bg-gray-50/10 opacity-70`; // Casi invisible
    default:
      return baseClass;
  }
};

// En el render
<div className={getCardClass(account.stage)}>
  {/* Header con Flow + Owner */}
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-semibold">{account.name}</h3>
    <span className="sb-badge">
      {account.flow === 'DIRECT' ? '🏪' : '📦'}
    </span>
  </div>
  
  {/* Owner & Distributor */}
  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
    <span>👤 {account.ownerName}</span>
    {account.distributorName && (
      <>
        <span>•</span>
        <span>📦 {account.distributorName}</span>
      </>
    )}
  </div>
  
  {/* Stage badge */}
  <span className="text-xs px-2 py-0.5 rounded-full bg-current/10 mb-3">
    {account.stage}
  </span>
  
  {/* KPIs */}
  <div className="grid grid-cols-2 gap-2 text-sm">
    <div>
      <p className="text-muted-foreground">Revenue YTD</p>
      <p className="font-semibold">€{account.ytdRevenue?.toLocaleString()}</p>
    </div>
    <div>
      <p className="text-muted-foreground">Engagement</p>
      <p className="font-semibold">{account.engagementScore}/100</p>
    </div>
  </div>
  
  {/* Health indicator */}
  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
    <span>{getHealthIcon(account.health?.status)}</span>
    <span className="text-xs text-muted-foreground">
      {account.health?.status || 'Unknown'}
    </span>
  </div>
</div>
```

---

## 🚀 OPTIMIZACIONES PRODUCTION-READY

### 1. Índices Firestore

```typescript
// Crear estos índices compuestos:
[
  // Para getAccountOrders
  { collection: 'orders', fields: ['accountId', 'createdAt:desc'] },
  
  // Para getAccountTimeline (interactions)
  { collection: 'interactions', fields: ['accountId', 'when:desc'] },
  
  // Para getAccountTasks
  { collection: 'tasks', fields: ['accountId', 'status', 'nextAt'] },
  
  // Para searchAccounts
  { collection: 'accounts', fields: ['status', 'segment', 'territory'] },
  { collection: 'accounts', fields: ['ownerId', 'stage'] },
  { collection: 'accounts', fields: ['flow', 'territory', 'stage'] }
]
```

### 2. Cache de KPIs

```typescript
// src/lib/cache.ts
const KPI_CACHE = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export function getCachedKPIs(accountId: string) {
  const cached = KPI_CACHE.get(accountId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}

export function setCachedKPIs(accountId: string, data: any) {
  KPI_CACHE.set(accountId, {
    data,
    expires: Date.now() + CACHE_TTL
  });
}

export function invalidateKPICache(accountId: string) {
  KPI_CACHE.delete(accountId);
}

// Invalidar al crear/actualizar pedido, tarea, interacción
```

### 3. Timeline con Desduplicación

```typescript
// src/server/actions/accounts.ts - getAccountTimeline
export async function getAccountTimeline(
  accountId: string,
  options?: { limit?: number; offset?: number; types?: string[] }
) {
  const events: TimelineEvent[] = [];
  const seenRelatedIds = new Set<string>();
  
  // Cargar en paralelo
  const [orders, interactions, tasks, notes] = await Promise.all([
    getAccountOrders(accountId),
    getAccountInteractions(accountId),
    getAccountTasks(accountId),
    getAccountNotes(accountId)
  ]);
  
  // Agregar con desduplicación
  orders.forEach(order => {
    if (!seenRelatedIds.has(order.id)) {
      events.push({
        id: `order-${order.id}`,
        type: 'ORDER',
        date: order.createdAt,
        title: `Pedido #${order.docNumber || order.id}`,
        relatedId: order.id,
        metadata: { total: order.totalAmount, status: order.status }
      });
      seenRelatedIds.add(order.id);
    }
  });
  
  // ... mismo proceso para interactions, tasks, notes
  
  // Ordenar por fecha desc
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Paginación
  const start = options?.offset || 0;
  const limit = options?.limit || 20;
  
  return {
    success: true,
    data: events.slice(start, start + limit),
    total: events.length,
    hasMore: start + limit < events.length
  };
}
```

### 4. Lazy Loading por Tipo

```tsx
// AccountTimeline component
const [loadedTypes, setLoadedTypes] = useState<Set<string>>(new Set(['ORDER']));

async function loadMoreOfType(type: string) {
  if (loadedTypes.has(type)) return;
  
  setLoading(true);
  // Cargar solo ese tipo
  await fetchTimelineEvents(accountId, { types: [type] });
  setLoadedTypes(prev => new Set([...prev, type]));
  setLoading(false);
}

// UI
<div className="flex gap-2 mb-4">
  <button onClick={() => loadMoreOfType('INTERACTION')}>
    💬 Mostrar interacciones
  </button>
  <button onClick={() => loadMoreOfType('TASK')}>
    ✅ Mostrar tareas
  </button>
  <button onClick={() => loadMoreOfType('EMAIL')}>
    📧 Mostrar emails
  </button>
</div>
```

### 5. Virtualización (si >1000 eventos)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: events.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
  overscan: 5
});

<div ref={parentRef} className="h-[600px] overflow-auto">
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
    {rowVirtualizer.getVirtualItems().map(virtualRow => (
      <div
        key={virtualRow.index}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`
        }}
      >
        <TimelineEventCard event={events[virtualRow.index]} />
      </div>
    ))}
  </div>
</div>
```

---

## 📈 TELEMETRÍA

```typescript
// src/lib/telemetry.ts
export function trackEvent(event: string, data?: any) {
  // Posthog, Mixpanel, o custom
  console.log('[Telemetry]', event, data);
}

// En AccountsPage
useEffect(() => {
  trackEvent('accounts_page_viewed', {
    tab: activeTab,
    filters: currentFilters
  });
}, [activeTab, currentFilters]);

// En AccountDrawer
useEffect(() => {
  const start = performance.now();
  
  loadAccountData(accountId).then(() => {
    const duration = performance.now() - start;
    trackEvent('account_drawer_loaded', {
      accountId,
      duration_ms: duration
    });
    
    if (duration > 2000) {
      console.warn('[Performance] Slow account load:', accountId, duration);
    }
  });
}, [accountId]);

// Al cambiar tab en AccountDrawer
function handleTabChange(tab: string) {
  trackEvent('account_tab_changed', {
    accountId,
    tab,
    previousTab: currentTab
  });
  setCurrentTab(tab);
}
```

---

## 🤖 AI-READY PLACEHOLDERS

### En AccountDrawer:

```tsx
{/* Placeholder para Insights de Gemini (Fase 6) */}
<div className="sb-card-glass-light p-5 border-2 border-dashed border-border/50">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <Sparkles size={20} className="text-white" />
    </div>
    <div>
      <h3 className="font-semibold">AI Insights</h3>
      <p className="text-xs text-muted-foreground">
        Próximamente: Recomendaciones inteligentes
      </p>
    </div>
  </div>
  
  <div className="space-y-2 opacity-50">
    <div className="flex items-start gap-2">
      <span>💡</span>
      <p className="text-sm">Sugerencia de próxima acción</p>
    </div>
    <div className="flex items-start gap-2">
      <span>📊</span>
      <p className="text-sm">Predicción de churn</p>
    </div>
    <div className="flex items-start gap-2">
      <span>🎯</span>
      <p className="text-sm">Oportunidades de upsell</p>
    </div>
  </div>
</div>
```

### Signals en KPIs Response:

```typescript
// getAccountKPIs response incluye signals
{
  success: true,
  data: {
    revenue: { ... },
    engagement: { ... },
    pipeline: { ... },
    health: { 
      status: 'at_risk',
      motivos: ['>90d sin pedido', 'baja respuesta emails'],
      indicators: [...],
      recommendations: [...]
    },
    
    // ⭐ Para Santa Brain (Fase 6)
    signals: [
      {
        type: 'no_orders_90d',
        severity: 'high',
        timestamp: '2025-01-15T10:00:00Z',
        metadata: { lastOrderDate: '2024-10-15' }
      },
      {
        type: 'low_email_response',
        severity: 'medium',
        timestamp: '2025-01-15T10:00:00Z',
        metadata: { responseRate: 0.15 }
      }
    ]
  }
}
```

---

## ✅ CHECKLIST PRODUCTION-READY

### Must-Have (Día 1-2):
- [ ] **Índices Firestore** (6 índices compuestos documentados)
- [ ] **Regla de flow** (campo fijo + flowOverride para mixtos)
- [ ] **Health con motivos[]** (array de razones)
- [ ] **Timeline con desduplicación** por relatedId
- [ ] **Saved views** (10 preset + localStorage)
- [ ] **Acciones rápidas** en Drawer header (Pedido/Visita/Email)
- [ ] **Permisos field-level** (ocultar KPIs financieros por rol)
- [ ] **Cache TTL 1h** + invalidación por evento
- [ ] **Telemetría básica** (latencias + eventos)
- [ ] **Signals[] para Santa Brain** (AI-ready)
- [ ] **Tabs Direct/Placement** (patrón de pedidos)
- [ ] **Cards con tint por stage** (blancas + 30% opacity)
- [ ] **Algolia setup** (índice + facets + replicas)
- [ ] **Owner/Distributor facets** en Algolia

### Nice-to-Have (Post Fase 3):
- [ ] **Scroll virtualizado** (si >1000 eventos)
- [ ] **Engagement normalizado** por tamaño de cuenta
- [ ] **Sección Relaciones** (Placement: distribuidor ↔ subordinadas)
- [ ] **Lazy loading por tipo** de evento en Timeline
- [ ] **Conflictos de propiedad** (avisos si owner cambió)

### Criterios Funcionales:
- [ ] **Tabs Direct/Placement** funcionan (mismo patrón que pedidos)
- [ ] **KPIs por tab** se calculan correctamente
- [ ] **Búsqueda Algolia** instant search funciona
- [ ] **Facets** (owner, distribuidor, territory, health, stage) funcionan
- [ ] **Saved views** se guardan/restauran correctamente
- [ ] **Flow badge** visible en AccountCard
- [ ] **AccountDrawer** muestra flow badge prominente
- [ ] **Si PLACEMENT:** Info de distribuidor visible
- [ ] **Timeline** muestra eventos sin duplicados
- [ ] **Tab Orders** lista pedidos del mismo flow
- [ ] **Tab Tasks** lista tareas de cuenta
- [ ] **Engagement score** normalizado por tamaño
- [ ] **Health status** preciso con motivos
- [ ] **Click en evento** navega al detalle correcto (OrderDrawer, etc)
- [ ] **Acciones rápidas** (Crear pedido/visita/email) funcionan
- [ ] **Permisos** verificados con usuario ventas + viewer

### Criterios de Performance:
- [ ] **<2s** para cargar drawer completo
- [ ] **<500ms** para recalcular KPIs al cambiar tab
- [ ] **Tabs** cambian instantáneamente (datos cacheados)
- [ ] **Timeline** lazy load en chunks de 20
- [ ] **Cache KPIs** TTL 1h activo
- [ ] **Índices Firestore** creados y funcionando
- [ ] **Telemetría** capturando latencias
- [ ] **Scroll virtualizado** si >1000 eventos (opcional)

### Criterios de UX:
- [ ] **Design system** aplicado consistentemente
- [ ] **Patrón visual** idéntico a pedidos
- [ ] **Badges de flow** claros y diferenciados
- [ ] **Tints por stage** sutiles (30% opacity)
- [ ] **Info distribuidor** no invasiva pero visible
- [ ] **Empty states** con "siguiente acción sugerida"
- [ ] **Loading states** informativos
- [ ] **Error states** con retry
- [ ] **Saved view** se restaura tras reload
- [ ] **Placeholder AI Insights** visible (Fase 6)

### QA - Casos Límite:
- [ ] **Cuenta sin pedidos** y sin interacciones (empty state correcto)
- [ ] **Cuenta MIXTA** (Direct + Placement) - requiere flowOverride
- [ ] **Cuenta con >1000 eventos** - virtualización funciona
- [ ] **Permisos** - KPIs financieros ocultos para roles no autorizados
- [ ] **Actions guard** - crear pedido solo si permiso sobre cuenta
- [ ] **Navegación** - Links desde Pedidos → AccountDrawer y viceversa
- [ ] **Accesibilidad** - Tabs con teclado, focus visible

---

## 📁 ARCHIVOS A CREAR/MODIFICAR

```
src/
├── server/actions/
│   └── accounts.ts                     # +300 líneas (extender)
├── components/accounts/                # NUEVO directorio
│   ├── AccountKPIs.tsx                 # ~150 líneas
│   ├── AccountTimeline.tsx             # ~200 líneas
│   ├── AccountOrdersTab.tsx            # ~150 líneas
│   └── AccountTasksTab.tsx             # ~120 líneas
├── app/(app)/ventas/cuentas/
│   └── page.tsx                        # Refactor completo
└── app/(app)/@drawer/
    └── (.)ventas/cuentas/[id]/
        └── page.tsx                    # ~250 líneas (nuevo)
```

**Total estimado:** ~1,000 líneas de código nuevo/modificado

---

## 🎯 PRÓXIMOS PASOS

1. Usuario aprueba el plan
2. Toggle a Act mode
3. Empezar con Día 1 - Server actions + AccountKPIs
4. Continuar con Día 2 - Tabs + Drawer
5. Testing final
6. Commit: `feat(accounts): Phase 3 COMPLETE - Smart Accounts`

---

## 💡 MEJORAS FUTURAS (Post Fase 3)

- **Segmentación automática** con IA (Fase 6)
- **Recomendaciones de upsell** basadas en historial
- **Predicción de churn** (riesgo de perder cuenta)
- **Email automático** si no hay interacción en X días
- **Dashboard de cuenta ejecutiva** para managers
- **Export de ficha de cuenta** a PDF
- **Comparativa entre cuentas** del mismo segmento

---

**¿Listo para implementar? 🚀**
