'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { BrainRule } from '@/domain/brain';
import type { Campaign } from '@/domain/campaigns';
import { 
  getBrainMetrics, 
  getActivityLog,
  type BrainMetrics,
  type ActivityLogEntry 
} from '@/server/actions/monitoring.actions';

interface MonitoringPanelProps {
  rules: BrainRule[];
  campaigns: Campaign[];
}

export function MonitoringPanel({ rules, campaigns }: MonitoringPanelProps) {
  const [metrics, setMetrics] = useState<BrainMetrics>({
    totalRules: rules.length,
    activeRules: rules.filter(r => r.enabled).length,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
    tasksCreatedToday: 0,
    tasksCreatedWeek: 0,
    avgTasksPerDay: 0,
    topPerformer: null,
  });
  
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadMetrics();
  }, [rules, campaigns]);
  
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  
  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [metricsResult, activitiesResult] = await Promise.all([
        getBrainMetrics(),
        getActivityLog(5)
      ]);
      
      if (metricsResult.ok) {
        setMetrics(metricsResult.data);
      } else {
        toast.error('Error al cargar métricas');
      }
      
      if (activitiesResult.ok) {
        setActivities(activitiesResult.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };
  
  const KPICard = ({ 
    title, 
    value, 
    subtitle, 
    trend, 
    icon 
  }: { 
    title: string; 
    value: number | string; 
    subtitle?: string; 
    trend?: 'up' | 'down' | 'neutral';
    icon: string;
  }) => (
    <div className="sb-card">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-medium ${
            trend === 'up' ? 'text-success' :
            trend === 'down' ? 'text-destructive' :
            'text-muted-foreground'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
    </div>
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">📊 Monitoreo Santa Brain</h2>
          <p className="text-sm text-muted-foreground">
            KPIs y métricas en tiempo real
          </p>
        </div>
        <button
          onClick={loadMetrics}
          disabled={loading}
          className="sb-btn sb-btn--ghost sb-btn--sm"
        >
          {loading ? '⟳' : '🔄'} Actualizar
        </button>
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon="📋"
          value={metrics.activeRules}
          title="Reglas Activas"
          subtitle={`${metrics.totalRules} totales`}
          trend={metrics.activeRules > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          icon="🚀"
          value={metrics.activeCampaigns}
          title="Campañas Activas"
          subtitle={`${metrics.totalCampaigns} totales`}
          trend={metrics.activeCampaigns > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          icon="✓"
          value={metrics.tasksCreatedToday}
          title="Tareas Hoy"
          subtitle="Generadas automáticamente"
          trend="up"
        />
        <KPICard
          icon="📈"
          value={metrics.avgTasksPerDay}
          title="Promedio Diario"
          subtitle={`${metrics.tasksCreatedWeek} esta semana`}
          trend="neutral"
        />
      </div>
      
      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Rules Health */}
        <div className="sb-card">
          <h3 className="font-semibold mb-4">🎯 Salud de Reglas</h3>
          <div className="space-y-3">
            {rules.map(rule => {
              const healthScore = rule.enabled ? 100 : 0;
              return (
                <div key={rule.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate flex-1 mr-2">{rule.name}</span>
                    <span className={`font-medium ${
                      rule.enabled ? 'text-success' : 'text-muted-foreground'
                    }`}>
                      {rule.enabled ? '✓ Activa' : '○ Inactiva'}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        rule.enabled ? 'bg-success' : 'bg-muted'
                      }`}
                      style={{ width: `${healthScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Campaign Progress */}
        <div className="sb-card">
          <h3 className="font-semibold mb-4">🚀 Progreso de Campañas</h3>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay campañas activas
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map(campaign => {
                const firstGoal = campaign.goals[0];
                if (!firstGoal) return null;
                
                const progress = campaign.progress.reduce((sum, p) => sum + p.current, 0);
                const percentage = Math.min(100, (progress / firstGoal.target) * 100);
                
                return (
                  <div key={campaign.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate flex-1 mr-2">{campaign.name}</span>
                      <span className="text-xs font-medium">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="sb-card">
        <h3 className="font-semibold mb-4">🕐 Actividad Reciente</h3>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay actividad reciente
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <ActivityItem
                key={activity.id}
                icon={getActivityIcon(activity.type)}
                title={activity.title}
                description={activity.description}
                time={formatRelativeTime(activity.timestamp)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Top Performers */}
      {metrics.topPerformer && (
        <div className="sb-card">
          <h3 className="font-semibold mb-4">🏆 Top Performer de la Semana</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
              👤
            </div>
            <div className="flex-1">
              <div className="font-semibold">{metrics.topPerformer.userName}</div>
              <div className="text-sm text-muted-foreground">
                {metrics.topPerformer.tasksCompleted} tareas completadas
              </div>
            </div>
            <div className="text-3xl">🥇</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ 
  icon, 
  title, 
  description, 
  time 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">{time}</div>
    </div>
  );
}

function getActivityIcon(type: ActivityLogEntry['type']): string {
  switch (type) {
    case 'RULE_EXECUTED': return '📋';
    case 'CAMPAIGN_STARTED': return '🚀';
    case 'CAMPAIGN_COMPLETED': return '✅';
    case 'QUOTA_ACHIEVED': return '🎯';
    case 'TASK_CREATED': return '✓';
    default: return '📌';
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
