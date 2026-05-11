'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


// FILE: src/app/(app)/work/WorkHubClient.tsx
// ============================================================================
// WORK HUB CLIENT - Sistema Unificado de Tasks y Projects
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TasksWidget, type TaskItem } from '@/components/widgets/TasksWidget';
import { ProjectsCircleWidget } from '@/components/widgets/ProjectsCircleWidget';
import { WorkKanbanBoard } from '@/features/workhub/components/WorkKanbanBoard';
import { WorkTimeline } from '@/features/workhub/components/WorkTimeline';
import { WorkCalendar } from '@/features/workhub/components/WorkCalendar';
import type { WorkItem } from '@/domain/workitem';
import { getWorkItems, moveWorkItem, getDailyFocus } from '@/server/actions/workhub.actions';
import { TaskEditDrawer } from '@/ui/drawers/drawers/TaskEditDrawer';
import { ProjectEditDrawer } from '@/ui/drawers/drawers/ProjectEditDrawer';

type ViewMode = 'list' | 'kanban' | 'timeline' | 'calendar';

export function WorkHubClient() {
  // TODO: Integrar con auth real cuando esté disponible
  const [user] = useState<{ uid: string } | null>({ uid: 'demo-user' });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<'all' | 'tasks' | 'projects'>('all');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyFocus, setDailyFocus] = useState<{
    topTasks: Array<{ taskId: string; reason: string; urgency: number }>;
    quickWins: Array<{ taskId: string; estimatedMins: number }>;
    blockers: Array<{ taskId: string; blocker: string }>;
  } | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  // Cargar datos reales
  useEffect(() => {
    if (!user?.uid) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getWorkItems({
          userId: user.uid,
          type: 'all',
        });

        if (result.success && result.data) {
          setWorkItems(result.data);
          
          // Cargar Focus del Día
          setFocusLoading(true);
          const focusResult = await getDailyFocus(user.uid);
          if (focusResult.success && focusResult.data) {
            setDailyFocus(focusResult.data);
          }
          setFocusLoading(false);
        } else {
          setError(result.error || 'Error al cargar datos');
        }
      } catch (err: any) {
        console.error('[WorkHubClient] Load error:', err);
        setError(err.message || 'Error inesperado');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.uid]);

  // Mapear a widgets con datos reales del SSOT/DB
  const tasksForWidget = useMemo<TaskItem[]>(() => {
    return workItems
      .filter((i) => i.type === 'task')
      .map((i) => ({
        id: i.id,
        title: i.title,
        dueISO: i.dueAt,
        status: i.status === 'DONE' ? 'DONE' : 'OPEN',
        accountName: (i.metadata?.accountName as string | undefined) || (i.metadata?.accountId as string | undefined),
      }));
  }, [workItems]);

  const projectsForWidget = useMemo(
    () => {
      const projects = workItems.filter((i) => i.type === 'project');
      return projects.map((p) => {
        const progress = Math.max(0, Math.min(100, Math.round((p.metadata?.progressPct as number) || 0)));
        return {
          id: p.id,
          name: p.title,
          // Representar el progreso como círculo 0..100
          todo: Math.max(0, 100 - progress),
          doing: 0,
          done: progress,
          trend: (p.trend || 'flat') as 'up' | 'down' | 'flat',
        };
      });
    },
    [workItems]
  );

  const baseFilteredItems = useMemo(() => {
    const base = workItems;
    if (filter === 'tasks') return base.filter((item) => item.type === 'task');
    if (filter === 'projects') return base.filter((item) => item.type === 'project');
    return base;
  }, [filter, workItems]);

  const kanbanItems = useMemo(() => {
    return baseFilteredItems.map((item) => ({
      ...item,
      status: item.status ?? 'BACKLOG',
    }));
  }, [baseFilteredItems]);

  const timelineItems = useMemo(() => {
    return baseFilteredItems.map((item) => ({
      ...item,
      createdAt: item.createdAt ?? new Date().toISOString(),
    }));
  }, [baseFilteredItems]);

  const calendarItems = useMemo(() => {
    return baseFilteredItems.map((item) => ({
      ...item,
      createdAt: item.createdAt ?? new Date().toISOString(),
    }));
  }, [baseFilteredItems]);

  const handleKanbanMove = useCallback(
    async ({ itemId, from, to }: { itemId: string; from: WorkItem['status']; to: WorkItem['status'] }) => {
      if (!user?.uid) return;

      try {
        const item = workItems.find((i) => i.id === itemId);
        if (!item) return;

        // Filtrar solo tipos válidos para moveWorkItem
        if (item.type !== 'task' && item.type !== 'project') {
          console.warn('[WorkHubClient] Unsupported item type for move:', item.type);
          return;
        }

        const result = await moveWorkItem({
          itemId,
          itemType: item.type,
          from,
          to,
          userId: user.uid,
        });

        if (result.success) {
          // Actualizar estado local optimistamente
          setWorkItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, status: to } : i))
          );
        } else {
          console.error('[WorkHubClient] Move failed:', result.error);
        }
      } catch (err: any) {
        console.error('[WorkHubClient] Move error:', err);
      }
    },
    [user?.uid, workItems]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trabajo</h1>
          <p className="text-muted-foreground">
            Sistema unificado de tareas y proyectos
          </p>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          <button onClick={() => setViewMode('list')} className={`sb-btn ${viewMode === 'list' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}>
            Lista
          </button>
          <button onClick={() => setViewMode('kanban')} className={`sb-btn ${viewMode === 'kanban' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}>
            Kanban
          </button>
          <button onClick={() => setViewMode('timeline')} className={`sb-btn ${viewMode === 'timeline' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}>
            Timeline
          </button>
          <button onClick={() => setViewMode('calendar')} className={`sb-btn ${viewMode === 'calendar' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}>
            Calendario
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Todo
        </button>
        <button
          onClick={() => setFilter('tasks')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === 'tasks'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Tareas
        </button>
        <button
          onClick={() => setFilter('projects')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            filter === 'projects'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Proyectos
        </button>
      </div>

      {/* Content Area */}
      {loading && (
        <div className="text-sm text-muted-foreground">Cargando trabajo...</div>
      )}
      {error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {viewMode === 'list' && (
            <>
              {(filter === 'all' || filter === 'tasks') && (
                <TasksWidget title="Mis Tareas" items={tasksForWidget} />
              )}
              {(filter === 'all' || filter === 'projects') && (
                <ProjectsCircleWidget
                  projects={projectsForWidget}
                  onProjectClick={(pid) => {
                    setSelectedProjectId(pid);
                    setProjectDrawerOpen(true);
                  }}
                />
              )}
            </>
          )}

          {viewMode === 'kanban' && (
            <WorkKanbanBoard
              items={kanbanItems}
              onMove={handleKanbanMove}
              onItemClick={(item) => {
                if (item.type === 'project') {
                  setSelectedProjectId(item.id);
                  setProjectDrawerOpen(true);
                }
              }}
            />
          )}

          {viewMode === 'timeline' && <WorkTimeline items={timelineItems} />}

          {viewMode === 'calendar' && <WorkCalendar items={calendarItems} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Focus del Día */}
          <div className="sb-card-glass p-6">
            <h3 className="text-lg font-semibold mb-4">Focus del Día</h3>
            <div className="space-y-4">
              {focusLoading && (
                <div className="text-sm text-muted-foreground">
                  Cargando sugerencias de Gemini...
                </div>
              )}

              {!focusLoading && dailyFocus && (
                <>
                  {/* Top Tasks */}
                  {dailyFocus.topTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        Prioridades
                      </h4>
                      <div className="space-y-2">
                        {dailyFocus.topTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.taskId}
                            className="text-sm p-2 rounded-lg bg-primary/10 border border-primary/20"
                          >
                            <div className="font-medium text-primary">
                              {workItems.find((i) => i.id === task.taskId)?.title || task.taskId}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {task.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Wins */}
                  {dailyFocus.quickWins.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        Quick Wins
                      </h4>
                      <div className="space-y-2">
                        {dailyFocus.quickWins.slice(0, 3).map((task) => (
                          <div
                            key={task.taskId}
                            className="text-sm p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                          >
                            <div className="font-medium text-emerald-600 dark:text-emerald-400">
                              {workItems.find((i) => i.id === task.taskId)?.title || task.taskId}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ~{task.estimatedMins} min
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blockers */}
                  {dailyFocus.blockers.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        Bloqueadores
                      </h4>
                      <div className="space-y-2">
                        {dailyFocus.blockers.slice(0, 2).map((task) => (
                          <div
                            key={task.taskId}
                            className="text-sm p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                          >
                            <div className="font-medium text-amber-600 dark:text-amber-400">
                              {workItems.find((i) => i.id === task.taskId)?.title || task.taskId}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {task.blocker}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!focusLoading && !dailyFocus && (
                <div className="text-sm text-muted-foreground">
                  Sin sugerencias disponibles
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="sb-card-glass p-6">
            <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tareas pendientes</span>
                <span className="font-semibold">{workItems.filter(i => i.type === 'task' && i.status !== 'DONE').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Proyectos activos</span>
                <span className="font-semibold">{workItems.filter(i => i.type === 'project' && i.status !== 'DONE').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Vencidas</span>
                <span className="font-semibold text-destructive">{workItems.filter(i => i.isOverdue).length}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="sb-card-glass p-6">
            <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <button onClick={() => setTaskDrawerOpen(true)} className="sb-btn sb-btn--primary w-full justify-start">
                Nueva Tarea
              </button>
              <button onClick={() => { setSelectedProjectId(undefined); setProjectDrawerOpen(true); }} className="sb-btn sb-btn--ghost w-full justify-start">
                Nuevo Proyecto
              </button>
              <button className="sb-btn sb-btn--ghost w-full justify-start">Agrupar Tareas</button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <TaskEditDrawer
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        onSuccess={() => {
          // Recargar datos
          if (user?.uid) {
            getWorkItems({ userId: user.uid, type: 'all' }).then((result) => {
              if (result.success && result.data) {
                setWorkItems(result.data);
              }
            });
          }
        }}
      />

      <ProjectEditDrawer
        open={projectDrawerOpen}
        onClose={() => { setProjectDrawerOpen(false); setSelectedProjectId(undefined); }}
        projectId={selectedProjectId}
        onSuccess={() => {
          // Recargar datos
          if (user?.uid) {
            getWorkItems({ userId: user.uid, type: 'all' }).then((result) => {
              if (result.success && result.data) {
                setWorkItems(result.data);
              }
            });
          }
        }}
      />
    </div>
  );
}
