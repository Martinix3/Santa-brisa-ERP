# SSOT CSS-First Migration Guide

## 🎯 Overview

Se ha refactorizado el archivo `src/domain/ssot.ts` para eliminar colores hardcodeados y adoptar un enfoque **CSS-First**. El CSS (`tokens.css`, `components.css`) es ahora la única fuente de verdad para colores y estilos.

## ❌ Breaking Changes

### 1. SB_COLORS eliminado

**Antes:**
```typescript
import { SB_COLORS } from '@/domain';
const color = SB_COLORS.primary.copper; // ❌ Ya no existe
```

**Ahora:**
```typescript
// Usa CSS variables directamente
const colorVar = 'var(--dept-ventas)';
// O aplica clases CSS
<div className="dept-VENTAS" />
```

### 2. DEPT_META cambió estructura

**Antes:**
```typescript
DEPT_META.VENTAS.color // '#ea945e'
DEPT_META.VENTAS.textColor // '#ffffff'
```

**Ahora:**
```typescript
DEPT_META.VENTAS.label // 'Ventas'
DEPT_META.VENTAS.className // 'dept-VENTAS'
```

### 3. Metadata usa className en vez de accent/color

**Antes:**
```typescript
ORDER_STATUS_META.open.accent // '#3b82f6'
SHIPMENT_STATUS_META.pending.accent // '#3b82f6'
```

**Ahora:**
```typescript
ORDER_STATUS_META.open.className // 'sb-badge--info'
SHIPMENT_STATUS_META.pending.className // 'sb-badge--info'
```

### 4. MODULE_ACCENTS usa tokens CSS correctos

**Antes:**
```typescript
MODULE_ACCENTS.sales // 'var(--sb-accent-ventas)' ❌ No existe
```

**Ahora:**
```typescript
MODULE_ACCENTS.sales // 'var(--dept-ventas)' ✅ Existe en tokens.css
```

## 🔧 Cómo Migrar

### Opción A: Usar clases CSS (RECOMENDADO)

```typescript
// Antes
<div style={{ background: DEPT_META.VENTAS.color }}>

// Ahora
<div className={DEPT_META.VENTAS.className}>
```

### Opción B: Usar CSS variables inline

```typescript
// Antes
<div style={{ color: SB_COLORS.primary.copper }}>

// Ahora
<div style={{ color: 'hsl(var(--dept-ventas))' }}>
```

### Opción C: Leer CSS variables en runtime (solo si necesario)

```typescript
function getDepartmentColor(dept: Department): string {
  const root = document.documentElement;
  const cssVar = MODULE_ACCENTS[dept.toLowerCase()];
  return getComputedStyle(root).getPropertyValue(cssVar.replace('var(', '').replace(')', ''));
}
```

## 📋 Archivos que Requieren Actualización

### Errores Detectados

1. **src/features/personal/TasksSection.tsx** (Líneas 116, 133, 134)
   ```typescript
   // ❌ ANTES
   style={{ backgroundColor: DEPT_META[dept].color }}
   style={{ backgroundColor: DEPT_META[dept].color, color: DEPT_META[dept].textColor }}
   
   // ✅ AHORA
   className={DEPT_META[dept].className}
   ```

2. **src/domain/ssot.audit.ts** (Línea 4)
   ```typescript
   // ❌ ANTES
   import { SB_COLORS } from '@/domain';
   
   // ✅ AHORA
   // Eliminar este import o usar MODULE_ACCENTS si necesitas variables CSS
   ```

### Búsqueda Global Recomendada

Busca en todo el proyecto:

```bash
# Buscar usos de SB_COLORS
grep -r "SB_COLORS" src/

# Buscar acceso a .color en metadata
grep -r "DEPT_META.*\.color" src/
grep -r "\.accent" src/

# Buscar .textColor
grep -r "\.textColor" src/
```

## 🎨 Nuevas Clases CSS Disponibles

### Departamentos
- `.dept-VENTAS`, `.dept-MARKETING`, `.dept-PRODUCCION`, `.dept-LOGISTICA`
- `.dept-ALMACEN` (alias de LOGISTICA), `.dept-CALIDAD`, `.dept-FINANZAS`
- `.dept-ADMIN`, `.dept-PERSONAL`, `.dept-OPS`

### Stages de Cuenta
- `.stage-activa`, `.stage-seguimiento`, `.stage-potencial`
- `.stage-fallida`, `.stage-cerrada`, `.stage-baja`

### Badges
- `.sb-badge--default`, `.sb-badge--success`, `.sb-badge--warning`
- `.sb-badge--destructive`, `.sb-badge--info`

## 🔗 Tokens CSS Disponibles

En `src/styles/tokens.css`:

```css
--dept-ventas
--dept-marketing
--dept-produccion
--dept-logistica
--dept-calidad
--dept-finanzas
--dept-admin
--dept-personal

--success
--warning
--destructive
--info

--sb-yellow
--sb-copper
--sb-aqua
--sb-green
```

## ✅ Beneficios del Cambio

1. **Single Source of Truth**: CSS es la única fuente de colores
2. **No más desincronización**: Los colores en JS y CSS siempre coinciden
3. **Facilita theming**: Cambiar colores editando solo CSS
4. **Performance**: Menos cálculos en JS, más cache del navegador
5. **Type safety**: TypeScript valida las clases CSS existen

## 📝 Ejemplo Completo de Migración

### Antes (estilo inline con colores hardcodeados)

```tsx
import { DEPT_META } from '@/domain';

export function DepartmentBadge({ dept }: { dept: Department }) {
  const meta = DEPT_META[dept];
  return (
    <span
      style={{
        backgroundColor: meta.color,
        color: meta.textColor,
        padding: '4px 8px',
        borderRadius: '4px'
      }}
    >
      {meta.label}
    </span>
  );
}
```

### Después (CSS-first)

```tsx
import { DEPT_META } from '@/domain';

export function DepartmentBadge({ dept }: { dept: Department }) {
  const meta = DEPT_META[dept];
  return (
    <span className={`${meta.className} px-2 py-1 rounded`}>
      {meta.label}
    </span>
  );
}
```

O mejor aún, usando Tailwind + CSS custom property:

```tsx
export function DepartmentBadge({ dept }: { dept: Department }) {
  const meta = DEPT_META[dept];
  return (
    <span className={`${meta.className} dept-color-tag px-2 py-1 rounded`}>
      {meta.label}
    </span>
  );
}
```

Donde `.dept-color-tag` está definido en `components.css`:

```css
.dept-color-tag {
  background-color: hsl(var(--dept-color) / 0.1);
  color: hsl(var(--
