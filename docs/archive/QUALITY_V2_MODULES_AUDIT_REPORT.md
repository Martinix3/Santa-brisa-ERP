# 🔍 AUDITORÍA QUALITY-V2 MODULES
## Cumplimiento SSOT_V2 + Design System v2.0

**Fecha:** 20 de Octubre 2025  
**Auditor:** Cline AI  
**Scope:** Módulos quality-v2 completos  
**Design System:** v2.0 (`docs/design_SYSTEM_GIDE2.md`)

---

## 📊 RESUMEN EJECUTIVO

### Estado General: 🔴 CRÍTICO

| Métrica | Score | Estado |
|---------|-------|--------|
| **Cumplimiento SSOT_V2** | 25% | 🔴 Crítico |
| **Cumplimiento Design System v2.0** | 18% | 🔴 Crítico |
| **Archivos auditados** | 5 | - |
| **Violaciones críticas** | 24 | 🔴 |
| **Violaciones mayores** | 15 | ⚠️ |

---

## 🚨 VIOLACIONES CRÍTICAS

### 1. QualityV2DashboardClient.tsx - Score: 15/100 🔴

#### Violaciones Design System v2.0

**❌ V1.1 - Header sin glassmorphism**
```tsx
// ACTUAL (INCORRECTO)
<div className="max-w-7xl mx-auto p-6 space-y-6">

// DEBE SER
<main className="p-4 md:p-6 space-y-5">
  <header className="sb-header-glass p-5">
    <h1>Dashboard QC</h1>
    <p className="text-muted-foreground">Subtítulo</p>
  </header>
```

**❌ V1.2 - KPI Component Custom (ANTI-PATRÓN)**
```tsx
// ACTUAL (INCORRECTO) - Componente custom
function KPI({ label, value, icon: Icon, tone }) {
  return (
    <Card className={`border ${toneClass}`}>
      <CardHeader>...</CardHeader>
    </Card>
  );
}

// DEBE SER - Usar KpiCard del DS
import { KpiCard } from '@/components/kpi-card';
<KpiCard title="Pendientes" value={pending.length} />
```

**❌ V1.3 - Tabs sin clase DS**
```tsx
// ACTUAL (INCORRECTO)
<Tabs defaultValue="pending">
  <TabsList className="mb-4">
    <TabsTrigger value="pending">Pendientes</TabsTrigger>
  </TabsList>
</Tabs>

// DEBE SER
<nav className="sb-tabs">
  <button className="sb-tab" aria-selected="true">
    <span>Pendientes</span>
    <span className="sb-kpi-badge">{pending.length}</span>
  </button>
  <button className="sb-tab" aria-selected="false">
    Aprobados<span className="sb-kpi-badge">{passed.length}</span>
  </button>
</nav>
```

**❌ V1.4 - Card sin glassmorphism**
```tsx
// ACTUAL (INCORRECTO)
<Card className="p-4">

// DEBE SER
<div className="sb-card-glass-light p-5">
```

**❌ V1.5 - Tabla custom (debe usar DS)**
```tsx
// ACTUAL (INCORRECTO)
<div className="divide-y rounded-xl border">
  {rows.map(r => (
    <div key={r.lotCode} className="flex items-center">

// DEBE SER
<div className="sb-table-wrap">
  <table className="sb-table">
    <thead>
      <tr><th>Lote</th><th>Estado</th></tr>
    </thead>
    <tbody>
      <tr className="hover:bg-secondary/30 cursor-pointer">
        <td>{r.lotCode}</td>
        <td><span className="sb-badge--success">APROBADO</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

**❌ V1.6 - Badges incorrectos**
```tsx
// ACTUAL (INCORRECTO)
<Badge variant={cfg.variant}>{cfg.label}</Badge>

// DEBE SER
<span className="sb-badge--success">APROBADO</span>
<span className="sb-badge--warning">PENDIENTE</span>
<span className="sb-badge--destructive">RECHAZADO</span>
```

#### Violaciones SSOT_V2

**❌ S1.1 - Tipos genéricos (any[])**
```tsx
// ACTUAL (INCORRECTO)
type Props = {
  lots: Array<{ lotCode: string; itemId: string; ... }>;
  plans: any[];
  parameters: any[];
  geminiAlerts: Array<{ id: string; ... }>;
};

// DEBE SER (usar tipos canónicos)
import { QualityPlan, AnalysisParameter, GeminiAnalysis } from '@/domain/ssot-v2-plus-schemas';

type Props = {
  lots: Array<Lot>;
  plans: QualityPlan[];
  parameters: AnalysisParameter[];
  geminiAlerts: GeminiAnalysis[];
};
```

**❌ S1.2 - Sin validación Zod**
```tsx
// DEBE AÑADIR
import { QualityPlanSchema } from '@/domain/ssot-v2-plus-schemas';
// Validar props en runtime
```

---

### 2. MethodsLibraryClient.tsx - Score: 20/100 🔴

#### Violaciones Design System v2.0

**❌ V2.1 - Sin header glassmorphism**
```tsx
// ACTUAL (INCORRECTO)
<div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-4">

// DEBE SER
<main className="p-4 md:p-6 space-y-5">
  <header className="sb-header-glass p-5">
    <h1>Biblioteca de Métodos</h1>
    <p className="text-muted-foreground">Gestión de métodos y parámetros</p>
  </header>
```

**❌ V2.2 - Cards sin glassmorphism**
```tsx
// ACTUAL (INCORRECTO)
<Card className="p-4 space-y-3">

// DEBE SER
<div className="sb-card-glass-light p-5 space-y-3">
```

**❌ V2.3 - Lista debe ser tabla**
```tsx
// ACTUAL (INCORRECTO)
<ul className="text-sm divide-y rounded-lg border">
  {methods.map((m:any)=>(
    <li key={m.id} className="p-2">

// DEBE SER
<div className="sb-table-wrap">
  <table className="sb-table">
    <thead>
      <tr><th>Código</th><th>Nombre</th><th>Estado</th></tr>
    </thead>
    <tbody>
      {methods.map(m => (
        <tr key={m.id} className="hover:bg-secondary/30">
          <td>{m.code}</td>
          <td>{m.name}</td>
          <td>{m.status}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**❌ V2.4 - Botones sin prefijo DS**
```tsx
// ACTUAL (INCORRECTO)
<Button onClick={...}>Añadir</Button>

// DEBE SER
<button className="sb-btn--primary" onClick={...}>Añadir</button>
```

#### Violaciones SSOT_V2

**❌ S2.1 - Llamada directa a actions**
```tsx
// ACTUAL (INCORRECTO)
await createAnalysisMethod({ name:mName, code:mName.toUpperCase() });

// DEBE SER (usar servicio canónico)
import { AnalysisLibraryService } from '@/services/canonical';
await AnalysisLibraryService.createMethod({
  name: mName,
  code: mName.toUpperCase(),
  userId: session.user.id
});
```

**❌ S2.2 - Tipos any**
```tsx
// ACTUAL (INCORRECTO)
methods = [], parameters = [] }:{ methods:any[]; parameters:any[] }

// DEBE SER
import { AnalysisMethod, AnalysisParameter } from '@/domain/ssot-v2-plus-schemas';
methods: AnalysisMethod[], parameters: AnalysisParameter[]
```

---

### 3. LotQcDrawer.tsx - Score: 60/100 ⚠️

#### Lo que está BIEN ✅
- ✅ Usa `.sb-drawer` correctamente
- ✅ Usa `.sb-drawer__header`
- ✅ Usa `.sb-drawer__footer`
- ✅ Estructura general correcta

#### Violaciones Design System v2.0

**❌ V3.1 - Tabs custom**
```tsx
// ACTUAL (INCORRECTO)
<div className="tabs-wrapper">
  <div className="flex border-b border-border mb-3">
    <button className="px-3 py-2 text-sm font-semibold">Resultados QC</button>

// DEBE SER
<nav className="sb-tabs">
  <button className="sb-tab" aria-selected="true">Resultados QC</button>
  <button className="sb-tab" aria-selected="false">Documentos</button>
</nav>
```

**❌ V3.2 - Botones sin prefijo DS**
```tsx
// ACTUAL (INCORRECTO)
<Button variant="primary" disabled={isPending}>Liberar</Button>

// DEBE SER
<button className="sb-btn--primary" disabled={isPending}>Liberar</button>
<button className="sb-btn--destructive" disabled={isPending}>Rechazar</button>
```

**❌ V3.3 - Contenido sin glassmorphism**
```tsx
// DEBE AÑADIR
<div className="sb-card-glass-light p-5">
  <QcResultsForm ... />
</div>
```

#### Violaciones SSOT_V2

**❌ S3.1 - userId hardcodeado**
```tsx
// ACTUAL (INCORRECTO)
const userId = "system"; // TODO: replace with active
