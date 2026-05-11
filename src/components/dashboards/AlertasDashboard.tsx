"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  Bell,
  AlertTriangle,
  Info,
  XCircle,
  TrendingUp,
  Factory,
  Megaphone,
  DollarSign,
  Package
} from "lucide-react";

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertDepartment = 'VENTAS' | 'OPS' | 'MARKETING' | 'FINANZAS' | 'TODOS';

interface SystemAlert {
  id: string;
  severity: AlertSeverity;
  department: string;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  createdAt: Date;
}

export default function AlertasDashboard() {
  const { data } = useData();
  const [activeTab, setActiveTab] = useState<AlertDepartment>('TODOS');

  if (!data) {
    return <div className="p-6">Cargando datos...</div>;
  }

  // Calcular todas las alertas del sistema
  const getAllAlerts = (): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    const now = new Date();

    // 1. OPERACIONES - Stock crítico
    const criticalStock = data.onHand?.filter((oh: any) => oh.qty < 50) || [];
    criticalStock.forEach((stock: any) => {
      alerts.push({
        id: `stock-${stock.id}`,
        severity: stock.qty < 20 ? 'critical' : 'warning',
        department: 'OPS',
        title: `Stock crítico: ${stock.itemId}`,
        description: `${stock.qty} unidades restantes`,
        entityType: 'ITEM',
        entityId: stock.itemId,
        createdAt: new Date(stock.updatedAt)
      });
    });

    // 2. OPERACIONES - Lotes QC pendientes/fallidos
    const qcLots = data.lots?.filter((l: any) => 
      l.qcStatus === 'PENDING' || l.qcStatus === 'FAILED'
    ) || [];
    qcLots.forEach((lot: any) => {
      alerts.push({
        id: `qc-${lot.id}`,
        severity: lot.qcStatus === 'FAILED' ? 'critical' : 'warning',
        department: 'OPS',
        title: `QC ${lot.qcStatus}: ${lot.lotNumber}`,
        description: `Lote requiere atención de calidad`,
        entityType: 'LOT',
        entityId: lot.id,
        createdAt: new Date(lot.createdAt)
      });
    });

    // 3. OPERACIONES - Producción atrasada
    const delayedProduction = data.productionOrders?.filter((po: any) => {
      if (!po.scheduledFor || po.status === 'DONE' || po.status === 'CANCELLED') return false;
      const scheduledDate = new Date(po.scheduledFor);
      const diffDays = Math.ceil((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 3;
    }) || [];
    delayedProduction.forEach((po: any) => {
      alerts.push({
        id: `prod-${po.id}`,
        severity: 'warning',
        department: 'OPS',
        title: `Producción atrasada: ${po.outputItemId}`,
        description: `${po.orderNumber || po.id} - Fecha prevista excedida`,
        entityType: 'PRODUCTION_ORDER',
        entityId: po.id,
        createdAt: new Date(po.scheduledFor)
      });
    });

    // 4. VENTAS - Pedidos pendientes
    const pendingOrders = data.ordersSellOut?.filter((o: any) => 
      o.status === 'open'
    ) || [];
    pendingOrders.forEach((order: any) => {
      alerts.push({
        id: `order-${order.id}`,
        severity: 'info',
        department: 'VENTAS',
        title: `Pedido pendiente: ${order.docNumber || order.id}`,
        description: `Total: €${order.totalAmount?.toFixed(2) || 0}`,
        entityType: 'ORDER',
        entityId: order.id,
        createdAt: new Date(order.createdAt)
      });
    });

    // 5. MARKETING - Eventos próximos
    const upcomingEvents = data.marketingEvents?.filter((e: any) => {
      const eventDate = new Date(e.startAt);
      const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && e.status === 'active';
    }) || [];
    upcomingEvents.forEach((event: any) => {
      const eventDate = new Date(event.startAt);
      const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `event-${event.id}`,
        severity: diffDays <= 3 ? 'warning' : 'info',
        department: 'MARKETING',
        title: `Evento próximo: ${event.title}`,
        description: `En ${diffDays} día${diffDays !== 1 ? 's' : ''} - ${event.city || 'Ciudad'}`,
        entityType: 'EVENT',
        entityId: event.id,
        createdAt: new Date(event.createdAt)
      });
    });

    // 6. TAREAS - Vencidas y urgentes (TODOS los departamentos)
    const urgentTasks = data.tasks?.filter((t: any) => {
      if (t.status === 'DONE' || t.status === 'CANCELLED') return false;
      if (!t.dueAt) return false;
      const dueDate = new Date(t.dueAt);
      return dueDate <= now || dueDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }) || [];
    
    urgentTasks.forEach((task: any) => {
      const dueDate = new Date(task.dueAt);
      const isOverdue = dueDate < now;
      const assignedUser = data.users?.find((u: any) => u.id === task.assignedToId);
      
      alerts.push({
        id: `task-${task.id}`,
        severity: isOverdue ? 'critical' : 'warning',
        department: task.department || 'TODOS',
        title: `Tarea: ${task.title}`,
        description: `${isOverdue ? 'Vencida' : 'Vence hoy'} · ${assignedUser?.name || 'Sin asignar'}`,
        entityType: 'TASK',
        entityId: task.id,
        createdAt: new Date(task.createdAt)
      });
    });

    return alerts.sort((a, b) => {
      // Ordenar por severidad primero
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      // Luego por fecha (más reciente primero)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  };

  const allAlerts = getAllAlerts();
  
  // Filtrar por tab activo
  const filteredAlerts = activeTab === 'TODOS' 
    ? allAlerts 
    : allAlerts.filter(a => a.department === activeTab);

  // Contar por severidad
  const criticalCount = filteredAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = filteredAlerts.filter(a => a.severity === 'warning').length;
  const infoCount = filteredAlerts.filter(a => a.severity === 'info').length;

  // Tabs con iconos
  const tabs: { key: AlertDepartment; label: string; icon: any }[] = [
    { key: 'TODOS', label: 'Todas', icon: Bell },
    { key: 'VENTAS', label: 'Ventas', icon: TrendingUp },
    { key: 'OPS', label: 'Operaciones', icon: Factory },
    { key: 'MARKETING', label: 'Marketing', icon: Megaphone },
    { key: 'FINANZAS', label: 'Finanzas', icon: DollarSign },
  ];

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return <XCircle className="text-destructive" size={18} />;
      case 'warning': return <AlertTriangle className="text-warning" size={18} />;
      default: return <Info className="text-info" size={18} />;
    }
  };

  const getSeverityBadgeClass = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 text-destructive';
      case 'warning': return 'bg-warning/10 text-warning';
      default: return 'bg-info/10 text-info';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">🔔 Panel de Alertas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Todas las alertas del sistema en tiempo real
            </p>
          </div>
          <div className="flex gap-2">
            <div className="sb-kpi-badge px-3 py-1 text-xs">
              {allAlerts.length} alertas activas
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === 'TODOS' 
            ? allAlerts.length 
            : allAlerts.filter(a => a.department === tab.key).length;
          
          return (
            <button
              key={tab.key}
              className={`h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "border border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              {tab.label}
              {count > 0 && (
                <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="sb-card-glass-light p-5 border-l-4 border-destructive">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="text-destructive" size={20} />
            <h3 className="text-sm font-semibold">Críticas</h3>
          </div>
          <div className="text-3xl font-bold">{criticalCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
        </div>

        <div className="sb-card-glass-light p-5 border-l-4 border-warning">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-warning" size={20} />
            <h3 className="text-sm font-semibold">Advertencias</h3>
          </div>
          <div className="text-3xl font-bold">{warningCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
        </div>

        <div className="sb-card-glass-light p-5 border-l-4 border-info">
          <div className="flex items-center gap-2 mb-2">
            <Info className="text-info" size={20} />
            <h3 className="text-sm font-semibold">Informativas</h3>
          </div>
          <div className="text-3xl font-bold">{infoCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Para conocimiento</p>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="sb-card-glass-light p-5">
        <h3 className="text-sm font-semibold mb-4">
          {activeTab === 'TODOS' ? 'Todas las alertas' : `Alertas de ${activeTab}`}
        </h3>
        
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Sin alertas activas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-4 hover:bg-background/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="flex items-center gap-2">
                        <span className={`sb-kpi-badge px-2 py-0.5 text-xs ${getSeverityBadgeClass(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="sb-kpi-badge px-2 py-0.5 text-xs">
                          {alert.department}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {alert.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
