"use client";

import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  HardDrive,
  Users,
  FileText
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { AlertsCard } from "./shared/AlertsCard";

export default function DashboardTechnical() {
  const { currentUser } = useData();

  // Datos mock (reemplazar con métricas reales del sistema)
  const systemHealth = {
    uptime: 99.97,
    responseTime: 120,
    activeUsers: 24,
    errorRate: 0.02
  };

  const performanceData = [
    { hour: '00:00', responseTime: 98, requests: 450 },
    { hour: '04:00', responseTime: 85, requests: 120 },
    { hour: '08:00', responseTime: 145, requests: 890 },
    { hour: '12:00', responseTime: 178, requests: 1240 },
    { hour: '16:00', responseTime: 132, requests: 950 },
    { hour: '20:00', responseTime: 110, requests: 680 }
  ];

  const firestoreMetrics = {
    reads: 45230,
    writes: 12450,
    deletes: 340,
    collections: 24,
    documents: 8945,
    storageUsed: 2.4
  };

  const systemAlerts = [
    // Alertas del sistema
    {
      id: '1',
      type: 'warning' as const,
      title: 'Alto uso de lecturas Firestore',
      description: '45K lecturas en las últimas 24h · Optimizar queries',
      actionLabel: 'Ver queries'
    },
    {
      id: '2',
      type: 'info' as const,
      title: 'Backup completado',
      description: 'Backup automático ejecutado exitosamente a las 03:00',
      actionLabel: 'Ver log'
    },
    {
      id: '3',
      type: 'warning' as const,
      title: 'Índice faltante',
      description: 'Query en /orders requiere índice compuesto',
      actionLabel: 'Crear índice'
    },
    // Tareas técnicas integradas
    {
      id: 'task-1',
      type: 'critical' as const,
      title: '📋 Actualizar Firebase Functions',
      description: 'Vence hoy · Versión 4.5.0 disponible',
      actionLabel: 'Ver tarea'
    },
    {
      id: 'task-2',
      type: 'warning' as const,
      title: '📋 Revisar índices Firestore',
      description: 'Vence mañana · Optimizar queries lentas',
      actionLabel: 'Ver tarea'
    },
    {
      id: 'task-3',
      type: 'info' as const,
      title: '📋 Documentar API endpoints',
      description: 'Esta semana · Actualizar Swagger',
      actionLabel: 'Ver tarea'
    }
  ];

  const recentErrors = [
    { id: '1', error: 'PERMISSION_DENIED', count: 3, lastSeen: '2h ago', path: '/admin/users' },
    { id: '2', error: 'NETWORK_ERROR', count: 2, lastSeen: '5h ago', path: '/api/sync' },
    { id: '3', error: 'TIMEOUT', count: 1, lastSeen: '8h ago', path: '/reports/generate' }
  ];

  const apiEndpoints = [
    { endpoint: '/api/orders', requests: 12450, avgTime: 145, errors: 2 },
    { endpoint: '/api/accounts', requests: 8920, avgTime: 98, errors: 0 },
    { endpoint: '/api/production', requests: 5430, avgTime: 210, errors: 1 },
    { endpoint: '/api/inventory', requests: 3890, avgTime: 132, errors: 0 }
  ];

  const webhooksStatus = [
    { service: 'Holded', status: 'active', lastSync: '5 min ago', success: 99.8 },
    { service: 'Algolia', status: 'active', lastSync: '2 min ago', success: 100 },
    { service: 'Sendcloud', status: 'error', lastSync: '1h ago', success: 95.2 },
    { service: 'Firebase Auth', status: 'active', lastSync: 'Real-time', success: 100 }
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Técnico</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema · Rendimiento · Monitoreo
            </p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 transition-all">
              Ver logs completos
            </button>
            <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Ejecutar diagnóstico
            </button>
          </div>
        </div>
      </div>

      {/* KPIs de sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Uptime (30d)"
          value={`${systemHealth.uptime}%`}
          hint="99.9% SLA objetivo"
          trend="up"
          variant="dark"
          icon={<CheckCircle2 size={20} />}
        />
        <KpiCard
          label="Response Time"
          value={`${systemHealth.responseTime}ms`}
          hint="promedio 24h"
          variant="light"
          icon={<Zap size={20} />}
        />
        <KpiCard
          label="Usuarios activos"
          value={systemHealth.activeUsers}
          hint="última hora"
          variant="light"
          icon={<Users size={20} />}
        />
        <KpiCard
          label="Error Rate"
          value={`${systemHealth.errorRate}%`}
          hint="< 1% objetivo"
          trend="down"
          variant="light"
          icon={<AlertTriangle size={20} />}
        />
      </div>

      {/* Grid 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna 1: Performance */}
        <div className="space-y-5">
          <ChartCard
            title="Response time (últimas 24h)"
            data={performanceData}
            dataKey="responseTime"
            xAxisKey="hour"
            type="line"
            height={200}
            formatter={(v) => `${v}ms`}
          />

          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} />
              <h3 className="text-sm font-semibold">API Endpoints</h3>
            </div>
            <div className="space-y-2">
              {apiEndpoints.map((api) => (
                <div
                  key={api.endpoint}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {api.endpoint}
                    </span>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                      {api.requests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">⚡ {api.avgTime}ms</span>
                    <span className={`${api.errors > 0 ? 'text-destructive' : 'text-success'}`}>
                      {api.errors > 0 ? `❌ ${api.errors}` : '✅ 0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna 2: Database y Storage */}
        <div className="space-y-5">
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} />
              <h3 className="text-sm font-semibold">Firestore Metrics</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Reads</div>
                <div className="text-xl font-bold">{(firestoreMetrics.reads / 1000).toFixed(1)}K</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Writes</div>
                <div className="text-xl font-bold">{(firestoreMetrics.writes / 1000).toFixed(1)}K</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Deletes</div>
                <div className="text-xl font-bold">{firestoreMetrics.deletes}</div>
              </div>
              <div className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3">
                <div className="text-xs text-muted-foreground mb-1">Storage</div>
                <div className="text-xl font-bold">{firestoreMetrics.storageUsed}GB</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
              {firestoreMetrics.collections} colecciones · {firestoreMetrics.documents.toLocaleString()} documentos
            </div>
          </div>

          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Server size={18} />
              <h3 className="text-sm font-semibold">Webhooks & Integraciones</h3>
            </div>
            <div className="space-y-2">
              {webhooksStatus.map((webhook) => (
                <div
                  key={webhook.service}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{webhook.service}</span>
                    <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${
                      webhook.status === 'active' 
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {webhook.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Último sync: {webhook.lastSync} · {webhook.success}% éxito
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna 3: Alertas y Errores */}
        <div className="space-y-5">
          <AlertsCard alerts={systemAlerts} variant="light" />

          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-destructive" />
              <h3 className="text-sm font-semibold">Errores recientes</h3>
            </div>
            <div className="space-y-2">
              {recentErrors.map((err) => (
                <div
                  key={err.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-destructive">
                      {err.error}
                    </span>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs bg-destructive/10 text-destructive">
                      x{err.count}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {err.path}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {err.lastSeen}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sb-card-glass-subtle p-5">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive size={18} />
              <h3 className="text-sm font-semibold">Recursos</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">CPU Usage</span>
                <span className="font-semibold">32%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-semibold">1.8 GB / 4 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-semibold">2.4 GB / 10 GB</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-muted-foreground">Último backup</span>
                <span className="font-semibold text-success">Hoy 03:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de colecciones */}
      <div className="sb-card-glass-light p-5 hover-raise">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} />
          <h3 className="text-sm font-semibold">Colecciones Firestore</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/30">
                <th className="pb-2 font-medium">Colección</th>
                <th className="pb-2 font-medium">Documentos</th>
                <th className="pb-2 font-medium">Tamaño</th>
                <th className="pb-2 font-medium">Última actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              <tr className="hover:bg-secondary/30">
                <td className="py-3 font-mono text-xs">accounts</td>
                <td className="py-3">1,245</td>
                <td className="py-3">124 MB</td>
                <td className="py-3 text-muted-foreground">hace 2 min</td>
              </tr>
              <tr className="hover:bg-secondary/30">
                <td className="py-3 font-mono text-xs">orders</td>
                <td className="py-3">3,892</td>
                <td className="py-3">892 MB</td>
                <td className="py-3 text-muted-foreground">hace 5 min</td>
              </tr>
              <tr className="hover:bg-secondary/30">
                <td className="py-3 font-mono text-xs">productionOrders</td>
                <td className="py-3">456</td>
                <td className="py-3">45 MB</td>
                <td className="py-3 text-muted-foreground">hace 15 min</td>
              </tr>
              <tr className="hover:bg-secondary/30">
                <td className="py-3 font-mono text-xs">lots</td>
                <td className="py-3">892</td>
                <td className="py-3">78 MB</td>
                <td className="py-3 text-muted-foreground">hace 1h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
