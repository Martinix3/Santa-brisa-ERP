# 🌴 Santa Brisa Design System v2.1 - Referencia Completa

> **Fuente única de verdad actualizada con components.css v2.1**  
> Tokenizado · Color-mix · Mobile-first · Glassmorphism premium

---

## 📍 Ubicación de Archivos

```
src/styles/
├── tokens.css          ← Tokens globales (NO TOCAR)
├── components.css      ← Componentes del DS (NO TOCAR)
├── stage-colors.css    ← Estados de cuenta (NO TOCAR)
└── globals.css         ← Imports principales (NO TOCAR)
```

**Orden de importación en globals.css:**
```css
@import "/src/styles/tokens.css";
@import "/src/styles/components.css";
@import "/src/styles/stage-colors.css";
```

---

## 🎨 Clases Disponibles (components.css v2.1)

### Layout & Page Structure

```html
<div class="sb-page">
  <!-- Página completa con padding y gap -->
</div>

<div class="sb-toolbar">
  <!-- Barra de herramientas con glassmorphism -->
</div>
```

### Glassmorphism (Actualizado v2.1)

```html
<!-- Header principal -->
<header class="sb-header-glass p-5">
  <h1>Título</h1>
  <p class="text-muted-foreground">Subtítulo</p>
</header>

<!-- Card light (más común) -->
<div class="sb-card-glass-light p-5 hover-raise">
  Contenido
</div>

<!-- Card dark (acentuada) -->
<div class="sb-card-glass-dark p-6">
  Contenido destacado
</div>
```

**Mejoras v2.1:**
- ✅ Sombras con `color-mix` (no más `rgba`)
- ✅ Bordes reforzados (`--sb-glass-border-mix: 0.5`)
- ✅ Contraste mejorado sin hardcodear colores

### Botones

```html
<button class="sb-btn--primary">Acción principal</button>
<button class="sb-btn--secondary">Secundaria</button>
<button class="sb-btn--ghost">Ghost</button>
<button class="sb-btn--destructive">Eliminar</button>
<button class="sb-btn--sm">Pequeño</button>
<button class="sb-btn--icon" aria-label="Icono">
  <Icon />
</button>
```

**Características:**
- Altura estándar: `h-10` (40px)
- Padding: `px-4`
- Border radius: `rounded-xl`
- Transiciones: `pressable` (scale on active)

### Formularios

```html
<!-- Input -->
<input 
  class="sb-input" 
  placeholder="Buscar…" 
  type="text"
/>

<!-- Select (con icono tokenizado) -->
<select class="sb-select">
  <option>Opción 1</option>
  <option>Opción 2</option>
</select>

<!-- Textarea -->
<textarea 
  class="sb-textarea" 
  placeholder="Notas…"
></textarea>
```

**Mejora v2.1:**
- ✅ Select usa `currentColor` en SVG (hereda de tokens)
- ✅ Backdrop blur consistente
- ✅ Focus ring tokenizado

### Badges (Semánticos)

```html
<span class="sb-badge--default">DEFAULT</span>
<span class="sb-badge--success">PAGADO</span>
<span class="sb-badge--warning">PENDIENTE</span>
<span class="sb-badge--info">EN TRÁNSITO</span>
<span class="sb-badge--destructive">CANCELADO</span>

<!-- Badge para KPIs (en tabs) -->
<span class="sb-kpi-badge">24</span>
```

### Tabs (Actualizado v2.1)

```html
<nav class="sb-tabs">
  <button class="sb-tab" aria-selected="true">
    <Icon size={16} />
    Activos
    <span class="sb-kpi-badge">24</span>
  </button>
  <button class="sb-tab" aria-selected="false">
    <Icon size={16} />
    Archivados
    <span class="sb-kpi-badge">3</span>
  </button>
</nav>
```

**IMPORTANTE:** Usa `aria-selected="true"` para tab activo. El CSS aplica estilos automáticamente.

### Tablas

```html
<div class="sb-table-wrap">
  <table class="sb-table">
    <thead>
      <tr>
        <th>Columna 1</th>
        <th>Columna 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Dato 1</td>
        <td>Dato 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Características:**
- Thead sticky con backdrop blur
- Hover en filas: `hsl(var(--secondary) / 0.4)`
- Border tokenizado
- Responsive con overflow-x-auto

### Modals (Drawer & Overlay)

```html
<!-- Overlay -->
<div class="sb-overlay" data-state="open"></div>

<!-- Drawer (mobile bottom, desktop right) -->
<aside class="sb-drawer" data-state="open">
  <div class="sb-drawer__handle"></div>
  <header class="sb-drawer__header">
    <h2>Título</h2>
  </header>
  <div class="sb-drawer__content">
    Contenido
  </div>
  <footer class="sb-drawer__footer">
    <button class="sb-btn--primary">Guardar</button>
  </footer>
</aside>
```

**Animaciones:**
- Mobile: `sb-slide-up` / `sb-slide-down`
- Desktop: `sb-slide-in` / `sb-slide-out`
- Overlay: `sb-fade-in` / `sb-fade-out`

### Departamentos & Avatares

```html
<!-- Tags de departamento -->
<span class="dept-color-tag dept-VENTAS">VENTAS</span>
<span class="dept-color-tag dept-MARKETING">MARKETING</span>
<span class="dept-color-tag dept-PRODUCCION">PRODUCCIÓN</span>
<span class="dept-color-tag dept-LOGISTICA">LOGÍSTICA</span>
<span class="dept-color-tag dept-ALMACEN">ALMACÉN</span>
<span class="dept-color-tag dept-CALIDAD">CALIDAD</span>
<span class="dept-color-tag dept-FINANZAS">FINANZAS</span>
<span class="dept-color-tag dept-ADMIN">ADMIN</span>
<span class="dept-color-tag dept-PERSONAL">PERSONAL</span>
<span class="dept-color-tag dept-OPS">OPS</span>

<!-- Avatar con color de departamento -->
<div class="avatar-color dept-VENTAS">
  MJ
</div>
```

### Estados de Cuenta (Stages)

```html
<div class="stage-activa">Activa</div>
<div class="stage-seguimiento">Seguimiento</div>
<div class="stage-potencial">Potencial</div>
<div class="stage-fallida">Fallida</div>
```

### Utilidades

```html
<!-- Hover raise effect -->
<div class="hover-raise">
  Card con efecto hover
</div>

<!-- Pressable (scale on active) -->
<button class="pressable">
  Botón con feedback táctil
</button>

<!-- Skeleton loader -->
<div class="sb-skeleton h-4 w-32"></div>
```

---

## 🆕 KPI Card Component (v2.1)

### CSS para components.css

```css
@layer components {
  /* ===== KPI CARD ===== */
  .sb-kpi {
    @apply sb-glass rounded-[16px] p-4 md:p-5 grid gap-2;
    background: linear-gradient(180deg, hsl(var(--card)/0.96), hsl(var(--card)/0.92));
    border-color: color-mix(in srgb, hsl(var(--border)) 60%, transparent);
  }
  .sb-kpi__title {
    @apply text-xs uppercase tracking-wide font-semibold text-muted-foreground;
  }
  .sb-kpi__value {
    @apply text-2xl md:text-3xl font-bold text-foreground leading-tight;
  }
  .sb-kpi__delta {
    @apply inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border;
  }
  .sb-kpi__delta--up {
    @apply border-success/20 bg-success/10 text-success;
  }
  .sb-kpi__delta--down {
    @apply border-destructive/20 bg-destructive/10 text-destructive;
  }
  .sb-kpi__delta--flat {
    @apply border-muted/40 bg-muted/20 text-muted-foreground;
  }
  .sb-kpi__foot {
    @apply text-xs text-muted-foreground;
  }

  /* Sparklines: slot opcional (usa currentColor) */
  .sb-kpi__spark {
    inline-size: 100%;
    block-size: 36px;
    color: hsl(var(--primary));
  }

  /* KPI group (auto-fit) */
  .sb-kpi-grid {
    @apply grid gap-4;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  /* Skeleton de carga */
  .sb-skeleton {
    @apply animate-pulse rounded-md bg-muted;
  }
}
```

### Componente React

```tsx
// src/components/ui/KpiCard.tsx
type DeltaDir = "up" | "down" | "flat";

function Delta({ dir, label }: { dir: DeltaDir; label: string }) {
  const cls =
    dir === "up"   ? "sb-kpi__delta sb-kpi__delta--up" :
    dir === "down" ? "sb-kpi__delta sb-kpi__delta--down" :
                     "sb-kpi__delta sb-kpi__delta--flat";
  const iconPath =
    dir === "up"   ? "M4 12l4-4 4 4" :
    dir === "down" ? "M4 8l4 4 4-4" :
                     "M4 12h8";
  return (
    <span className={cls} aria-label={label}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d={iconPath} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

export function KpiCard({
  title,
  value,
  delta,
  foot,
  sparkSvgPath,
  isLoading = false
}: {
  title: string;
  value: string | number;
  delta?: { dir: DeltaDir; label: string };
  foot?: string;
  sparkSvgPath?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <article className="sb-kpi">
        <div className="sb-kpi__title sb-skeleton h-3 w-24"></div>
        <div className="mt-2 sb-skeleton h-8 w-32"></div>
        <div className="mt-2 sb-skeleton h-4 w-20"></div>
      </article>
    );
  }

  return (
    <article className="sb-kpi">
      <div className="sb-kpi__title">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="sb-kpi__value">{value}</div>
        {delta && <Delta dir={delta.dir} label={delta.label} />}
      </div>
      {sparkSvgPath && (
        <svg viewBox="0 0 100 24" className="sb-kpi__spark" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={sparkSvgPath} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {foot && <div className="sb-kpi__foot">{foot}</div>}
    </article>
  );
}
```

### Ejemplo de Uso

```tsx
<div className="sb-kpi-grid">
  <KpiCard
    title="Pedidos pendientes"
    value={3}
    delta={{ dir: "down", label: "-2 vs. semana" }}
    foot="Últimos 7 días"
  />
  <KpiCard
    title="En tránsito"
    value={5}
    delta={{ dir: "up", label: "+1 hoy" }}
    foot="Llegada estimada"
  />
  <KpiCard
    title="Entregados (mes)"
    value={28}
    delta={{ dir: "up", label: "+12% vs. mes anterior" }}
    foot="Diciembre 2024"
    sparkSvgPath="M0 18 L20 16 L40 14 L60 12 L80 10 L100 8"
  />
  <KpiCard
    title="OTIF %"
    value="94%"
    delta={{ dir: "flat", label: "0,0% cambio" }}
    foot="On Time In Full"
  />
</div>
```

---

## 🎯 Mejoras v2.1 vs v2.0

### 1. Sombras Tokenizadas
```css
/* ❌ ANTES (v2.0) */
box-shadow: 0 8px 32px -8px rgba(0,0,0,.1);

/* ✅ AHORA (v2.1) */
box-shadow: 0 8px 32px -8px color-mix(in srgb, hsl(var(--foreground)) 12%, transparent);
```

### 2. Bordes Reforzados
```css
/* ❌ ANTES */
--sb-glass-border-mix: 0.4;

/* ✅ AHORA */
--sb-glass-border-mix: 0.5;
```

### 3. Select con currentColor
```css
/* ✅ El icono del select hereda color del token --foreground */
color: hsl(var(--foreground));
background-image: url("data:image/svg+xml,...stroke='currentColor'...");
```

### 4. Hover Raise Mejorado
```css
.hover-raise:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px color-mix(in srgb, hsl(var(--foreground)) 8%, transparent);
}
```

---

## 📋 Scaffold Completo de Página

```tsx
export default function MiPagina() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <header className="sb-header-glass p-5">
        <h1>Título de la Página</h1>
        <p className="text-muted-foreground">Descripción breve</p>
        <div className="mt-3 flex gap-2">
          <button className="sb-btn--primary">Acción Principal</button>
          <button className="sb-btn--secondary">Secundaria</button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sb-tabs">
        <button className="sb-tab" aria-selected="true">
          <Icon size={16} />
          Todos
          <span className="sb-kpi-badge">128</span>
        </button>
        <button className="sb-tab" aria-selected="false">
          <Icon size={16} />
          Pendientes
          <span className="sb-kpi-badge">12</span>
        </button>
      </nav>

      {/* KPIs */}
      <div className="sb-kpi-grid">
        <KpiCard
          title="Métrica 1"
          value="€12.450"
          delta={{ dir: "up", label: "+6,1%" }}
          foot="Últimos 30 días"
        />
        <KpiCard
          title="Métrica 2"
          value={238}
          delta={{ dir: "flat", label: "0,0%" }}
        />
      </div>

      {/* Contenido principal */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Tabla de Datos</h3>
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>SB-001</td>
                    <td>Cliente A</td>
                    <td>
                      <span className="sb-badge--success">ACTIVO</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Alertas</h3>
            {/* Contenido sidebar */}
          </div>
        </aside>
      </section>
    </div>
  );
}
```

---

## ✅ Checklist de Implementación

### Antes de hacer PR

- [ ] Header usa `sb-header-glass`
- [ ] Tabs usan `sb-tab` con `aria-selected`
- [ ] KPIs usan `KpiCard` component
- [ ] Tablas usan `sb-table-wrap` y `sb-table`
- [ ] Badges usan `sb-badge--*` semánticos
- [ ] Cards usan `sb-card-glass-light` o `sb-card-glass-dark`
- [ ] Botones usan `sb-btn--*`
- [ ] Formularios usan `sb-input`, `sb-select`, `sb-textarea`
- [ ] No hay clases custom duplicando tokens
- [ ] Responsive: 1 → 2/3 columnas en grid

### Anti-patrones a evitar

- ❌ Sombras con `rgba(0,0,0,...)` (usar `color-mix`)
- ❌ Colores hardcodeados (usar tokens)
- ❌ Tabs custom sin `aria-selected`
- ❌ KPIs custom (usar `KpiCard`)
- ❌ Grid para datos tabulares (usar `sb-table`)

---

## 🎨 Tokens de Motion

```css
--motion-fast: 150ms;    /* Hover, tap feedback */
--motion-base: 200ms;    /* Transiciones estándar */
--motion-slow: 350ms;    /* Drawer, dialog */

--easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
--easing-entrance: cubic-bezier(0.2, 0.7, 0.3, 1);
```

**Animaciones disponibles:**
- `sb-fade-in` / `sb-fade-out`
- `sb-pop`
- `sb-slide-up` / `sb-slide-down`
- `sb-slide-in` / `sb-slide-out`

---

## 📐 Z-Index Layers

```css
--z-base: 1;       /* Contenido normal */
--z-sticky: 10;    /* Headers sticky */
--z-overlay: 40;   /* Overlays de modals */
--z-dialog: 50;    /* Drawers y dialogs */
--z-toast: 60;     /* Notificaciones toast */
```

---

## 🔧 Accesibilidad

### Focus Visible
```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring));
}
```

### Tamaños Mínimos
- Botones: `h-10` (40px) ✅
- Inputs: `h-10` (40px) ✅
- Tabs: `h-10` (40px) ✅

### Contraste
- Texto sobre fondos glass: `text-foreground`
- Texto secundario: `text-muted-foreground`
- Bordes visibles: `border-border`

---

## 📚 Referencia Rápida

| Elemento | Clase Principal | Variantes |
|----------|----------------|-----------|
| Header | `sb-header-glass` | - |
| Card | `sb-card-glass-light` | `sb-card-glass-dark` |
| Botón | `sb-btn--primary` | `secondary`, `ghost`, `destructive`, `sm`, `icon` |
| Badge | `sb-badge--success` | `warning`, `info`, `destructive`, `default` |
| Tab | `sb-tab` | Usa `aria-selected` |
| Tabla | `sb-table-wrap` + `sb-table` | - |
| Input | `sb-input` | - |
| Select | `sb-select` | - |
| Textarea | `sb-textarea` | - |
| KPI | `sb-kpi` | Con `sb-kpi-grid` |

---

## 🎓 Notas Finales

1. **NO modificar** `tokens.css`, `components.css` ni `globals.css` directamente
2. **Usar solo** las clases documentadas aquí
3. **Respetar** `aria-selected` en tabs
4. **Preferir** componentes del DS sobre custom
5. **Validar** con checklist antes de PR

**Versión:** 2.1  
**Última actualización:** 21 Octubre 2025  
**Basado en:** `components.css` v2.1 con color-mix y tokens reforzados
