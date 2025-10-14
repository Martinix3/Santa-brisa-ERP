"use client";

import { useState } from "react";
import { 
  BrainCircuit,
  TrendingUp,
  Users,
  Factory,
  DollarSign,
  Package,
  AlertTriangle,
  Calendar,
  Target,
  Megaphone,
  Boxes,
  Truck,
  Server
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { AlertsCard } from "./shared/AlertsCard";
import DashboardOps from "./DashboardOps";
import DashboardSales from "./DashboardSales";
import DashboardAdmin from "./DashboardAdmin";
import DashboardDistributor from "./DashboardDistributor";
import DashboardTechnical from "./DashboardTechnical";

type DashboardView = "ejecutivo" | "ops" | "ventas" | "admin" | "distributor" | "technical";

export default function DashboardManager() {
  const [view, setView] = useState<DashboardView>("ejecutivo");

  // Vista ejecutiva (dashboard manager propio) - datos mock
  // Datos mock (reemplazar con server actions)
  const executiveKpis = {
    sales: { value: 284500, growth: 15.8, target: 320000 },
    production: { value: 24, growth: 8.3 },
    inventory: { value: 84320, critical: 5 },
    finance: { collected: 245200, pending: 39300 }
  };

  const departmentSummary = [
    {
      dept: 'Ventas',
      icon: TrendingUp,
      color: 'text-primary',
      metrics: [
        { label: 'Facturación', value: '€284.5K', status: 'success' },
        { label: 'Pipeline', value: '155 cuentas', status: 'success' },
        { label: 'Conversión', value: '67%', status: 'success' }
      ]
    },
    {
      dept: 'Producción',
      icon: Factory,
      color: 'text-purple-500',
      metrics: [
        { label: 'Órdenes', value: '24', status: 'success' },
        { label: 'OEE', value: '84%', status: 'success' },
        { label: 'QC Pendiente', value: '3 lotes', status: 'warning' }
      ]
    },
    {
      dept: 'Marketing',
      icon: Megaphone,
      color: 'text-pink-500',
      metrics: [
        { label: 'Eventos', value: '7 este mes', status: 'success' },
        { label: 'Campañas', value: '5 activas', status: 'success' },
        { label: 'ROI', value: '3.2x', status: 'success' }
      ]
    },
    {
      dept: 'Finanzas',
      icon: DollarSign,
      color: 'text-success',
      metrics: [
        { label: 'Cobros', value: '€245.2K', status: 'success' },
        { label: 'Pendiente', value: '€39.3K', status: 'warning' },
        { label: 'Margen', value: '42.5%', status: 'success' }
      ]
    }
  ];

  const santaBrainPriorities = [
    {
      id: '1',
      title: '🔴 Factura vencida Grupo Hostelero',
      description: '€3,200 · Vencida hace 15 días · Gestionar cobro urgente',
      priority: 'critical',
      dept: 'Finanzas'
    },
    {
      id: '2',
      title: '🟡 Stock crítico SB-LIME-01',
      description: 'Solo 12 unidades · Planificar reposición o producción',
      priority: 'high',
      dept: 'Operaciones'
    },
    {
      id: '3',
      title: '🔵 Aprobar pedido Cadena Hotelera',
      description: '€12,500 · Requiere aprobación gerencial · Margen 44%',
      priority: 'medium',
      dept: 'Ventas'
    }
  ];

  const criticalAlerts = [
    {
      id: '1',
      type: 'critical' as const,
      title: 'Factura vencida > 15 días',
      description: 'Grupo Hostelero Premium · €3,200',
      actionLabel: 'Gestionar cobro'
    },
    {
      id: '2',
      type: 'warning' as const,
      title: '3 SKUs en stock crítico',
      description: 'Requieren reposición inmediata',
      actionLabel: 'Ver inventario'
    },
    {
      id: '3',
      type: 'warning' as const,
      title: 'Lote L-BASE-422 en HOLD',
      description: 'Parámetros fuera de rango · Revisar QC',
      actionLabel: 'Abrir QC'
    },
    {
      id: '4',
      type: 'info' as const,
      title: 'Pedido grande pendiente',
      description: 'Cadena Hotelera · €12,500 · Requiere aprobación',
      actionLabel: 'Revisar'
    }
  ];

  const upcomingEvents = [
    { id: '1', title: 'Feria HORECA Madrid', date: 'Próxima semana', type: 'FERIA' },
    { id: '2', title: 'Degustación Hotel Premium', date: 'Jueves 16:00', type: 'DEMO' },
    { id: '3', title: 'Reunión inversores', date: 'Viernes 10:00', type: 'MEETING' }
  ];

  const monthlyTrend = [
    { month: 'Jul', ventas: 26700, produccion: 22, marketing: 5 },
    { month: 'Ago', ventas: 24100, produccion: 19, marketing: 4 },
    { month: 'Sep', ventas: 27800, produccion: 21, marketing: 6 },
    { month: 'Oct', ventas: 29600, produccion: 24, marketing: 7 }
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header con selector de vistas */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Ejecutivo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visión 360° · Acceso a todos los dashboards
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all">
              Exportar reporte ejecutivo
            </button>
            <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Ver análisis IA
            </button>
          </div>
        </div>
      </div>

      {/* Selector de dashboards - SIEMPRE VISIBLE */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "ejecutivo", label: "Ejecutivo", icon: BrainCircuit },
          { key: "ops", label: "Operaciones", icon: Factory },
          { key: "ventas", label: "Ventas", icon: TrendingUp },
          { key: "admin", label: "Admin", icon: Users },
          { key: "distributor", label: "Distribuidor", icon: Truck },
          { key: "technical", label: "Técnico", icon: Server }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
                view === tab.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80"
              }`}
              onClick={() => setView(tab.key as DashboardView)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Renderizado condicional según vista seleccionada */}
      {view === "ops" && <DashboardOps />}
      {view === "ventas" && <DashboardSales />}
      {view === "admin" && <DashboardAdmin />}
      {view === "distributor" && <DashboardDistributor />}
      {view === "technical" && <DashboardTechnical />}

      {/* Vista Ejecutiva - Solo se muestra cuando view="ejecutivo" */}
      {view === "ejecutivo" && (
        <>
          {/* KPIs Macro - Fila 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas (mes)"
          value={`€${(executiveKpis.sales.value / 1000).toFixed(0)}K`}
          hint={`${((executiveKpis.sales.value / executiveKpis.sales.target) * 100).toFixed(0)}% del objetivo`}
          trend="up"
          variant="dark"
          icon={<TrendingUp size={20} />}
        />
        <KpiCard
          label="Órdenes producción"
          value={executiveKpis.production.value}
          hint={`+${executiveKpis.production.growth}% vs mes anterior`}
          trend="up"
          variant="light"
          icon={<Factory size={20} />}
        />
        <KpiCard
          label="Valor inventario"
          value={`€${(executiveKpis.inventory.value / 1000).toFixed(0)}K`}
          hint={`${executiveKpis.inventory.critical} SKUs críticos`}
          trend="down"
          variant="light"
          icon={<Package size={20} />}
        />
        <KpiCard
          label="Pendiente cobro"
          value={`€${(executiveKpis.finance.pending / 1000).toFixed(0)}K`}
          hint="Revisar vencimientos"
          variant="light"
          icon={<DollarSign size={20} />}
        />
      </div>

      {/* Santa Brain: Focus del Día */}
      <div className="sb-card-glass-dark p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-primary/20 backdrop-blur-sm">
            <BrainCircuit size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Santa Brain · Focus del Día</h2>
            <p className="text-xs opacity-70">Top 3 prioridades basadas en IA</p>
          </div>
        </div>

        <div className="space-y-3">
          {santaBrainPriorities.map((priority, index) => (
            <div
              key={priority.id}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm mb-1">{priority.title}</div>
                  <div className="text-xs opacity-70 mb-2">{priority.description}</div>
                  <div className="flex items-center gap-2">
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                      {priority.dept}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid 4 columnas - Resumen por Departamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {departmentSummary.map((dept) => {
          const Icon = dept.icon;
          return (
            <div key={dept.dept} className="sb-card-glass-light p-5 hover-raise">
              <div className="flex items-center gap-2 mb-4">
                <Icon size={18} className={dept.color} />
                <h3 className="text-sm font-semibold">{dept.dept}</h3>
              </div>
              <div className="space-y-3">
                {dept.metrics.map((metric, idx) => (
                  <div key={idx}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {metric.label}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{metric.value}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        metric.status === 'success' 
                          ? 'bg-success' 
                          : metric.status === 'warning'
                          ? 'bg-warning'
                          : 'bg-destructive'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fila inferior: Gráfico + Alertas + Calendario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Tendencia general */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Tendencia trimestral"
            data={monthlyTrend}
            dataKey="ventas"
            xAxisKey="month"
            type="line"
            height={280}
            formatter={(v) => `€${v.toLocaleString()}`}
          />
        </div>

        {/* Alertas críticas */}
        <div>
          <AlertsCard alerts={criticalAlerts} variant="light" />
        </div>
      </div>

      {/* Calendario ejecutivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="sb-card-glass-light p-5 hover-raise">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} />
            <h3 className="text-sm font-semibold">Calendario ejecutivo</h3>
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      📅 {event.date}
                    </div>
                  </div>
                  <span className="sb-kpi-badge px-2 py-0.5 text-xs whitespace-nowrap">
                    {event.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats ejecutivas */}
        <div className="sb-card-glass-subtle p-5">
          <h3 className="text-sm font-semibold mb-4">Snapshot ejecutivo</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total cuentas</span>
              <span className="text-lg font-bold">155</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pedidos (mes)</span>
              <span className="text-lg font-bold">142</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lotes producidos</span>
              <span className="text-lg font-bold">24</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Eventos realizados</span>
              <span className="text-lg font-bold">7</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <span className="text-sm font-medium">Team members</span>
              <span className="text-lg font-bold">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tasa de cumplimiento</span>
              <span className="text-lg font-bold text-success">89%</span>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
