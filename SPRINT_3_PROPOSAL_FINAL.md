# 🎯 SPRINT 3 - DASHBOARDS FINAL

**Objetivo:** Dashboards funcionales con datos reales y pipeline visual

**Duración:** 4-5 horas

---

## 📊 DASHBOARD VENTAS: ARQUITECTURA CON TABS

### **TAB 1: SELL-OUT** (Vista Principal - Equipo Comercial)
Lo que venden los comerciales a través de distribuidores.

**Datos:** Reportados por distribuidores o registrados por comerciales en QuickLog

### **TAB 2: SELL-IN** (Facturación Directa)
Lo que Santa Brisa factura directamente.

**Datos:** Integración con Holded (futuro) + Shopify + CRM directo

### **Relación Sell-Out ↔ Sell-In:**
```
Sell-Out (Distribuidores) ──→ Indica demanda real del mercado
                              
Sell-In (Facturación SB) ──→  Indica lo que reponemos a distribuidores

KPI Clave: Sell-Out / Sell-In Ratio = Velocidad de rotación
```

---

## 🎨 MOCKUP: Dashboard Ventas

```
┌──────────────────────────────────────────────────────────────┐
│ 💰 Dashboard Ventas                          [Nueva Cuenta]  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [ Sell-Out ] [ Sell-In ]  ← TABS                            │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Cajas YTD │ │Objetivo  │ │Cuentas   │ │Ratio     │        │
│  │(Sell-Out)│ │Anual     │ │Activas   │ │Visita→   │        │
│  │   410    │ │  1,910   │ │    57    │ │Pedido    │        │
│  │━━━━░░░░░ │ │   21%    │ │  ↗ +5    │ │   65%    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔄 PIPELINE COMERCIAL (Por Estado de Cuenta)          │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐│  │
│  │  │POTENCIAL │  │SEGUIMIENTO│  │ ACTIVA   │  │FALLIDA││  │
│  │  │          │  │           │  │          │  │       ││  │
│  │  │    15    │─→│    22     │─→│    18    │  │   2   ││  │
│  │  │ cuentas  │  │  cuentas  │  │ cuentas  │  │cuentas││  │
│  │  │          │  │           │  │          │  │       ││  │
│  │  │Sin inter │  │Con inter  │  │Con pedido│  │Cerradas│  │
│  │  │acción    │  │sin pedido │  │          │  │       ││  │
│  │  │          │  │           │  │ 410 cajas│  │       ││  │
│  │  └──────────┘  └──────────┘  └──────────┘  └───────┘│  │
│  │                                                        │  │
│  │  💡 15 cuentas necesitan primera interacción          │  │
│  │  ⚠️  8 cuentas sin contacto hace +30 días             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 👥 PERFORMANCE COMERCIALES                            │  │
│  ├─────────────┬─────────┬────────┬──────┬──────────────┤  │
│  │ Comercial   │ Objetivo│ Cajas  │ %Obj │ Pipeline     │  │
│  ├─────────────┼─────────┼────────┼──────┼──────────────┤  │
│  │ Alfon&Nico  │   240   │    4   │ 1.7% │ 2→0→2→0      │  │
│  │ ━━━░░░░░░░░ │         │  ↗ +2  │      │ P S A F      │  │
│  ├─────────────┼─────────┼────────┼──────┼──────────────┤  │
│  │ Patxi       │   120   │    4   │ 3.3% │ 2→0→2→0      │  │
│  │ ━━━░░░░░░░░ │         │  ↗ +2  │      │              │  │
│  └─────────────┴─────────┴────────┴──────┴──────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🎯 TOP 5 CUENTAS AVANZADAS (Seguimiento → Activa)   │   │
│  ├────────────────┬────────────┬─────────────────────────┤  │
│  │ Cuenta         │ Stage      │ Próximo Paso            │  │
│  ├────────────────┼────────────┼─────────────────────────┤  │
│  │ Suahila        │SEGUIMIENTO │ Cata 15 Oct con equipo  │  │
│  │ 10 cajas/mes   │  → ACTIVA  │ Cerrar pedido inicial   │  │
│  ├────────────────┼────────────┼─────────────────────────┤  │
│  │ Terrazas       │SEGUIMIENTO │ Empezar semana 41       │  │
│  │ 24 cajas/mes   │  → ACTIVA  │ 2-5 ubicaciones         │  │
│  └────────────────┴────────────┴─────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎨 MOCKUP: Dashboard Personal

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Mi Dashboard - Martin                    [+ Nueva Tarea]  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Tareas    │ │Completadas│ │Ratio     │ │Cajas YTD │        │
│  │Hoy       │ │Esta Semana│ │Cumplim.  │ │(Mis      │        │
│  │   12     │ │    45     │ │   89%    │ │ cuentas) │        │
│  │          │ │  ↗ +12%   │ │  ━━━━━   │ │    0     │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔄 MI PIPELINE PERSONAL                                │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐│  │
│  │  │POTENCIAL │  │SEGUIMIENTO│  │ ACTIVA   │  │FALLIDA││  │
│  │  │          │  │           │  │          │  │       ││  │
│  │  │     3    │─→│     5     │─→│     2    │  │   1   ││  │
│  │  │ cuentas  │  │  cuentas  │  │ cuentas  │  │cuenta ││  │
│  │  │          │  │           │  │          │  │       ││  │
│  │  │ Goya     │  │ Cova Xoroi│  │Dist.     │  │       ││  │
│  │  │ I.Cata..│  │ Eventos   │  │Gerona    │  │       ││  │
│  │  │          │  │           │  │ 0 cajas  │  │       ││  │
│  │  └──────────┘  └──────────┘  └──────────┘  └───────┘│  │
│  │                                                        │  │
│  │  💡 3 cuentas potenciales necesitan primera visita    │  │
│  │  ⚠️  2 cuentas en seguimiento sin contacto hace 20d   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️ TAREAS VENCIDAS (3)                                  ││
│  │ • Demo Cova d'en Xoroi - Vencido hace 2 días           ││
│  │ • Llamar Distribuidor Gerona - Vencido ayer            ││
│  │ • Enviar presupuesto Goya - Vencido hace 1 semana      ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES A CREAR

### 1. **PipelineVisual Component**
**Ubicación:** `src/components/sales/PipelineVisual.tsx`

```typescript
type PipelineStage = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA'

type PipelineData = {
  stage: PipelineStage
  count: number
  accounts: Account[]
  cajasTotal?: number  // Solo para ACTIVA
}

export function PipelineVisual({ 
  data, 
  onStageClick 
}: { 
  data: PipelineData[], 
  onStageClick?: (stage: PipelineStage) => void 
}) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {data.map(stage => (
        <button
          key={stage.stage}
          onClick={() => onStageClick?.(stage.stage)}
          className="pipeline-stage-card"
        >
          <div className="stage-name">{STAGE_LABELS[stage.stage]}</div>
          <div className="stage-count">{stage.count}</div>
          <div className="stage-label">cuentas</div>
          {stage.cajasTotal && (
            <div className="stage-cajas">{stage.cajasTotal} cajas</div>
          )}
        </button>
      ))}
    </div>
  )
}
```

### 2. **SalesTabLayout Component**
**Ubicación:** `src/components/sales/SalesTabLayout.tsx`

```typescript
export function SalesTabLayout() {
  const [activeTab, setActiveTab] = useState<'sellout' | 'sellin'>('sellout')
  
  return (
    <PageShell
      title="Dashboard Ventas"
      module="sales"
    >
      {/* Tab Selector */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('sellout')}
          className={activeTab === 'sellout' ? 'tab-active' : 'tab-inactive'}
        >
          Sell-Out (Comerciales)
        </button>
        <button 
          onClick={() => setActiveTab('sellin')}
          className={activeTab === 'sellin' ? 'tab-active' : 'tab-inactive'}
        >
          Sell-In (Facturación)
        </button>
      </div>
      
      {activeTab === 'sellout' ? <SellOutTab /> : <SellInTab />}
    </PageShell>
  )
}
```

### 3. **ComercialPerformanceTable Component**
**Ubicación:** `src/components/sales/ComercialPerformanceTable.tsx`

```typescript
type ComercialRow = {
  nombre: string
  objetivo: number
  cajasYTD: number
  porcentaje: number
  pipeline: {
    potencial: number
    seguimiento: number
    activa: number
    fallida: number
  }
}

export function ComercialPerformanceTable({ data }: { data: ComercialRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Comercial</th>
          <th>Objetivo</th>
          <th>Cajas YTD</th>
          <th>% Objetivo</th>
          <th>Pipeline (P→S→A→F)</th>
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.nombre}>
            <td>{row.nombre}</td>
            <td>{row.objetivo}</td>
            <td>{row.cajasYTD}</td>
            <td>
              <ProgressBar value={row.porcentaje} />
            </td>
            <td>
              <PipelineMini data={row.pipeline} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PipelineMini({ data }) {
  return (
    <span className="text-xs">
      {data.potencial}→{data.seguimiento}→{data.activa}→{data.fallida}
    </span>
  )
}
```

---

## 📋 HELPERS A CREAR

### `src/lib/pipeline-helpers.ts`

```typescript
import { Account, Interaction, OrderSellOut } from '@/domain/ssot'

export type PipelineStage = 'POTENCIAL' | 'SEGUIMIENTO' | 'ACTIVA' | 'FALLIDA'

export type PipelineData = {
  stage: PipelineStage
  count: number
  accounts: Account[]
  cajasTotal?: number
}

/**
 * Calcula el pipeline global o de un comercial específico
 */
export function calculatePipeline(
  accounts: Account[],
  interactions: Interaction[],
  orders: OrderSellOut[],
  userId?: string
): PipelineData[] {
  // Filtrar cuentas del comercial si se especifica
  let filteredAccounts = userId 
    ? accounts.filter(a => a.ownerId === userId)
    : accounts

  const stages: PipelineStage[] = ['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA']
  
  return stages.map(stage => {
    const accountsInStage = filteredAccounts.filter(a => a.stage === stage)
    
    let cajasTotal: number | undefined
    if (stage === 'ACTIVA') {
      // Calcular cajas solo para cuentas activas
      const accountIds = accountsInStage.map(a => a.id)
      cajasTotal = orders
        .filter(o => o.flow === 'PLACEMENT' && accountIds.includes(o.accountId))
        .reduce((sum, o) => sum + sumCajasOrder(o), 0)
    }
    
    return {
      stage,
      count: accountsInStage.length,
      accounts: accountsInStage,
      cajasTotal
    }
  })
}

/**
 * Detecta alertas del pipeline
 */
export function getPipelineAlerts(
  accounts: Account[],
  interactions: Interaction[]
): string[] {
  const alerts: string[] = []
  
  // Cuentas potenciales sin interacción
  const sinInteraccion = accounts.filter(a => 
    a.stage === 'POTENCIAL' && 
    !interactions.some(i => i.accountId === a.id)
  )
  if (sinInteraccion.length > 0) {
    alerts.push(`${sinInteraccion.length} cuentas necesitan primera interacción`)
  }
  
  // Cuentas sin contacto hace más de 30 días
  const sinContacto = accounts.filter(a => {
    if (a.stage === 'FALLIDA' || a.stage === 'CERRADA') return false
    const ultima = getUltimaInteraccion(a.id, interactions)
    return ultima && daysSince(ultima.createdAt) > 30
  })
  if (sinContacto.length > 0) {
    alerts.push(`${sinContacto.length} cuentas sin contacto hace +30 días`)
  }
  
  return alerts
}

/**
 * Obtiene la última interacción de una cuenta
 */
export function getUltimaInteraccion(
  accountId: string,
  interactions: Interaction[]
): Interaction | null {
  const sorted = interactions
    .filter(i => i.accountId === accountId)
    .sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  
  return sorted[0] || null
}

/**
 * Calcula días desde una fecha
 */
function daysSince(date: string): number {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Suma cajas de un pedido
 */
function sumCajasOrder(order: OrderSellOut): number {
  return order.lines.reduce((sum, line) => sum + line.qty, 0)
}
```

---

## 🔄 ORDEN DE IMPLEMENTACIÓN

### **Paso 1: Crear Helpers** (45 min)
```bash
1. src/lib/pipeline-helpers.ts (funciones de pipeline)
2. src/lib/sales-helpers.ts (cálculos ventas sell-out/sell-in)
3. Testing manual con datos reales en consola
```

### **Paso 2: Componente PipelineVisual** (30 min)
```bash
1. Crear src/components/sales/PipelineVisual.tsx
2. Estilos y responsive
3. Testing con datos mock
```

### **Paso 3: Dashboard Personal** (1h)
```bash
1. Refactorizar src/app/(app)/dashboard-personal/page.tsx
2. KpiGrid (4 cards)
3. PipelineVisual (pipeline personal del usuario)
4. Lista de tareas vencidas
5. Testing
```

### **Paso 4: Dashboard Ventas - Tab Sell-Out** (1.5h)
```bash
1. Crear src/app/(app)/sales/dashboard/page.tsx con tabs
2. KpiGrid principal
3. PipelineVisual (global)
4. ComercialPerformanceTable con pipeline mini
5. TopAccountsCard
6. Testing
```

### **Paso 5: Tab Sell-In (Placeholder)** (15 min)
```bash
1. Tab básico con mensaje "Próximamente: Integración Holded"
2. KPI card mostrando "Sell-In: Implementación pendiente"
```

---

## ✅ CRITERIOS DE ÉXITO

**Dashboard Personal:**
- [ ] 4 KPI cards funcionales
- [ ] Pipeline visual con 4 stages
- [ ] Alertas de pipeline (cuentas sin contacto)
- [ ] Lista de tareas vencidas
- [ ] Responsive mobile/tablet/desktop

**Dashboard Ventas:**
- [ ] Sistema de tabs (Sell-Out / Sell-In)
- [ ] KPIs Sell-Out correctos
- [ ] Pipeline visual global
- [ ] Tabla de comerciales con mini-pipeline
- [ ] Top 5 cuentas avanzadas
- [ ] Colores modulares aplicados

**Pipeline Component:**
- [ ] 4 stages visuales
- [ ] Contador de cuentas por stage
- [ ] Cajas totales en ACTIVA
- [ ] Clickable para drill-down (opcional)
- [ ] Alertas contextuales

---

## 📦 DEPENDENCIAS

NO necesitamos instalar nada nuevo para esta fase. Los componentes usarán:
- PageShell (ya creado)
- KpiCard (ya creado)
- EmptyState (ya creado)
- Tailwind CSS (ya instalado)

---

## 🎯 RESULTADO ESPERADO

Al finalizar Sprint 3:

1. ✅ Dashboard Personal con pipeline personal
2. ✅ Dashboard Ventas con tabs Sell-Out/Sell-In
3. ✅ Pipeline visual reutilizable
4. ✅ Sistema de alertas de pipeline
5. ✅ Base para Sell-In (futuro con Holded)

**Tiempo Total:** 4-5 horas  
**Prioridad:** Pipeline Visual (componente estrella)

---

**🚀 ¿Empezamos con los helpers?**
