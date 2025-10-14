# 📣 ARQUITECTURA MÓDULO MARKETING - Component Map Completo

## 📊 Estructura de Datos Disponible (SSOT)

```typescript
// Entidades ya definidas en SantaData
marketingEvents: MarketingEvent[]        // Eventos y activaciones
onlineCampaigns: OnlineCampaign[]       // Campañas digitales/ads
influencerCollabs: InfluencerCollab[]   // Colaboraciones
posTactics: PosTactic[]                 // Tácticas de punto de venta
posCostCatalog: PosCostCatalogEntry[]   // Catálogo de costos PLV
plv_material: PlvMaterial[]             // Materiales PLV físicos
socialMetrics: SocialMetrics[]          // Métricas redes sociales
webAnalytics: WebAnalytics[]            // Analytics web
activations: Activation[]               // Activaciones generales
```

---

## 1. 📣 `/marketing` — Dashboard Marketing

### Objetivo
Visión global de activaciones, colaboraciones y POS en curso.

### Layout Principal
```tsx
<div className="sb-page">
  <h1 className="sb-page__title flex items-center gap-2">
    <Megaphone className="h-6 w-6" />
    Dashboard Marketing
  </h1>
  
  <div className="sb-page__content">
    {/* Secciones aquí */}
  </div>
</div>
```

### A) KPIs Superiores (Grid 4 columnas)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="sb-kpi">
    <div className="sb-kpi__value">12</div>
    <div className="sb-kpi__label">🪩 EVENTOS ACTIVOS</div>
    <div className="sb-kpi__change sb-kpi__change--positive">+3 este mes</div>
  </div>
  
  <div className="sb-kpi">
    <div className="sb-kpi__value">8</div>
    <div className="sb-kpi__label">🤝 COLABORACIONES</div>
    <div className="sb-kpi__change">Abiertas</div>
  </div>
  
  <div className="sb-kpi">
    <div className="sb-kpi__value">4</div>
    <div className="sb-kpi__label">🧾 CAMPAÑAS ADS</div>
    <div className="sb-kpi__change">Activas</div>
  </div>
  
  <div className="sb-kpi">
    <div className="sb-kpi__value">156</div>
    <div className="sb-kpi__label">🏪 PLV ENTREGADO</div>
    <div className="sb-kpi__change sb-kpi__change--positive">85% completado</div>
  </div>
</div>
```

**Clases usadas:**
- `.sb-kpi` - Card de KPI con glassmorphism
- `.sb-kpi__value` - Valor grande
- `.sb-kpi__label` - Etiqueta uppercase
- `.sb-kpi__change` - Cambio con variantes `--positive` / `--negative`

### B) Calendario de Activaciones
```tsx
<div className="sb-card">
  <div className="sb-card__header">
    <h3 className="sb-card__title">📅 Calendario de Activaciones</h3>
    <button className="sb-btn sb-btn--sm sb-btn--ghost">Ver Todo</button>
  </div>
  <div className="sb-card__content">
    <Calendar 
      mode="multiple"
      selected={eventDates}
      className="rounded-lg"
      classNames={{
        day_selected: "bg-primary text-primary-foreground"
      }}
    />
  </div>
</div>
```

**Componente:** `react-day-picker` integrado  
**Clases usadas:**
- `.sb-card` - Card base
- `.sb-card__header` - Header con separador
- `.sb-card__title` - Título semibold
- `.sb-card__content` - Padding interno
- `.sb-btn--sm` - Botón small
- `.sb-btn--ghost` - Botón transparente

### C) Quick Actions (Tiles)
```tsx
<div className="sb-card">
  <div className="sb-card__header">
    <h3 className="sb-card__title">⚡ Acciones Rápidas</h3>
  </div>
  <div className="sb-card__content">
    <div className="sb-tiles">
      <button className="sb-tile" onClick={() => navigate('/marketing/events-activations/new')}>
        <CalendarPlus size={20} />
        <span className="sb-tile__label">Nueva Activación</span>
      </button>
      <button className="sb-tile" onClick={() => navigate('/marketing/collabs/new')}>
        <Handshake size={20} />
        <span className="sb-tile__label">Nuevo Colaborador</span>
      </button>
      <button className="sb-tile" onClick={() => navigate('/marketing/pos-mkt/new')}>
        <Package size={20} />
        <span className="sb-tile__label">Material POS</span>
      </button>
      <button className="sb-tile" onClick={() => navigate('/marketing/ads/new')}>
        <TrendingUp size={20} />
        <span className="sb-tile__label">Nueva Campaña</span>
      </button>
    </div>
  </div>
</div>
```

**Clases usadas:**
- `.sb-tiles` - Grid responsive 4 columnas (3 en móvil)
- `.sb-tile` - Tile individual con hover
- `.sb-tile__label` - Label pequeño

### D) Feed de Actividad Reciente
```tsx
<div className="sb-card">
  <div className="sb-card__header">
    <h3 className="sb-card__title">📌 Actividad Reciente</h3>
  </div>
  <div className="sb-card__content space-y-3">
    {recentActivity.slice(0, 5).map(item => (
      <div key={item.id} className="sb-card hover-raise p-3 cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="sb-avatar">{item.icon}</div>
          <div className="flex-1">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="sb-badge sb-badge--primary">{item.type}</span>
              <span className="text-xs text-muted-foreground">{item.date}</span>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

**Clases usadas:**
- `.hover-raise` - Efecto hover (translateY + shadow)
- `.sb-avatar` - Avatar circular
- `.sb-badge--primary` - Badge con color primario

### E) ROI Metrics
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="sb-metric">
    <TrendingUp className="text-primary" size={24} />
    <div>
      <div className="sb-metric__label">ROI Medio</div>
      <div className="text-2xl font-bold">3.2x</div>
      <div className="text-xs text-muted-foreground">+0.4 vs mes anterior</div>
    </div>
  </div>
  
  <div className="sb-metric">
    <Target className="text-success" size={24} />
    <div>
      <div className="sb-metric__label">Alcance Estimado</div>
      <div className="text-2xl font-bold">45K</div>
      <div className="text-xs text-muted-foreground">Personas</div>
    </div>
  </div>
</div>
```

**Clases usadas:**
- `.sb-metric` - Métrica con icono y datos

---

## 2. 🤝 `/marketing/collabs` — Colaboraciones e Influencers

### Objetivo
Gestión de colaboraciones (influencers, locales, marcas, prensa).

### Layout con Filtros y Tabs
```tsx
<div className="sb-page">
  <div className="flex items-center justify-between mb-4">
    <h1 className="sb-page__title">🤝 Colaboraciones</h1>
    <button className="sb-btn sb-btn--primary" onClick={() => setDrawerOpen(true)}>
      <Plus size={18} />
      Nueva Colaboración
    </button>
  </div>
  
  {/* Toolbar con filtros */}
  <div className="sb-toolbar">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} />
      <input 
        className="sb-input pl-10"
        placeholder="Buscar colaborador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
    <select className="sb-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
      <option value="">Todos los tipos</option>
      <option value="influencer">Influencer</option>
      <option value="local">Local</option>
      <option value="marca">Marca</option>
      <option value="prensa">Prensa</option>
    </select>
    <select className="sb-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
      <option value="">Todos los estados</option>
      <option value="contact">En contacto</option>
      <option value="active">Activa</option>
      <option value="finished">Finalizada</option>
    </select>
  </div>
  
  {/* Tabs por tipo */}
  <div className="sb-tabs">
    <button className="sb-tab" aria-selected={activeTab === 'all'} onClick={() => setActiveTab('all')}>
      Todos (28)
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'influencers'} onClick={() => setActiveTab('influencers')}>
      Influencers (12)
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'locals'} onClick={() => setActiveTab('locals')}>
      Locales (8)
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'brands'} onClick={() => setActiveTab('brands')}>
      Marcas (5)
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'press'} onClick={() => setActiveTab('press')}>
      Prensa (3)
    </button>
  </div>
  
  {/* Grid de cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
    {filteredCollabs.map(collab => (
      <CollabCard key={collab.id} collab={collab} onClick={() => openDrawer(collab)} />
    ))}
  </div>
</div>
```

**Clases usadas:**
- `.sb-toolbar` - Barra de herramientas con glass effect
- `.sb-input` - Input con border y backdrop blur
- `.sb-select` - Select estilizado
- `.sb-tabs` - Container de tabs
- `.sb-tab` - Tab individual con `aria-selected`

### CollabCard Component
```tsx
function CollabCard({ collab, onClick }: { collab: InfluencerCollab, onClick: () => void }) {
  return (
    <div className="sb-card hover-raise cursor-pointer" onClick={onClick}>
      <div className="sb-card__content">
        <div className="flex items-start justify-between mb-3">
          <div className="sb-avatar">
            {collab.name.slice(0, 2).toUpperCase()}
          </div>
          <span className={`sb-badge ${getStatusBadgeClass(collab.status)}`}>
            {collab.status}
          </span>
        </div>
        
        <h4 className="font-semibold mb-1">{collab.name}</h4>
        <p className="text-sm text-muted-foreground mb-3">{collab.type}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <span>{formatNumber(collab.reach)} alcance</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span>Inicio: {formatDate(collab.startDate)}</span>
          </div>
        </div>
        
        {collab.socialMedia && (
          <div className="flex gap-2 mt-3">
            {collab.socialMedia.instagram && <Instagram size={16} className="text-pink-500" />}
            {collab.socialMedia.twitter && <Twitter size={16} className="text-blue-400" />}
            {collab.socialMedia.youtube && <Youtube size={16} className="text-red-500" />}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'active': return 'sb-badge--success';
    case 'contact': return 'sb-badge--primary';
    case 'finished': return 'sb-badge';
    default: return 'sb-badge';
  }
}
```

### Drawer Detalle Colaboración
```tsx
{drawerOpen && (
  <>
    <div className="sb-drawer__overlay" onClick={() => setDrawerOpen(false)} />
    <div className="sb-drawer">
      <div className="sb-drawer__handle" />
      
      <div className="sb-drawer__header sb-header-glass">
        <h2 className="text-xl font-bold">Detalle Colaboración</h2>
        <button className="sb-btn sb-btn--icon sb-btn--ghost" onClick={() => setDrawerOpen(false)}>
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info básica */}
        <div className="sb-section">
          <h3 className="sb-section__title">INFORMACIÓN GENERAL</h3>
          <div className="space-y-3">
            <div>
              <label className="sb-label">Nombre</label>
              <input className="sb-input" value={selectedCollab?.name} />
            </div>
            <div>
              <label className="sb-label">Tipo</label>
              <select className="sb-select">
                <option>Influencer</option>
                <option>Local</option>
                <option>Marca</option>
                <option>Prensa</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Redes sociales */}
        <div className="sb-section">
          <h3 className="sb-section__title">REDES SOCIALES</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Instagram size={18} className="text-pink-500" />
              <input className="sb-input flex-1" placeholder="@usuario" />
            </div>
            <div className="flex items-center gap-2">
              <Youtube size={18} className="text-red-500" />
              <input className="sb-input flex-1" placeholder="Canal de YouTube" />
            </div>
          </div>
        </div>
        
        {/* Acuerdos */}
        <div className="sb-section">
          <h3 className="sb-section__title">ACUERDOS Y CONDICIONES</h3>
          <textarea className="sb-textarea" rows={4} placeholder="Describe el acuerdo..." />
        </div>
        
        {/* Resultados */}
        <div className="sb-section">
          <h3 className="sb-section__title">RESULTADOS</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="sb-kpi-badge p-3">
              <div className="text-xs text-muted-foreground">Alcance</div>
              <div className="text-lg font-bold">25K</div>
            </div>
            <div className="sb-kpi-badge p-3">
              <div className="text-xs text-muted-foreground">Engagement</div>
              <div className="text-lg font-bold">8.5%</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="sb-drawer__footer">
        <button className="sb-btn sb-btn--secondary" onClick={() => setDrawerOpen(false)}>
          Cancelar
        </button>
        <button className="sb-btn sb-btn--primary" onClick={handleSave}>
          Guardar Cambios
        </button>
      </div>
    </div>
  </>
)}
```

**Clases usadas:**
- `.sb-drawer__overlay` - Overlay con glassmorphism
- `.sb-drawer` - Panel lateral
- `.sb-drawer__handle` - Manija móvil
- `.sb-drawer__header` / `.sb-drawer__footer` - Header/Footer sticky
- `.sb-header-glass` - Header con glass effect
- `.sb-section` - Bloque de contenido
- `.sb-section__title` - Título de sección
- `.sb-label` - Label de formulario
- `.sb-textarea` - Textarea estilizado
- `.sb-kpi-badge` - Badge con glass para KPIs
- `.sb-btn--icon` - Botón cuadrado para iconos

---

## 3. 📊 `/marketing/ads` — Campañas Publicitarias

### Objetivo
Seguimiento de campañas de publicidad digital (Meta, Google, TikTok).

### Layout con Métricas y Tabla
```tsx
<div className="sb-page">
  <div className="flex items-center justify-between mb-4">
    <h1 className="sb-page__title">📊 Campañas Ads</h1>
    <div className="flex gap-2">
      <button className="sb-btn sb-btn--secondary">
        <Download size={18} />
        Importar Meta
      </button>
      <button className="sb-btn sb-btn--primary">
        <Plus size={18} />
        Nueva Campaña
      </button>
    </div>
  </div>
  
  {/* KPIs de campañas */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div className="sb-metric">
      <TrendingUp className="text-primary" size={24} />
      <div>
        <div className="sb-metric__label">Inversión Total</div>
        <div className="text-2xl font-bold">€3,450</div>
        <div className="text-xs text-muted-foreground">Este mes</div>
      </div>
    </div>
    
    <div className="sb-metric">
      <Target className="text-success" size={24} />
      <div>
        <div className="sb-metric__label">Conversiones</div>
        <div className="text-2xl font-bold">284</div>
        <div className="text-xs text-success">+12% vs anterior</div>
      </div>
    </div>
    
    <div className="sb-metric">
      <MousePointer className="text-blue-500" size={24} />
      <div>
        <div className="sb-metric__label">CTR Promedio</div>
        <div className="text-2xl font-bold">3.8%</div>
        <div className="text-xs text-muted-foreground">Todas las campañas</div>
      </div>
    </div>
    
    <div className="sb-metric">
      <DollarSign className="text-amber-500" size={24} />
      <div>
        <div className="sb-metric__label">ROAS</div>
        <div className="text-2xl font-bold">4.2x</div>
        <div className="text-xs text-success">+0.5x vs anterior</div>
      </div>
    </div>
  </div>
  
  {/* Gráfico Gasto vs Conversión */}
  <div className="sb-card mb-6">
    <div className="sb-card__header">
      <h3 className="sb-card__title">Rendimiento de Campañas (Últimos 30 días)</h3>
      <div className="flex gap-2">
        <button className="sb-pill sb-pill--primary">
          <Circle size={8} className="fill-current" />
          Gasto
        </button>
        <button className="sb-pill sb-pill--success">
          <Circle size={8} className="fill-current" />
          Conversiones
        </button>
      </div>
    </div>
    <div className="sb-card__content">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={campaignData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            yAxisId="left"
            label={{ value: 'Gasto (€)', angle: -90, position: 'insideLeft' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ value: 'Conversiones', angle: 90, position: 'insideRight' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="spend" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="conversions" 
            stroke="hsl(var(--success))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--success))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
  
  {/* Filtros y Tabla */}
  <div className="sb-card">
    <div className="sb-card__header">
      <h3 className="sb-card__title">Todas las Campañas</h3>
      <div className="flex gap-2">
        <button className={`sb-pill ${platform === 'all' ? 'sb-pill--primary' : ''}`} onClick={() => setPlatform('all')}>
          Todas
        </button>
        <button className={`sb-pill ${platform === 'meta' ? 'sb-pill--primary' : ''}`} onClick={() => setPlatform('meta')}>
          Meta
        </button>
        <button className={`sb-pill ${platform === 'google' ? 'sb-pill--primary' : ''}`} onClick={() => setPlatform('google')}>
          Google
        </button>
        <button className={`sb-pill ${platform === 'tiktok' ? 'sb-pill--primary' : ''}`} onClick={() => setPlatform('tiktok')}>
          TikTok
        </button>
      </div>
    </div>
    <div className="sb-table-wrap">
      <table className="sb-table">
        <thead>
          <tr>
            <th>Campaña</th>
            <th>Plataforma</th>
            <th>Presupuesto</th>
            <th>Periodo</th>
            <th>Impresiones</th>
            <th>CTR</th>
            <th>ROAS</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredCampaigns.map(campaign => (
            <tr key={campaign.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => openDrawer(campaign)}>
              <td className="font-medium">{campaign.title}</td>
              <td>
                <span className="sb-badge">{campaign.platform}</span>
              </td>
              <td className="font-semibold">€{campaign.budget.toLocaleString()}</td>
              <td className="text-sm text-muted-foreground">
                {formatDateRange(campaign.startDate, campaign.endDate)}
              </td>
              <td>{formatNumber(campaign.impressions)}</td>
              <td className="font-medium">{campaign.ctr}%</td>
              <td className={`font-semibold ${campaign.roas >= 3 ? 'text-success' : ''}`}>
                {campaign.roas}x
              </td>
              <td>
                <span className={`sb-status sb-status--${campaign.status}`}>
                  {campaign.status === 'active' ? 'Activa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                </span>
              </td>
              <td>
                <button className="sb-btn sb-btn--sm sb-btn--ghost" onClick={(e) => {
                  e.stopPropagation();
                  window.open(campaign.reportUrl, '_blank');
                }}>
                  <ExternalLink size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
```

**Clases usadas:**
- `.sb-pill` - Pill con variante `--primary` para selección
- `.sb-table-wrap` - Wrapper con scroll horizontal
- `.sb-table` - Tabla base con sticky header
- `.sb-status` - Status badge con variantes `--active`, `--error`, `--inactive`

**Componente externo:**
- `recharts` para gráficos (LineChart, ResponsiveContainer)

---

## 4. 🎉 `/marketing/events-activations` — Eventos y Activaciones

### Objetivo
Planificar y registrar eventos, degustaciones, ferias, activaciones.

### Layout con Calendario + Lista
```tsx
<div className="sb-page">
  <div className="flex items-center justify-between mb-4">
    <h1 className="sb-page__title">🎉 Eventos y Activaciones</h1>
    <button className="sb-btn sb-btn--primary">
      <Plus size={18} />
      Nuevo Evento
    </button>
  </div>
  
  {/* Vista switcher + Filtros */}
  <div className="sb-toolbar">
    <div className="flex gap-2">
      <button 
        className={`sb-btn sb-btn--sm ${viewMode === 'calendar' ? 'sb-btn--secondary' : 'sb-btn--ghost'}`}
        onClick={() => setViewMode('calendar')}
      >
        <Calendar size={16} />
        Calendario
      </button>
      <button 
        className={`sb-btn sb-btn--sm ${viewMode === 'list' ? 'sb-btn--secondary' : 'sb-btn--ghost'}`}
        onClick={() => setViewMode('list')}
      >
        <List size={16} />
        Lista
      </button>
    </div>
    
    <div className="flex gap-2 flex-1 justify-end">
      <select className="sb-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
        <option value="">Todos los tipos</option>
        <option value="tasting">Degustación</option>
        <option value="fair">Feria</option>
        <option value="presentation">Presentación</option>
        <option value="activation">Activación</option>
      </select>
      <select className="sb-select" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
        <option value="">Todas las zonas</option>
        <option value="madrid">Madrid</option>
        <option value="barcelona">Barcelona</option>
        <option value="valencia">Valencia</option>
      </select>
    </div>
  </div>
  
  {/* Grid: Calendario + Lista lateral */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Calendario */}
    <div className="lg:col-span-2">
      <div className="sb-card">
        <div className="sb-card__content">
          <Calendar 
            mode="multiple"
            selected={eventDates}
            onSelect={setEventDates}
            onDayClick={(day) => setSelectedDate(day)}
            className="rounded-lg w-full"
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary",
              day_today: "bg-accent text-accent-foreground"
            }}
            components={{
              Day: ({ date, displayMonth }) => {
                const eventsForDay = getEventsForDate(date);
                return (
                  <div className="relative">
                    {eventsForDay.length > 0 && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
                    )}
                    {date.getDate()}
                  </div>
                );
              }
            }}
          />
        </div>
      </div>
    </div>
    
    {/* Lista de eventos del día seleccionado */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {selectedDate ? formatDate(selectedDate) : 'Selecciona un día'}
        </h3>
        <span className="sb-badge sb-badge--primary">
          {eventsForSelectedDay.length} eventos
        </span>
      </div>
      
      {eventsForSelectedDay.length === 0 ? (
        <div className="sb-empty">
          <CalendarOff size={48} className="sb-empty__icon" />
          <p className="sb-empty__title">Sin eventos</p>
          <p className="sb-empty__description">
            No hay eventos programados para esta fecha
          </p>
        </div>
      ) : (
        eventsForSelectedDay.map(event => (
          <div key={event.id} className="sb-card hover-raise cursor-pointer" onClick={() => openDrawer(event)}>
            <div className="sb-card__content">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{event.title}</h4>
                <span className={`sb-badge ${getEventTypeBadge(event.type)}`}>
                  {event.type}
                </span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{event.location}</span>
                </div>
                {event.account && (
                  <div className="flex items-center gap-2">
                    <Building size={14} />
                    <span>{event.account}</span>
                  </div>
                )}
              </div>
              
              {event.status && (
                <div className="mt-3">
                  <span className={`sb-status sb-status--${event.status}`}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
  
  {/* Vista Lista (alternativa) */}
  {viewMode === 'list' && (
    <div className="sb-card mt-6">
      <div className="sb-card__header">
        <h3 className="sb-card__title">Todos los Eventos</h3>
      </div>
      <div className="sb-table-wrap">
        <table className="sb-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Ubicación</th>
              <th>Cuenta</th>
              <th>Asistencia</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allEvents.map(event => (
              <tr key={event.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => openDrawer(event)}>
                <td className="font-medium">{event.title}</td>
                <td>
                  <span className={`sb-badge ${getEventTypeBadge(event.type)}`}>
                    {event.type}
                  </span>
                </td>
                <td>{formatDateTime(event.date)}</td>
                <td className="text-sm">{event.location}</td>
                <td className="text-sm">{event.account || '-'}</td>
                <td>{event.attendance || '-'}</td>
                <td>
                  <span className={`sb-status sb-status--${event.status}`}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </td>
                <td>
                  <button className="sb-btn sb-btn--sm sb-btn--ghost">
                    <MoreVertical size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}
</div>
```

**Clases usadas:**
- `.sb-empty` - Estado vacío
- `.sb-empty__icon` - Icono grande
- `.sb-empty__title` - Título del empty state
- `.sb-empty__description` - Descripción

### Drawer Detalle Evento
```tsx
{drawerOpen && (
  <>
    <div className="sb-drawer__overlay" onClick={() => setDrawerOpen(false)} />
    <div className="sb-drawer">
      <div className="sb-drawer__handle" />
      
      <div className="sb-drawer__header sb-header-glass">
        <h2 className="text-xl font-bold">Detalle Evento</h2>
        <button className="sb-btn sb-btn--icon sb-btn--ghost" onClick={() => setDrawerOpen(false)}>
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Información del evento */}
        <div className="sb-section">
          <h3 className="sb-section__title">INFORMACIÓN DEL EVENTO</h3>
          <div className="space-y-3">
            <div>
              <label className="sb-label">Nombre del Evento</label>
              <input className="sb-input" value={selectedEvent?.title} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="sb-label">Fecha</label>
                <input className="sb-input" type="date" />
              </div>
              <div>
                <label className="sb-label">Hora</label>
                <input className="sb-input" type="time" />
              </div>
            </div>
            <div>
              <label className="sb-label">Ubicación</label>
              <input className="sb-input" placeholder="Dirección o lugar..." />
            </div>
            <div>
              <label className="sb-label">Tipo de Evento</label>
              <select className="sb-select">
                <option>Degustación</option>
                <option>Feria</option>
                <option>Presentación</option>
                <option>Activación</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Materiales PLV */}
        <div className="sb-section">
          <h3 className="sb-section__title">MATERIALES PLV</h3>
          <div className="space-y-2">
            {plvMaterials.map(material => (
              <div key={material.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <input type="checkbox" checked={material.checked} className="w-4 h-4" />
                <Package size={16} className="text-muted-foreground" />
                <span className="flex-1">{material.name}</span>
                <span className="text-sm text-muted-foreground">{material.quantity}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Resultados post-evento */}
        <div className="sb-section">
          <h3 className="sb-section__title">RESULTADOS</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sb-label">Asistencia</label>
              <input className="sb-input" type="number" placeholder="Nº personas" />
            </div>
            <div>
              <label className="sb-label">Ventas</label>
              <input className="sb-input" type="number" placeholder="€" />
            </div>
          </div>
          <div className="mt-3">
            <label className="sb-label">Leads Captados</label>
            <input className="sb-input" type="number" placeholder="Nº leads" />
          </div>
        </div>
        
        {/* Notas */}
        <div className="sb-section">
          <h3 className="sb-section__title">NOTAS</h3>
          <textarea className="sb-textarea" rows={4} placeholder="Notas y observaciones..." />
        </div>
        
        {/* Fotos */}
        <div className="sb-section">
          <h3 className="sb-section__title">FOTOS</h3>
          <div className="grid grid-cols-3 gap-2">
            {selectedEvent?.photos?.map((photo, i) => (
              <img 
                key={i} 
                src={photo} 
                alt={`Foto ${i+1}`}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
            <button className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:bg-secondary">
              <Plus size={24} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="sb-drawer__footer">
        <button className="sb-btn sb-btn--secondary">Cancelar</button>
        <button className="sb-btn sb-btn--primary">Guardar</button>
      </div>
    </div>
  </>
)}
```

---

## 5. 🪟 `/marketing/pos-mkt` — Punto de Venta (PLV)

### Objetivo
Gestión de materiales PLV y tácticas de punto de venta.

### Layout con Tabs y Tabla
```tsx
<div className="sb-page">
  <div className="flex items-center justify-between mb-4">
    <h1 className="sb-page__title">🪟 Punto de Venta (PLV)</h1>
    <div className="flex gap-2">
      <button className="sb-btn sb-btn--secondary">
        <Eye size={18} />
        Ver Catálogo
      </button>
      <button className="sb-btn sb-btn--primary">
        <Plus size={18} />
        Nuevo Material
      </button>
    </div>
  </div>
  
  {/* Tabs por tipo de material */}
  <div className="sb-tabs">
    <button className="sb-tab" aria-selected={activeTab === 'all'} onClick={() => setActiveTab('all')}>
      Todos
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'physical'} onClick={() => setActiveTab('physical')}>
      PLV Físico
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'signage'} onClick={() => setActiveTab('signage')}>
      Cartelería
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'menus'} onClick={() => setActiveTab('menus')}>
      Menús
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'kits'} onClick={() => setActiveTab('kits')}>
      Kits Activación
    </button>
    <button className="sb-tab" aria-selected={activeTab === 'merch'} onClick={() => setActiveTab('merch')}>
      Merchandising
    </button>
  </div>
  
  {/* Toolbar con filtros */}
  <div className="sb-toolbar mt-4">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} />
      <input 
        className="sb-input pl-10"
        placeholder="Buscar material..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
    <select className="sb-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
      <option value="">Todos los estados</option>
      <option value="requested">Solicitado</option>
      <option value="delivered">Entregado</option>
      <option value="installed">Instalado</option>
      <option value="retired">Retirado</option>
    </select>
    <select className="sb-select" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
      <option value="">Todas las cuentas</option>
      {accounts.map(acc => (
        <option key={acc.id} value={acc.id}>{acc.name}</option>
      ))}
    </select>
  </div>
  
  {/* Tabla de materiales */}
  <div className="sb-card mt-6">
    <div className="sb-card__header">
      <h3 className="sb-card__title">Materiales PLV</h3>
      <div className="flex gap-2">
        <span className="sb-badge">
          {filteredMaterials.length} materiales
        </span>
      </div>
    </div>
    <div className="sb-table-wrap">
      <table className="sb-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Estado</th>
            <th>Cuenta</th>
            <th>Fecha</th>
            <th>Ubicación</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredMaterials.map(material => (
            <tr key={material.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => openDrawer(material)}>
              <td>
                <div className="flex items-center gap-3">
                  {material.photo ? (
                    <img 
                      src={material.photo} 
                      alt={material.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{material.name}</p>
                    <p className="text-xs text-muted-foreground">{material.sku}</p>
                  </div>
                </div>
              </td>
              <td>
                <span className="sb-badge">{material.type}</span>
              </td>
              <td className="font-medium">{material.quantity}</td>
              <td>
                <span className={`sb-status sb-status--${getStatusVariant(material.status)}`}>
                  {material.status}
                </span>
              </td>
              <td className="text-sm">{material.accountName || '-'}</td>
              <td className="text-sm text-muted-foreground">
                {formatDate(material.date)}
              </td>
              <td className="text-sm">{material.location || '-'}</td>
              <td>
                <button className="sb-btn sb-btn--sm sb-btn--ghost">
                  <MoreVertical size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  
  {/* Catálogo visual (cuando se activa) */}
  {showCatalog && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {catalog.map(item => (
        <div key={item.id} className="sb-card hover-raise cursor-pointer">
          <div className="sb-card__content">
            {item.image && (
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full aspect-square object-cover rounded-lg mb-3"
              />
            )}
            <h4 className="font-semibold mb-1">{item.name}</h4>
            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.code}</span>
              <span className="sb-badge sb-badge--primary">
                {item.availableStock} disponibles
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

### Drawer Detalle Material PLV
```tsx
{drawerOpen && (
  <>
    <div className="sb-drawer__overlay" onClick={() => setDrawerOpen(false)} />
    <div className="sb-drawer">
      <div className="sb-drawer__handle
