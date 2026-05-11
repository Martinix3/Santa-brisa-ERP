# Santa Brisa — Dashboard, Pipeline y Pedidos
## Arquitectura Funcional y Lógica de Negocio

---

## 🧭 Introducción General

Este documento describe la arquitectura funcional y la lógica de negocio del ecosistema **Santa Brisa ERP/CRM**, orientado a la gestión de ventas, distribuidores, pipeline comercial, pedidos y analítica inteligente (Gemini / Santa Brain).

### Conceptos Clave del Negocio

| Concepto | Descripción |
|----------|-------------|
| **Sell‑in** | Ventas que Santa Brisa realiza **a distribuidores** |
| **Sell‑out** | Ventas que Santa Brisa (o sus comerciales) realizan **a clientes finales** (bares, hoteles, tiendas…) |
| **Colocación (Placement)** | Cuando un distribuidor o comercial "coloca" producto en puntos de venta |
| **Facturación** | Pedidos que pasan a la parte administrativa (Holded / Shopify / Sendcloud) listos para contabilizar, cobrar o enviar |

### Capas Principales del Sistema

1. **Dashboard General**
   - Visión ejecutiva (sell‑in vs sell‑out, top cuentas, mix comercial, alertas)
   - Versión **personal** para cada comercial (actividad diaria: llamadas, visitas, emails)

2. **Pipeline Comercial**
   - Vista Kanban que muestra las **cuentas activas por etapa** del ciclo comercial
   - Etapas: `POTENCIAL` → `SEGUIMIENTO` → `ACTIVA` → `FALLIDA`
   - Alertas inteligentes de IA

3. **Hub de Pedidos**
   - Gestión unificada de pedidos según `flow` y `status`
   - Vista del **portal de distribuidor**

---

## 🧩 Reglas de Negocio Fundamentales

### 1. Estructura de Pedidos (OrderSellOut)

**IMPORTANTE:** El sistema NO usa un campo `tipo` con valores 'DIRECTA'/'COLOCACION'/'FACTURACION'. En su lugar:

```typescript
interface OrderSellOut {
  // === IDENTIFICACIÓN ===
  id: string;
  docNumber?: string;
  accountId: string;
  partyId?: string;
  
  // === FLOW COMERCIAL ===
  flow?: 'PLACEMENT' | 'DIRECT';  // ← Define venta directa vs colocación
  distributorPartyId?: string;     // ← Distribuidor involucrado (si aplica)
  isSellOutReported?: boolean;     // ← Si es sell-out reportado
  
  // === ESTADO DEL PEDIDO ===
  status: 'open' | 'confirmed' | 'shipped' | 'invoiced' | 'paid' | 'cancelled' | 'lost';
  billingStatus?: 'pending' | 'invoiced' | 'paid' | 'void';
  
  // === LÍNEAS DE PEDIDO ===
  lines: OrderLine[];
  totalAmount?: number;
  currency: 'EUR';
  
  // === ORIGEN DEL PEDIDO ===
  source?: 'SHOPIFY' | 'B2B' | 'Direct' | 'CRM' | 'MANUAL' | 'HOLDED';
  
  // === SSOT V2.1: DATOS COMERCIALES Y CLIENTE ===
  channel?: 'PRIVATE' | 'DISTRIBUTOR' | 'ONLINE' | 'HORECA' | 'CATERING';
  ownerId?: string;           // Comercial responsable
  ownerName?: string;
  customerVat?: string;       // CIF/VAT del cliente
  customerName?: string;
  contactPerson?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  bankAccount?: string;
  
  // === SINCRONIZACIÓN HOLDED ===
  holdedOrderId?: string;
  syncedToHolded?: boolean;
  lastSyncAt?: ISODateString;
  syncError?: string;
  
  // === TIMESTAMPS ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
  orderDate?: ISO;
  
  // === OTROS ===
  notes?: string;
  external?: {
    shopifyOrderId?: string;
    holdedEstimateId?: string;
    holdedInvoiceId?: string;
  };
  linkedPromotions?: string[];
  region?: 'ES' | 'USA' | 'MX' | 'OTHER';
}
```

### 2. Lógica de Clasificación de Pedidos

Los pedidos se clasifican según **múltiples dimensiones**:

#### Por Flow (Flujo Comercial)
- **`DIRECT`**: Venta directa de Santa Brisa al cliente final
- **`PLACEMENT`**: Colocación a través de distribuidor

#### Por Channel (Canal de Venta)
- **`PRIVATE`**: Venta privada
- **`DISTRIBUTOR`**: A través de distribuidor
- **`ONLINE`**: Ecommerce (Shopify)
- **`HORECA`**: Hostelería, restauración, catering
- **`CATERING`**: Catering específico

#### Por Status (Estado del Pedido)
- **`open`**: Pedido abierto
- **`confirmed`**: Confirmado
- **`shipped`**: Enviado
- **`invoiced`**: Facturado
- **`paid`**: Pagado
- **`cancelled`**: Cancelado
- **`lost`**: Perdido

#### Por Source (Origen)
- **`SHOPIFY`**: Pedido online
- **`HOLDED`**: Desde ERP contable
- **`MANUAL`**: Creado manualmente
- **`CRM`**: Desde CRM
- **`B2B`**: Portal B2B

### 3. Reglas de Validación de Negocio

El sistema implementa validaciones automáticas en `OrderSellOutRules`:

```typescript
// 1. Channel debe coincidir con segmento de cuenta
channelMatchesSegment(order, accountSegment)

// 2. Owner requerido para pedidos no-online
ownerRequired(order)

// 3. Datos de cliente completos según channel
customerDataComplete(order)

// 4. Consistencia de flujo distribuidor
distributorFlowConsistent(order)
```

### 4. Roles y Vistas por Defecto

| Rol | Acceso | Capacidades |
|-----|--------|-------------|
| **ADMIN** | Todas las vistas globales y datos agregados | Supervisión total |
| **VENTAS** | Dashboard personal, pipeline de cuentas propias, pedidos | Operativa comercial |
| **DISTRIBUIDOR** | Portal propio con KPIs y pedidos | Gestión autónoma |

### 5. Flujos de Información Externa

| Sistema | Rol | Entrada / Salida de datos |
|---------|-----|----------------------------|
| **Shopify** | Ecommerce | Pedidos online → `source: 'SHOPIFY'`, `status: 'confirmed'` automático |
| **Holded** | ERP contable | Sincronización de facturas → `billingStatus: 'invoiced'` cuando se factura |
| **Sendcloud** | Logística | Gestión de envíos y tracking → `status: 'shipped'` |
| **Gemini Brain** | Inteligencia | Alertas: cobros vencidos, actividad baja, consignas altas |

### 6. Flujos Operativos Detallados

#### Flujo 1: Pedido Shopify (Venta Directa Online)
```
Shopify → Webhook
    ↓
ERP crea OrderSellOut
    - source: 'SHOPIFY'
    - flow: 'DIRECT'
    - channel: 'ONLINE'
    - status: 'confirmed' (automático)
    ↓
Logística ERP → Preparación
    ↓
Sendcloud u otro carrier → Envío
    - status: 'shipped'
    ↓
Albarán generado
    ↓
Holded → Facturación
    - billingStatus: 'invoiced'
    - syncedToHolded: true
```

#### Flujo 2: Pedido Venta Directa Manual
```
Comercial crea pedido en ERP
    - source: 'MANUAL'
    - flow: 'DIRECT'
    - status: 'open'
    ↓
Comercial confirma pedido
    - status: 'confirmed'
    ↓
Logística ERP → Preparación
    ↓
Sendcloud u otro carrier → Envío
    - status: 'shipped'
    ↓
Albarán generado
    ↓
Factura emitida
    - billingStatus: 'invoiced'
```

#### Flujo 3: Pedido Colocación (Placement)
```
Comercial crea pedido colocación
    - source: 'MANUAL'
    - flow: 'PLACEMENT'
    - distributorPartyId: [ID distribuidor]
    - status: 'open'
    ↓
Distribuidor puede aportar información adicional
    - Desde Portal Distribuidor
    - Notas, documentos, preferencias
    ↓
Pedido procesado según acuerdo comercial
```

---

## 🔧 Arquitectura Técnica

### 1. Estructura de Directorios

```
src/
├── app/(app)/
│   ├── ventas/
│   │   ├── page.tsx                    # Dashboard de ventas
│   │   └── pedidos/
│   │       └── page.tsx                # Hub de pedidos
│   ├── accounts/
│   │   └── [id]/
│   │       └── page.tsx                # Detalle de cuenta
│   └── pipeline/
│       └── page.tsx                    # Pipeline Kanban
│
├── components/
│   ├── orders/
│   │   └── PedidosContent.tsx          # Gestión de pedidos
│   ├── alerts/
│   │   ├── AlertsProvider.tsx          # Contexto de alertas
│   │   └── AlertsWidget.tsx            # Widget de alertas
│   └── layout/
│       ├── Sidebar.tsx
│       └── DynamicHeader.tsx
│
├── server/
│   ├── actions/
│   │   ├── ventas-dashboard.ts         # Server actions dashboard
│   │   ├── analyzer-panel.ts           # Server actions pipeline
│   │   └── alerts.actions.ts           # Server actions alertas
│   ├── gemini/
│   │   ├── analyzers/
│   │   │   ├── sales-analyzer.ts       # Análisis de ventas
│   │   │   ├── email-analyzer.ts       # Análisis de emails
│   │   │   └── quicklog-analyzer.ts    # Análisis de QuickLog
│   │   └── intelligence-hub.ts         # Hub central de IA
│   └── integrations/
│       ├── shopify/
│       ├── holded/
│       └── sendcloud/
│
├── services/
│   └── canonical/
│       ├── order.service.ts            # Servicio de pedidos
│       ├── audit.service.ts
│       └── index.ts
│
└── domain/
    ├── ssot.ts                         # Tipos SSOT base
    └── ssot-v2-plus-schemas.ts         # Esquemas Zod V2+
```

### 2. Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    FUENTES EXTERNAS                          │
├─────────────────────────────────────────────────────────────┤
│  Shopify  │  Holded  │  Sendcloud  │  Gmail  │  QuickLog   │
└─────┬───────────┬──────────┬──────────┬─────────────┬───────┘
      │           │          │          │             │
      ▼           ▼          ▼          ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│              CAPA DE INTEGRACIÓN                             │
│  src/server/integrations/                                    │
│  - Normalización de datos                                    │
│  - Sincronización bidireccional                              │
│  - Manejo de errores y reintentos                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              GEMINI INTELLIGENCE HUB                         │
│  src/server/gemini/                                          │
│  - Análisis contextual de emails, ventas, actividad         │
│  - Generación de alertas inteligentes                       │
│  - Recomendaciones de acciones                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVICIOS CANÓNICOS (SSOT)                      │
│  src/services/canonical/                                     │
│  - order.service.ts: CRUD y validación de pedidos           │
│  - Enriquecimiento automático de datos                       │
│  - Validación de reglas de negocio                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              FIRESTORE (SSOT V2.1)                           │
│  Colecciones:                                                │
│  - ordersSellOut: Pedidos con datos V2.1                    │
│  - contacts: Clientes y contactos                            │
│  - accounts: Cuentas comerciales                             │
│  - alerts: Alertas inteligentes                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVER ACTIONS                                  │
│  src/server/actions/                                         │
│  - ventas-dashboard.ts: KPIs y métricas                     │
│  - analyzer-panel.ts: Pipeline y cuentas                    │
│  - alerts.actions.ts: Gestión de alertas                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              COMPONENTES UI (Next.js App Router)             │
│  src/app/(app)/ y src/components/                           │
│  - Dashboard: Métricas ejecutivas y personales              │
│  - Pipeline: Kanban de cuentas por etapa                    │
│  - Hub Pedidos: Gestión unificada de pedidos                │
│  - Portal Distribuidor: Vista aislada para distribuidores   │
└─────────────────────────────────────────────────────────────┘
```

### 3. Componentes Clave

#### Dashboard de Ventas (`src/app/(app)/ventas/page.tsx`)

```typescript
// Vista ejecutiva y personal
// - KPIs globales: sell-in, sell-out, top cuentas
// - Dashboard personal: actividad diaria del comercial
// - Alertas contextuales de Gemini
// - Gráficos de tendencias y mix comercial
```

#### Hub de Pedidos (`src/components/orders/PedidosContent.tsx`)

```typescript
// Gestión unificada de pedidos
// - Filtros por flow, channel, status, owner
// - Creación manual de pedidos
// - Enriquecimiento automático de datos de cliente
// - Sincronización con Holded/Shopify
// - Vista de portal de distribuidor
```

#### Pipeline Kanban (`src/app/(app)/pipeline/page.tsx`)

```typescript
// Vista Kanban de cuentas por etapa
// - Columnas: POTENCIAL, SEGUIMIENTO, ACTIVA, FALLIDA
// - Alertas IA por cuenta (inactividad, pagos vencidos)
// - Drag & drop para cambiar etapa
// - Filtros por comercial, segmento, región
```

#### Sistema de Alertas (`src/components/alerts/`)

```typescript
// Alertas inteligentes contextuales
// - AlertsProvider: Contexto global de alertas
// - AlertsWidget: Widget visual de alertas
// - Integración con Gemini para alertas automáticas
// - Conversión de alertas a tareas
```

---

## 📊 Vistas del Sistema

### 1. Dashboard General

**Ruta:** `/ventas`

**Métricas Principales:**
- Sell-in vs Sell-out (comparativa)
- Top 10 cuentas por facturación
- Mix comercial por channel
- Cajas vendidas por período
- Alertas activas (Gemini)

**Dashboard Personal (Comercial):**
- Mis cuentas activas
- Mis pedidos del mes
- Actividad diaria: llamadas, visitas, emails
- Tareas pendientes
- Próximas visitas programadas

### 2. Pipeline Comercial

**Ruta:** `/pipeline`

**Columnas Kanban:**
1. **POTENCIAL**: Cuentas prospectadas, sin actividad
2. **SEGUIMIENTO**: Cuentas con interacción, sin pedido
3. **ACTIVA**: Cuentas con pedidos recientes
4. **FALLIDA**: Cuentas perdidas o inactivas

**Alertas IA por Cuenta:**
- 🔴 Sin pedido en 60+ días
- 🟡 Sin visita en 30+ días
- 🟠 Pago vencido
- 🔵 Consigna elevada sin rotación

### 3. Hub de Pedidos

**Ruta:** `/ventas/pedidos`

**Filtros Disponibles:**
- Por `flow`: DIRECT, PLACEMENT
- Por `channel`: PRIVATE, DISTRIBUTOR, ONLINE, HORECA, CATERING
- Por `status`: open, confirmed, shipped, invoiced, paid
- Por `ownerId`: Comercial responsable
- Por rango de fechas

**Acciones:**
- ➕ Crear pedido manual
- 📝 Editar pedido
- 🔄 Sincronizar con Holded
- 📧 Enviar confirmación
- 📦 Generar albarán

### 4. Portal de Distribuidor

**Ruta:** `/distribuidor/portal`

**Vista Aislada:**
- KPIs del distribuidor
- Pedidos propios (filtrados por `distributorPartyId`)
- Documentos y notas
- Preferencias de comunicación
- Historial de colocaciones

---

## 🧠 Inteligencia de Negocio (Gemini / Santa Brain)

### Módulos de Análisis

#### 1. Sales Analyzer (`sales-analyzer.ts`)
```typescript
// Análisis de pipeline y ventas
// - Detecta cuentas inactivas
// - Identifica oportunidades de upsell
// - Predice riesgo de churn
// - Recomienda acciones comerciales
```

#### 2. Email Analyzer (`email-analyzer.ts`)
```typescript
// Análisis de emails entrantes
// - Detecta urgencia y prioridad
// - Extrae información de pedidos
// - Identifica solicitudes de cliente
// - Genera alertas automáticas
```

#### 3. QuickLog Analyzer (`quicklog-analyzer.ts`)
```typescript
// Análisis de notas de voz/texto
// - Extrae tareas y recordatorios
// - Identifica menciones de cuentas
// - Detecta compromisos comerciales
// - Crea alertas programadas
```

### Flujo de Alertas Inteligentes

```
┌─────────────────────────────────────────────────────────────┐
│  EVENTO TRIGGER                                              │
│  - Email urgente recibido                                    │
│  - Cuenta sin pedido 60+ días                                │
│  - Pago vencido                                              │
│  - QuickLog con "recordarme..."                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  GEMINI ANALYZER                                             │
│  - Analiza contexto                                          │
│  - Determina severidad                                       │
│  - Sugiere acciones                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ALERTA CREADA                                               │
│  type: 'EMAIL_URGENT' | 'ACCOUNT_INACTIVE' | ...            │
│  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'           │
│  suggestedActions: [...]                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICACIÓN AL USUARIO                                     │
│  - AlertsWidget muestra alerta                               │
│  - Push notification (si configurado)                        │
│  - Email (si crítico)                                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ACCIÓN DEL USUARIO                                          │
│  - Convertir a tarea                                         │
│  - Descartar                                                 │
│  - Posponer (snooze)                                         │
│  - Resolver directamente                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad y Permisos

### Matriz de Permisos

| Acción | ADMIN | VENTAS | DISTRIBUIDOR |
|--------|-------|--------|--------------|
| Ver dashboard global | ✅ | ❌ | ❌ |
| Ver dashboard personal | ✅ | ✅ | ❌ |
| Ver todas las cuentas | ✅ | ❌ | ❌ |
| Ver cuentas propias | ✅ | ✅ | ❌ |
| Crear pedido manual | ✅ | ✅ | ❌ |
| Editar pedido | ✅ | ✅ (propios) | ❌ |
| Ver portal distribuidor | ✅ | ❌ | ✅ |
| Sincronizar Holded | ✅ | ❌ | ❌ |
| Gestionar alertas | ✅ | ✅ (propias) | ❌ |

### Filtros de Datos por Rol

```typescript
// ADMIN: Ve todos los datos
const orders = await orderService.queryOrders({});

// VENTAS: Solo sus cuentas y pedidos
const orders = await orderService.queryOrders({
  ownerId: currentUser.id
});

// DISTRIBUIDOR: Solo sus pedidos
const orders = await orderService.queryOrders({
  distributorPartyId: currentUser.partyId
});
```

---

## 📈 KPIs y Métricas

### Dashboard Ejecutivo

```typescript
interface ExecutiveKPIs {
  // Ventas
  sellInTotal: number;        // Total sell-in (a distribuidores)
  sellOutTotal: number;       // Total sell-out (a clientes finales)
  sellInVsSellOut: number;    // Ratio sell-in/sell-out
  
  // Cuentas
  activeAccounts: number;     // Cuentas con pedido últimos 30 días
  topAccounts: Account[];     // Top 10 por facturación
  
  // Mix Comercial
  byChannel: Record<Channel, number>;  // Facturación por canal
  byRegion: Record<Region, number>;    // Facturación por región
  
  // Alertas
  criticalAlerts: number;     // Alertas críticas activas
  pendingTasks: number;       // Tareas pendientes
}
```

### Dashboard Personal (Comercial)

```typescript
interface PersonalKPIs {
  // Actividad
  callsToday: number;
  visitsThisWeek: number;
  emailsSent: number;
  
  // Ventas
  myOrdersThisMonth: number;
  myRevenueThisMonth: number;
  myActiveAccounts: number;
  
  // Pipeline
  potentialAccounts: number;
  followUpAccounts: number;
  
  // Tareas
  tasksOverdue: number;
  tasksDueToday: number;
  upcomingVisits: Interaction[];
}
```

---

## 🚀 Roadmap de Implementación

### Fase 1: Fundamentos (Semana 1-2)
- [x] Revisar esquemas SSOT existentes
- [x] Analizar estructura de OrderSellOut
- [x] Revisar servicios canónicos
- [ ] Documentar integraciones externas
- [ ] Crear documento de arquitectura

### Fase 2: Dashboard (Semana 3-4)
- [ ] Implementar dashboard ejecutivo
- [ ] Implementar dashboard personal
- [ ] Integrar KPIs en tiempo real
- [ ] Conectar con Gemini para alertas

### Fase 3: Pipeline (Semana 5-6)
- [ ] Implementar vista Kanban
- [ ] Drag & drop de cuentas
- [ ] Alertas IA por cuenta
- [ ] Filtros y búsqueda avanzada

### Fase 4: Hub de Pedidos (Semana 7-8)
- [ ] Vista unificada de pedidos
- [ ] Creación manual de pedidos
- [ ] Enriquecimiento automático
- [ ] Sincronización Holded/Shopify

### Fase 5: Portal Distribuidor (Semana 9-10)
- [ ] Vista aislada para distribuidores
- [ ] KPIs específicos
- [ ] Gestión de documentos
- [ ] Preferencias de comunicación

### Fase 6: Inteligencia IA (Semana 11-12)
- [ ] Integración completa Gemini
- [ ] Alertas automáticas
- [ ] Recomendaciones contextuales
- [ ] Análisis predictivo

---

## 📝 Notas de Implementación

### Consideraciones Técnicas

1. **SSOT V2.1 es la fuente de verdad**
   - Todos los datos deben respetar los esquemas en `ssot.ts` y `ssot-v2-plus-schemas.ts`
   - No inventar campos que no existen
   - Usar los servicios canónicos para toda operación de datos

2. **Validación de Negocio**
   - Usar `OrderSellOutRules` para validar pedidos
   - Implementar validaciones en server actions
   - Mostrar errores claros al usuario

3. **Enriquecimiento Automático**
   - Los pedidos deben auto-poblarse con datos de Contact/Party
   - Usar `orderService.enrichOrder()` para actualizar datos
   - Mantener sincronización con Holded

4. **Integraciones Externas**
   - Shopify: Pedidos online → `source: 'SHOPIFY'`
   - Holded: Sincronización bidireccional de facturas
   - Sendcloud: Actualización de estados de envío
   - Gemini: Análisis contextual y alertas

5. **Performance**
   - Usar índices de Firestore para queries frecuentes
   - Cachear KPIs calculados
   - Implementar paginación en listas largas
   - Lazy loading de componentes pesados

---

## 🎯 Conclusión

Este documento establece la arquitectura completa del módulo **Dashboard, Pipeline y Pedidos** de Santa Brisa ERP/CRM, basado en:

✅ **SSOT V2.1** como fuente única de verdad  
✅ **OrderSellOut** con estructura real (no inventada)  
✅ **Servicios canónicos** para toda operación de datos  
✅ **Gemini Intelligence** para alertas y recomendaciones  
✅ **Integraciones externas** (Shopify, Holded, Sendcloud)  
✅ **Roles y permisos** claramente definidos  

El sistema está diseñado para ser **escalable**, **mantenible** y **alineado con la realidad del negocio**.
