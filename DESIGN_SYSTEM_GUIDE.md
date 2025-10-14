# 🎨 Sistema de Diseño Global Santa Brisa

**Guía completa de estilos y componentes reutilizables**

---

## 📋 Índice

1. [Filosofía del Sistema](#filosofía)
2. [Page Layouts](#page-layouts)
3. [Cards](#cards)
4. [Tables](#tables)
5. [Dialogs](#dialogs)
6. [KPIs](#kpis)
7. [Forms](#forms)
8. [Buttons](#buttons)
9. [Status & Badges](#status-badges)
10. [Utilities](#utilities)
11. [Mobile-First](#mobile-first)

---

## 🎯 Filosofía

El sistema usa **Tailwind Layers** (`@layer base`, `@layer components`, `@layer utilities`) para crear componentes reutilizables con clases `.sb-*` que mantienen coherencia visual en toda la app.

**Principios:**
- Mobile-first (breakpoint md: 768px)
- Glass morphism sutil
- Variables CSS de color centralizadas
- Accesibilidad (ARIA, focus states)
- Dark mode automático

---

## 📄 Page Layouts

### Estructura básica de página

```tsx
<section className="sb-page">
  <header className="sb-page__header">
    <h1 className="sb-page__title">Título</h1>
    <p className="sb-page__subtitle">87 items</p>
  </header>
  
  <div className="sb-page__content">
    {/* Contenido aquí */}
  </div>
</section>
```

**Clases disponibles:**
- `.sb-page` - Contenedor principal con gap y padding responsive
- `.sb-page__header` - Header sticky con glass effect
- `.sb-page__title` - Título h1 estilizado
- `.sb-page__subtitle` - Subtítulo muted
- `.sb-page__content` - Área de contenido con spacing

---

## 🗂️ Cards

### Card estándar

```tsx
<div className="sb-card">
  <div className="sb-card__header">
    <h3 className="sb-card__title">Título</h3>
    <button>Acción</button>
  </div>
  
  <div className="sb-card__content">
    <p>Contenido</p>
  </div>
  
  <div className="sb-card__footer">
    <button>Guardar</button>
  </div>
</div>
```

### Variantes de glass

```tsx
{/* Sutil - info secundaria */}
<div className="sb-card-glass-subtle">...</div>

{/* Light - vista estándar */}
<div className="sb-card-glass-light">...</div>

{/* Dark - destacado, KPIs */}
<div className="sb-card-glass-dark">...</div>
```

---

## 📊 Tables

### Tabla con wrapper

```tsx
<div className="sb-table-wrapper">
  <table className="sb-table">
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Ciudad</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alberto</td>
        <td>Madrid</td>
        <td>Activo</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Tabla responsive (scroll horizontal en móvil)

```tsx
<div className="sb-table-responsive">
  <table className="sb-table">
    {/* ... */}
  </table>
</div>
```

**Características:**
- Sticky header automático
- Hover states
- Último row sin border-bottom
- Scroll táctil en móvil

---

## 💬 Dialogs

### Dialog estándar

```tsx
{dialogOpen && (
  <>
    {/* Overlay */}
    <div className="sb-dialog-overlay" onClick={onClose} />
    
    {/* Dialog */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="sb-dialog max-w-2xl w-full">
        {/* Accent bar opcional */}
        <div className="sb-dialog__accent" />
        
        <div className="sb-dialog__header">
          <h2 className="sb-dialog__title">Título</h2>
          <button onClick={onClose}>✕</button>
        </div>
        
        <div className="sb-dialog__content">
          <p>Contenido</p>
        </div>
        
        <div className="sb-dialog__footer">
          <button className="sb-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="sb-btn-primary">
            Guardar
          </button>
        </div>
      </div>
    </div>
  </>
)}
```

### Dialog mobile-friendly (bottom sheet en móvil)

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center max-md:items-end">
  <div className="sb-dialog sb-dialog-mobile md:max-w-2xl">
    {/* Mismo contenido */}
  </div>
</div>
```

---

## 📈 KPIs

### KPI destacado

```tsx
<div className="sb-kpi">
  <div className="sb-kpi__value">1,247</div>
  <div className="sb-kpi__label">Total Ventas</div>
  <div className="sb-kpi__change sb-kpi__change--positive">
    +12.5% vs mes anterior
  </div>
</div>
```

### KPI sutil (con icono)

```tsx
<div className="sb-kpi-subtle">
  <div className="sb-kpi-subtle__icon">
    <TrendingUp size={20} />
  </div>
  <div className="sb-kpi-subtle__content">
    <div className="sb-kpi-subtle__value">245</div>
    <div className="sb-kpi-subtle__label">Pedidos</div>
  </div>
</div>
```

### Grid de KPIs

```tsx
<div className="sb-stats-grid">
  <div className="sb-kpi">...</div>
  <div className="sb-kpi">...</div>
  <div className="sb-kpi">...</div>
  <div className="sb-kpi">...</div>
</div>
```

---

## 📝 Forms

### Input básico

```tsx
<div>
  <label className="sb-label">Nombre *</label>
  <input
    type="text"
    className="sb-input"
    placeholder="Ingrese nombre"
  />
</div>
```

### Select

```tsx
<select className="sb-select">
  <option>Opción 1</option>
  <option>Opción 2</option>
</select>
```

### Textarea

```tsx
<textarea
  className="sb-textarea"
  placeholder="Descripción"
/>
```

---

## 🔘 Buttons

```tsx
{/* Primary */}
<button className="sb-btn-primary">
  Guardar
</button>

{/* Secondary */}
<button className="sb-btn-secondary">
  Cancelar
</button>

{/* Ghost */}
<button className="sb-btn-ghost">
  Ver más
</button>

{/* Destructive */}
<button className="sb-btn-destructive">
  Eliminar
</button>
```

### Toolbar

```tsx
<div className="sb-toolbar">
  <select className="sb-select">...</select>
  <input className="sb-input" />
  <button className="sb-btn-primary">Filtrar</button>
</div>
```

---

## 🏷️ Status & Badges

### Status badges

```tsx
<span className="sb-status-active">Activo</span>
<span className="sb-status-pending">Pendiente</span>
<span className="sb-status-inactive">Inactivo</span>
<span className="sb-status-error">Error</span>
```

### Pills

```tsx
<span className="sb-pill">General</span>
<span className="sb-pill-primary">Importante</span>
<span className="sb-pill-success">Completado</span>
<span className="sb-pill-destructive">Urgente</span>
```

---

## 🔧 Utilities

### Interacciones

```tsx
<div className="hover-raise">Eleva al hover</div>
<button className="pressable">Escala al click</button>
<div className="fade-in">Aparece con fade</div>
```

### Truncate

```tsx
<p className="truncate-2">
  Texto largo que se corta en 2 líneas...
</p>

<p className="truncate-3">
  Texto largo que se corta en 3 líneas...
</p>
```

### Glass effects

```tsx
<div className="glass-light">Blur sutil</div>
<div className="glass-medium">Blur medio</div>
<div className="glass-heavy">Blur fuerte</div>
```

### Focus ring

```tsx
<button className="focus-ring">
  Botón accesible
</button>
```

---

## 📱 Mobile-First

### Safe areas (notch)

```tsx
<div className="pb-safe">
  Respeta safe area del dispositivo
</div>
```

### Full bleed en móvil

```tsx
<div className="mobile-full-bleed">
  Sin márgenes laterales en móvil
</div>
```

### Touch targets

```tsx
<button className="touch-target">
  Mínimo 44x44px
</button>
```

---

## 🎁 Componentes Específicos SB

### Module Header

```tsx
<div className="sb-module-header">
  <h1>Dashboard Ventas</h1>
</div>
```

### FAB (Floating Action Button)

```tsx
<button className="sb-fab">
  <Plus size={24} />
</button>
```

### Metric Card

```tsx
<div className="sb-metric">
  <div className="sb-metric__icon bg-primary/10">
    <TrendingUp size={20} className="text-primary" />
  </div>
  <div className="sb-metric__content">
    <div className="sb-metric__value">1,234</div>
    <div className="sb-metric__label">Ventas</div>
    <div className="sb-metric__trend text-success">+12%</div>
  </div>
</div>
```

### Timeline

```tsx
<div className="sb-timeline">
  <div className="sb-timeline-item">
    <h4>Pedido creado</h4>
    <p className="text-sm text-muted-foreground">Hace 2 horas</p>
  </div>
  <div className="sb-timeline-item">
    <h4>Pedido enviado</h4>
    <p className="text-sm text-muted-foreground">Hace 1 hora</p>
  </div>
</div>
```

### Data Grid (alternativa móvil a tablas)

```tsx
<div className="sb-data-grid">
  <div className="sb-data-grid-item">
    <div className="sb-data-grid-item__header">
      <span className="sb-data-grid-item__title">Alberto</span>
      <span className="sb-pill-primary">VIP</span>
    </div>
    <div className="sb-data-grid-item__meta">Madrid · Cliente</div>
    <div className="sb-data-grid-item__content">
      <p>alberto@ejemplo.com</p>
      <p>+34 600 123 456</p>
    </div>
  </div>
</div>
```

### Empty State

```tsx
<div className="sb-empty">
  <div className="sb-empty__icon">
    <Inbox size={64} />
  </div>
  <h3 className="sb-empty__title">No hay resultados</h3>
  <p className="sb-empty__description">
    No se encontraron contactos con los filtros aplicados
  </p>
</div>
```

### Loading States

```tsx
{/* Skeleton */}
<div className="sb-skeleton h-4 w-32" />
<div className="sb-skeleton h-8 w-full mt-2" />

{/* Spinner */}
<div className="sb-spinner w-8 h-8" />
```

---

## 🎨 Variables de Color

Las variables CSS están definidas en `:root` y son accesibles vía `hsl(var(--nombre))`:

```css
--primary: 46 100% 50%;        /* Amarillo Santa Brisa */
--primary-foreground: 30 100% 4%;
--accent: 30 100% 4%;          /* Oscuro */
--background: 0 0% 100%;       /* Blanco */
--foreground: 240 10% 4%;      /* Texto oscuro */
--secondary: 240 5% 96%;       /* Gris claro */
--muted: 240 6% 90%;
--border: 240 6% 90%;
--destructive: 0 84% 60%;      /* Rojo */
--success: 142 76% 36%;        /* Verde */
```

---

## 🔄 Drawer System

El drawer ya está implementado con comportamiento responsive automático:

- **Móvil (<768px)**: Bottom sheet que sube desde abajo
- **Desktop (≥768px)**: Panel lateral derecho

```tsx
{drawerOpen && (
  <>
    <div className="sb-drawer__overlay" onClick={onClose} />
    <aside className="sb-drawer">
      <div className="sb-drawer__header">
        <h2>Título</h2>
        <button onClick={onClose}>✕</button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Contenido scrolleable */}
      </div>
      
      <div className="sb-drawer__footer">
        <button className="sb-btn-primary">Acción</button>
      </div>
    </aside>
  </>
)}
```

---

## ✅ Best Practices

### 1. Usa clases semánticas

❌ **Evitar:**
```tsx
<div className="p-4 rounded-xl border bg-white">...</div>
```

✅ **Preferir:**
```tsx
<div className="sb-card">...</div>
```

### 2. Componentes sobre estilos inline

❌ **Evitar:**
```tsx
<div style={{ background: 'white', padding: '16px' }}>...</div>
```

✅ **Preferir:**
```tsx
<div className="sb-card__content">...</div>
```

### 3. Mobile-first thinking

```tsx
{/* Siempre piensa mobile primero */}
<div className="flex-col md:flex-row">
  {/* En móvil: columna, en desktop: fila */}
</div>
```

### 4. Accesibilidad

```tsx
<button 
  className="focus-ring"
  aria-label="Cerrar"
  onClick={onClose}
>
  ✕
</button>
```

---

## 📦 Ejemplo Completo: Página de Dashboard

```tsx
export default function DashboardPage() {
  return (
    <section className="sb-page">
      {/* Header */}
      <header className="sb-page__header">
        <h1 className="sb-page__title">Dashboard Ventas</h1>
        <p className="sb-page__subtitle">Resumen del mes actual</p>
      </header>
      
      {/* KPIs Grid */}
      <div className="sb-stats-grid">
        <div className="sb-kpi">
          <div className="sb-kpi__value">€124.5K</div>
          <div className="sb-kpi__label">Ingresos</div>
          <div className="sb-kpi__change sb-kpi__change--positive">
            +12.5%
          </div>
        </div>
        {/* Más KPIs... */}
      </div>
      
      {/* Tabla */}
      <div className="sb-card">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Últimos Pedidos</h3>
          <button className="sb-btn-ghost">Ver todos</button>
        </div>
        
        <div className="sb-table-wrapper">
          <table className="sb-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#SO-001</td>
                <td>Alberto</td>
                <td>€245</td>
                <td>
                  <span className="sb-status-active">Activo</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
```

---

## 🚀 Próximos Pasos

1. **Adoptar clases `.sb-*`** en páginas existentes
2. **Eliminar estilos inline** y duplicados
3. **Documentar componentes custom** específicos de módulos
4. **Crear Storybook** (opcional) para visualizar componentes

---

## 📚 Referencias

- Variables CSS: `src/app/globals.css` (líneas 1-30)
- Componentes base: `@layer components` (líneas 480+)
- Utilities: `@layer utilities` (líneas 680+)
- Drawer system: Líneas 60-210

---

**Última actualización:** 10/11/2025  
**Versión:** 1.0.0
</final_file_content>
