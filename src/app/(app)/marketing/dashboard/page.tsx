"use client";

import { useData } from "@/lib/dataprovider";
import { SBCard } from "@/components/ui/ui-primitives";
import { 
  Megaphone, 
  CalendarPlus, 
  Handshake, 
  Package, 
  TrendingUp,
  Target,
  Users,
  Calendar as CalendarIcon,
  Eye
} from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { listAllProjects } from "@/server/actions/projects";
import type { Project } from "@/domain/ssot";
import { ProjectCard } from "@/features/projects/components";
import { AlertsCard } from "@/components/dashboards/shared/AlertsCard";

export default function MarketingDashboardPage() {
  const { data } = useData();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Cargar proyectos del departamento Marketing
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      const result = await listAllProjects();
      if (result.success) {
        // Filtrar solo proyectos del departamento MARKETING
        const marketingProjects = result.data.filter(p => p.department === 'MARKETING');
        setProjects(marketingProjects);
      }
      setLoadingProjects(false);
    }
    
    loadProjects();
  }, []);
  
  // Datos del SSOT
  const events = data?.marketingEvents || [];
  const collabs = data?.influencerCollabs || [];
  const campaigns = data?.onlineCampaigns || [];
  const plvMaterials = data?.plv_material || [];
  
  // KPIs calculados
  const activeEvents = useMemo(() => events.filter(e => e.status === 'active').length, [events]);
  const activeCollabs = useMemo(() => collabs.filter(c => c.status === 'LIVE' || c.status === 'AGREED').length, [collabs]);
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'active').length, [campaigns]);
  const deliveredPLV = plvMaterials.length; // PlvMaterial no tiene status, contamos todos
  
  // Actividad reciente (últimas 5 entradas)
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      date: string;
      icon: string;
    }> = [];
    
    // Eventos recientes
    events.slice(0, 2).forEach(event => {
      activities.push({
        id: `event-${event.id}`,
        type: 'Evento',
        title: event.title || 'Evento sin nombre',
        description: event.city || 'Sin ubicación',
        date: event.startAt,
        icon: '🎉'
      });
    });
    
    // Colaboraciones recientes
    collabs.slice(0, 2).forEach(collab => {
      activities.push({
        id: `collab-${collab.id}`,
        type: 'Colaboración',
        title: collab.creatorName || 'Colaboración',
        description: collab.platform || 'Sin plataforma',
        date: collab.createdAt,
        icon: '🤝'
      });
    });
    
    // Ordenar por fecha
    return activities.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    }).slice(0, 5);
  }, [events, collabs]);

  // Alertas + Tareas del equipo con "assigned to"
  const teamAlerts = [
    // Tareas del equipo marketing
    { 
      id: 'team-task-1', 
      type: 'critical' as const, 
      title: '📋 Confirmar ponente evento HORECA',
      description: 'Vence hoy · Asignada a: Ana García · Alta prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-2', 
      type: 'warning' as const, 
      title: '📋 Revisar creativos campaña Instagram',
      description: 'Vence mañana · Asignada a: Carlos López · Media prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-3', 
      type: 'info' as const, 
      title: '📋 Negociar contrato @influencer_food',
      description: 'Esta semana · Asignada a: María Ruiz · Baja prioridad',
      actionLabel: 'Ver tarea'
    },
    { 
      id: 'team-task-4', 
      type: 'warning' as const, 
      title: '📋 Preparar material PLV feria',
      description: 'Vence en 3 días · Asignada a: Juan Martínez',
      actionLabel: 'Ver tarea'
    }
  ];

  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Megaphone className="h-6 w-6" />
        Dashboard Marketing
      </h1>
      
      <div className="sb-page__content">
        {/* KPIs Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeEvents}</div>
            <div className="sb-kpi__label">🪩 EVENTOS ACTIVOS</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              {events.length} total
            </div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeCollabs}</div>
            <div className="sb-kpi__label">🤝 COLABORACIONES</div>
            <div className="sb-kpi__change">Abiertas</div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{activeCampaigns}</div>
            <div className="sb-kpi__label">🧾 CAMPAÑAS ADS</div>
            <div className="sb-kpi__change">Activas</div>
          </div>
          
          <div className="sb-kpi">
            <div className="sb-kpi__value">{deliveredPLV}</div>
            <div className="sb-kpi__label">🏪 PLV ENTREGADO</div>
            <div className="sb-kpi__change sb-kpi__change--positive">
              {plvMaterials.length} total
            </div>
          </div>
        </div>

        {/* Proyectos del Equipo Marketing */}
        {!loadingProjects && projects.length > 0 && (
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">🎯 Proyectos del Equipo Marketing ({projects.length})</h3>
            </div>
            <div className="sb-card__content">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    progress={0} // TODO: calcular progreso real
                    teamMembers={[]} // TODO: cargar team members del proyecto
                    onClick={() => {/* TODO: abrir ProjectDrawer */}}
                  />
                ))}
              </div>
            </div>
          </SBCard>
        )}

        {/* Quick Actions */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">⚡ Acciones Rápidas</h3>
          </div>
          <div className="sb-card__content">
            <div className="sb-tiles">
              <button className="sb-tile" onClick={() => window.location.href = '/marketing/events-activations'}>
                <CalendarPlus size={20} />
                <span className="sb-tile__label">Nueva Activación</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/marketing/collabs'}>
                <Handshake size={20} />
                <span className="sb-tile__label">Nuevo Colaborador</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/marketing/pos-mkt'}>
                <Package size={20} />
                <span className="sb-tile__label">Material POS</span>
              </button>
              <button className="sb-tile" onClick={() => window.location.href = '/marketing/ads'}>
                <TrendingUp size={20} />
                <span className="sb-tile__label">Nueva Campaña</span>
              </button>
            </div>
          </div>
        </SBCard>

        {/* Grid de 2 columnas: Actividad Reciente + Métricas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actividad Reciente */}
          <SBCard>
            <div className="sb-card__header">
              <h3 className="sb-card__title">📌 Actividad Reciente</h3>
            </div>
            <div className="sb-card__content space-y-3">
              {recentActivity.length === 0 ? (
                <div className="sb-empty py-8">
                  <Eye size={48} className="sb-empty__icon" />
                  <p className="sb-empty__title">Sin actividad</p>
                  <p className="sb-empty__description">
                    No hay actividad reciente de marketing
                  </p>
                </div>
              ) : (
                recentActivity.map(item => (
                  <div key={item.id} className="sb-card hover-raise p-3 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="sb-avatar">{item.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="sb-badge sb-badge--primary">{item.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SBCard>

          {/* Tareas del Equipo + Métricas */}
          <div className="space-y-4">
            {/* Tareas del equipo con "assigned to" */}
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-4">📋 Tareas del Equipo Marketing</h3>
              <AlertsCard alerts={teamAlerts} variant="light" />
            </div>

            <SBCard>
              <div className="sb-card__header">
                <h3 className="sb-card__title">📊 Resumen de Actividades</h3>
              </div>
              <div className="sb-card__content space-y-4">
                <div className="sb-metric">
                  <CalendarIcon className="text-primary" size={24} />
                  <div>
                    <div className="sb-metric__label">Eventos Totales</div>
                    <div className="text-2xl font-bold">{events.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeEvents} activos
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Users className="text-blue-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Colaboraciones</div>
                    <div className="text-2xl font-bold">{collabs.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeCollabs} activas
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <TrendingUp className="text-success" size={24} />
                  <div>
                    <div className="sb-metric__label">Campañas Digitales</div>
                    <div className="text-2xl font-bold">{campaigns.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeCampaigns} en curso
                    </div>
                  </div>
                </div>

                <div className="sb-metric">
                  <Package className="text-amber-500" size={24} />
                  <div>
                    <div className="sb-metric__label">Material PLV</div>
                    <div className="text-2xl font-bold">{plvMaterials.length}</div>
                    <div className="text-xs text-success">
                      {deliveredPLV} entregados
                    </div>
                  </div>
                </div>
              </div>
            </SBCard>
          </div>
        </div>

        {/* Próximos Eventos */}
        <SBCard>
          <div className="sb-card__header">
            <h3 className="sb-card__title">📅 Próximos Eventos</h3>
            <button 
              className="sb-btn sb-btn--sm sb-btn--ghost"
              onClick={() => window.location.href = '/marketing/events-activations'}
            >
              Ver Todos
            </button>
          </div>
          <div className="sb-card__content">
            {events.length === 0 ? (
              <div className="sb-empty py-8">
                <CalendarIcon size={48} className="sb-empty__icon" />
                <p className="sb-empty__title">Sin eventos programados</p>
                <p className="sb-empty__description">
                  Crea tu primer evento de marketing
                </p>
                <button 
                  className="sb-btn sb-btn--primary mt-4"
                  onClick={() => window.location.href = '/marketing/events-activations'}
                >
                  <CalendarPlus size={18} />
                  Crear Evento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.slice(0, 6).map(event => (
                  <div key={event.id} className="sb-card hover-raise cursor-pointer">
                    <div className="sb-card__content">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold line-clamp-1">{event.title || 'Evento'}</h4>
                        <span className="sb-badge sb-badge--primary text-xs">
                          {event.kind || 'General'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={14} />
                          <span>{new Date(event.startAt).toLocaleDateString('es-ES')}</span>
                        </div>
                        {event.city && (
                          <div className="flex items-center gap-2">
                            <Target size={14} />
                            <span className="line-clamp-1">{event.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SBCard>
      </div>
    </div>
  );
}
