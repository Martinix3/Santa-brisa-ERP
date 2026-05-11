# 🏭 QUALITY-V2 — ESTRUCTURA FINAL DEFINITIVA

**Fecha:** 21 de Octubre 2025  
**Versión:** Final (Post-refactor + HTML mockups)  
**Estado:** 📋 Especificación para Implementación

---

## 🎯 Arquitectura Final

```
/quality-v2/
├── dashboard/          ← Dashboard Ejecutivo (KPIs + Overview + Alertas Gemini)
├── lots/               ← Gestión de Lotes QC
├── appcc/              ← Puntos de Control APPCC/HACCP
├── library/            ← Librería Documental
└── specifications/     ← Especificaciones de Calidad (Protocolos + Parámetros)
```

---

## 📊 1. DASHBOARD EJECUTIVO

**URL:** `/quality-v2/dashboard`  
**Propósito:** Vista ejecutiva con métricas, tendencias y estado global

### Componentes

```tsx
<QualityDashboardExecutive>
  {/* KPIs Principales */}
  <KpiSection>
    <KpiCard title="Rejection Rate" value="3.2%" trend={-1.1} />
    <KpiCard title="Lotes en HOLD" value="7" trend={+2} />
    <KpiCard title="Tiempo medio QC" value="21h" />
    <KpiCard title="NC Abiertas" value="3" />
  </KpiSection>

  {/* Charts */}
  <ChartsSection>
    <LineChart title="Rejection Rate - 6 meses" data={trend} />
    <DonutChart title="NC por tipo" data={distribution} />
  </ChartsSection>

  {/* Lotes Destacados */}
  <LotsSection>
    <LotTable rows={pendingLots} limit={5} />
    <Button href="/quality-v2/lots">Ver todos los lotes →</Button>
  </LotsSection>

  {/* Alertas Gemini */}
  <GeminiAlertsSection>
    <GeminiAlert severity="warning">
      Rejection rate aumentó 15% esta semana
    </GeminiAlert>
    <GeminiAlert severity="info">
      3 lotes próximos a vencer en HOLD
    </GeminiAlert>
  </GeminiAlertsSection>

  {/* Quick Actions */}
  <QuickActions>
    <ActionButton href="/quality-v2/lots">Revisar Lotes (12)</ActionButton>
    <ActionButton href="/quality-v2/appcc">APPCC del día (3)</ActionButton>
  </QuickActions>
</QualityDashboardExecutive>
```

---

## 📦 2. LOTES (Control de Calidad)

**URL:** `/quality-v2/lots`  
**Propósito:** Gestión operativa de lotes, revisión QC

### Vista Principal

```tsx
<QualityLotsClient>
  <Header title="Control de Lotes" />
  
  {/* Filtros */}
  <FilterBar>
    <SearchInput />
    <Select label="Tipo" options={['MP', 'FG', 'Semielaborado']} />
    <DateRangePicker />
  </FilterBar>

  {/* Tabs por Estado */}
  <Tabs>
    <Tab value="pending">Pendientes <Badge>12</Badge></Tab>
    <Tab value="approved">Aprobados <Badge>45</Badge></Tab>
    <Tab value="rejected">Rechazados <Badge>2</Badge></Tab>
  </Tabs>

  {/* Tabla de Lotes */}
  <LotTable>
    <Column header="Lote" />
    <Column header="Producto" />
    <Column header="Fecha" />
    <Column header="Estado QC" />
    <Column header="Responsable" />
    <Column header="Acción" action={openDrawer} />
  </LotTable>
</QualityLotsClient>
```

### Drawer de Lote (3 tabs)

```tsx
<LotQcDrawer lotCode={selected}>
  <Tabs>
    <Tab value="results">Resultados QC</Tab>
    <Tab value="traceability">Trazabilidad</Tab>
    <Tab value="docs">Documentación</Tab>
  </Tabs>

  {/* Tab 1: Resultados QC */}
  <TabContent value="results">
    <QcResultsForm 
      parameters={parameters}
      plans={plans}
      onChange={setResults}
    />
    <Footer>
      <Button variant="success">Liberar</Button>
      <Button variant="destructive">Rechazar</Button>
      <Button variant="secondary">Condicional</Button>
    </Footer>
  </TabContent>

  {/* Tab 2: Trazabilidad */}
  <TabContent value="traceability">
    <TraceabilityTimeline>
      <Section title="🔼 Origen (Upstream)">
        <TraceEvent>Proveedor → Recepción → Lote</TraceEvent>
      </Section>
      <Section title="📍 Estado actual">
        <TraceEvent>Lote en Quality Control</TraceEvent>
      </Section>
      <Section title="🔽 Destino (Downstream)">
        <TraceEvent>Producción → Pedidos → Clientes</TraceEvent>
      </Section>
    </TraceabilityTimeline>
  </TabContent>

  {/* Tab 3: Documentación */}
  <TabContent value="docs">
    <DocumentList lotCode={selected} />
    <Button>+ Subir documento</Button>
  </TabContent>
</LotQcDrawer>
```

---

## ✅ 3. APPCC / HACCP (Puntos de Control)

**URL:** `/quality-v2/appcc`  
**Propósito:** Gestión de Puntos de Control Críticos  
**UI:** Igual que Lotes (tabla + drawer)

### Vista Principal

```tsx
<AppccControlPoints>
  <Header title="Protocolos APPCC / HACCP">
    <Button variant="primary">+ Nuevo Punto de Control</Button>
  </Header>

  {/* Tabs por Estado */}
  <Tabs>
    <Tab value="pending">Pendientes de Revisión <Badge>2</Badge></Tab>
    <Tab value="compliant">Conformes <Badge>18</Badge></Tab>
    <Tab value="deviation">Con Desviaciones <Badge>1</Badge></Tab>
    <Tab value="all">Todos <Badge>21</Badge></Tab>
  </Tabs>

  {/* Tabla de Puntos de Control */}
  <ControlPointsTable>
    <Column header="Nombre del Punto" />
    <Column header="Frecuencia" />
    <Column header="Responsable(s)" />
    <Column header="Última Interacción" />
    <Column header="Registros" icon={<FileText />} />
  </ControlPointsTable>
</AppccControlPoints>
```

### Drawer de Punto de Control (3 tabs)

```tsx
<ControlPointDrawer pointId={selected}>
  <Tabs>
    <Tab value="register">Registro de Datos</Tab>
    <Tab value="history">Historial de Registros</Tab>
    <Tab value="docs">Documentación</Tab>
  </Tabs>

  {/* Tab 1: Registro de Datos */}
  <TabContent value="register">
    <ControlCheckForm>
      {/* PCC 1 */}
      <CheckPoint 
        title="PCC-1: Control Tª Pasteurización"
        status="COMPLETED"
        criticalLimit="72-75°C durante 15 seg"
      >
        <Input label="Valor Registrado" value="73.5°C" disabled />
        <Input label="Verificado por" value="Ana García" disabled />
      </CheckPoint>

      {/* PCC 2 - PENDIENTE */}
      <CheckPoint 
        title="PCC-2: Control pH Post-Mezcla"
        status="PENDING"
        criticalLimit="pH 2.8 - 3.2"
        variant="warning"
      >
        <Input 
          label="Registrar Valor (pH)" 
          type="number" 
          step="0.01" 
          placeholder="ej. 2.95" 
        />
        <Input label="Responsable" value="Carlos Ruiz" />
        <Textarea label="Observaciones" placeholder="Anotar desviación..." />
      </CheckPoint>

      {/* PCC 3 - BLOQUEADO */}
      <CheckPoint 
        title="PCC-3: Control Cuerpos Extraños"
        status="BLOCKED"
        criticalLimit="Filtro 0.5 micras íntegro"
        disabled
      >
        <Message>Pendiente hasta completar PCC-2</Message>
      </CheckPoint>
    </ControlCheckForm>

    <Footer>
      <Button variant="primary">Guardar Registro</Button>
      <Button variant="destructive">Marcar Desviación</Button>
    </Footer>
  </TabContent>

  {/* Tab 2: Historial */}
  <TabContent value="history">
    <RegistryTimeline>
      {history.map(entry => (
        <TimelineEntry 
          date={entry.date}
          user={entry.user}
          status={entry.status}
          values={entry.values}
        />
      ))}
    </RegistryTimeline>
  </TabContent>

  {/* Tab 3: Documentación */}
  <TabContent value="docs">
    <DocumentList controlPointId={selected} />
    <Button>+ Adjuntar evidencia</Button>
  </TabContent>
</ControlPointDrawer>
```

### Datos del Punto de Control

```typescript
interface ControlPoint {
  id: string;
  code: string; // "PCC-001"
  name: string; // "Control de Temperatura Pasteurización"
  category: 'PRODUCCION' | 'LIMPIEZA' | 'PLAGAS' | 'AGUAS' | 'FORMACION';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PER_BATCH';
  responsibles: string[]; // userIds
  
  checks: Array<{
    id: string;
    title: string; // "PCC-1: Temperatura"
    criticalLimit: string; // "72-75°C"
    isCritical: boolean;
    required: boolean;
    order: number;
  }>;
  
  lastInteraction?: Date;
  lastStatus?: 'COMPLIANT' | 'DEVIATION' | 'PENDING';
  
  createdAt: Date;
  updatedAt: Date;
}

interface ControlPointRegistry {
  id: string;
  controlPointId: string;
  registeredAt: Date;
  registeredBy: string;
  
  checks: Array<{
    checkId: string;
    value: string | number;
    status: 'OK' | 'FAIL' | 'NA';
    observations?: string;
  }>;
  
  overallStatus: 'COMPLIANT' | 'DEVIATION';
  deviationReason?: string;
  correctiveAction?: string;
}
```

---

## 📚 4. LIBRERÍA DOCUMENTAL

**URL:** `/quality-v2/library`  
**
