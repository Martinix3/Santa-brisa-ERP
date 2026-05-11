# 🔄 Plan de Migración al SSOT (Single Source of Truth)

**Fecha:** 6 de Enero de 2025  
**Objetivo:** Conectar todas las páginas al SSOT para que usen datos y colores centralizados

---

## 📋 **Resumen Ejecutivo**

Actualmente hay **4 páginas críticas** con datos y colores hardcodeados que necesitan conectarse al SSOT:

1. ✅ `/sell-out` - Colores hardcodeados (Tailwind directo)
2. ✅ `/production/dashboard` - Datos mock y colores hardcodeados
3. ✅ `/cashflow/dashboard` - Datos mock completos
4. ✅ `/quality/parametros` - Colores con variables CSS no configurables

---

## 🎯 **Principios de Migración**

### **1. Colores**
```typescript
// ❌ ANTES (Hardcoded)
className="bg-indigo-600 text-white"
style={{ backgroundColor: '#829fce' }}

// ✅ DESPUÉS (Desde SSOT)
const { config } = useSystemConfig();
const ventasColor = config?.theme.departments.VENTAS.color || '#ea945e';
style={{ backgroundColor: ventasColor }}
```

### **2. Metadatos**
```typescript
// ❌ ANTES (Hardcoded)
const STATUS_LABELS = { open: 'Abierto', done: 'Hecho' };

// ✅ DESPUÉS (Desde SSOT)
import { ORDER_STATUS_META } from '@/domain/ssot';
const label = ORDER_STATUS_META[status].label;
```

### **3. Datos**
```typescript
// ❌ ANTES (Mock data)
const mockData = { balance: 125340, ... };

// ✅ DESPUÉS (Desde Firestore via useData)
const { data } = useData();
const balance = calculateBalance(data?.financeLinks || []);
```

---

## 📄 **Página 1: `/sell-out`**

### **Problemas Detectados**

#### Colores Hardcodeados
```typescript
// Línea ~163
<button className="bg-indigo-600 text-white px-4 py-2 rounded-lg">

// Línea ~235
<div className="bg-emerald-500 h-5 rounded-full">

// Línea ~267
<div className="bg-white p-6 rounded-xl border-amber-200 ring-2 ring-amber-100">

// Línea ~340
<div className="bg-white p-6 rounded-xl border-red-200 ring-1 ring-red-100">

// Línea ~393
<circle stroke="#f59e0b" />

// Línea ~441
{colors = ['bg-indigo-500', 'bg-sky-500', 'bg-teal-500']}
```

### **Solución**

```typescript
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META } from '@/domain/ssot';

export default function SellOutPage() {
  const { config } = useSystemConfig();
  
  // Obtener colores del departamento VENTAS
  const ventasTheme = config?.theme.departments.VENTAS || DEPT_META.VENTAS;
  
  // Colores de estado (success, warning, danger)
  const successColor = config?.theme.state.success || '#22c55e';
  const warningColor = config?.theme.state.warning || '#fecb46';
  const dangerColor = config?.theme.state.danger || '#ef4444';
  
  return (
    <div>
      {/* Botón principal */}
      <button style={{ backgroundColor: ventasTheme.color, color: ventasTheme.textColor }}>
        Registrar Venta
      </button>
      
      {/* Barra de progreso */}
      <div style={{ backgroundColor: successColor }}>
        Progreso
      </div>
      
      {/* Alerta */}
      <div style={{ borderColor: dangerColor, backgroundColor: `${dangerColor}10` }}>
        Necesitan atención
      </div>
    </div>
  );
}
```

---

## 📄 **Página 2: `/production/dashboard`**

### **Archivos a Revisar**
```
src/app/(app)/production/dashboard/page.tsx
```

### **Problemas Esperados**
1. Colores de departamento PRODUCCION hardcodeados
2. Estados de producción hardcodeados
3. Posibles datos mock de órdenes de producción

### **Solución**

```typescript
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META, PRODUCTION_STATUS_META } from '@/domain/ssot';

export default function ProductionDashboardPage() {
  const { config } = useSystemConfig();
  const { data } = useData();
  
  // Colores desde config
  const produccionTheme = config?.theme.departments.PRODUCCION || DEPT_META.PRODUCCION;
  
  // Datos reales
  const orders = data?.productionOrders || [];
  const lots = data?.lots || [];
  
  // Estados desde SSOT
  const getStatusLabel = (status: ProductionStatus) => {
    return PRODUCTION_STATUS_META[status]?.label || status;
  };
  
  return (
    <div style={{ backgroundColor: `${produccionTheme.color}10` }}>
      {/* Contenido */}
    </div>
  );
}
```

---

## 📄 **Página 3: `/cashflow/dashboard`**

### **Problemas Detectados**

```typescript
// ❌ TODO HARDCODED
const cashflowData = {
    currentBalance: 125340,
    inflow30d: 45200,
    outflow30d: 22800,
    netCashflow: 22400,
    forecast: [...]
}
```

### **Solución**

**Paso 1: Crear helper de finanzas**

```typescript
// src/lib/finance-helpers.ts

import { FinanceLink, PaymentLink } from '@/domain/ssot';

export function calculateCashflowMetrics(
  financeLinks: FinanceLink[],
  paymentLinks: PaymentLink[],
  days: number = 30
) {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  // Calcular ingresos (pagos recibidos)
  const inflow = paymentLinks
    .filter(p => new Date(p.date) >= cutoffDate)
    .reduce((sum, p) => sum + p.amount, 0);
  
  // Calcular salidas (facturas pendientes de pago)
  const outflow = financeLinks
    .filter(f => f.status !== 'paid' && new Date(f.issueDate) >= cutoffDate)
    .reduce((sum, f) => sum + f.grossAmount, 0);
  
  // Calcular saldo actual
  const allPayments = paymentLinks.reduce((sum, p) => sum + p.amount, 0);
  const allInvoices = financeLinks.reduce((sum, f) => sum + f.grossAmount, 0);
  const currentBalance = allPayments - allInvoices;
  
  return {
    currentBalance,
    inflow,
    outflow,
    netCashflow: inflow - outflow
  };
}

export function getCashflowForecast(
  financeLinks: FinanceLink[],
  weeks: number = 4
) {
  const forecast: Array<{ name: string; inflow: number; outflow: number }> = [];
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekInvoices = financeLinks.filter(f => {
      const dueDate = new Date(f.dueDate);
      return dueDate >= weekStart && dueDate < weekEnd;
    });
    
    forecast.push({
      name: `Sem ${i + 1}`,
      inflow: weekInvoices
        .filter(f => f.status === 'paid')
        .reduce((sum, f) => sum + f.grossAmount, 0),
      outflow: weekInvoices
        .filter(f => f.status === 'pending')
        .reduce((sum, f) => sum + f.grossAmount, 0)
    });
  }
  
  return forecast;
}
```

**Paso 2: Actualizar página**

```typescript
// src/app/(app)/cashflow/dashboard/page.tsx

import { useData } from '@/lib/dataprovider';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { calculateCashflowMetrics, getCashflowForecast } from '@/lib/finance-helpers';
import { DEPT_META } from '@/domain/ssot';

export default function CashflowDashboardPage() {
  const { data } = useData();
  const { config } = useSystemConfig();
  
  // Colores desde config
  const finanzasTheme = config?.theme.departments.FINANZAS || DEPT_META.FINANZAS;
  
  // Datos reales
  const metrics = calculateCashflowMetrics(
    data?.financeLinks || [],
    data?.paymentLinks || []
  );
  
  const forecast = getCashflowForecast(data?.financeLinks || []);
  
  return (
    <div>
      <h1 style={{ color: finanzasTheme.color }}>Dashboard de Tesorería</h1>
      
      <KPI 
        label="Saldo Actual" 
        value={metrics.currentBalance.toLocaleString('es-ES', {
          style: 'currency', 
          currency: 'EUR'
        })} 
      />
      
      {/* Resto del contenido */}
    </div>
  );
}
```

---

## 📄 **Página 4: `/quality/parametros`**

### **Problemas Detectados**

```typescript
// Línea ~145
<h1 className="text-[hsl(var(--sb-accent-calidad))]">

// Línea ~203
<SBButton style={{ backgroundColor: 'hsl(var(--sb-accent-calidad))' }}>

// Línea ~249
<button className="text-[hsl(var(--sb-accent-calidad))] hover:underline">
```

### **Solución**

```typescript
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META } from '@/domain/ssot';

export default function QualityParametersPage() {
  const { config } = useSystemConfig();
  const { data, saveCollection } = useData();
  
  // Colores desde config
  const calidadTheme = config?.theme.departments.CALIDAD || DEPT_META.CALIDAD;
  
  return (
    <div>
      <h1 style={{ color: calidadTheme.color }}>
        <FlaskConical />
        Parámetros de Calidad
      </h1>
      
      <SBButton 
        onClick={handleAddParameter}
        style={{ 
          backgroundColor: calidadTheme.color,
          color: calidadTheme.textColor
        }}
      >
        <Plus size={16} /> Añadir
      </SBButton>
      
      <button 
        onClick={() => setIsEditing(true)}
        style={{ color: calidadTheme.color }}
        className="hover:underline"
      >
        <Edit size={12}/> Editar
      </button>
    </div>
  );
}
```

---

## 🔧 **Implementación por Fases**

### **Fase 1: Infraestructura** ✅ COMPLETADO
- [x] Crear `SystemConfig` en SSOT
- [x] Crear hook `useSystemConfig`
- [x] Crear página admin `/admin/system-config`

### **Fase 2: Helpers de Datos** 🔄 EN PROGRESO
- [ ] Crear `src/lib/finance-helpers.ts`
- [ ] Crear funciones de cálculo de cashflow
- [ ] Crear funciones de forecast

### **Fase 3: Migración de Páginas** 📋 PENDIENTE
- [ ] Migrar `/sell-out` (colores)
- [ ] Migrar `/production/dashboard` (datos + colores)
- [ ] Migrar `/cashflow/dashboard` (datos completos)
- [ ] Migrar `/quality/parametros` (colores)

### **Fase 4: Validación** 📋 PENDIENTE
- [ ] Testing de cada página
- [ ] Verificar que los colores se actualizan desde admin
- [ ] Verificar que los datos son correctos
- [ ] Performance check

---

## 📊 **Métricas de Éxito**

| Métrica | Antes | Objetivo |
|---------|-------|----------|
| Valores hardcodeados | 400+ | 0 |
| Páginas con mock data | 4 | 0 |
| Páginas con colores hardcoded | 10+ | 0 |
| Fuentes de verdad | Múltiples | 1 (SSOT) |
| Tiempo de cambio de color | Manual en cada archivo | 1 click en admin |

---

## 🚀 **Próximos Pasos Inmediatos**

1. **Crear finance-helpers.ts** con funciones de cálculo
2. **Migrar cashflow/dashboard** (datos reales)
3. **Migrar quality/parametros** (colores desde config)
4. **Migrar sell-out** (colores desde config)
5. **Revisar production/dashboard** y migrar

---

**Responsable:** Equipo de Desarrollo  
**Fecha límite:** Enero 2025  
**Prioridad:** 🔴 Alta
