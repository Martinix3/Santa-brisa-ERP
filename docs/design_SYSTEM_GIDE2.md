# 🌴 SANTA BRISA ERP — GUÍA DE ESTILO UI/UX (v2.0)

> **Fuente única de verdad del Design System “Santa Brisa Design Language”**  
> Mobile‑first · Glassmorphism premium · Tailwind v4 tokens

---

## 0) Implementación rápida

**Archivos base (importa en este orden)**

```css
/* globals.css */
@import "/src/styles/tokens.css";
@import "/src/styles/components.css";
@import "/src/styles/stage-colors.css";
```

**Tailwind (v4)**: tokens ya publican el `@theme`. No redefinas colores ni radius en tailwind.config.

---

## 1) Tokens de diseño (CSS Variables)

### 1.1 Colores de marca (HSL)
```css
--sb-yellow: 45 90% 67%;   /* #F7D15F */
--sb-copper: 20 66% 54%;   /* #D7713E */
--sb-aqua:   181 40% 75%;  /* #A7D8D9 */
--sb-green:  181 19% 47%;  /* #618E8F */
```

### 1.2 Neutros de UI
```css
--background: 0 0% 100%;
--foreground: 240 10% 4%;
--card: 0 0% 100%;
--card-foreground: 240 10% 4%;
--secondary: 240 5% 96%;
--secondary-foreground: 240 5% 26%;
--muted: 240 4.8% 95.9%;
--muted-foreground: 240 3.8% 46.1%;
--border: 240 5.9% 90%;
--input: 240 5.9% 90%;
--ring: 240 4.9% 83.9%;
```

### 1.3 Semánticos
```css
--primary: var(--sb-yellow);
--primary-foreground: 30 100% 4%;
--accent: var(--sb-copper);
--accent-foreground: 0 0% 100%;

--success: 142 76% 36%;
--success-foreground: 0 0% 98%;
--warning: 38 92% 50%;
--warning-foreground: 0 0% 100%;
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 98%;
--info: 199 89% 48%;
--info-foreground: 0 0% 100%;
```

### 1.4 Departamentos (tokens derivados)
```css
--dept-personal:   var(--sb-yellow);
--dept-ventas:     var(--sb-copper);
--dept-marketing:  181 40% 75%;
--dept-logistica:  28 36% 44%;
--dept-produccion: var(--sb-green);
--dept-calidad:    228 35% 60%;
--dept-finanzas:   48 88% 54%;
--dept-admin:      240 2% 60%;
```

### 1.5 Tamaño, radios, motion, z-index
```css
--radius: 14px;
--radius-xl: 24px;

--motion-fast: 150ms;
--motion-base: 200ms;
--motion-slow: 350ms;
--easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
--easing-entrance: cubic-bezier(0.2, 0.7, 0.3, 1);

--z-base: 1;
--z-sticky: 10;
--z-overlay: 40;
--z-dialog: 50;
--z-toast: 60;
```

> **Tip:** Usa `hsl(var(--token))` en CSS o `bg-primary` / `text-primary` en Tailwind (mapeado en `@theme`).

---

## 2) Fundamentos UI/UX

- **Consistencia**: solo usar componentes del DS, sin clases ad‑hoc.
- **Glassmorphism premium**: headers/cards con `backdrop-blur`, gradientes sutiles y bordes “mix”.
- **Mobile‑first**: el *drawer* es el flujo por defecto en móvil; en desktop abre lateral derecho.
- **Datos tabulares → Tabla**; contenidos visuales → Grid de cards.
- **Iconografía**: `lucide-react` (16–18px).

---

## 3) Layouts y patrones de página

### 3.1 Scaffold estándar (listado + sidebar)
```tsx
<div className="p-4 md:p-6 space-y-5">
  <header className="sb-header-glass p-5">
    <h1>Título</h1>
    <p className="text-muted-foreground">Subtítulo · Contexto</p>
    <div className="mt-3 flex gap-2">
      <button className="sb-btn--primary">Acción principal</button>
      <button className="sb-btn--secondary">Secundaria</button>
    </div>
  </header>

  <nav className="sb-tabs">
    <button className="sb-tab" aria-selected="true">
      <span>Todos</span><span className="sb-kpi-badge">128</span>
    </button>
    <button className="sb-tab" aria-selected="false">
      Pendientes<span className="sb-kpi-badge">12</span>
    </button>
  </nav>

  <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <div className="lg:col-span-2 space-y-5">
      <div className="sb-card-glass-light p-5">
        {/* Tabla principal */}
      </div>
    </div>
    <aside className="space-y-5">
      {/* AlertsCard, ActivityFeed, etc. */}
    </aside>
  </section>
</div>
```

### 3.2 Tablas (estilo unificado)
```html
<div class="sb-table-wrap">
  <table class="sb-table">
    <thead>
      <tr>
        <th>Columna</th>
        <th>Otra</th>
      </tr>
    </thead>
    <tbody>
      <tr class="hover:bg-secondary/30 cursor-pointer">
        <td>Valor</td>
        <td>Detalle</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 3.3 Grid de cards (para contenidos visuales)
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <article class="sb-card-glass-light p-4 hover-raise">Card</article>
</div>
```

---

## 4) Componentes (clases utilitarias del DS)

### 4.1 Glassmorphism
```html
<div class="sb-header-glass p-5">Header</div>
<div class="sb-card-glass-light p-5 hover-raise">Card light</div>
<div class="sb-card-glass-dark p-6">Card dark</div>
```

### 4.2 Botones
```html
<button class="sb-btn--primary">Primario</button>
<button class="sb-btn--secondary">Secundario</button>
<button class="sb-btn--ghost">Ghost</button>
<button class="sb-btn--destructive">Eliminar</button>
<button class="sb-btn--icon" aria-label="Icon"></button>
```

### 4.3 Formularios
```html
<input class="sb-input" placeholder="Buscar…" />
<select class="sb-select"><option>Opción</option></select>
<textarea class="sb-textarea"></textarea>
```

### 4.4 Badges & Pills
```html
<span class="sb-badge--default">DEFAULT</span>
<span class="sb-badge--success">PAGADO</span>
<span class="sb-badge--warning">PENDIENTE</span>
<span class="sb-badge--info">EN TRÁNSITO</span>
<span class="sb-badge--destructive">CANCELADO</span>
```

### 4.5 Tabs
```html
<nav class="sb-tabs">
  <button class="sb-tab" aria-selected="true">Activos <span class="sb-kpi-badge">24</span></button>
  <button class="sb-tab" aria-selected="false">Archivados <span class="sb-kpi-badge">3</span></button>
</nav>
```

### 4.6 Drawer & Dialog
```html
<!-- Drawer: mobile bottom / desktop right -->
<aside class="sb-drawer" data-state="open">
  <div class="sb-drawer__handle"></div>
  <header class="sb-drawer__header">Título</header>
  <footer class="sb-drawer__footer">Acciones</footer>
</aside>

<!-- Overlay -->
<div class="sb-overlay" data-state="open"></div>
```

---

## 5) Colores por Departamento y Avatar

```html
<!-- Aplica el dept y hereda color -->
<span class="dept-color-tag dept-VENTAS">VENTAS</span>
<span class="dept-color-tag dept-MARKETING">MARKETING</span>
<span class="dept-color-tag dept-PRODUCCION">PRODUCCIÓN</span>
<span class="dept-color-tag dept-LOGISTICA">LOGÍSTICA</span>
<span class="dept-color-tag dept-CALIDAD">CALIDAD</span>
<span class="dept-color-tag dept-FINANZAS">FINANZAS</span>
<span class="dept-color-tag dept-ADMIN">ADMIN</span>
<span class="dept-color-tag dept-PERSONAL">PERSONAL</span>
```

> Los avatares pueden usar `.avatar-color` con la misma variable `--dept-color`.

---

## 6) Estados de cuenta (stages)

Usa fondos sutiles tokenizados (clases listas):
```html
<div class="stage-activa">Activa</div>
<div class="stage-seguimiento">Seguimiento</div>
<div class="stage-potencial">Potencial</div>
<div class="stage-fallida">Fallida</div>
<div class="stage-cerrada">Cerrada</div>
<div class="stage-baja">Baja</div>
```

---

## 7) Motion & Easing

- **Duraciones**: `--motion-fast` (tap/hover), `--motion-base` (transiciones base), `--motion-slow` (drawer/dialog).
- **Easings**: `--easing-standard` (transiciones), `--easing-entrance` (entradas).  
- **Keyframes disponibles**: `sb-fade-in/out`, `sb-pop`, `sb-slide-up/down`, `sb-slide-in/out`.

Ejemplo:
```css
.my-enter {
  animation: sb-pop var(--motion-slow) var(--easing-entrance) both;
}
```

---

## 8) Accesibilidad (A11y)

- **Contraste**: prioriza `text-foreground` sobre fondos translúcidos.
- **Focus visible**: tokens aplican `box-shadow` con `--ring` por defecto.
- **Tamaño clicable**: botones e inputs `h-10` (≥40 px).

---

## 9) Checklist de PR (UI)

- [ ] Header con `sb-header-glass` y botones estandarizados.
- [ ] Tabs con `sb-tab` + `sb-kpi-badge`.
- [ ] KPIs con **KpiCard** (no custom).
- [ ] Datos tabulares en **sb-table** (no grid).
- [ ] Grid solo para contenido visual.
- [ ] Drawer para flujos secundarios / edición rápida.
- [ ] Badges semánticos correctos.
- [ ] Hover/focus consistentes.
- [ ] No clases adhoc duplicando tokens.
- [ ] Responsive: 1 → 2/3 columnas.

---

## 10) Anti‑patrones (NO hacer)

- ❌ KPIs custom (usa `KpiCard`).
- ❌ Cards planas (`bg-white p-4` sin glass).
- ❌ Tabs sin iconos/badges.
- ❌ Grid para pedidos/facturas.
- ❌ Re-declarar colores de marca en componentes.

---

## 11) Ejemplo completo de página

```tsx
export default function PedidosPage() {
  return (
    <main className="p-4 md:p-6 space-y-5">
      <header className="sb-header-glass p-5">
        <h1>Pedidos</h1>
        <p className="text-muted-foreground">Gestión centralizada de pedidos</p>
        <div className="mt-3 flex gap-2">
          <button className="sb-btn--primary">Nuevo pedido</button>
          <button className="sb-btn--secondary">Exportar</button>
        </div>
      </header>

      <nav className="sb-tabs">
        <button className="sb-tab" aria-selected="true">Todos <span className="sb-kpi-badge">128</span></button>
        <button className="sb-tab" aria-selected="false">Pendientes <span className="sb-kpi-badge">12</span></button>
      </nav>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="sb-card-glass-light p-5">
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Cliente</th><th>Importe</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-secondary/30 cursor-pointer">
                    <td>SB-2025-123</td>
                    <td>Golf Escorpión</td>
                    <td>€2,450</td>
                    <td><span className="sb-badge--success">PAGADO</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          {/* <AlertsCard ... /> etc. */}
          <div className="sb-card-glass-light p-5">Alertas y actividad</div>
        </aside>
      </section>
    </main>
  );
}
```

---

### Mantenimiento
- Esta guía se alinea con `tokens.css`, `components.css` y `stage-colors.css`.  
- Cambios en tokens → arrastran mapeos Tailwind automáticamente.  
- Evitar redefinir estilos que ya existen en el DS.

**Última actualización:** generado automáticamente v2.0
