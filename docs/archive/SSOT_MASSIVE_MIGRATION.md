# 🔄 Plan de Migración Masiva al SSOT

**Fecha:** 6 de Enero de 2025  
**Alcance:** Migrar TODAS las páginas del CRM al Single Source of Truth

---

## 📋 **INVENTARIO COMPLETO**

### **Estado Actual**

| # | Página | Datos | Colores | Estado | Prioridad |
|---|--------|-------|---------|--------|-----------|
| 1 | `/dashboard-personal` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Alta |
| 2 | `/sell-out` | ✅ Real | ✅ SSOT | ✅ **COMPLETO** | - |
| 3 | `/sell-in` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Alta |
| 4 | `/accounts` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Alta |
| 5 | `/orders` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Alta |
| 6 | `/marketing/dashboard` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 7 | `/marketing/events` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 8 | `/marketing/online` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 9 | `/marketing/pos-tactics` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 10 | `/production/dashboard` | ✅ Real | ✅ SSOT | ✅ **COMPLETO** | - |
| 11 | `/production/bom` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 12 | `/production/execution` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 13 | `/quality/dashboard` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 14 | `/quality/release` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 15 | `/quality/traceability` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Baja |
| 16 | `/quality/parametros` | ✅ Real | ✅ SSOT | ✅ **COMPLETO** | - |
| 17 | `/warehouse/dashboard` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 18 | `/warehouse/logistics` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Baja |
| 19 | `/warehouse/inventory` | ⚠️ Revisar | ⚠️ Revisar | 🔴 Pendiente | Media |
| 20 | `/cashflow/dashboard` | ✅ Real | ✅ SSOT | ✅ **COMPLETO** | - |

**Progreso:** 4/20 páginas (20%)

---

## 🎯 **ESTRATEGIA DE MIGRACIÓN**

### **Fase 1: Componentes Base** (Prioridad: 🔴 CRÍTICA)
Antes de migrar páginas, necesitamos migrar los componentes compartidos:

#### **1.1 Cards y Tarjetas**
```
src/components/ui/ui-primitives.tsx
  ├─ SBCard
  ├─ KPI
  └─ DashboardCard
```

**Cambios necesarios:**
- [ ] Agregar prop `departmentColor?: string`
- [ ] Usar color del departamento en borders/accents
- [ ] Preservar todos los estilos Tailwind

#### **1.2 Botones**
```
src/components/ui/ui-primitives.tsx
  └─ SBButton
```

**Cambios necesarios:**
- [ ] Agregar variant `department`
- [ ] Usar `useSystemConfig` para obtener colores
- [ ] Mantener todos los variants existentes

#### **1.3 Tabs**
```
src/components/ui/ui-primitives.tsx (si existe)
  └─ Tabs component
```

**Cambios necesarios:**
- [ ] Active tab usa color del departamento
- [ ] Hover states dinámicos

#### **1.4 Iconos**
**Patrón:**
```typescript
// ❌ Antes
<Icon className="text-blue-500" />

// ✅ Después
<Icon style={{ color: theme.color }} />
```

#### **1.5 Tablas**
**Patrón:**
```typescript
// Header row
<thead style={{ backgroundColor: `${theme.color}10` }}>
  <th style={{ color: theme.color }}>Columna</th>
</thead>
```

#### **1.6 Gráficos (Charts)**
**Librería:** Recharts (probablemente)

**Patrón:**
```typescript
<BarChart>
  <Bar dataKey="value" fill={theme.color} />
</BarChart>
```

---

### **Fase 2: Páginas Alta Prioridad** (5 páginas)

#### **2.1 Dashboard Personal** 🔴
**Ruta:** `src/app/(app)/dashboard-personal/page.tsx`

**Issues esperados:**
- Colores de tarjetas KPI
- Colores de gráficos
- Estados de tareas

**Departamento:** VENTAS (probablemente)

#### **2.2 Sell-In** 🔴
**Ruta:** `src/app/(app)/sell-in/page.tsx`

**Issues esperados:**
- Similar a sell-out
- Colores de botones
- Gráficos de evolución

**Departamento:** VENTAS

#### **2.3 Accounts** 🔴
**Ruta:** `src/app/(app)/accounts/page.tsx`

**Issues esperados:**
- Cards de cuentas
- Pipeline visual
- Filtros y estados

**Departamento:** VENTAS

#### **2.4 Orders** 🔴
**Ruta:** Múltiples componentes en `src/features/orders/`

**Issues esperados:**
- Tablas de pedidos
- Estados de orden
- Badges de status

**Departamento:** VENTAS

---

### **Fase 3: Páginas Marketing** (4 páginas)

#### **3.1 Marketing Dashboard**
**Departamento:** MARKETING
**Colores:** Desde `config.theme.departments.MARKETING`

#### **3.2-3.4 Events / Online / POS Tactics**
**Todos:** Departamento MARKETING

---

### **Fase 4: Páginas Production** (2 páginas)

#### **4.1 Production BOM**
**Departamento:** PRODUCCION

#### **4.2 Production Execution**
**Departamento:** PRODUCCION

---

### **Fase 5: Páginas Quality** (2 páginas)

#### **5.1 Quality Dashboard**
**Departamento:** CALIDAD

#### **5.2 Quality Release**
**Departamento:** CALIDAD

---

### **Fase 6: Páginas Warehouse** (3 páginas)

#### **6.1-6.3 Dashboard / Logistics / Inventory**
**Departamento:** OPERACIONES

---

## 🔧 **PATRÓN DE MIGRACIÓN ESTÁNDAR**

### **Template para cada página:**

```typescript
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META } from '@/domain/ssot';

export default function PageName() {
  const { config } = useSystemConfig();
  const { data } = useData();
  
  // Obtener tema del departamento
  const deptTheme = config?.theme.departments.DEPARTMENT_NAME || DEPT_META.DEPARTMENT_NAME;
  
  // Estados de color
  const successColor = config?.theme.state.success || '#22c55e';
  const warningColor = config?.theme.state.warning || '#fecb46';
  const dangerColor = config?.theme.state.danger || '#ef4444';
  
  return (
    <div>
      <h1 
        className="text-2xl font-semibold"
        style={{ color: deptTheme.color }}
      >
        Título
      </h1>
      
      {/* Resto del contenido */}
    </div>
  );
}
```

---

## 📊 **CHECKLIST POR PÁGINA**

Para cada página, verificar:

- [ ] **Título principal** usa color del departamento
- [ ] **Botones primarios** usan `deptTheme.color`
- [ ] **Cards/Tarjetas** usan accent del departamento
- [ ] **Tabs activos** usan color del departamento
- [ ] **Iconos destacados** usan color del departamento
- [ ] **Gráficos** usan paleta del departamento
- [ ] **Estados** (success/warning/danger) usan colores de estado
- [ ] **Badges** usan colores apropiados
- [ ] **Borders** de elementos activos usan color del departamento
- [ ] **Hover states** son consistentes
- [ ] **NO se eliminan clases Tailwind** (tipografía, spacing, etc.)
- [ ] **Datos vienen de useData()**, no mock
- [ ] **Loading states** están implementados

---

## 🎨 **COMPONENTES A CREAR/ACTUALIZAR**

### **1. DepartmentCard**
```typescript
// src/components/shared/DepartmentCard.tsx
interface DepartmentCardProps {
  department: Department;
  children: React.ReactNode;
  title?: string;
}

export function DepartmentCard({ department, children, title }: DepartmentCardProps) {
  const { config } = useSystemConfig();
  const theme = config?.theme.departments[department] || DEPT_META[department];
  
  return (
    <div 
      className="bg-white rounded-xl border-2 p-6"
      style={{ borderColor: `${theme.color}33` }}
    >
      {title && (
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: theme.color }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
```

### **2. DepartmentButton**
```typescript
// src/components/shared/DepartmentButton.tsx
interface DepartmentButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  department: Department;
  variant?: 'primary' | 'secondary';
}

export function DepartmentButton({ department, variant = 'primary', children, ...props }: DepartmentButtonProps) {
  const { config } = useSystemConfig();
  const theme = config?.theme.departments[department] || DEPT_META[department];
  
  return (
    <button
      className="px-4 py-2 rounded-lg font-semibold transition-colors"
      style={{
        backgroundColor: variant === 'primary' ? theme.color : 'transparent',
        color: variant === 'primary' ? theme.textColor : theme.color,
        border: variant === 'secondary' ? `2px solid ${theme.color}` : 'none'
      }}
      {...props}
    >
      {children}
    </button>
  );
}
```

### **3. StatusBadge**
```typescript
// src/components/shared/StatusBadge.tsx
type StatusType = 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { config } = useSystemConfig();
  
  const colors = {
    success: config?.theme.state.success || '#22c55e',
    warning: config?.theme.state.warning || '#fecb46',
    danger: config?.theme.state.danger || '#ef4444',
    info: config?.theme.state.info || '#3b82f6'
  };
  
  const color = colors[status];
  
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color
      }}
    >
      {label}
    </span>
  );
}
```

---

## 📈 **MÉTRICAS DE ÉXITO**

| Métrica | Objetivo |
|---------|----------|
| Páginas migradas | 20/20 (100%) |
| Colores hardcodeados | 0 |
| Datos mock | 0 |
| Componentes reutilizables | 3+ nuevos |
| Tiempo cambio de color | <1 min |
| Consistencia visual | 100% |

---

## 🚀 **PLAN DE EJECUCIÓN**

### **Semana 1: Fundación**
- [ ] Fase 1: Migrar componentes base
- [ ] Crear DepartmentCard, DepartmentButton, StatusBadge
- [ ] Testing de componentes

### **Semana 2: Core Business**
- [ ] Fase 2: Páginas alta prioridad (5 páginas)
- [ ] Dashboard personal, Sell-in, Accounts, Orders

### **Semana 3: Departamentos**
- [ ] Fase 3: Marketing (4 páginas)
- [ ] Fase 4: Production (2 páginas)

### **Semana 4: Final**
- [ ] Fase 5: Quality (2 páginas)
- [ ] Fase 6: Warehouse (3 páginas)
- [ ] Testing completo
- [ ] Documentación

---

## 💡 **NEXT STEPS INMEDIATOS**

1. **Crear componentes base** (DepartmentCard, DepartmentButton, StatusBadge)
2. **Migrar dashboard-personal** (página más usada)
3. **Continuar con sell-in y accounts**
4. **Iterar sobre el resto**

---

**Estimación total:** ~4 semanas de trabajo
**Páginas por día:** 1-2 páginas
**Progreso actual:** 4/20 (20%)
