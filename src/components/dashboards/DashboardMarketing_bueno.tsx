"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { useData } from "@/lib/dataprovider";
import { 
  Megaphone,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Sparkles
} from "lucide-react";
import { KpiCard } from "./shared/KpiCard";
import { ChartCard } from "./shared/ChartCard";
import { ActivityFeed } from "./shared/ActivityFeed";
import { AlertsCard } from "./shared/AlertsCard";

export default function DashboardMarketing_bueno() {
  const { currentUser, data } = useData();

  // Guard contra data null
  if (!data) {
    return <div className="p-6">Cargando datos...</div>;
  }

  // Datos reales desde SSOT
  const events = data.marketingEvents || [];
  const collabs = data.influencerCollabs || [];
  const campaigns = data.onlineCampaigns || [];

  // KPIs calculados
  const myActiveEvents = events.filter((e: any) => 
    e.status === 'active' && e.ownerUserId === currentUser?.id
  ).length;
  
  const myActiveCollabs = collabs.filter((c: any) => 
    (c.status === 'LIVE' || c.status === 'AGREED') && c.ownerUserId === currentUser?.id
  ).length;
  
  const myActiveCampaigns = campaigns.filter((c: any) => 
    c.status === 'active' && c.ownerUserId === currentUser?.id
  ).length;

  // Actividad semanal calculada desde datos reales
  const getWeeklyData = () => {
    const weeks = ['S1', 'S2', 'S3', 'S4'];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return weeks.map((name, idx: number) => {
      const weekStart = new Date(monthStart.getTime() + idx * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const eventosWeek = events.filter((e: any) => {
        const eDate = new Date(e.startAt);
        return eDate >= weekStart && eDate < weekEnd;
      }).length;
      
      const campañasWeek = campaigns.filter((c: any) => {
        const cDate = new Date(c.startAt);
        return cDate >= weekStart && cDate < weekEnd;
      }).length;
      
      const colaboracionesWeek = collabs.filter((c: any) => {
        const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
        return cDate >= weekStart && cDate < weekEnd;
      }).length;
      
      return {
        name,
        eventos: eventosWeek,
        campañas: campañasWeek,
        colaboraciones: colaboracionesWeek
      };
    });
  };

  const monthlyData = getWeeklyData();

  // Actividad reciente desde datos reales
  const getRecentActivity = () => {
    const activities: any[] = [];
    
    // Eventos recientes
    const recentEvents = events
      .filter((e: any) => e.status === 'active' || e.status === 'closed')
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 2);
    
    recentEvents.forEach((event: any) => {
      activities.push({
        id: event.id,
        title: `Evento: ${event.title}`,
        description: `${event.city || 'Ciudad'} · ${event.kind}`,
        timestamp: event.updatedAt || event.createdAt,
        type: 'event' as const,
        icon: '🎉'
      });
    });
    
    // Campañas recientes
    const recentCampaigns = campaigns
      .filter((c: any) => c.status === 'active')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2);
    
    recentCampaigns.forEach((campaign: any) => {
      activities.push({
        id: campaign.id,
        title: `Campaña: ${campaign.title}`,
        description: `${campaign.channel} · €${campaign.budget || 0}`,
        timestamp: campaign.createdAt,
        type: 'other' as const,
        icon: '📱'
      });
    });
    
    // Colaboraciones recientes
    const recentCollabs = collabs
      .filter((c: any) => c.status === 'LIVE' || c.status === 'AGREED')
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 1);
    
    recentCollabs.forEach((collab: any) => {
      activities.push({
        id: collab.id,
        title: `Colaboración: ${collab.creatorName}`,
        description: `${collab.platform} · ${collab.tier}`,
        timestamp: collab.createdAt || new Date().toISOString(),
        type: 'other' as const,
        icon: '🤝'
      });
    });
    
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };

  const recentActivity = getRecentActivity();

  // Alertas desde tareas reales del EQUIPO (no solo currentUser)
  const marketingTasks = data.tasks?.filter((t: any) => 
    t.kind === 'MARKETING' && 
    t.status !== 'DONE' &&
    t.status !== 'CANCELLED'
  ) || [];

  const alerts = marketingTasks.slice(0, 4).map((task: any) => {
    const dueDate = task.dueAt ? new Date(task.dueAt) : null;
    const now = new Date();
    const isOverdue = dueDate && dueDate < now;
    const isDueToday = dueDate && dueDate.toDateString() === now.toDateString();
    
    // Buscar usuario asignado
    const assignedUser = data.users?.find((u: any) => u.id === task.assignedToId);
    const assignedName = assignedUser?.name || 'Sin asignar';
    
    // Calcular texto de vencimiento
    let dueText = 'Sin fecha';
    if (dueDate) {
      if (isOverdue) {
        dueText = 'Vence hoy';
      } else if (isDueToday) {
        dueText = 'Vence hoy';
      } else {
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          dueText = 'Vence mañana';
        } else if (diffDays <= 7) {
          dueText = `Vence en ${diffDays} días`;
        } else {
          dueText = 'Esta semana';
        }
      }
    }
    
    return {
      id: task.id,
      type: isOverdue ? 'critical' as const : isDueToday ? 'warning' as const : 'info' as const,
      title: `📋 ${task.title}`,
      description: `${dueText} · Asignada a: ${assignedName}`,
      actionLabel: 'Ver tarea'
    };
  });

  // Calcular ROI promedio real
  const calculateAvgROI = () => {
    const campaignsWithMetrics = campaigns.filter((c: any) => 
      c.metrics?.revenue && c.spend
    );
    
    if (campaignsWithMetrics.length === 0) return "N/A";
    
    const totalROI = campaignsWithMetrics.reduce((sum, c: any) => {
      const roi = (c.metrics.revenue / c.spend);
      return sum + roi;
    }, 0);
    
    const avgROI = totalROI / campaignsWithMetrics.length;
    return avgROI.toFixed(1) + 'x';
  };

  const avgROI = calculateAvgROI();

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Marketing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Campañas · Eventos · Colaboraciones · ROI
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
        
        {/* Columna 1: Mis KPIs */}
        <div className="space-y-5">
          {/* KPIs principales */}
          <div className="sb-card-glass-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold opacity-90">Mi actividad</h3>
              <Sparkles size={20} className="opacity-60" />
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs opacity-70 mb-1">Eventos activos</div>
                <div className="text-3xl font-bold">{myActiveEvents}</div>
              </div>

              <div>
                <div className="text-xs opacity-70 mb-1">Campañas en curso</div>
                <div className="text-3xl font-bold">{myActiveCampaigns}</div>
              </div>

              <div>
                <div className="text-xs opacity-70 mb-1">Colaboraciones</div>
                <div className="text-3xl font-bold">{myActiveCollabs}</div>
              </div>
            </div>
          </div>

          {/* Gráfico actividad */}
          <ChartCard
            title="Actividad semanal"
            data={monthlyData}
            dataKey="eventos"
            xAxisKey="name"
            type="bar"
            height={200}
          />

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="Eventos"
              value={myActiveEvents}
              hint="activos"
              variant="subtle"
              icon={<Calendar size={18} />}
            />
            <KpiCard
              label="Ads"
              value={myActiveCampaigns}
              hint="en curso"
              variant="subtle"
              icon={<TrendingUp size={18} />}
            />
            <KpiCard
              label="Collabs"
              value={myActiveCollabs}
              hint="activas"
              variant="subtle"
              icon={<Users size={18} />}
            />
          </div>
        </div>

        {/* Columna 2: Próximos Eventos */}
        <div className="space-y-5">
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} />
              <h3 className="text-sm font-semibold">Próximos eventos ({events.length})</h3>
            </div>
            <div className="space-y-2">
              {events.slice(0, 5).map((event: any) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 hover:bg-background/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-sm truncate">{event.title}</div>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs whitespace-nowrap">
                      {event.kind}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    📍 {event.city || 'Ciudad'} · 📅 {new Date(event.startAt).toLocaleDateString('es-ES')}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Sin eventos programados
                </div>
              )}
            </div>
          </div>

          {/* Colaboraciones activas */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} />
              <h3 className="text-sm font-semibold">Colaboraciones ({collabs.length})</h3>
            </div>
            <div className="space-y-2">
              {collabs.slice(0, 3).map((collab: any) => (
                <div
                  key={collab.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="font-medium text-sm">{collab.creatorName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {collab.platform} · {collab.tier}
                  </div>
                </div>
              ))}
              {collabs.length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Sin colaboraciones activas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna 3: Actividad y Campañas */}
        <div className="space-y-5">
          {/* Actividad reciente */}
          {recentActivity.length > 0 ? (
            <ActivityFeed
              activities={recentActivity}
              maxItems={5}
              variant="light"
            />
          ) : (
            <div className="sb-card-glass-light p-5">
              <h3 className="text-sm font-semibold mb-3">Actividad reciente</h3>
              <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
            </div>
          )}

          {/* Alertas + Tareas integradas */}
          {alerts.length > 0 && <AlertsCard alerts={alerts} variant="light" />}

          {/* Campañas activas */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={18} />
              <h3 className="text-sm font-semibold">Campañas digitales ({campaigns.length})</h3>
            </div>
            <div className="space-y-2">
              {campaigns.slice(0, 3).map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="font-medium text-sm">{campaign.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {campaign.channel}
                    {campaign.budget && ` · €${campaign.budget}`}
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Sin campañas activas
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="sb-card-glass-subtle p-5">
            <h3 className="text-sm font-semibold mb-3">Este mes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total eventos</span>
                <span className="font-semibold">{events.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Colaboraciones</span>
                <span className="font-semibold">{collabs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Campañas</span>
                <span className="font-semibold">{campaigns.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ROI promedio</span>
                <span className="font-semibold text-success">{avgROI}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
