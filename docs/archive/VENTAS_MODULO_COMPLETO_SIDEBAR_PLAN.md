# 📊 MÓDULO DE VENTAS - PLAN COMPLETO SIDEBAR

**Fecha:** 26 de Octubre de 2025  
**Objetivo:** Reflejar TODAS las funcionalidades del módulo de Ventas en el Sidebar para máxima usabilidad  
**Estado:** 📋 PLAN DETALLADO

---

## 🎯 VISIÓN GENERAL

El módulo de Ventas debe tener **acceso directo desde el Sidebar** a todas sus funcionalidades principales, organizadas de forma lógica según el flujo comercial.

---

## 📋 ESTRUCTURA PROPUESTA DEL SIDEBAR

### Opción A: Estructura Expandida (Recomendada)

```typescript
{
  title: "Ventas",
  module: "sales",
  icon: ShoppingCart,
  href: "/ventas",
  items: [
    // === FLUJO COMERCIAL ===
    { href: "/ventas/pipeline", label: "Pipeline" },           // ✅ Ya existe
    { href: "/ventas/clientes", label: "Clientes" },           // ✅ Ya existe
    { href: "/ventas/pedidos", label: "Pedidos" },             // ✅ Ya existe
    
    // === ANÁLISIS Y REPORTES ===
    { href: "/ventas/analytics", label: "Analytics" },         // ⚠️ Parcial
    { href: "/ventas/reportes", label: "Reportes" },           // 🆕 Nuevo
    
    // === GESTIÓN ===
    { href: "/ventas/cotizaciones", label: "Cotizaciones" },   // 🆕 Nuevo
    { href: "/ventas/seguimiento", label: "Seguimiento" },     // 🆕 Nuevo
  ],
}
```

### Opción B: Estructura con Subsecciones (Avanzada)

```typescript
{
  title: "Ventas",
  module: "sales",
  icon: ShoppingCart,
  href: "/ventas",
  items: [
    // Sección: Gestión Comercial
    { 
      href: "/ventas/pipeline", 
      label: "Pipeline",
      badge: "12" // Oportunidades activas
    },
    { 
      href: "/ventas/clientes", 
      label: "Clientes",
      badge: "156" // Total clientes activos
    },
    { 
      href: "/ventas/pedidos", 
      label: "Pedidos",
      badge: "5" // Pedidos pendientes
    },
    
    // Sección: Análisis
    { href: "/ventas/analytics", label: "Analytics" },
    { href: "/ventas/reportes", label: "Reportes" },
    
    // Sección: Herramientas
    { href: "/ventas/cotizaciones", label: "Cotizaciones" },
    { href: "/ventas/seguimiento", label: "Seguimiento" },
  ],
}
```

---

## 🔧 FUNCIONALIDADES POR PÁGINA

### 1. 🎯 Pipeline (`/ventas/pipeline`)
**Estado:** ✅ Completo y funcional

**Funcionalidades actuales:**
- Vista Kanban de oportunidades
- Vista Lista
- Drag & drop entre etapas
- Filtros por etapa, responsable, fecha

**Mejoras propuestas para Sidebar:**
- Badge con número de oportunidades activas
- Acceso rápido a "Nueva Oportunidad" desde el menú

**Código del badge:**
```typescript
{ 
  href: "/ventas/pipeline", 
  label: "Pipeline",
  badge: opportunitiesCount, // Dinámico desde useData
  icon: FolderKanban // Opcional
}
```

---

### 2. 👥 Clientes (`/ventas/clientes`)
**Estado:** ✅ Funcional

**Funcionalidades actuales:**
- Lista de cuentas
- Búsqueda y filtros
- Drawer de detalle

**Mejoras propuestas:**
- Mostrar historial de pedidos en el drawer
- Calcular y mostrar LTV (Lifetime Value)
- Badge con total de clientes activos

**Mejoras en Sidebar:**
```typescript
{ 
  href: "/ventas/clientes", 
  label: "Clientes",
  badge: activeAccountsCount,
  icon: Users
}
```

---

### 3. 📦 Pedidos (`/ventas/pedidos`)
**Estado:** ⚠️ Funcional pero requiere SSOT v2

**Funcionalidades actuales:**
- Lista de pedidos
- Filtros avanzados
- Quick actions
- Drawer de detalle

**Mejoras críticas (SSOT v2):**
- Servicio canónico `order.service.ts`
- Validaciones de transiciones de estado
- Validación de stock disponible
- Sistema de alertas automáticas

**Mejoras en Sidebar:**
```typescript
{ 
  href: "/ventas/pedidos", 
  label: "Pedidos",
  badge: pendingOrdersCount, // Pedidos pendientes
  badgeVariant: "warning", // Si hay pedidos urgentes
  icon: Package
}
```

---

### 4. 📊 Analytics (`/ventas/analytics`)
**Estado:** ⚠️ Parcial - Requiere implementación

**Funcionalidades propuestas:**
- KPIs principales (ventas, conversión, ticket medio)
- Gráficos de tendencias
- Top clientes y productos
- Comparativas período anterior

**Estructura sugerida:**
```typescript
// src/app/(app)/ventas/analytics/page.tsx
export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1>Analytics de Ventas</h1>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-4 gap-4">
        <KpiWidget title="Ventas Mes" value="€45,230" />
        <KpiWidget title="Conversión" value="23%" />
        <KpiWidget title="Ticket Medio" value="€890" />
        <KpiWidget title="Clientes Nuevos" value="12" />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <SalesChart />
        <ConversionFunnel />
      </div>
      
      {/* Tables */}
      <TopClientsTable />
      <TopProductsTable />
    </div>
  );
}
```

---

### 5. 📄 Reportes (`/ventas/reportes`) - NUEVO
**Estado:** 🆕 A crear

**Funcionalidades propuestas:**
- Reportes predefinidos (ventas por período, por cliente, por producto)
- Exportación a PDF/Excel
- Programación de reportes automáticos
- Comparativas y análisis

**Estructura:**
```typescript
// src/app/(app)/ventas/reportes/page.tsx
export default function ReportesPage() {
  return (
    <div className="container mx-auto p-6">
      <h1>Reportes de Ventas</h1>
      
      {/* Reportes Rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <ReportCard 
          title="Ventas Mensuales"
          description="Resumen de ventas del mes actual"
          action="Generar"
        />
        <ReportCard 
          title="Top Clientes"
          description="Clientes con mayor facturación"
          action="Generar"
        />
        <ReportCard 
          title="Pipeline Status"
          description="Estado actual del pipeline"
          action="Generar"
        />
      </div>
      
      {/* Reportes Personalizados */}
      <CustomReportBuilder />
    </div>
  );
}
```

---

### 6. 💰 Cotizaciones (`/ventas/cotizaciones`) - NUEVO
**Estado:** 🆕 A crear

**Funcionalidades propuestas:**
- Crear cotizaciones desde oportunidades
- Gestión de versiones de cotización
- Aprobación y conversión a pedido
- Plantillas de cotización

**Flujo:**
```
Pipeline (Oportunidad) 
  → Crear Cotización 
  → Enviar al Cliente 
  → Aprobar 
  → Convertir a Pedido
```

---

### 7. 📈 Seguimiento (`/ventas/seguimiento`) - NUEVO
**Estado:** 🆕 A crear

**Funcionalidades propuestas:**
- Timeline de actividades comerciales
- Tareas pendientes por cliente/oportunidad
- Recordatorios automáticos
- Historial de interacciones

**Vista:**
```typescript
// src/app/(app)/ventas/seguimiento/page.tsx
export default function SeguimientoPage() {
  return (
    <div className="container mx-auto p-6">
      <h1>Seguimiento Comercial</h1>
      
      {/* Tareas Pendientes */}
      <TasksWidget 
        title="Tareas Hoy"
        tasks={todayTasks}
      />
      
      {/* Timeline */}
      <ActivityTimeline 
        activities={recentActivities}
      />
      
      {/* Recordatorios */}
      <RemindersPanel />
    </div>
  );
}
```

---

## 🎨 MEJORAS VISUALES EN EL SIDEBAR

### 1. Badges Dinámicos

```typescript
// Ejemplo de implementación
const VentasSidebarSection = () => {
  const { data } = useData();
  
  const opportunitiesCount = data?.opportunities?.filter(o => o.status === 'active').length || 0;
  const pendingOrdersCount = data?.ordersSellOut?.filter(o => o.status === 'open').length || 0;
  const activeAccountsCount = data?.accounts?.filter(a => a.status === 'active').length || 0;
  
  return {
    title: "Ventas",
    items: [
      { 
        href: "/ventas/pipeline", 
        label: "Pipeline",
        badge: opportunitiesCount > 0 ? String(opportunitiesCount) : undefined
      },
      { 
        href: "/ventas/clientes", 
        label: "Clientes",
        badge: String(activeAccountsCount)
      },
      { 
        href: "/ventas/pedidos", 
        label: "Pedidos",
        badge: pendingOrdersCount > 0 ? String(pendingOrdersCount) : undefined,
        badgeVariant: pendingOrdersCount > 5 ? "warning" : "default"
      },
    ]
  };
};
```

### 2. Iconos por Item

```typescript
import { 
  FolderKanban,  // Pipeline
  Users,         // Clientes
  Package,       // Pedidos
  TrendingUp,    // Analytics
  FileText,      // Reportes
  FileCheck,     // Cotizaciones
  Clock          // Seguimiento
} from "lucide-react";

const items = [
  { href: "/ventas/pipeline", label: "Pipeline", icon: FolderKanban },
  { href: "/ventas/clientes", label: "Clientes", icon: Users },
  { href: "/ventas/pedidos", label: "Pedidos", icon: Package },
  { href: "/ventas/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/ventas/reportes", label: "Reportes", icon: FileText },
  { href: "/ventas/cotizaciones", label: "Cotizaciones", icon: FileCheck },
  { href: "/ventas/seguimiento", label: "Seguimiento", icon: Clock },
];
```

### 3. Estados Visuales

```typescript
// Indicadores de estado en el Sidebar
const getItemStatus = (href: string) => {
  switch(href) {
    case "/ventas/pipeline":
      return hasUrgentOpportunities ? "urgent" : "normal";
    case "/ventas/pedidos":
      return hasPendingOrders ? "warning" : "normal";
    case "/ventas/clientes":
      return hasNewClients ? "info" : "normal";
    default:
      return "normal";
  }
};
```

---

## 📱 RESPONSIVE Y UX

### Sidebar Colapsado
Cuando el sidebar está colapsado, mostrar:
- Icono del módulo
- Badge con número total de items pendientes
- Tooltip con nombre completo al hover

### Sidebar Expandido
- Mostrar todos los items
- Badges individuales por item
- Iconos opcionales
- Indicadores de estado

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Quick Wins (1-2 días)
- [x] Añadir Pipeline al Sidebar ✅ HECHO
- [ ] Añadir badges dinámicos a items existentes
- [ ] Añadir iconos a cada item
- [ ] Mejorar estados visuales

### Fase 2: Páginas Nuevas (1 semana)
- [ ] Crear `/ventas/reportes`
- [ ] Crear `/ventas/cotizaciones`
- [ ] Crear `/ventas/seguimiento`
- [ ] Completar `/ventas/analytics`

### Fase 3: Backend SSOT v2 (1 semana)
- [ ] Implementar `order.service.ts`
- [ ] Migrar campos deprecados
- [ ] Añadir validaciones
- [ ] Sistema de alertas

### Fase 4: Integración y Pulido (3 días)
- [ ] Conectar badges con datos reales
- [ ] Optimizar queries
- [ ] Tests de integración
- [ ] Documentación

---

## 📊 RESULTADO FINAL ESPERADO

### Sidebar del Módulo de Ventas

```
🛒 Ventas
  ├─ 🎯 Pipeline (12)
  ├─ 👥 Clientes (156)
  ├─ 📦 Pedidos (5) ⚠️
  ├─ 📊 Analytics
  ├─ 📄 Reportes
  ├─ 💰 Cotizaciones
  └─ 📈 Seguimiento
```

**Características:**
- ✅ Acceso directo a todas las funcionalidades
- ✅ Badges con contadores en tiempo real
- ✅ Indicadores visuales de urgencia
- ✅ Iconos descriptivos
- ✅ Organización lógica por flujo comercial
- ✅ Responsive y usable

---

## 🎯 MÉTRICAS DE ÉXITO

| Métrica | Objetivo |
|---------|----------|
| Tiempo para acceder a cualquier función | < 2 clics |
| Visibilidad de items pendientes | 100% |
| Satisfacción de usuario | > 90% |
| Reducción de clics innecesarios | > 50% |

---

## 📝 NOTAS TÉCNICAS

### Modificaciones en Sidebar.tsx

```typescript
// src/components/layout/Sidebar.tsx

// 1. Añadir soporte para badges
type NavItem = { 
  href: string; 
  label: string;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "info";
  icon?: React.ElementType;
};

// 2. Renderizar badges
{item.badge && (
  <span className={cn(
    "ml-auto px-2 py-0.5 text-xs rounded-full",
    item.badgeVariant === "warning" && "bg-yellow-500 text-white",
    item.badgeVariant === "success" && "bg-green-500 text-white",
    !item.badgeVariant && "bg-primary/10 text-primary"
  )}>
    {item.badge}
  </span>
)}

// 3. Renderizar iconos opcionales
{item.icon && <item.icon size={16} className="mr-2" />}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Sidebar
- [x] Estructura base actualizada
- [ ] Badges dinámicos implementados
- [ ] Iconos añadidos
- [ ] Estados visuales configurados
- [ ] Responsive verificado

### Páginas
- [x] Pipeline ✅
- [x] Clientes ✅
- [x] Pedidos ✅ (requiere mejoras SSOT v2)
- [ ] Analytics (completar)
- [ ] Reportes (crear)
- [ ] Cotizaciones (crear)
- [ ] Seguimiento (crear)

### Backend
- [ ] order.service.ts
- [ ] Validaciones SSOT v2
- [ ] Sistema de alertas
- [ ] Auditoría

### Testing
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Performance testing

---

**FIN DEL PLAN**
