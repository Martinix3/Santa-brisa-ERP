# 🏭 SANTA BRISA — QUALITY HUB COMPLETE PROPOSAL

**Fecha:** 20 de Octubre 2025  
**Versión:** 2.0 (Post Quality-V2 refactor)  
**Estado:** 📋 Propuesta de Implementación

---

## 🎯 Visión General

Transformar el módulo Quality en un **Quality Hub integral** que centralice:
- ✅ Control de Calidad de lotes (QC)
- 📊 Análisis de Métodos y Parámetros
- 📄 Documentos Controlados con versionado
- ✅ Protocolos de Autocontrol (APPCC/ISO22000)
- 🔍 Trazabilidad completa
- 🤖 Intelligence con Gemini

---

## 🗺️ Arquitectura Propuesta

```
/quality-v2/
├── dashboard/           ← ✅ IMPLEMENTADO (KPIs + Drawer de lote)
├── library/             ← ✅ IMPLEMENTADO (Métodos básicos)
├── plans/               ← 🚧 NUEVA (Planes QC)
├── releases/            ← 🚧 NUEVA (Liberaciones)
├── methods/             ← 🔄 AMPLIAR (Catálogo completo)
├── documents/           ← 🚧 NUEVA (Controlados v2)
├── protocols/           ← 🚧 NUEVA (Autocontrol + Compliance)
└── traceability/        ← 🚧 NUEVA (Timeline eventos)
```

---

## 📊 1. DASHBOARD — Quality Cockpit

### Estado Actual
✅ Dashboard básico implementado con:
- KPIs (Pendientes, Aprobados, Rechazados, Alertas Gemini)
- Tabla de lotes con filtros y tabs
- Drawer funcional con 6 tabs (Resultados, Protocolos, Parámetros, Trazabilidad, Documentos, Gemini)

### Mejoras Propuestas

#### KPIs Adicionales
```tsx
<QualityDashboard>
  <KpiRow>
    <KpiCard title="Rejection Rate" value="3.2%" trend="-1.1%" />
    <KpiCard title="Lotes en HOLD" value="7" icon={<AlertCircle />} />
    <KpiCard title="Tiempo medio revisión" value="21h" />
    <KpiCard title="NC abiertas" value="3" variant="warning" />
    <KpiCard title="Docs caducados" value="2" variant="destructive" />
  </KpiRow>
  
  <ChartSection>
    <LineChart title="Rejection Rate Trend" data={rejectionRateTrend} />
    <DonutChart title="NC por categoría" data={ncDistribution} />
  </ChartSection>
  
  <AutocontrolSection>
    <KpiCard title="Limpieza diaria" value="96%" variant="success" />
    <KpiCard title="Plagas" value="1 incidencia" variant="warning" />
    <KpiCard title="Aguas" value="Pendiente análisis" variant="info" />
    <KpiCard title="Formación" value="4 sin registro" variant="warning" />
  </AutocontrolSection>
  
  <GeminiPanel phase="QUALITY" autoOpen />
</QualityDashboard>
```

---

## 🧪 2. LIBRERÍA DE MÉTODOS Y PARÁMETROS

### Estado Actual
✅ Vista básica de métodos y parámetros
✅ Creación de métodos y parámetros

### Mejoras Propuestas

#### Vista Enriquecida
```tsx
<MethodsLibrary>
  <SBHeader title="Métodos de Análisis" 
    actions={
      <>
        <SBButton onClick={importFromSpec}>Importar desde SPEC</SBButton>
        <SBButton variant="primary">+ Nuevo método</SBButton>
      </>
    } 
  />
  
  <FilterBar>
    <SearchInput placeholder="Buscar por código o nombre..." />
    <Select options={['Activo', 'Retirado']} />
    <Select options={['Físico', 'Químico', 'Microbiológico']} />
  </FilterBar>
  
  <SBGrid cols={3}>
    {methods.map(method => (
      <MethodCard 
        key={method.id}
        method={method}
        onClick={() => openDrawer(method.id)}
      >
        <MethodHeader>
          <h3>{method.name}</h3>
          <Badge variant={method.status}>{method.code}</Badge>
        </MethodHeader>
        <MethodStats>
          <Stat label="Parámetros" value={method.parameterCount} />
          <Stat label="Usado en" value={method.planCount} />
          <Stat label="Última versión" value={method.version} />
        </MethodStats>
      </MethodCard>
    ))}
  </SBGrid>
  
  <MethodDrawer methodId={selectedId}>
    <Tabs>
      <Tab value="details">Detalles</Tab>
      <Tab value="parameters">Parámetros ({parameters.length})</Tab>
      <Tab value="history">Historial de versiones</Tab>
      <Tab value="usage">Uso en planes</Tab>
    </Tabs>
    <TabContent value="details">
      <MethodForm method={selected} />
    </TabContent>
    <TabContent value="parameters">
      <ParameterList methodId={selected.id} />
      <Button>+ Añadir parámetro</Button>
    </TabContent>
  </MethodDrawer>
</MethodsLibrary>
```

---

## 📘 3. PLANES QC

### Nueva Vista
```tsx
<QualityPlansClient>
  <SBHeader title="Planes de Calidad" 
    actions={<Button>+ Nuevo Plan</Button>}
  />
  
  <Table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Nombre</th>
        <th>Scope</th>
        <th>Frecuencia</th>
        <th>Parámetros</th>
        <th>Estado</th>
        <th>Última modificación</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {plans.map(plan => (
        <tr key={plan.id}>
          <td><Badge>{plan.code}</Badge></td>
          <td>{plan.name}</td>
          <td>{plan.scope}</td>
          <td>{plan.frequency}</td>
          <td>{plan.parameters.length}</td>
          <td><StatusBadge status={plan.status} /></td>
          <td>{formatDate(plan.updatedAt)}</td>
          <td>
            <Button size="sm" onClick={() => openDrawer(plan.id)}>
              Editar
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
  
  <PlanDrawer planId={selectedId}>
    <Tabs>
      <Tab value="general">General</Tab>
      <Tab value="parameters">Parámetros</Tab>
      <Tab value="history">Versiones</Tab>
      <Tab value="usage">Uso</Tab>
    </Tabs>
  </PlanDrawer>
</QualityPlansClient>
```

---

## 🎫 4. LIBERACIONES QC

### Vista Kanban
```tsx
<QualityReleasesClient view="kanban">
  <KanbanBoard>
    <KanbanColumn title="Pendiente" status="PENDING">
      {pendingReleases.map(release => (
        <ReleaseCard 
          key={release.id}
          release={release}
          onClick={() => openLotDrawer(release.lotCode)}
        />
      ))}
    </KanbanColumn>
    
    <KanbanColumn title="En revisión" status="IN_PROGRESS">
      {inProgressReleases.map(release => (
        <ReleaseCard key={release.id} release={release} />
      ))}
    </KanbanColumn>
    
    <KanbanColumn title="Aprobado" status="APPROVED">
      {approvedReleases.map(release => (
        <ReleaseCard key={release.id} release={release} />
      ))}
    </KanbanColumn>
    
    <KanbanColumn title="Rechazado" status="REJECTED">
      {rejectedReleases.map(release => (
        <ReleaseCard key={release.id} release={release} />
      ))}
    </KanbanColumn>
  </KanbanBoard>
</QualityReleasesClient>
```

---

## 📄 5. DOCUMENTOS CONTROLADOS

### Nueva Vista Documents v2
```tsx
<DocumentsManager>
  <SBHeader title="Documentos Controlados" 
    actions={<Button>+ Nuevo Documento</Button>}
  />
  
  <FilterBar>
    <Select label="Tipo" options={['SPEC', 'COA', 'SOP', 'CERTIFICATE']} />
    <Select label="Estado" options={['DRAFT', 'IN_REVIEW', 'APPROVED', 'RETIRED']} />
    <Select label="Entidad" options={['ITEM', 'LOT', 'PROTOCOL', 'METHOD']} />
    <SearchInput placeholder="Buscar..." />
  </FilterBar>
  
  <Table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Título</th>
        <th>Entidad vinculada</th>
        <th>Versión</th>
        <th>Estado</th>
        <th>Vigencia</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {documents.map(doc => (
        <DocumentRow 
          key={doc.id}
          document={doc}
          onEdit={() => openDrawer(doc.id)}
          onPreview={() => previewDocument(doc.id)}
        />
      ))}
    </tbody>
  </Table>
  
  <DocumentDrawer documentId={selectedId}>
    <Tabs>
      <Tab value="details">Detalles</Tab>
      <Tab value="versions">Historial de versiones</Tab>
      <Tab value="signatures">Firmas</Tab>
      <Tab value="linked">Entidades vinculadas</Tab>
    </Tabs>
    <TabContent value="details">
      <DocumentForm document={selected} />
      <ValiditySection>
        <DatePicker label="Vigente hasta" />
        <StatusIndicator valid={isValid} />
      </ValiditySection>
      <OCRSection>
        <PreviewPanel src={selected.url} />
        <ParsedData data={selected.ocrData} />
      </OCRSection>
    </TabContent>
  </DocumentDrawer>
</DocumentsManager>
```

---

## ✅ 6. PROTOCOLOS Y AUTOCONTROL

### 6.1 Modelo de Datos Extendido

```typescript
// Colección: productionProtocols
interface ProductionProtocol {
  id: string;
  code: string;
  name: string;
  category: 'PRODUCCION' | 'PLAGAS' | 'AGUAS' | 'LIMPIEZA' | 
            'FORMACION' | 'SEGURIDAD' | 'TEMPERATURA' | 
            'MANTENIMIENTO' | 'CALIBRACION' | 'AUDITORIA';
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 
             'ANNUAL' | 'PER_BATCH' | 'ON_DEMAND';
  requiredRole?: string[];
  
  steps: ProtocolStep[];
  
  status: 'ACTIVE' | 'RETIRED';
  version: number;
  approvedBy?: string;
  approvedAt?: Date;
  
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  sch
