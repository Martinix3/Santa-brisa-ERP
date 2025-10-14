"use client";

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

export default function DashboardAdmin() {
  const { currentUser } = useData();

  // Datos mock (reemplazar con server actions)
  const financialKpis = {
    salesTotal: 284500,
    salesGrowth: 15.8,
    collected: 245200,
    pending: 39300,
    margin: 42.5
  };

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
    { month: 'Oct', sales: 29600, margin: 12500 },
    { month: 'Nov', sales: 26500, margin: 11100 },
    { month: 'Dic', sales: 0, margin: 0 }
  ];

  const topAccounts = [
    { id: '1', name: 'Grupo Hostelero Premium', revenue: 45200, growth: 23 },
    { id: '2', name: 'Distribuidora Central', revenue: 38900, growth: 18 },
    { id: '3', name: 'Cadena Hotelera Costa', revenue: 32100, growth: -5 },
    { id: '4', name: 'Restaurantes del Sur', revenue: 28700, growth: 31 },
    { id: '5', name: 'Gourmet Selection', revenue: 24500, growth: 12 }
  ];

  const productionSummary = {
    activeLots: 8,
    pendingQC: 3,
    completedOrders: 24,
    oee: 84
  };

  const criticalStock = [
    { sku: 'SB-LIME-01', qty: 12, status: 'critical' },
    { sku: 'SB-BOT-750', qty: 45, status: 'low' },
    { sku: 'SB-TAJIN-OT', qty: 28, status: 'low' }
  ];

  const accountsByStage = [
    { stage: 'POTENCIAL', count: 45 },
    { stage: 'ACTIVA', count: 87 },
    { stage: 'SEGUIMIENTO', count: 23 }
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
      title: '📋 Aprobar presupuesto Q1', 
      description: 'Vence hoy · Requiere firma',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-2', 
      type: 'warning' as const, 
      title: '📋 Revisar facturas pendientes', 
      description: 'Vence mañana · 3 facturas vencidas',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-3', 
      type: 'info' as const, 
      title: '📋 Reunión junta directiva', 
      description: 'Esta semana · Preparar informe',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visión global · Finanzas · Operaciones
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all">
              Exportar reporte
            </button>
            <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
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
            formatter={(v) => `€${v.toLocaleString()}`}
          />

          {/* Top cuentas */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} />
              <h3 className="text-sm font-semibold">Top 5 cuentas</h3>
            </div>
            <div className="space-y-2">
              {topAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs font-semibold">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate">{account.name}</span>
                    </div>
                    <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                      account.growth > 0 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
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
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Factory size={18} />
              <h3 className="text-sm font-semibold">Resumen producción</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Lotes activos</div>
                <div className="text-2xl font-bold">{productionSummary.activeLots}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Pendiente QC</div>
                <div className="text-2xl font-bold">{productionSummary.pendingQC}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Órdenes (mes)</div>
                <div className="text-2xl font-bold">{productionSummary.completedOrders}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">OEE</div>
                <div className="text-2xl font-bold">{productionSummary.oee}%</div>
              </div>
            </div>
          </div>

          {/* Stock crítico */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} />
              <h3 className="text-sm font-semibold">Stock crítico</h3>
            </div>
            <div className="space-y-2">
              {criticalStock.map((item) => (
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
                    <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                      item.status === 'critical'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {item.status === 'critical' ? 'Crítico' : 'Bajo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline comercial */}
          <div className="sb-card-glass-light p-5 hover-raise">
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
                  <span className="font-bold text-primary">
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
          <div className="sb-card-glass-light p-5 hover-raise">
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
          <div className="sb-card-glass-subtle p-5">
            <h3 className="text-sm font-semibold mb-3">Resumen financiero</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Facturación</span>
                <span className="font-semibold">€{financialKpis.salesTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Cobros</span>
                <span className="font-semibold text-success">€{financialKpis.collected.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Pendiente</span>
                <span className="font-semibold text-warning">€{financialKpis.pending.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-medium">Tasa de cobro</span>
                <span className="font-bold text-primary">
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
