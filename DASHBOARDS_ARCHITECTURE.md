# 🎯 Arquitectura de Dashboards - Guía Definitiva

**Última actualización:** 14/01/2025  
**Estado:** Fase 1.5 completa (server actions) - Fase 1.5.8 pendiente (conectar UI)

---

## 📊 DOS SISTEMAS DIFERENTES

### Sistema 1: Dashboards PERSONALES (por Rol)
**Ruta:** `/dashboard`  
**Propósito:** Dashboard personal del usuario según su rol  
**Acceso:** Automático al entrar a la app

### Sistema 2: Dashboards DEPARTAMENTALES
**Rutas:** `/[departamento]/dashboard`  
**Propósito:** Vista agregada de todo el departamento  
**Acceso:** Navegación manual desde sidebar

---

## 🏠 SISTEMA 1: DASHBOARDS PERSONALES

### Concepto
Cada usuario ve SU dashboard personal al entrar a `/dashboard`, mostrando:
- SUS tareas
- SUS cuentas  
- SUS KPIs individuales
- SUS alertas

### Arquitectura

```
/dashboard (ruta única)
    ↓
Router por rol (dashboard/page.tsx)
    ↓
┌─────────────────────────────────────────┐
│ if (role === "comercial")               │
│   → <DashboardSales />                  │
│                                          │
│ if (role === "ops")                     │
│   → <DashboardOps />                    │
│                                          │
│ if (role === "marketing")               │
│   → <DashboardMarketing />              │
│                                          │
│ if (role === "owner" || role === "admin") │
│   → <DashboardManager />                │
│                                          │
│ if (role === "distribuidor")            │
│   → <DashboardDistributor />            │
│                                          │
│ else → Dashboard Personal (tareas)      │
└─────────────────────────────────────────┘
```

### Componentes

```
src/components/dashboards/
├── DashboardSales.tsx        ← Comerciales
├── DashboardOps.tsx          ← Operaciones  
├── DashboardMarketing.tsx    ← Marketing
├── DashboardAdmin.tsx        ← Admin
├── DashboardManager.tsx      ← Owner/Manager
├── DashboardDistributor.tsx  ← Distribuidores
└── DashboardTechnical.tsx    ← Técnico
```

### Server Actions (con filtro por usuario)

```typescript
// Ejemplo: Dashboard personal de un comercial
getDashboardSalesData(userId: "juan-id")
  → Solo cuentas asignadas a Juan
  → Solo tareas de Juan
  → KPIs individuales de Juan
```

### Estado Actual
- ✅ Componentes UI completos
- ✅ Diseño y glassmorphism
- ⚠️ Usan datos mock
- ❌ NO conectados a server actions
- ❌ Router en /dashboard incompleto

---

## 📂 SISTEMA 2: DASHBOARDS DEPARTAMENTALES

### Concepto
Dashboards agregados por departamento, accesibles desde sidebar:
- Datos de TODO el equipo
- KPIs del departamento completo
- Proyectos del área
- Alertas departamentales

### Arquitectura

```
Sidebar
  ↓
Click "Dashboard Ventas"
  ↓
/ventas/dashboard
  ↓
page.tsx carga datos departamentales
  ↓
Muestra KPIs de TODO el equipo de ventas
```

### Rutas y Server Actions

| Ruta | Server Action | Estado |
|------|---------------|--------|
| `/ventas/dashboard` | `dashboard-sales.ts` | ✅ Completo |
| `/warehouse/dashboard` | `dashboard-ops.ts` | ✅ Completo |
| `/marketing/dashboard` | `dashboard-marketing.ts` | ✅ Completo |
| `/production/dashboard` | (usa dashboard-ops.ts) | ✅ Completo |
| `/quality/dashboard` | (usa dashboard-ops.ts) | ✅ Completo |
| `/finance/dashboard` | `dashboard-admin.ts` | ✅ Completo |

### Server Actions (sin filtro de usuario)

```typescript
// Ejemplo: Dashboard departamental de ventas
getDashboardSalesData()
  → Todas las cuentas del equipo
  → Todos los pedidos
  → KPIs agregados del departamento
```

### Estado Actual
- ✅ Server actions completos (Fase 1.5)
- ✅ Queries a Firestore optimizadas
- ✅ Tipos TypeScript
- ✅ Error handling
- ⚠️ Pendiente: Conectar a páginas `/[dept]/dashboard`

---

## 🔑 DIFERENCIAS CLAVE

| Aspecto | Dashboard Personal | Dashboard Departamental |
|---------|-------------------|------------------------|
| **Ubicación** | `/dashboard` | `/ventas/dashboard`, etc. |
| **Componente** | `DashboardSales.tsx` | `page.tsx` en cada ruta |
| **Server Action** | Con `userId` | Sin `userId` (todos) |
| **Datos** | Individuales del usuario | Agregados del equipo |
| **Acceso** | Automático (home) | Manual (sidebar) |
| **Uso** | Trabajo diario | Supervisión de equipo |

---

## 📋 EJEMPLO COMPLETO: COMERCIAL

### Flujo de Juan Pérez (Comercial)

#### 1. Login → `/dashboard` (Personal)

```typescript
// Router detecta role="comercial"
<DashboardSales userId="juan-id" />
  ↓
getDashboardSalesData("juan-id")
  ↓
{
  myKpis: {
    salesThisMonth: 12000,
    visitsThisMonth: 18,
    conversionRate: 85,
    pendingTasks: 4
  },
  myAccounts: [...],     // Solo cuentas de Juan
  myTasks: [...],        // Solo tareas de Juan
  myPipeline: [...]      // Solo pipeline de Juan
}
```

**Vista:** Dashboard PERSONAL de Juan

#### 2. Click "Dashboard Ventas" → `/ventas/dashboard` (Departamental)

```typescript
// Página departamental
getDashboardSalesData()  // Sin userId
  ↓
{
  teamKpis: {
    totalSales: 45000,          // Juan + María + Carlos
    totalVisits: 67,
    avgConversion: 78,
    totalPending: 15
  },
  topAccounts: [...],           // Top del equipo completo
  teamPerformance: [
    { name: "Juan", sales: 12000 },
    { name: "María", sales: 18000 },
    { name: "Carlos", sales: 15000 }
  ]
}
```

**Vista:** Dashboard DEPARTAMENTAL (todo el equipo)

---

## 🛠️ ESTADO DE IMPLEMENTACIÓN

### ✅ COMPLETADO (Fase 1.5)

**Server Actions - 7 archivos creados:**
1. `dashboard-sales.ts` - KPIs ventas, cuentas, pipeline
2. `dashboard-ops.ts` - 5 tabs (Hoy, Logística, Inventario, Calidad, Producción)
3. `dashboard-admin.ts` - Finanzas, top cuentas, producción
4. `dashboard-manager.ts` - Vista ejecutiva agregada
5. `dashboard-distributor.ts` - Pedidos, sell-out, stock
6. `dashboard-marketing.ts` - Campañas, eventos, ROI
7. `dashboard-technical.ts` - Sistemas, logs, rendimiento

**Características:**
- ✅ Queries paralelas con Promise.all
- ✅ Fórmulas centralizadas (dashboard-config.ts)
- ✅ Reglas de alertas aplicadas
- ✅ Error handling completo
- ✅ Interfaces tipadas

### ⏳ PENDIENTE (Tareas 1.5.8-1.5.10)

**1. Tarea 1.5.8: Router por rol**
- Corregir `/dashboard/page.tsx`
- Conectar Dashboard*.tsx con server actions
- Eliminar datos mock

**2. Tarea 1.5.9: Loading states**
- Suspense en cada dashboard
- Skeleton screens

**3. Tarea 1.5.10: Error boundaries**
- Manejo de errores
- Fallbacks

---

## 📦 ARCHIVOS DEL SISTEMA

### Dashboards Personales (Componentes)
```
src/components/dashboards/
├── DashboardSales.tsx       ⚠️ Mock data, sin conectar
├── DashboardOps.tsx         ⚠️ Mock data, sin conectar
├── DashboardMarketing.tsx   ⚠️ Mock data, sin conectar
├── DashboardAdmin.tsx       ⚠️ Mock data, sin conectar
├── DashboardManager.tsx     ⚠️ Mock data, sin conectar
├── DashboardDistributor.tsx ⚠️ Mock data, sin conectar
├── DashboardTechnical.tsx   ⚠️ Mock data, sin conectar
└── shared/
    ├── KpiCard.tsx          ✅ Completo
    ├── ChartCard.tsx        ✅ Completo
    ├── ActivityFeed.tsx     ✅ Completo
    └── AlertsCard.tsx       ✅ Completo
```

### Router Principal
```
src/app/(app)/dashboard/
└── page.tsx                 ⚠️ Solo funciona owner/admin
```

### Dashboards Departamentales (Páginas)
```
src/app/(app)/
├── ventas/dashboard/page.tsx      ⚠️ Pendiente conectar
├── warehouse/dashboard/page.tsx   ⚠️ Pendiente conectar
├── marketing/dashboard/page.tsx   ⚠️ Pendiente conectar
├── production/dashboard/page.tsx  ⚠️ Pendiente conectar
└── quality/dashboard/page.tsx     ⚠️ Pendiente conectar
```

### Server Actions (Datos)
```
src/server/actions/
├── dashboard-sales.ts       ✅ Completo Fase 1.5
├── dashboard-ops.ts         ✅ Completo Fase 1.5
├── dashboard-marketing.ts   ✅ Completo Fase 1.5
├── dashboard-admin.ts       ✅ Completo Fase 1.5
├── dashboard-manager.ts     ✅ Completo Fase 1.5
├── dashboard-distributor.ts ✅ Completo Fase 1.5
└── dashboard-technical.ts   ✅ Completo Fase 1.5
```

---

## 🎯 PRÓXIMOS PASOS

### Inmediatos (Completar Fase 1.5)

1. **Conectar DashboardSales.tsx**
   ```tsx
   const { data } = await getDashboardSalesData(userId);
   // Reemplazar mock data con data real
   ```

2. **Conectar DashboardOps.tsx**
3. **Conectar DashboardMarketing.tsx**
4. **Conectar DashboardAdmin.tsx**
5. **Conectar DashboardManager.tsx**
6. **Conectar DashboardDistributor.tsx**
7. **Conectar DashboardTechnical.tsx**

8. **Actualizar router en /dashboard/page.tsx**
   ```tsx
   if (role === "comercial") return <DashboardSales />;
   if (role === "ops") return <DashboardOps />;
   // etc.
   ```

9. **Loading states y error boundaries**

### Futuros (Mejoras)

1. **Permisos granulares** - Sistema de permisos para dashboards
2. **Personalización** - Cada usuario puede configurar su dashboard
3. **Widgets** - Sistema modular de widgets
4. **Exportación** - PDF/Excel de dashboards

---

## 💡 REGLAS DE ORO

1. **Dashboard Personal = Datos filtrados por userId**
2. **Dashboard Departamental = Datos agregados sin filtro**
3. **Mismo server action, diferente parámetro**
4. **Personal en `/dashboard`, Departamental en `/[dept]/dashboard`**
5. **Personal = Trabajo diario, Departamental = Supervisión**

---

## ❓ FAQ

**P: ¿Por qué dos sistemas?**
R: Personal para el día a día del usuario, departamental para ver el equipo completo.

**P: ¿Pueden compartir código?**
R: Sí, usan los mismos server actions pero con/sin userId.

**P: ¿Un comercial puede ver dashboards departamentales?**
R: Sí, si tiene permisos. Por defecto ve su departamento.

**P: ¿Manager/Owner ven qué en /dashboard?**
R: DashboardManager - vista ejecutiva de toda la empresa.

**P: ¿Los dashboards departamentales están listos?**
R: Server actions sí (✅), falta conectarlos a las páginas.

---

**Última actualización:** 14/01/2025 23:05  
**Autor:** Sistema de documentación Santa Brisa ERP
