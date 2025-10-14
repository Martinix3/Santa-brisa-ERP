# 🎨 Fixes de Consistencia de Estilos

## Panel Santa Brain - Alineación con Design System

### ❌ Problemas Detectados

1. **Tabs custom** - Implementación manual con clases Tailwind
2. **Cards genéricas** - `bg-card p-6 rounded-lg border`
3. **Inputs sin sistema** - `w-full px-3 py-2 border rounded-md`
4. **Colores hardcoded** - `bg-blue-50 border-blue-200`
5. **Radius inconsistente** - `rounded-md` (8px) vs design system (14px)
6. **Severity badges custom** - `bg-red-100 text-red-800`

### ✅ Soluciones Aplicadas

#### 1. Tabs del Sistema
```tsx
// ANTES
<div className="border-b">
  <nav className="flex gap-4">
    <button className={`pb-2 px-1 border-b-2 ${tab === 'config' ? 'border-primary' : 'border-transparent'}`}>
      Config
    </button>
  </nav>
</div>

// DESPUÉS
<div className="sb-tabs">
  <button className="sb-tab" aria-selected={tab === 'config'}>
    ⚙️ Configuración
  </button>
</div>
```

**Beneficios:**
- Animaciones consistentes (18ms ease)
- Focus states del sistema
- Hover states elegantes
- Atributo aria-selected semántico

#### 2. Cards con sb-card
```tsx
// ANTES
<div className="bg-card p-6 rounded-lg border">

// DESPUÉS
<div className="sb-card">
```

**Beneficios:**
- Border radius consistente (14px)
- Padding estandarizado
- Shadow system unificado
- Responsive automático (p-3 md:p-4)

#### 3. Inputs con sb-input
```tsx
// ANTES
<input className="w-full px-3 py-2 border rounded-md" />

// DESPUÉS
<input className="sb-input" />
```

**Beneficios:**
- Focus ring con tokens `--ring`
- Backdrop blur sutil
- Border con transparencia
- Transiciones suaves (all)

#### 4. Severity Badges
```tsx
// ANTES
<span className={`text-xs px-2 py-0.5 rounded ${
  rule.severity === 'CRIT' ? 'bg-red-100 text-red-800' :
  rule.severity === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
  'bg-blue-100 text-blue-800'
}`}>

// DESPUÉS
<span className={
  rule.severity === 'CRIT' ? 'sb-badge sb-badge--destructive' :
  rule.severity === 'WARN' ? 'sb-badge' :
  'sb-badge sb-badge--primary'
}>
```

**Beneficios:**
- Usa tokens de color del sistema
- `--destructive` para CRIT
- `--primary` para INFO
- Border + background consistentes

#### 5. Resultado Simulación con Tokens
```tsx
// ANTES
<div className="bg-blue-50 border border-blue-200 p-4 rounded-md">

// DESPUÉS
<div className="sb-card" style={{ 
  backgroundColor: 'hsl(var(--info) / 0.1)', 
  borderColor: 'hsl(var(--info) / 0.3)' 
}}>
```

**Beneficios:**
- Usa token `--info` (181 40% 48%)
- Consistente con paleta
- Alpha channels para sutileza

## 📊 Impacto

### Antes
- **11 clases hardcoded** con colores directos
- **Radius inconsistente**: 8px, 12px, 16px mezclados
- **Focus states**: Tailwind default (anillo azul)
- **Animaciones**: Custom por componente

### Después
- **0 colores hardcoded**
- **Radius consistente**: 14px (--radius)
- **Focus states**: Token `--ring` unificado
- **Animaciones**: Sistema centralizado en tokens.css

## 🎯 Tokens Usados

### Colores
- `--primary` (sb-yellow): Badges primarios
- `--destructive`: Severity CRIT
- `--info`: Resultado simulación
- `--ring`: Focus states
- `--border`: Bordes sutiles
- `--muted-foreground`: Texto secundario

### Motion
- `--motion-fast`: 150ms (no usado aún)
- `--motion-base`: 200ms (usado implícito)
- `--easing-standard`: cubic-bezier(0.4, 0, 0.2, 1)

### Layout
- `--radius`: 14px (global)
- `--z-dialog`: 50 (no usado en panel)

## 🔍 Componentes Auditados

- ✅ BrainPanel.tsx - **Completamente alineado**
- ⚠️ Otros panels admin - **Pendiente revisión**
- ⚠️ Drawers - **Algunos usan clases custom**
- ⚠️ Forms diversos - **Mezcla de sb-input y custom**

## 📝 Próximos Pasos

1. **Auditar ContactDrawer** - Verificar uso de sb-input
2. **Auditar AccountDrawer** - Cards y badges
3. **Crear componente Toggle** - Reemplazar switch manual
4. **Documentar sb-badge variants** - Añadir más opciones (warning, info-subtle)

## 🧪 Testing

```bash
# Verificar clases CSS usadas
grep -r "className=" src/app/(app)/admin/brain/

# Buscar colores hardcoded restantes
grep -r "bg-\(red\|blue\|yellow\|green\)-" src/app/(app)/admin/
```

## 📚 Referencias

- Design System: `docs/DESIGN_SYSTEM_GUIDE.md`
- Tokens: `src/styles/tokens.css`
- Components: `src/styles/components.css`
- Panel Brain: `docs/SANTA_BRAIN_PANEL.md`
