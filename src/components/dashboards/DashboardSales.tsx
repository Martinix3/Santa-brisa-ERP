"use client";

import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  Target, 
  MapPin, 
  ShoppingCart, 
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { ActivityFeed } from "./shared/ActivityFeed";
import { AlertsCard } from "./shared/AlertsCard";

export default function DashboardSales() {
  const { currentUser } = useData();
  const [selectedMonth] = useState(new Date().getMonth());

  // Datos mock (reemplazar con server actions)
  const salesKpis = {
    monthlyTarget: 50000,
    currentSales: 32450,
    visits: 12,
    orders: 8,
    conversion: 67
  };

  const monthlySalesData = [
    { name: 'S1', value: 8200 },
    { name: 'S2', value: 9800 },
    { name: 'S3', value: 7450 },
    { name: 'S4', value: 7000 }
  ];

  const accountsByStage = [
    { stage: 'POTENCIAL', count: 15, color: 'bg-gray-500' },
    { stage: 'ACTIVA', count: 24, color: 'bg-primary' },
    { stage: 'SEGUIMIENTO', count: 8, color: 'bg-warning' }
  ];

  const upcomingVisits = [
    { id: '1', account: 'Restaurante La Marina', date: 'Hoy 15:00', city: 'Madrid', type: 'VISITA' },
    { id: '2', account: 'Hotel Fuerte', date: 'Mañana 11:00', city: 'Marbella', type: 'DEMO' },
    { id: '3', account: 'Grupo Gourmet', date: 'Jueves 16:30', city: 'Barcelona', type: 'VISITA' }
  ];

  const inactiveAccounts = [
    { id: '1', name: 'Bar Central', lastActivity: '45 días', city: 'Valencia' },
    { id: '2', name: 'Terraza Sunset', lastActivity: '32 días', city: 'Málaga' },
    { id: '3', name: 'Restaurante El Puerto', lastActivity: '28 días', city: 'Cádiz' }
  ];

  const recentActivity = [
    {
      id: '1',
      title: 'Pedido #1234 confirmado',
      description: 'La Marina · €450 · 12 botellas',
      timestamp: new Date().toISOString(),
      type: 'order' as const,
      icon: '📦'
    },
    {
      id: '2',
      title: 'Visita completada',
      description: 'Hotel Fuerte · Degustación exitosa',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'visit' as const,
      icon: '🤝'
    },
    {
      id: '3',
      title: 'Nueva cuenta creada',
      description: 'Bar Costero · Málaga · HORECA',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'other' as const,
      icon: '✨'
    }
  ];

  // Alertas + Tareas integradas
  const alerts = [
    // Tareas vencidas/prioritarias
    { 
      id: 'task-1', 
      type: 'critical' as const,
      title: '📋 Seguimiento pedido La Marina',
      description: 'Vence hoy · Alta prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-2', 
      type: 'warning' as const,
      title: '📋 Enviar propuesta Hotel Fuerte',
      description: 'Vence mañana · Media prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-3', 
      type: 'info' as const,
      title: '📋 Llamar a Terraza Sunset',
      description: 'Esta semana · Baja prioridad',
      actionLabel: 'Ver tarea'
    }
  ];

  const progress = (salesKpis.currentSales / salesKpis.monthlyTarget) * 100;
  const remaining = salesKpis.monthlyTarget - salesKpis.currentSales;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Ventas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Mi pipeline · Cuentas · Actividad
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all flex items-center gap-2">
              <Calendar size={16} />
              Ver calendario
            </button>
            <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Nueva actividad
            </button>
          </div>
        </div>
      </div>

      {/* Grid 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna 1: Mi Pipeline */}
        <div className="space-y-5">
          {/* Objetivo vs Actual */}
          <div className="sb-card-glass-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold opacity-90">Objetivo del mes</h3>
              <Target size={20} className="opacity-60" />
            </div>
            
            <div className="mb-2">
              <div className="text-xs opacity-70 mb-1">Vendido hasta ahora</div>
              <div className="text-4xl font-bold tracking-tight">
                €{salesKpis.currentSales.toLocaleString()}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="opacity-70">Progreso</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/8 backdrop-blur-sm p-3 border border-white/10">
                <div className="text-xs opacity-70 mb-1">Meta</div>
                <div className="text-base font-bold">
                  €{salesKpis.monthlyTarget.toLocaleString()}
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 backdrop-blur-sm p-3 border border-white/10">
                <div className="text-xs opacity-70 mb-1">Falta</div>
                <div className="text-base font-bold">
                  €{remaining.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de ventas semanales */}
          <ChartCard
            title="Ventas por semana"
            data={monthlySalesData}
            dataKey="value"
            xAxisKey="name"
            type="bar"
            height={200}
            formatter={(v) => `€${v.toLocaleString()}`}
          />

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="Visitas"
              value={salesKpis.visits}
              hint="este mes"
              variant="subtle"
              icon={<MapPin size={18} />}
            />
            <KpiCard
              label="Pedidos"
              value={salesKpis.orders}
              hint="cerrados"
              variant="subtle"
              icon={<ShoppingCart size={18} />}
            />
            <KpiCard
              label="Conversión"
              value={`${salesKpis.conversion}%`}
              hint="tasa"
              variant="subtle"
              icon={<TrendingUp size={18} />}
              trend="up"
            />
          </div>
        </div>

        {/* Columna 2: Mis Cuentas */}
        <div className="space-y-5">
          {/* Pipeline por stage */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <h3 className="text-sm font-semibold mb-4">Pipeline por fase</h3>
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
                      className={`h-full ${stage.color}`}
                      style={{ width: `${(stage.count / 47) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visitas próximas */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} />
              <h3 className="text-sm font-semibold">Visitas próximas</h3>
            </div>
            <div className="space-y-2">
              {upcomingVisits.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Sin visitas programadas
                </div>
              ) : (
                upcomingVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm truncate">{visit.account}</div>
                      <span className="sb-kpi-badge px-2 py-0.5 text-xs whitespace-nowrap">
                        {visit.type}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      📍 {visit.city} · 🕐 {visit.date}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cuentas sin actividad */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-warning" />
              <h3 className="text-sm font-semibold">Cuentas sin actividad</h3>
            </div>
            <div className="space-y-2">
              {inactiveAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{account.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        📍 {account.city}
                      </div>
                    </div>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-warning/10 text-warning whitespace-nowrap">
                      {account.lastActivity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna 3: Actividad y Tareas */}
        <div className="space-y-5">
          {/* Actividad reciente */}
          <ActivityFeed
            activities={recentActivity}
            maxItems={5}
            variant="light"
          />

          {/* Alertas + Tareas integradas */}
          <AlertsCard alerts={alerts} variant="light" />

          {/* Quick stats */}
          <div className="sb-card-glass-subtle p-5">
            <h3 className="text-sm font-semibold mb-3">Este mes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nuevas cuentas</span>
                <span className="font-semibold">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Interacciones</span>
                <span className="font-semibold">28</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Emails enviados</span>
                <span className="font-semibold">42</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Llamadas</span>
                <span className="font-semibold">18</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
