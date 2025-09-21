# 📊 Marketing Dashboard Brief — Santa Brisa CRM

## 🎯 Objetivo

Unificar visión **budget → spend → ROI/uplift** por canal (EVENT, ONLINE, COLLAB, POS), mostrar **qué escalar/cortar** y evidenciar **rotación extra por inversión (RVI)** a nivel local.

---

## 🔗 Bloques y cómo se construyen

### 1. KPI Cards (MTD / YTD)

*   **Fuente**:
    *   `events.spend`, `events.kpis.revenueAttributed`
    *   `onlineCampaigns.spend`, `metrics.revenue`
    *   `collabs.costs.*`, `collabs.tracking.revenue`
    *   `posTactics.actualCost`
*   **Cálculo**:
    *   Spend = Σ spend canal.
    *   Budget = `settings.budgets.marketingMonth`.
    *   Revenue = Σ revenue canal.
    *   ROI = revenue/spend.
    *   Actions = nº registros MTD/YTD.
*   **Visualización**: 6 cards → Spend MTD, Budget MTD, Revenue MTD, ROI MTD, Acciones MTD, ROI YTD.

---

### 2. Mix de inversión + Forecast

*   **Fuente**: igual que KPIs, segmentado por canal.
*   **Cálculo**:
    *   Mix = spend canal / total.
    *   Forecast = `spendMTD * (díasMes / díaActual)`.
    *   % budget = forecast / budget canal.
*   **Visualización**:
    *   Tabla canal vs Spend/Budget/ROI.
    *   Segunda tabla Forecast: Spend MTD, Proyección, % budget.

---

### 3. Top inversiones (ROI · Uplift)

*   **Fuente**: `events.kpis`, `online.metrics`, `collabs.tracking`, `posTactics.result`.
*   **Cálculo**:
    *   ROI = revenue/spend.
    *   Lift% = cuando disponible.
    *   Ranking = ordenar por ROI y revenue.
    *   Etiqueta = reglas SCALE/KEEP/TUNE/STOP.
*   **Visualización**: leaderboard con etiquetas de color.

---

### 4. Rotación vs Inversión (RVI)

*   **Fuente**:
    *   `posTactics.actualCost` + `events.spend` (con `accountId`) = inversión.
    *   `selloutWeekly.units` = ventas.
    *   `stores.segment/banner` = segmentación.
*   **Cálculo**:
    *   Baseline = media 3 meses previos.
    *   Uplift = units − baseline.
    *   Lift% = uplift / baseline.
    *   Units/€ = upliftUnits / invest€.
    *   ROI = (uplift\*margin)/invest€.
    *   Cohortes Activos vs Inactivos → RVI = Δ medianas.
*   **Visualización**:
    *   Cards: RVI, Units/€, % positivos, ROI mediano.
    *   Gráfico línea: quintiles inversión vs lift%.
    *   Tabla: por segmento.
    *   Scatter: invest€ vs lift%.

---

### 5. Próximos 30 días

*   **Fuente**:
    *   `events.startAt`, `online.startAt`, `collabs.goLiveAt`, `posTactics.status:'planned'`.
*   **Cálculo**: filtrar fechas futuras ≤30d.
*   **Visualización**: lista cronológica.

---

### 6. Tareas pendientes (14 días)

*   **Fuente**: `interactions` con `dept:'MARKETING'`, `status:'open'`.
*   **Cálculo**: filtrar `plannedFor ≤14d`.
*   **Visualización**: lista con nota, fecha, prioridad.

---

## 🧱 Servicios y contratos

*   `buildMarketingDashboardData()`
*   `buildRotationVsInvestment()`

Ambos centralizan cálculos para que el dashboard solo consuma datos normalizados.