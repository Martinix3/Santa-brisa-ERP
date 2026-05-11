"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Factory,
  Package,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { AlertsCard } from "./shared/AlertsCard";
import { MiniCalendarCollapsible } from "@/components/widgets/MiniCalendarCollapsible";
import { TasksWidget } from "@/components/widgets/TasksWidget";
import { SmartMailsWidget } from "@/components/widgets/SmartMailsWidget";

export default function DashboardAdmin() {
  const { data } = useData();

  if (!data) {
    return <div className="p-6">Cargando datos...</div>;
  }

  // KPIs financieros desde datos reales
  const salesTotal = data.ordersSellOut?.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0) || 0;
  
  const collectedOrders = data.ordersSellOut?.filter((o: any) => 
    o.status === 'paid' || o.status === 'closed'
  ) || [];
  const collected = collectedOrders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);
  
  const pendingPayment = data.ordersSellOut?.filter((o: any) => 
    o.status === 'shipped' || o.status === 'invoiced' || o.status === 'approved'
  ).reduce((sum, o: any) => sum + (o.totalAmount || 0), 0) || 0;

  const financialKpis = {
    salesTotal,
    salesGrowth: 15.8, // TODO: Santa Brain - Calcular crecimiento vs período anterior
    collected,
    pending: pendingPayment,
    margin: 42.5 // TODO: Santa Brain - Calcular margen (ventas - costos) / ventas
  };

  // TODO: Santa Brain - Datos mensuales históricos (últimos 12 meses)
  const yearlyData = [
    { month: 'Ene', sales: 18500, margin: 7800 },
    { month: 'Feb', sales: 22300, margin: 9400 },
    { month: 'Mar', sales: 25100, margin: 10600 },
    { month: 'Abr', sales: 23800, margin: 10000 },
    { month: 'May', sales: 28900, margin: 12200 },
    { month: 'Jun', sales: 31200, margin: 13100 },
    { month: 'Jul', sales: 26700, margin: 11200 },
    { month: 'Ago', sales: 24100, margin: 10100 },
    { month: 'Sep', sales: 27800, margin: 11700 },
    { month: 'Oct', sales: 29600, margin: 12500 }
  ];

  // Top cuentas por revenue (datos reales)
  const accountRevenue = data.accounts?.map((account: any) => {
    const accountOrders = data.ordersSellOut?.filter((o: any) => o.accountId === account.id) || [];
    const revenue = accountOrders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);
    return { 
      id: account.id,
      name: account.displayName || account.name || 'Sin nombre',
      revenue,
      growth: 15 // TODO: Santa Brain - Calcular growth real vs período anterior
    };
  }).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5) || [];

  const topAccounts = accountRevenue.length > 0 ? accountRevenue : [
    { id: '1', name: 'Sin cuentas aún', revenue: 0, growth: 0 }
  ];

  // Producción desde datos reales
  const activeLots = data.lots?.filter((l: any) => l.status === 'ACTIVE').length || 0;
  const pendingQC = data.lots?.filter((l: any) => l.qcStatus === 'PENDING' || l.qcStatus === 'FAILED').length || 0;
  const completedOrders = data.productionOrders?.filter((po: any) => po.status === 'DONE').length || 0;

  const productionSummary = {
    activeLots,
    pendingQC,
    completedOrders,
    oee: 84 // TODO: Santa Brain - Calcular OEE = Disponibilidad × Rendimiento × Calidad
  };

  // Stock crítico desde onHand (datos reales)
  const criticalStockData = data.onHand?.filter((oh: any) => oh.qty < 50)
    .sort((a: any, b: any) => a.qty - b.qty)
    .slice(0, 3)
    .map((oh: any) => {
      const sku = oh.sku || oh.itemId;
      return {
        sku,
        qty: oh.qty,
        status: oh.qty < 20 ? 'critical' as const : 'low' as const
      };
    }) || [];

  const criticalStock = criticalStockData.length > 0 ? criticalStockData : [
    { sku: 'Sin stock crítico', qty: 0, status: 'low' as const }
  ];

  // Pipeline por stage (datos reales)
  const stageGroups = data.accounts?.reduce((acc: any, account: any) => {
    const stage = account.stage || 'ACTIVA';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {}) || {};

  const accountsByStage = [
    { stage: 'POTENCIAL', count: stageGroups['POTENCIAL'] || 0 },
    { stage: 'ACTIVA', count: stageGroups['ACTIVA'] || 0 },
    { stage: 'SEGUIMIENTO', count: stageGroups['SEGUIMIENTO'] || 0 }
  ];

  const alerts = [
    // Alertas operativas
    { 
      id: '1', 
      type: 'critical' as const, 
      title: 'Factura vencida', 
      description: 'Grupo Hostelero · €3,200 · Vencida hace 15 días',
      actionLabel: 'Ver factura'
    },
    { 
      id: '2', 
      type: 'warning' as const, 
      title: 'Stock crítico', 
      description: '3 SKUs por debajo del mínimo',
      actionLabel: 'Ver inventario'
    },
    { 
      id: '3', 
      type: 'info' as const, 
      title: 'Nuevo pedido grande', 
      description: 'Cadena Hotelera · €12,500 · Requiere aprobación',
      actionLabel: 'Revisar'
    },
    // Tareas administrativas integradas
    { 
      id: 'task-1', 
      type: 'critical' as const, 
      title: 'Aprobar presupuesto Q1', 
      description: 'Vence hoy · Requiere firma',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-2', 
      type: 'warning' as const, 
      title: 'Revisar facturas pendientes', 
      description: 'Vence mañana · 3 facturas vencidas',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-3', 
      type: 'info' as const, 
      title: 'Reunión junta directiva', 
      description: 'Esta semana · Preparar informe',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ padding: '1rem' }}>
      {/* Header */}
      <div className="sb-card-glass-light p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visión global · Finanzas · Operaciones
            </p>
          </div>
          <div className="flex gap-2">
            <button className="sb-btn sb-btn--secondary sb-btn--sm">
              Exportar reporte
            </button>
            <button className="sb-btn sb-btn--primary sb-btn--sm">
              Ver análisis completo
            </button>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas totales (año)"
          value={`€${financialKpis.salesTotal.toLocaleString()}`}
          hint={`+${financialKpis.salesGrowth}% vs año anterior`}
          trend="up"
          variant="dark"
          icon={<TrendingUp size={20} />}
        />
        <KpiCard
          label="Cobrado"
          value={`€${financialKpis.collected.toLocaleString()}`}
          hint={`${((financialKpis.collected/financialKpis.salesTotal)*100).toFixed(0)}% del total`}
          variant="light"
          icon={<DollarSign size={20} />}
        />
        <KpiCard
          label="Pendiente cobro"
          value={`€${financialKpis.pending.toLocaleString()}`}
          hint="Revisar vencimientos"
          variant="light"
          icon={<AlertTriangle size={20} />}
          trend="down"
        />
        <KpiCard
          label="Margen promedio"
          value={`${financialKpis.margin}%`}
          hint="Último trimestre"
          variant="light"
          icon={<BarChart3 size={20} />}
          trend="up"
        />
      </div>

      {/* Widgets Grid - Calendar, Tasks, Alerts, Smart Mails */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Organización & Asistente Inteligente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calendar Widget */}
          <MiniCalendarCollapsible 
            eventsByDay={{}}
            currentMonth={new Date()}
          />
          
          {/* Tasks Widget */}
          <TasksWidget
            items={[
              { id: '1', title: 'Aprobar presupuesto Q1', dueISO: new Date().toISOString(), status: 'OPEN' },
              { id: '2', title: 'Revisar facturas vencidas', dueISO: new Date(Date.now() + 86400000).toISOString(), status: 'OPEN' },
              { id: '3', title: 'Reunión junta directiva', dueISO: new Date(Date.now() + 172800000).toISOString(), status: 'OPEN' },
            ]}
            show={5}
          />
          
          {/* Alerts Card */}
          <AlertsCard
            alerts={[
              { id: '1', type: 'critical', title: 'Factura vencida - Grupo Hostelero', description: '€3,200 · Vencida hace 15 días', actionLabel: 'Ver factura' },
              { id: '2', type: 'warning', title: '3 SKUs por debajo del mínimo', actionLabel: 'Ver inventario' },
              { id: '3', type: 'info', title: 'Nuevo pedido grande requiere aprobación', actionLabel: 'Revisar' },
            ]}
            variant="subtle"
          />
          
          {/* Smart Mails Widget */}
          <SmartMailsWidget
            mails={[
              {
                id: '1',
                from: 'finanzas@cliente.com',
                subject: 'Consulta sobre factura pendiente',
                snippet: 'Buenos días, necesito aclaración sobre...',
                priority: 'high',
                category: 'urgent',
                geminiSummary: 'Cliente solicita aclaración sobre factura #1234 con descuento aplicado.',
                timestamp: new Date(Date.now() - 3600000)
              },
              {
                id: '2',
                from: 'proveedor@example.com',
                subject: 'Actualización de precios',
                snippet: 'Les informamos de los nuevos precios...',
                priority: 'medium',
                category: 'info',
                timestamp: new Date(Date.now() - 7200000)
              },
            ]}
          />
        </div>
      </div>

      {/* Grid 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna 1: Finanzas */}
        <div className="space-y-5">
          {/* Gráfico anual */}
          <ChartCard
            title="Ventas y margen mensual"
            data={yearlyData.filter(d => d.sales > 0)}
            dataKey="sales"
            xAxisKey="month"
            type="area"
            height={240}
            formatter={(v: any) => `€${v.toLocaleString()}`}
          />

          {/* Top cuentas */}
          <div className="sb-card-glass-light p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} />
              <h3 className="text-sm font-semibold">Top 5 cuentas</h3>
            </div>
            <div className="space-y-2">
              {topAccounts.map((account, index: number) => (
                <div
                  key={account.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 sb-hover-subtle cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs font-semibold">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{account.name}</span>
                    </div>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                      {account.growth > 0 ? '+' : ''}{account.growth}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    €{account.revenue.toLocaleString()} este año
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna 2: Operaciones */}
        <div className="space-y-5">
          {/* Producción */}
          <div className="sb-card-glass-light p-5">
            <div className="flex items-center gap-2 mb-4">
              <Factory size={18} />
              <h3 className="text-sm font-semibold">Resumen producción</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 sb-hover-subtle">
                <div className="text-xs text-muted-foreground mb-1">Lotes activos</div>
                <div className="text-2xl font-bold">{productionSummary.activeLots}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 sb-hover-subtle">
                <div className="text-xs text-muted-foreground mb-1">Pendiente QC</div>
                <div className="text-2xl font-bold">{productionSummary.pendingQC}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 sb-hover-subtle">
                <div className="text-xs text-muted-foreground mb-1">Órdenes (mes)</div>
                <div className="text-2xl font-bold">{productionSummary.completedOrders}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 sb-hover-subtle">
                <div className="text-xs text-muted-foreground mb-1">OEE</div>
                <div className="text-2xl font-bold">{productionSummary.oee}%</div>
              </div>
            </div>
          </div>

          {/* Stock crítico */}
          <div className="sb-card-glass-light p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} />
              <h3 className="text-sm font-semibold">Stock crítico</h3>
            </div>
            <div className="space-y-2">
              {criticalStock.map((item: any) => (
                <div
                  key={item.sku}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{item.sku}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.qty} unidades restantes
                      </div>
                    </div>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                      {item.status === 'critical' ? 'Crítico' : 'Bajo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline comercial */}
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Pipeline comercial</h3>
            <div className="space-y-3">
              {accountsByStage.map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${(stage.count / 155) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Total cuentas</span>
                  <span className="font-bold">
                    {accountsByStage.reduce((sum, s) => sum + s.count, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna 3: Alertas y Actividad */}
        <div className="space-y-5">
          {/* Alertas */}
          <AlertsCard alerts={alerts} variant="light" />

          {/* Métricas del mes */}
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Métricas del mes</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nuevas cuentas</span>
                <span className="text-lg font-bold">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pedidos procesados</span>
                <span className="text-lg font-bold">142</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Visitas comerciales</span>
                <span className="text-lg font-bold">89</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lotes producidos</span>
                <span className="text-lg font-bold">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Eventos realizados</span>
                <span className="text-lg font-bold">7</span>
              </div>
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-3">Resumen financiero</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Facturación</span>
                <span className="font-semibold">€{financialKpis.salesTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Cobros</span>
                <span className="font-semibold">€{financialKpis.collected.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Pendiente</span>
                <span className="font-semibold">€{financialKpis.pending.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-medium">Tasa de cobro</span>
                <span className="font-bold">
                  {((financialKpis.collected/financialKpis.salesTotal)*100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
