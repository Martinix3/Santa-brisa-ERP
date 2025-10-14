"use client";

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

export default function DashboardMarketing() {
  const { currentUser, data } = useData();

  // Datos desde SSOT
  const events = data?.marketingEvents || [];
  const collabs = data?.influencerCollabs || [];
  const campaigns = data?.onlineCampaigns || [];

  // KPIs personales mock (TODO: filtrar por ownerUserId)
  const myActiveEvents = events.filter(e => e.status === 'active' && e.ownerUserId === currentUser?.id).length;
  const myActiveCollabs = collabs.filter(c => (c.status === 'LIVE' || c.status === 'AGREED') && c.ownerUserId === currentUser?.id).length;
  const myActiveCampaigns = campaigns.filter(c => c.status === 'active' && c.ownerUserId === currentUser?.id).length;

  const monthlyData = [
    { name: 'S1', eventos: 2, campañas: 3, colaboraciones: 1 },
    { name: 'S2', eventos: 3, campañas: 2, colaboraciones: 2 },
    { name: 'S3', eventos: 1, campañas: 4, colaboraciones: 1 },
    { name: 'S4', eventos: 2, campañas: 3, colaboraciones: 3 }
  ];

  const recentActivity = [
    {
      id: '1',
      title: 'Evento completado',
      description: 'Feria HORECA Madrid · 150 asistentes',
      timestamp: new Date().toISOString(),
      type: 'event' as const,
      icon: '🎉'
    },
    {
      id: '2',
      title: 'Campaña lanzada',
      description: 'Instagram Ads · €500 presupuesto',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'other' as const,
      icon: '📱'
    },
    {
      id: '3',
      title: 'Nueva colaboración',
      description: '@influencer_food · Negociación',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'other' as const,
      icon: '🤝'
    }
  ];

  // Alertas + Tareas integradas
  const alerts = [
    // Tareas de marketing
    { 
      id: 'task-1', 
      type: 'critical' as const,
      title: '📋 Confirmar ponente evento HORECA',
      description: 'Vence hoy · Alta prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-2', 
      type: 'warning' as const,
      title: '📋 Revisar creativos campaña Instagram',
      description: 'Vence mañana · Media prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'task-3', 
      type: 'info' as const,
      title: '📋 Negociar contrato @influencer_food',
      description: 'Esta semana · Baja prioridad',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Marketing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Mis campañas · Eventos · Colaboraciones
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
              <h3 className="text-sm font-semibold">Próximos eventos</h3>
            </div>
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
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
                    📍 {event.city} · 📅 {new Date(event.startAt).toLocaleDateString()}
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
              <h3 className="text-sm font-semibold">Colaboraciones</h3>
            </div>
            <div className="space-y-2">
              {collabs.slice(0, 3).map((collab) => (
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
          <ActivityFeed
            activities={recentActivity}
            maxItems={5}
            variant="light"
          />

          {/* Alertas + Tareas integradas */}
          <AlertsCard alerts={alerts} variant="light" />

          {/* Campañas activas */}
          <div className="sb-card-glass-light p-5 hover-raise">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={18} />
              <h3 className="text-sm font-semibold">Campañas digitales</h3>
            </div>
            <div className="space-y-2">
              {campaigns.slice(0, 3).map((campaign) => (
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
                <span className="font-semibold text-success">3.2x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
