# 🎨 QUALITY V2 - AUDITORÍA DE REFINAMIENTO VISUAL

**Fecha:** 2025-01-21  
**Enfoque:** Elegancia, sutileza, paleta corporativa  
**Problema:** Uso excesivo de colores saturados, falta de refinamiento

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. Abuso de Colores Saturados

**Tokens actuales (demasiado fuertes):**
```css
--success: 142 76% 36%;      /* Verde muy saturado */
--warning: 38 92% 50%;       /* Naranja muy saturado */
--destructive: 0 84% 60%;    /* Rojo muy saturado */
--info: 199 89% 48%;         /* Azul muy saturado */
--accent: 20 66% 54%;        /* Copper saturado */
```

**Problema:** Estos colores se usan en KPIs grandes, textos, fondos → "colorines"

### 2. Dashboard - Colores Demasiado Fuertes

**Violaciones actuales:**
```tsx
// ❌ KPIs con colores saturados en texto grande
<p className="text-2xl font-bold text-accent">{activeProtocols}</p>
<p className="text-2xl font-bold text-warning">{pendingRuns}</p>
<p className="text-2xl font-bold text-success">{completedToday}</p>
<p className="text-2xl font-bold text-info">{complianceRate}%</p>
<p className="text-2xl font-bold text-destructive">{nonCompliant}</p>
```

**Debería ser:**
- Números grandes en `text-foreground` (neutro)
- Color SOLO en el icono pequeño
- Fondo sutil `bg-muted` no `bg-{color}/10`

### 3. APPCC - Problemas de Spacing y Layout

**Violaciones:**
```tsx
// ❌ Header sin padding consistente
<div className="sb-header-glass">
  <div className="flex items-center justify-between mb-4">

// ❌ Debería tener p-4 md:p-6 como estándar

// ❌ KPIs con clases custom
<div className="sb-card-glass-light p-3 rounded-lg">

// ❌ Tabla sin sb-table-wrap
<table className="w-full">
```

### 4. Badges - Uso Excesivo de Color

**Problema:** Cada badge con color fuerte
```tsx
<span className="sb-badge--destructive">TEMPERATURA</span>
<span className="sb-badge--info">LIMPIEZA</span>
<span className="sb-badge--warning">PRODUCCION</span>
```

**Debería:** La mayoría badges `sb-badge--default` (neutro), color SOLO para estado crítico

---

## ✅ PRINCIPIOS DE REFINAMIENTO

### Paleta Corporativa Elegante

1. **Base neutra (90% del UI):**
   - `text-foreground` - texto principal
   - `text-muted-foreground` - texto secundario
   - `bg-muted` - fondos sutiles
   - `bg-secondary` - áreas de énfasis bajo

2. **Color semántico (10% del UI):**
   - SOLO para badges de estado crítico
   - SOLO para iconos pequeños indicadores
   - NUNCA para textos grandes o KPIs

3. **Colores de marca (mínimo):**
   - `accent` (copper) - SOLO botones primarios
   - `primary` (yellow) - SOLO elementos key de brand
   
### Layout y Spacing

1. **Padding consistente:**
   - Páginas: `p-4 md:p-6`
   - Headers: incluido en `sb-header-glass` (ya tiene padding)
   - Cards: `p-5` (estándar del DS)

2. **Gaps consistentes:**
   - Entre secciones: `space-y-5`
   - Entre elementos: `gap-3` o `gap-4`
   - Grid gaps: `gap-4` o `gap-5`

---

## 🔧 PLAN DE CORRECCIÓN

### Dashboard Executive

```tsx
// ✅ CORRECTO - KPIs sutiles
<div className="sb-card-glass-light p-5">
  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-3">
    <TrendingDown className="w-5 h-5" />
  </div>
  <p className="text-sm text-muted-foreground mb-1">Tasa de rechazo</p>
  <p className="text-2xl font-bold text-foreground">2.3%</p>
  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
    <TrendingDown className="w-3 h-3 text-success" />
    -1.2% vs mes anterior
  </div>
</div>
```

### APPCC Dashboard

```tsx
// ✅ CORRECTO - Layout con spacing apropiado
<div className="p-4 md:p-6 space-y-5">
  <div className="sb-header-glass">
    {/* Ya tiene padding interno */}
  </div>
  
  {/* KPIs sutiles */}
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div className="sb-card-glass-light p-4">
      <p className="text-xs text-muted-foreground mb-1">Protocolos Activos</p>
      <p className="text-2xl font-bold text-foreground">{active}</p>
    </div>
  </div>
  
  {/* Tabla estándar */}
  <div className="sb-card-glass-light p-5">
    <div className="sb-table-wrap">
      <table className="sb-table">
        {/* ... */}
      </table>
    </div>
  </div>
</div>
```

### Badges - Refinamiento

```tsx
// ❌ ANTES - Demasiado color
<span className="sb-badge--destructive">TEMPERATURA</span>
<span className="sb-badge--info">LIMPIEZA</span>

// ✅ DESPUÉS - Mayormente neutral
<span className="sb-badge--default">
  <Thermometer className="w-3 h-3 inline mr-1" />
