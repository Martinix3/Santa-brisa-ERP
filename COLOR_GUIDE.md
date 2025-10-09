# 🎨 GUÍA DE COLORES - SANTA BRISA ERP

## ❌ PROBLEMA DETECTADO

Estamos hardcodeando colores en varios componentes, lo que dificulta:
- Mantener consistencia visual
- Cambiar el tema globalmente
- Escalar el diseño

## ✅ SOLUCIÓN: Usar SSOT y CSS Variables

---

## 📚 COLORES DISPONIBLES EN SSOT

### 1. Colores de Marca (SB_COLORS.brand)
```typescript
import { SB_COLORS } from '@/domain/ssot';

SB_COLORS.brand.sun          // #fff5a9 (amarillo suave)
SB_COLORS.brand.sunStrong    // #fecb46 (amarillo fuerte)
SB_COLORS.brand.agua         // #99d9d9 (agua)
SB_COLORS.brand.cobre        // #c56a3c (cobre)
SB_COLORS.brand.naranja      // #ed6a36 (naranja)
SB_COLORS.brand.verdeMar     // #5a9496 (verde mar)
```

### 2. Colores de Estado (SB_COLORS.state)
```typescript
SB_COLORS.state.success      // #22c55e (verde)
SB_COLORS.state.warning      // #fecb46 (amarillo)
SB_COLORS.state.danger       // #ef4444 (rojo)
SB_COLORS.state.info         // #3b82f6 (azul)
```

### 3. Colores por Departamento (DEPT_META)
```typescript
import { DEPT_META } from '@/domain/ssot';

DEPT_META.VENTAS.color       // #ea945e
DEPT_META.MARKETING.color    // #9dd4d6
DEPT_META.PRODUCCION.color   // #638c8d
DEPT_META.CALIDAD.color      // #829fce
DEPT_META.ALMACEN.color      // #996947
DEPT_META.FINANZAS.color     // #fecb46
```

---

## 🎯 CSS VARIABLES (RECOMENDADO)

### Variables de Módulo
```css
/* Disponibles en globals.css */
--sb-accent-ventas
--sb-accent-marketing
--sb-accent-produccion
--sb-accent-calidad
--sb-accent-logistica
--sb-accent-finance
--sb-accent-personal
--sb-accent-admin
--sb-accent-ops
```

### Uso en Tailwind
```tsx
// ✅ BIEN - Usar CSS variables
<div className="bg-[hsl(var(--sb-accent-ventas))]">

// ❌ MAL - Hardcodear
<div className="bg-[#ea945e]">
```

### Uso en Componentes
```tsx
// ✅ BIEN - Usar tokenToHsl helper
import { tokenToHsl } from '@/domain/ssot';

<div style={{ backgroundColor: tokenToHsl('--sb-accent-ventas') }}>

// ✅ BIEN - Con opacidad
<div style={{ backgroundColor: tokenToHsl('--sb-accent-ventas', 0.5) }}>
```

---

## 📝 EJEMPLOS DE MIGRACIÓN

### Antes (Hardcodeado)
```tsx
<button className="bg-indigo-600 text-white">
  Nueva Cuenta
</button>

<div style={{ backgroundColor: '#618E8F' }}>
  Contenido
</div>
```

### Después (Usando SSOT)
```tsx
<button className="bg-[hsl(var(--sb-accent-ventas))] text-white">
  Nueva Cuenta
</button>

<div style={{ backgroundColor: tokenToHsl('--sb-accent-ventas') }}>
  Contenido
</div>
```

---

## 🔍 COLORES HARDCODEADOS A REVISAR

### Ubicaciones comunes:
1. **Accounts page**: `bg-[#618E8F]` en botones de vista
2. **Dashboard pages**: Colores de KPIs y gráficos
3. **Componentes de ventas**: Barras de progreso
4. **Sidebar**: Enlaces activos
5. **Botones de acción**: Primarios, secundarios

### Archivos prioritarios:
- `src/app/(app)/accounts/page.tsx`
- `src/app/(app)/sell-out/page.tsx`
- `src/app/(app)/sell-in/page.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/sales/*.tsx`

---

## ✨ BENEFICIOS

1. **Consistencia**: Todos los colores desde una fuente única
2. **Mantenibilidad**: Cambios globales desde un solo lugar
3. **Temas**: Fácil implementar modo oscuro/claro
4. **Escalabilidad**: Nuevos módulos heredan el sistema

---

## 📌 REGLAS DE ORO

1. **NUNCA hardcodear colores hex/rgb** (#fff, rgb(255,0,0))
2. **SIEMPRE usar CSS variables** (--sb-accent-*)
3. **PREFERIR tokenToHsl** para JavaScript
4. **CONSULTAR SSOT** antes de crear nuevos colores

---

## 🚀 PRÓXIMOS PASOS

- [ ] Auditar todos los archivos por colores hardcodeados
- [ ] Migrar a CSS variables
- [ ] Crear componentes con colores del sistema
- [ ] Documentar nuevos colores en SSOT si es necesario
