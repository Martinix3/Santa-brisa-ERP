# 🎯 Sistema de Dashboards por Rol - Guía Completa

## 📋 Estado de Implementación

### ✅ COMPLETADO

**Componentes Compartidos** (4/4)
- ✅ `KpiCard.tsx` - Tarjetas de métricas con glassmorphism
- ✅ `ChartCard.tsx` - Gráficos con Recharts integrado
- ✅ `ActivityFeed.tsx` - Feed de actividades recientes
- ✅ `AlertsCard.tsx` - Tarjeta de alertas tipadas

**Dashboards** (1/5)
- ✅ `DashboardOps.tsx` - Dashboard OPS completo con 5 tabs

### 🔄 PENDIENTE

**Dashboards Faltantes** (4)
- ⏳ `DashboardSales.tsx` - Dashboard comercial
- ⏳ `DashboardAdmin.tsx` - Dashboard admin/inversor
- ⏳ `DashboardManager.tsx` - Dashboard gerencia/owner
- ⏳ `DashboardDistributor.tsx` - Dashboard distribuidor

**Infraestructura**
- ⏳ Router por rol en `/dashboard/page.tsx`
- ⏳ Server actions por dashboard
- ⏳ Tipos TypeScript para datos

---

## 📂 Estructura de Archivos

```
src/
├── components/dashboards/
│   ├── shared/
│   │   ├── KpiCard.tsx           ✅ Completado
│   │   ├── ChartCard.tsx         ✅ Completado
│   │   ├── ActivityFeed.tsx      ✅ Completado
│   │   └── AlertsCard.tsx        ✅ Completado
│   ├── DashboardOps.tsx          ✅ Completado
│   ├── DashboardSales.tsx        ⏳ Pendiente
│   ├── DashboardAdmin.tsx        ⏳ Pendiente
│   ├── DashboardManager.tsx      ⏳ Pendiente
│   └── DashboardDistributor.tsx  ⏳ Pendiente
│
├── server/actions/
│   ├── dashboard-ops.ts          ⏳ Pendiente
│   ├── dashboard-sales.ts        ⏳ Pendiente
│   ├── dashboard-admin.ts        ⏳ Pendiente
│   ├── dashboard-manager.ts      ⏳ Pendiente
│   └── dashboard-distributor.ts  ⏳ Pendiente
│
└── app/(app)/dashboard/
    └── page.tsx                  ⏳ Modificar router
```

---

## 🎨 COMPONENTES COMPARTIDOS

### 1. KpiCard

**Ubicación:** `src/components/dashboards/shared/KpiCard.tsx`

**Props:**
```typescript
interface KpiCardProps {
  label: string;              // Etiqueta del KPI
  value: string | number;     // Valor principal
  hint?: string;              // Texto adicional
  trend?: 'up' | 'down' | 'neutral';  // Tendencia (colorea hint)
  variant?: 'dark' | 'light' | 'subtle';  // Estilo de card
  icon?: React.ReactNode;     // Icono opcional
}
```

**Ejemplo:**
```tsx
<KpiCard
  label="Ventas del mes"
  value="€ 45,320"
  hint="+12% vs mes anterior"
  trend="up"
  variant="dark"
  icon={<TrendingUp size={20} />}
/>
```

**Variantes:**
- `dark`: `.sb-card-glass-dark` (KPIs principales)
- `light`: `.sb-card-glass-light` (KPIs secundarios)
- `subtle`: `.sb-card-glass-subtle` (KPIs terciarios)

---

### 2. ChartCard

**Ubicación:** `src/components/dashboards/shared/ChartCard.tsx`

**Props:**
```typescript
interface ChartCardProps {
  title: string;              // Título del gráfico
  data: any[];                // Array de datos
  dataKey: string;            // Clave del valor a graficar
  type?: 'line' | 'bar' | 'area';  // Tipo de gráfico
  height?: number;            // Altura en px (default: 192)
  variant?: 'dark' | 'light' | 'subtle';
  xAxisKey?: string;          // Clave eje X (default: 'name')
  formatter?: (value: number) => string;  // Formatear valores
}
```

**Ejemplo:**
```tsx
<ChartCard
  title="Ventas mensuales"
  data={[
    { month: 'Ene', sales: 12000 },
    { month: 'Feb', sales: 15000 },
    { month: 'Mar', sales: 18000 }
  ]}
  dataKey="sales"
  xAxisKey="month"
  type="line"
  height={240}
  formatter={(value) => `€${value.toLocaleString()}`}
/>
```

**Tipos de gráfico:**
- `line`: Línea (default)
- `bar`: Barras verticales
- `area`: Área rellena

---

### 3. ActivityFeed

**Ubicación:** `src/components/dashboards/shared/ActivityFeed.tsx`

**Props:**
```typescript
interface Activity {
  id: string;
  title: string;
  description?: string;
  timestamp: string;          // ISO string
  type?: 'order' | 'visit' | 'event' | 'note' | 'other';
  icon?: string;              // Emoji o texto
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;          // Default: 10
  variant?: 'light' | 'subtle';
  onItemClick?: (activity: Activity) => void;
}
```

**Ejemplo:**
```tsx
<ActivityFeed
  activities={[
    {
      id: '1',
      title: 'Pedido #1234 completado',
      description: 'Restaurante La Marina - €450',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'order',
      icon: '📦'
    }
  ]}
  maxItems={5}
  onItemClick={(activity) => router.push(`/orders/${activity.id}`)}
/>
```

**Colores por tipo:**
- `order`: verde (success)
- `visit`: azul (primary)
- `event`: morado
- `note`: azul claro
- `other`: gris (muted)

---

### 4. AlertsCard

**Ubicación:** `src/components/dashboards/shared/AlertsCard.tsx`

**Props:**
```typescript
interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description?: string;
  actionLabel?: string;       // Texto del botón de acción
}

interface AlertsCardProps {
  alerts: Alert[];
  onActionClick?: (alert: Alert) => void;
  variant?: 'light' | 'subtle';
}
```

**Ejemplo:**
```tsx
<AlertsCard
  alerts={[
    {
      id: '1',
      type: 'critical',
      title: 'Stock crítico',
      description: 'SB-LIME-01 con solo 12 unidades',
      actionLabel: 'Ver inventario'
    },
    {
      id: '2',
      type: 'warning',
      title: 'QC pendiente',
      description: 'Lote L-BASE-422 esperando liberación',
      actionLabel: 'Abrir QC'
    }
  ]}
  onActionClick={(alert) => handleAlert(alert)}
/>
```

**Iconos y colores por tipo:**
- `critical`: ❌ rojo (destructive)
- `warning`: ⚠️ amarillo (warning)
- `info`: ℹ️ azul (info)
- `success`: ✅ verde (success)

---

## 🏭 DASHBOARD OPS

**Ubicación:** `src/components/dashboards/DashboardOps.tsx`

### Estructura

**5 Tabs:**
1. **Hoy** - Resumen cross-OPS del día
2. **Logística** - Envíos y transporte
3. **Inventario** - Stock y rotación
4. **Calidad** - QC y parámetros
5. **Producción** - Órdenes y OEE

### Tab 1: Hoy

**Contenido:**
- 4 KPIs superiores (grid 1-4 columnas)
  - Órdenes en tránsito
  - Stock crítico
  - Lotes en QC
  - Órdenes de producción
- Timeline de movimientos del día (lista)
- Card de alertas activas

**Layout:** Grid 3 columnas (2+1 en desktop)

### Tab 2: Logística

**Contenido:**
- Tabla de salidas programadas
  - Hora, Destinatario, Bultos, Estado
  - Badges de estado (Etiquetado, Picking, etc.)
- Card de incidencias de transporte

**Layout:** Grid 3 columnas (2+1 en desktop)

### Tab 3: Inventario

**Contenido:**
- 4 KPIs en grid (2x2 mobile, 4x1 desktop)
  - SKUs en stock
  - Valor inventario
  - Roturas
  - Cobertura media
- Lista de stock crítico (Top 10)
  - Con badges por nivel (crítico, bajo)

**Layout:** Full width

### Tab 4: Calidad

**Contenido:**
- Tabla de lotes en QC
  - Lote, Estado, Parámetros, Acción
  - Botones de acción (Abrir QC, Ver)
  - Badges por estado (PENDING, HOLD, etc.)
- Card de parámetros fuera de rango
  - Lista con indicadores alto/bajo

**Layout:** Grid 3 columnas (2+1 en desktop)

### Tab 5: Producción

**Contenido:**
- 4 KPIs en grid
  - Órdenes en curso
  - Rendimiento última orden
  - Merma (7 días)
  - OEE estimado
- Tabla de órdenes de producción activas
  - Con barra de progreso visual
  - Estados con badges
- Card de cuellos de botella
  - Lista de problemas
  - Sugerencias de Santa Brain

**Layout:** Grid 3 columnas (2+1 en desktop)

### Datos Mock Actuales

El dashboard usa datos estáticos para demostración:
```typescript
const todayKpis = {
  ordersInTransit: 12,
  criticalStock: 5,
  lotsInQC: 3,
  activeProductionOrders: 2
};
```

**⚠️ TODO:** Reemplazar con server actions reales.

---

## 🎨 Sistema de Diseño

### Clases Glassmorphism

Todas heredadas de `globals.css`:

```css
.sb-header-glass       /* Headers con glassmorphism */
.sb-card-glass-dark    /* Cards oscuras (KPIs principales) */
.sb-card-glass-light   /* Cards claras (listas, tablas) */
.sb-card-glass-subtle  /* Cards sutiles (info secundaria) */
.sb-kpi-badge          /* Badges redondeados */
.hover-raise           /* Efecto hover con elevación */
```

### Espaciado Consistente

- Padding cards: `p-5` (20px)
- Padding header: `p-5` o `p-6` (20-24px)
- Gaps entre elementos: `gap-5` (20px)
- Espaciado vertical: `space-y-5` (20px)

### Responsive

- **Mobile:** Grid 1 columna
- **Tablet (md:):** Grid 2 columnas
- **Desktop (lg:):** Grid 3 columnas
- **XL (xl:):** Grid 3-4 columnas

### Colores

Todos usando variables CSS HSL:
```css
hsl(var(--primary))           /* Azul principal */
hsl(var(--success))           /* Verde éxito */
hsl(var(--warning))           /* Amarillo advertencia */
hsl(var(--destructive))       /* Rojo error */
hsl(var(--info))              /* Azul información */
hsl(var(--muted-foreground))  /* Texto secundario */
hsl(var(--border))            /* Bordes */
```

---

## 🔧 PRÓXIMOS PASOS

### Fase 1: Completar Dashboards (Prioridad Alta)

**1. DashboardSales** (Comercial)
- Grid 3 columnas
- KPIs: Objetivo vs Actual, Visitas, Pedidos, Conversión
- Pipeline mini-kanban (POTENCIAL, ACTIVA, SEGUIMIENTO)
- Lista de visitas de la semana
- Cuentas sin actividad (alertas)
- Tareas prioritarias

**2. DashboardAdmin** (Admin/Inversor)
- Grid 3 columnas
- KPIs financieros (ventas, cobrado, pendiente, margen)
- Gráfico anual de facturación
- Top 5 cuentas por revenue
- Producción: lotes activos, stock crítico
- Pipeline comercial agregado

**3. DashboardManager** (Gerencia/Owner)
- Grid 4 columnas (más denso)
- KPIs macro por departamento
- Resumen Ventas/Marketing/Producción/Finanzas
- Santa Brain: Top 3 prioridades del día
- Alertas críticas cross-departamento
- Calendario ejecutivo

**4. DashboardDistributor** (Distribuidor)
- Tabs: Pedidos / Sell-out / Inventario / POS / Finanzas
- Upload de CSV para sell-out
- Tracking de pedidos (estado, ETA)
- Stock en depósito
- Solicitud de PLV
- Crédito y bonificaciones

### Fase 2: Infraestructura (Prioridad Alta)

**1. Router por Rol**
```typescript
// src/app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  const { currentUser } = useData();
  
  switch (currentUser?.role) {
    case "ops":
      return <DashboardOps />;
    case "comercial":
      return <DashboardSales />;
    case "admin":
      return <DashboardAdmin />;
    case "owner":
    case "manager":
      return <DashboardManager />;
    case "distributor":
      return <DashboardDistributor />;
    default:
      return <DashboardPersonal />; // Actual
  }
}
```

**2. Server Actions por Dashboard**

Crear archivos:
- `src/server/actions/dashboard-ops.ts`
- `src/server/actions/dashboard-sales.ts`
- `src/server/actions/dashboard-admin.ts`
- `src/server/actions/dashboard-manager.ts`
- `src/server/actions/dashboard-distributor.ts`

Patrón de cada action:
```typescript
export async function getDashboardData() {
  try {
    const data = await db.collection('...').get();
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'mensaje' };
  }
}
```

### Fase 3: Refinamiento (Prioridad Media)

1. **Loading States**
   - Skeleton screens mientras carga
   - Suspense boundaries

2. **Error Boundaries**
   - Manejo de errores por componente
   - Fallbacks informativos

3. **Optimización**
   - useMemo para cálculos pesados
   - Lazy loading de tabs
   - Virtualización de listas largas

4. **Interactividad**
   - Drawers para detalles
   - Modals para acciones
   - Tooltips explicativos

---

## 📊 CONEXIONES FIRESTORE

### Colecciones Necesarias

**Para DashboardOps:**
```typescript
- shipments          // Envíos
- onHand            // Stock actual
- lots              // Lotes con qcStatus
- productionOrders  // Órdenes de producción
- stockMoves        // Movimientos de inventario
```

**Para DashboardSales:**
```typescript
- accounts          // Cuentas por stage
- interactions      // Visitas y actividad
- orders            // Pedidos
- tasks             // Tareas del usuario
```

**Para DashboardAdmin:**
```typescript
- orders            // Facturación
- accounts          // Top cuentas
- lots              // Producción
- onHand            // Stock
```

**Para DashboardManager:**
```typescript
- (todas las anteriores)
- santaBrainPriorities  // Prioridades del día
```

**Para DashboardDistributor:**
```typescript
- orders            // Pedidos del distribuidor
- sellOut           // Sell-out subido
- onHand            // Stock depósito
- plv_material      // Material PLV
- creditLines       // Líneas de crédito
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Componentes Compartidos
- [x] KpiCard con variantes
- [x] ChartCard con Recharts
- [x] ActivityFeed con tipos
- [x] AlertsCard con iconos

### Dashboards
- [x] DashboardOps (5 tabs completos)
- [ ] DashboardSales
- [ ] DashboardAdmin
- [ ] DashboardManager
- [ ] DashboardDistributor

### Infraestructura
- [ ] Router por rol en dashboard/page.tsx
- [ ] Server actions dashboard-ops.ts
- [ ] Server actions dashboard-sales.ts
- [ ] Server actions dashboard-admin.ts
- [ ] Server actions dashboard-manager.ts
- [ ] Server actions dashboard-distributor.ts

### Testing
- [ ] Verificar routing por cada rol
- [ ] Probar cada tab con datos reales
- [ ] Validar responsive en mobile
- [ ] Verificar colores y glassmorphism
- [ ] Testing de interacciones

### Documentación
- [x] Guía de componentes compartidos
- [x] Arquitectura de DashboardOps
- [ ] Guía de implementación completa
- [ ] Ejemplos de uso por dashboard

---

## 🚀 ESTIMACIÓN DE TIEMPO

**Completar sistema completo:**
- Dashboards faltantes (4): **2-3 días**
- Router por rol: **0.5 días**
- Server actions (5 archivos): **2-3 días**
- Testing y refinamiento: **1-2 días**

**Total estimado: 5-8 días laborables**

---

## 📝 NOTAS FINALES

### Ventajas del Sistema Actual

✅ **Componentes reutilizables** - 4 componentes base para todos
✅ **Diseño consistente** - Glassmorphism en toda la UI
✅ **TypeScript completo** - Props tipadas
✅ **Responsive** - Mobile-first approach
✅ **Escalable** - Fácil añadir nuevos dashboards
✅ **Mantenible** - Código DRY y modular

### Próxima Sesión

**Recomendación:** Continuar con DashboardSales
- Es el más usado día a día
- Menos complejo que Manager
- Servirá de plantilla para Admin

**Orden sugerido:**
1. DashboardSales
2. DashboardAdmin
3. DashboardManager
4. DashboardDistributor
5. Router + Server Actions
