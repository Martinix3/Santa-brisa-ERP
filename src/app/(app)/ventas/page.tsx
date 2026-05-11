'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Suspense, useState } from "react";
import { TrendingUp, ShoppingCart, Package, Users, BarChart3, Award } from "lucide-react";
import { KpiCard } from "@/components/dashboards/shared/KpiCard";
import { ChartCard } from "@/components/dashboards/shared/ChartCard";
import { MiniCalendarCollapsible } from "@/components/widgets/MiniCalendarCollapsible";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";
import { SmartMailsWidget } from "@/components/widgets/SmartMailsWidget";
import { SBMetricCard } from "@/components/ui/SBMetricCard";
import Link from "next/link";
import { 
  getSellInData, 
  getTopClientes, 
  getVentasKPIs,
  getCRMData,
  getCalendarEvents 
} from "@/server/actions/ventas-dashboard";
import { use } from "react";

type TimeRange = 'day' | 'month' | 'year';

function VentasDashboardContent({ 
  dataPromise 
}: { 
  dataPromise: Promise<any> 
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const data = use(dataPromise);
  
  const { sellInData, clientesResult, ventasKPIs, crmData, calendarData } = data;
  
  // Sell-In (datos reales)
  const sellInKpis = sellInData.success ? sellInData.kpis : {
    totalMes: 0,
    pedidosActivos: 0,
    ticketMedio: 0,
    crecimiento: 0
  };

  // KPIs generales (datos reales)
  const kpisGenerales = ventasKPIs.success ? ventasKPIs.kpis : {
    sellInMes: 0,
    sellOutMes: 0,
    pipeline: 0,
    cuentasActivas: 0
  };

  // CRM Data (datos reales)
  const funnelData = crmData.success ? crmData.funnelData : {
    POTENCIAL: { count: 0, value: 0 },
    SEGUIMIENTO: { count: 0, value: 0 },
    ACTIVA: { count: 0, value: 0 }
  };

  // Pipeline KPIs (datos reales del CRM)
  const pipelineKpis = {
    pipelineAbierto: (funnelData?.POTENCIAL?.value || 0) + (funnelData?.SEGUIMIENTO?.value || 0),
    oportunidades: (funnelData?.POTENCIAL?.count || 0) + (funnelData?.SEGUIMIENTO?.count || 0),
    tasaConversion: (funnelData?.ACTIVA?.count || 0) > 0 
      ? Math.round(((funnelData?.ACTIVA?.count || 0) / ((funnelData?.POTENCIAL?.count || 0) + (funnelData?.SEGUIMIENTO?.count || 0) + (funnelData?.ACTIVA?.count || 0))) * 100)
      : 0,
    forecastQ1: Math.round(((funnelData?.SEGUIMIENTO?.value || 0) * 0.6) + ((funnelData?.POTENCIAL?.value || 0) * 0.3))
  };

  // Calendar events
  const eventsByDay = calendarData.success ? calendarData.eventsByDay : {};

  // Chart data - Sell-In evolution (últimos 3 meses)
  const now = new Date();
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const sellInEvolution = [
    { 
      month: monthNames[(now.getMonth() - 2 + 12) % 12], 
      value: Math.round((sellInKpis?.totalMes || 0) * 0.85) 
    },
    { 
      month: monthNames[(now.getMonth() - 1 + 12) % 12], 
      value: Math.round((sellInKpis?.totalMes || 0) * 0.92) 
    },
    { 
      month: monthNames[now.getMonth()], 
      value: sellInKpis?.totalMes || 0
    }
  ];

  // Sell-Out comparison (mock por ahora - TODO: implementar cuando haya datos)
  const sellOutComparison = [
    { name: 'Sell-In', value: sellInKpis?.totalMes || 0 },
    { name: 'Sell-Out', value: Math.round((sellInKpis?.totalMes || 0) * 0.78) }
  ];

  const mixComercial = sellInData.success ? sellInData.mixComercial : [];
  const topClientes = clientesResult.success ? clientesResult.clientes! : [];

  return (
    <>
      {/* KPIs Row 1: Sell-In con gráfico sparkline */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sell-In (A Clientes)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* KPIs - 8 columnas */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Total Mes"
              value={`€${((sellInKpis?.totalMes || 0) / 1000).toFixed(0)}K`}
              variant="light"
              icon={<ShoppingCart size={18} />}
            />
            <KpiCard
              label="Pedidos Activos"
              value={sellInKpis?.pedidosActivos || 0}
              variant="light"
              icon={<Package size={18} />}
            />
            <KpiCard
              label="Ticket Medio"
              value={`€${(sellInKpis?.ticketMedio || 0).toLocaleString()}`}
              variant="light"
            />
            <KpiCard
              label="vs Mes Anterior"
              value={`${sellInKpis?.crecimiento || 0}%`}
              variant="light"
              trend={sellInKpis?.crecimiento && sellInKpis.crecimiento > 0 ? "up" : "down"}
            />
          </div>
          
          {/* Gráfico Sparkline - 4 columnas */}
          <div className="lg:col-span-4">
            <div className="sb-card-glass-light-no-hover p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Evolución 3M</span>
                <TrendingUp size={14} className="text-[--dept-ventas]" />
              </div>
              <div className="flex items-end justify-between gap-1 h-16">
                {sellInEvolution.map((item, idx) => {
                  const maxValue = Math.max(...sellInEvolution.map(d => d.value));
                  const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-[--dept-ventas] rounded-t transition-all duration-500 hover:opacity-80"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      <span className="text-[9px] text-muted-foreground">{item.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-center mt-2 font-semibold text-[--dept-ventas]">
                €{((sellInKpis?.totalMes || 0) / 1000).toFixed(0)}K
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Row 2: Sell-Out */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sell-Out (DE Distribuidores)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total Mes"
            value={`€${((kpisGenerales?.sellOutMes || 0) / 1000).toFixed(0)}K`}
            variant="light"
            icon={<TrendingUp size={18} />}
          />
          <KpiCard
            label="Ratio SO/SI"
            value={(sellInKpis?.totalMes || 0) > 0 ? `${Math.round(((kpisGenerales?.sellOutMes || 0) / (sellInKpis?.totalMes || 1)) * 100)}%` : '0%'}
            variant="light"
          />
          <KpiCard
            label="Stock Canal"
            value="Pendiente"
            variant="light"
          />
          <KpiCard
            label="Cajas Vendidas"
            value="Pendiente"
            variant="light"
          />
        </div>
      </div>

      {/* KPIs Row 3: Pipeline & Forecast */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pipeline & Forecast</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Pipeline Abierto"
            value={`€${(pipelineKpis.pipelineAbierto / 1000).toFixed(0)}K`}
            variant="light"
            icon={<Users size={18} />}
          />
          <KpiCard
            label="Oportunidades"
            value={pipelineKpis.oportunidades}
            variant="light"
          />
          <KpiCard
            label="Tasa Conversión"
            value={`${pipelineKpis.tasaConversion}%`}
            variant="light"
          />
          <KpiCard
            label="Forecast Q1 2025"
            value={`€${(pipelineKpis.forecastQ1 / 1000).toFixed(0)}K`}
            variant="light"
            trend="up"
          />
        </div>
      </div>

      {/* Widgets Grid - Calendar, Tasks, Alerts, Smart Mails */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Organización & Asistente Inteligente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calendar Widget */}
          <MiniCalendarCollapsible 
            eventsByDay={eventsByDay}
            currentMonth={new Date()}
          />
          
          {/* Tasks Widget */}
          <TasksWidget
            items={[
              { id: '1', title: 'Seguimiento cliente ABC', dueISO: new Date(Date.now() + 86400000).toISOString(), status: 'OPEN', accountName: 'ABC Corp' },
              { id: '2', title: 'Preparar propuesta XYZ', dueISO: new Date(Date.now() + 172800000).toISOString(), status: 'OPEN', accountName: 'XYZ Ltd' },
              { id: '3', title: 'Revisar pedido pendiente', dueISO: new Date(Date.now() - 86400000).toISOString(), status: 'OPEN' },
            ]}
            show={5}
          />
          
          {/* Alerts Card */}
          <AlertsCard
            alerts={[
              { id: '1', type: 'warning', title: 'Nuevo email de cliente importante', description: 'Requiere respuesta urgente' },
              { id: '2', type: 'info', title: 'Visita programada para mañana', description: 'Cliente ABC Corp - 10:00 AM' },
              { id: '3', type: 'warning', title: 'Pedido pendiente de confirmación', actionLabel: 'Ver pedido' },
            ]}
            variant="subtle"
          />
          
          {/* Smart Mails Widget */}
          <SmartMailsWidget
            mails={[
              {
                id: '1',
                from: 'cliente@example.com',
                subject: 'Consulta sobre nuevo pedido',
                snippet: 'Hola, me gustaría hacer un pedido de...',
                priority: 'high',
                category: 'urgent',
                geminiSummary: 'Cliente solicita información sobre disponibilidad de producto X para pedido urgente.',
                timestamp: new Date(Date.now() - 3600000)
              },
              {
                id: '2',
                from: 'distribuidor@example.com',
                subject: 'Actualización de stock',
                snippet: 'Les informo que el stock actual...',
                priority: 'medium',
                category: 'info',
                timestamp: new Date(Date.now() - 7200000)
              },
            ]}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sell-In Evolution */}
        <ChartCard
          title="Evolución Sell-In (3 meses)"
          data={sellInEvolution}
          dataKey="value"
          xAxisKey="month"
          type="line"
          height={240}
        />

        {/* Sell-Out vs Sell-In */}
        <ChartCard
          title="Sell-Out vs Sell-In (mes actual)"
          data={sellOutComparison}
          dataKey="value"
          xAxisKey="name"
          type="bar"
          height={240}
        />
      </div>

      {/* Bottom Grid - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Mix Comercial con SBMetricCard */}
        <SBMetricCard
          title="Mix Comercial Sell-In"
          icon={BarChart3}
          items={(mixComercial || []).map((item: any) => ({
            label: item.name,
            value: `€${(item.value / 1000).toFixed(1)}K (${item.percentage}%)`,
          }))}
        />

        {/* Top Clientes con SBMetricCard */}
        <SBMetricCard
          title="Top 5 Clientes (mes)"
          icon={Award}
          items={topClientes.map((cliente: any, idx: number) => ({
            label: `#${idx + 1} ${cliente.name}`,
            value: `€${(cliente.value / 1000).toFixed(1)}K`,
          }))}
          footer={{
            label: "Ver todos",
            value: "→",
          }}
        />

        {/* Calendar Widget */}
        <div className="lg:col-span-1">
          <MiniCalendarCollapsible 
            eventsByDay={eventsByDay}
            currentMonth={new Date()}
          />
        </div>
      </div>

      {/* Forecast Widget */}
      <div className="mb-6 sb-card-glass-light-no-hover p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-200/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={20} className="text-blue-600" />
              <h3 className="text-sm font-semibold">Forecast Próximos 3 Meses</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dic 2024</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 bg-blue-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '70%' }} />
                  </div>
                  <span className="text-sm font-bold w-20 text-right">
                    €{Math.round(pipelineKpis.forecastQ1 * 0.35 / 1000)}K (70%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ene 2025</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 bg-blue-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '60%' }} />
                  </div>
                  <span className="text-sm font-bold w-20 text-right">
                    €{Math.round(pipelineKpis.forecastQ1 * 0.38 / 1000)}K (60%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Feb 2025</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 bg-blue-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '50%' }} />
                  </div>
                  <span className="text-sm font-bold w-20 text-right">
                    €{Math.round(pipelineKpis.forecastQ1 * 0.27 / 1000)}K (50%)
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Link
            href="/ventas/crm"
            className="sb-btn sb-btn--sm sb-btn--primary ml-4"
          >
            Ver CRM →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/ventas/sell-in" className="sb-btn sb-btn--secondary">
          <ShoppingCart size={18} />
          Ver Sell-In
        </Link>
        <Link href="/ventas/sell-out" className="sb-btn sb-btn--secondary">
          <TrendingUp size={18} />
          Ver Sell-Out
        </Link>
        <Link href="/ventas/crm" className="sb-btn sb-btn--secondary">
          <Users size={18} />
          Ver Pipeline
        </Link>
        <Link href="/warehouse/logistics" className="sb-btn sb-btn--ghost">
          <Package size={18} />
          Logistics
        </Link>
      </div>
    </>
  );
}

export default function VentasDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  
  // Fetch data
  const dataPromise = Promise.all([
    getSellInData(),
    getTopClientes(5),
    getVentasKPIs(),
    getCRMData(),
    getCalendarEvents(),
  ]).then(([sellInData, clientesResult, ventasKPIs, crmData, calendarData]) => ({
    sellInData,
    clientesResult,
    ventasKPIs,
    crmData,
    calendarData
  }));

  return (
    <div className="sb-page">
      {/* Header con glassmorphism y tabs */}
      <div className="sb-header-glass mb-8 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <TrendingUp className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <h1 className="sb-page__title">
                Dashboard de Ventas
              </h1>
              <p className="sb-page__subtitle">
                Visión general del rendimiento de ventas, sell-in, sell-out y pipeline
              </p>
            </div>
          </div>
          
          {/* Time Range Tabs */}
          <div className="sb-tabs">
            <button
              className="sb-tab"
              aria-selected={timeRange === 'day'}
              onClick={() => setTimeRange('day')}
            >
              Día
            </button>
            <button
              className="sb-tab"
              aria-selected={timeRange === 'month'}
              onClick={() => setTimeRange('month')}
            >
              Mes
            </button>
            <button
              className="sb-tab"
              aria-selected={timeRange === 'year'}
              onClick={() => setTimeRange('year')}
            >
              Año
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        }
      >
        <VentasDashboardContent dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
