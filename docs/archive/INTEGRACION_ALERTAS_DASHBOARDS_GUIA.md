# 📋 Guía de Integración: Alertas en Dashboards

**FASE FINAL.6 - UI Integration**

---

## 🎯 Cómo Integrar Alertas en Cualquier Dashboard

### **✨ SUPER SIMPLE: Solo 2 Pasos**

**1. Importar el widget:**
```tsx
import { AlertsWidget } from '@/components/alerts/AlertsWidget';
```

**2. Añadir el componente:**
```tsx
<AlertsWidget userId={currentUser.id} />
```

**¡ESO ES TODO!** 🎉

---

### **Ejemplo Completo:**

```tsx
// En cualquier dashboard, por ejemplo: src/components/dashboards/DashboardSales.tsx

import { AlertsWidget } from '@/components/alerts/AlertsWidget';
import { useData } from '@/lib/dataprovider';

export function DashboardSales() {
  const { currentUser } = useData();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Columna 1: KPIs */}
      <div className="space-y-5">
        <KpiCard ... />
        <ChartCard ... />
      </div>
      
      {/* Columna 2: Gráficos */}
      <div className="space-y-5">
        <ChartCard ... />
      </div>
      
      {/* Columna 3: Alertas + Actividad */}
      <div className="space-y-5">
        {/* ✅ SOLO AÑADIR ESTA LÍNEA */}
        <AlertsWidget userId={currentUser.id} />
        
        <ActivityFeed ... />
      </div>
    </div>
  );
}
```

**Con opciones (opcional):**
```tsx
<AlertsWidget 
  userId={currentUser.id}
  limit={5}               // Cuántas mostrar
  department="VENTAS"     // Filtrar por departamento
  title="Mis Alertas"     // Título personalizado
/>
```

### **Opción 2: Widget Compacto**

```tsx
import { AlertsWidgetCompact } from '@/components/alerts/AlertsWidget';

// Para espacios reducidos
<AlertsWidgetCompact userId={currentUser.id} limit={3} />
```

---

## 📍 Dónde Integrar

### **Dashboards Principales:**

1. **Dashboard Admin** (`src/components/dashboards/DashboardAdmin.tsx`)
   - Columna derecha, después de KPIs
   - `<AlertsWidget userId={currentUser.id} limit={5} />`

2. **Dashboard Sales** (`src/components/dashboards/DashboardSales.tsx`)
   - Columna derecha, junto a actividades
   - `<AlertsWidget userId={currentUser.id} department="VENTAS" />`

3. **Dashboard Marketing** (`src/components/dashboards/DashboardMarketing_bueno.tsx`)
   - Columna derecha
   - `<AlertsWidget userId={currentUser.id} department="MARKETING" />`

4. **Dashboard Operations** (`src/components/dashboards/DashboardOps_bueno.tsx`)
   - Junto a alertas operativas
   - `<AlertsWidget userId={currentUser.id} limit={8} />`

5. **Dashboard Quality** (`src/components/dashboards/QualityWidget.tsx`)
   - Panel lateral
   - `<AlertsWidget userId={currentUser.id} department="CALIDAD" />`

### **Páginas Específicas:**

6. **Calendario** (`src/app/calendario/page.tsx`)
   - Panel lateral con alertas del día
   - `<AlertsWidget userId={currentUser.id} title="Alertas del Día" />`

7. **Tareas** (si existe página)
   - Alertas relacionadas con tareas vencidas
   - `<AlertsWidget userId={currentUser.id} title="Alertas de Tareas" />`

8. **Pedidos** (`src/components/orders/PedidosContent.tsx`)
   - Ya tiene AlertsCard, reemplazar con AlertsWidget
   - `<AlertsWidget userId={currentUser.id} department="VENTAS" />`

---

## 🔧 Props Disponibles

```typescript
interface AlertsWidgetProps {
  userId: string;              // REQUERIDO
  limit?: number;              // Default: 5
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department?: Department;     // Filtrar por dept
  title?: string;              // Default: 'Alertas'
  variant?: 'default' | 'compact';
}
```

---

## 📊 Ejemplos de Integración

### **Dashboard con Alertas Filtradas:**

```tsx
// Dashboard de Ventas - Solo alertas de VENTAS
<AlertsWidget 
  userId={currentUser.id}
  department="VENTAS"
  limit={8}
  title="Alertas de Ventas"
/>
```

### **Dashboard con Alertas Críticas:**

```tsx
// Dashboard Admin - Solo alertas críticas del sistema
<AlertsWidget 
  userId={currentUser.id}
  severity="CRITICAL"
  limit={10}
  title="Alertas Críticas"
/>
```

### **Sidebar con Widget Compacto:**

```tsx
// En un panel lateral
<AlertsWidgetCompact userId={currentUser.id} limit={3} />
```

---

## ✅ Integración Global Ya Activa

**DynamicHeader:**
- ✅ Ya integrado en `src/app/(app)/layout.tsx`
- ✅ Muestra contador de alertas no leídas
- ✅ Dropdown con todas las alertas
- ✅ Visible en TODAS las páginas del sistema

**Funcionalidades:**
- ✅ Auto-refresh cada 30 segundos
- ✅ Click para dismiss alerta
- ✅ Marcar todas como leídas
- ✅ Formato de fecha relativo ("hace 5 min")

---

## 🎨 Personalización

### **Cambiar Título:**
```tsx
<AlertsWidget 
  userId={currentUser.id}
  title="Mis Notificaciones"
/>
```

### **Más Alertas:**
```tsx
<AlertsWidget 
  userId={currentUser.id}
  limit={10}  // Mostrar hasta 10
/>
```

### **Estilo Compacto:**
```tsx
<AlertsWidget 
  userId={currentUser.id}
  variant="compact"  // Menos padding, sin descripción
/>
```

---

## 🚀 Próximos Pasos

1. **Añadir widget a dashboards principales** (5 min c/u)
2. **Probar en cada dashboard** (2 min c/u)
3. **Ajustar límites según espacio** (1 min c/u)

**Tiempo total:** ~30 minutos para integrar en todos los dashboards

---

## 💡 Tips

- Usa `variant="compact"` para espacios reducidos
- Filtra por `department` para dashboards específicos
- Usa `limit` alto (8-10) en dashboards con mucho espacio
- El widget es responsive automáticamente
- Las alertas se actualizan en tiempo real (30 seg)

---

**Archivos creados:**
- `src/components/alerts/AlertsProvider.tsx` - Hook
- `src/components/alerts/AlertsWidget.tsx` - Widget
- `src/app/(app)/layout.tsx` - Integración global

**¡Listo para usar en cualquier página/dashboard!** 🎉
