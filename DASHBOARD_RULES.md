# 📋 REGLAS GLOBALES PARA DASHBOARDS

## 🎯 APLICABLE A: Todos los dashboards EXCEPTO Dashboard Personal

---

## 1️⃣ FILTROS TEMPORALES OBLIGATORIOS

**Todos los dashboards deben incluir:**

```tsx
[SEMANA] [MES] [ACUMULADO]
```

**Comportamiento:**
- Ubicación: Header sticky (siempre visible al scroll)
- Afecta: TODOS los KPIs, gráficos y datos de la página
- Estado: Compartido entre componentes vía hook o context

**Implementación:**
```typescript
type TimeRange = 'week' | 'month' | 'ytd';

// Filtro de fechas según rango
const filterByTimeRange = (date: string, range: TimeRange) => {
  const now = new Date();
  const targetDate = new Date(date);
  
  switch (range) {
    case 'week':
      // Últimos 7 días
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return targetDate >= weekAgo;
      
    case 'month':
      // Mes actual
      return (
        targetDate.getMonth() === now.getMonth() &&
        targetDate.getFullYear() === now.getFullYear()
      );
      
    case 'ytd':
      // Año hasta la fecha (Year To Date)
      return targetDate.getFullYear() === now.getFullYear();
  }
};
```

---

## 2️⃣ PANEL DE TAREAS OBLIGATORIO

**Todos los dashboards deben mostrar:**

### **Tareas del Departamento**

**Secciones:**
1. **Tareas Vencidas** (plannedFor < hoy)
2. **Tareas Pendientes** (plannedFor >= hoy)

**Mostrar:**
- Owner (nombre del usuario asignado)
- Fecha de vencimiento/planificación
- Título o nota de la tarea

**NO Mostrar:**
- Botones de edición
- Botones de completar
- Acciones de modificación

**Solo lectura**

**Filtrado:**
```typescript
// Filtrar por departamento
const tareasDept = interactions.filter(i => 
  i.dept === departamento && // ej: 'VENTAS', 'MARKETING', etc.
  i.status === 'open' &&
  filterByTimeRange(i.plannedFor, timeRange)
);

// Separar vencidas y pendientes
const tareasVencidas = tareasDept.filter(t => {
  if (!t.plannedFor) return false;
  return new Date(t.plannedFor) < new Date();
});

const tareasPendientes = tareasDept.filter(t => {
  if (!t.plannedFor) return true; // Sin fecha = pendiente
  return new Date(t.plannedFor) >= new Date();
});
```

**Ubicación:**
- Desktop: Sidebar derecho colapsable con botón flotante
- Mobile: Sección al final del dashboard

---

## 3️⃣ ESTRUCTURA ESTÁNDAR DE DASHBOARD

```tsx
export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const { data } = useData();
  
  return (
    <PageShell title="Dashboard [Nombre]" module="[modulo]">
      {/* 1. Header Sticky con Filtros */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur...">
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="space-y-6">
        {/* 2. KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI Cards */}
        </div>

        {/* 3. Visualizaciones y tablas */}
        {/* Contenido específico del dashboard */}

        {/* 4. Panel de Tareas (al final o sidebar) */}
        <TasksPanel 
          departamento="VENTAS" 
          timeRange={timeRange} 
        />
      </div>
    </PageShell>
  );
}
```

---

## 4️⃣ DISEÑO Y UX

### **Colores Corporativos Santa Brisa:**
- `#F7D15F` - Amarillo (KPIs principales)
- `#D7713E` - Naranja (Alertas, warnings)
- `#A7D8D9` - Azul claro (Info, secundario)
- `#618E8F` - Verde azulado (Éxito, activo)

### **Sin Emojis:**
- NO usar emojis en producción
- Usar iconos de Lucide React
- Look profesional y corporativo

### **Responsive:**
- Mobile: 1 columna para KPIs
- Tablet: 2 columnas
- Desktop: 4 columnas
- Priorizar mobile-first

---

## 5️⃣ NOMENCLATURA Y CONVENCIONES

### **Rutas:**
- Formato: `/[nombre-dashboard]`
- Ejemplos: `/sell-out`, `/sell-in`, `/marketing`, `/production`

### **Archivos:**
```
src/app/(app)/
  [dashboard-name]/
    page.tsx

src/components/[module]/
  [ComponentName].tsx
```

### **Tipos TimeRange:**
```typescript
type TimeRange = 'week' | 'month' | 'ytd';

const TIME_RANGE_LABELS = {
  week: 'Semana',
  month: 'Mes',
  ytd: 'Acumulado'
};
```

---

## 6️⃣ DATOS Y HELPERS

### **Helpers Comunes:**
```typescript
// src/lib/time-range-helpers.ts
export function filterByTimeRange(date: string, range: TimeRange): boolean;
export function getTimeRangeLabel(range: TimeRange): string;
export function getPeriodDates(range: TimeRange): { start: Date, end: Date };

// src/lib/dashboard-helpers.ts
export function getTareasDepartamento(
  interactions: Interaction[], 
  dept: Department,
  timeRange: TimeRange
): { vencidas: Interaction[], pendientes: Interaction[] };
```

---

## 7️⃣ COMPONENTES REUTILIZABLES

### **TimeRangeFilter**
```tsx
<TimeRangeFilter 
  value={timeRange} 
  onChange={setTimeRange} 
/>
```

### **TasksPanel**
```tsx
<TasksPanel 
  departamento="VENTAS"
  timeRange={timeRange}
  location="sidebar" | "bottom"
/>
```

### **KpiCard** (ya existe)
```tsx
<KpiCard
  title="Título"
  value={123}
  icon={IconName}
  target={200}
  targetLabel="Objetivo: 200"
  accentColor="#F7D15F"
/>
```

---

## 8️⃣ EXCEPCIONES

### **Dashboard Personal:**
- ❌ NO usa filtros Semana/Mes/Acumulado
- ✅ USA filtros Día/Semana/Mes (específico para tareas)
- ❌ NO muestra panel de tareas de departamento
- ✅ MUESTRA tareas personales con edición

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

Para cada nuevo dashboard, verificar:

- [ ] Filtros temporales (Semana/Mes/Acumulado) implementados
- [ ] Filtros afectan a TODOS los datos
- [ ] Panel de tareas del departamento incluido
- [ ] Tareas solo lectura (sin edición)
- [ ] Colores corporativos aplicados
- [ ] Sin emojis en producción
- [ ] Responsive mobile/tablet/desktop
- [ ] Header sticky funcional
- [ ] KPIs con iconos Lucide React
- [ ] TypeScript sin errores

---

## 🎯 RESUMEN RÁPIDO

**OBLIGATORIO EN TODOS LOS DASHBOARDS (excepto Personal):**
1. ✅ Filtros: SEMANA | MES | ACUMULADO
2. ✅ Panel de Tareas (departamento)
3. ✅ Header sticky
4. ✅ Colores Santa Brisa
5. ✅ Sin emojis

**DASHBOARD PERSONAL (EXCEPCIÓN):**
- Filtros: DÍA | SEMANA | MES
- Tareas personales editables
- Sin panel de tareas de departamento
