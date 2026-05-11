'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useMemo } from 'react';
import { useDrawer } from '@/ui/drawers/drawer-registry';
import { WidgetFrame } from './WidgetFrame';
import { CheckCircle2, Calendar, MoreHorizontal } from 'lucide-react';

export type TaskStatus = 'OPEN'|'DONE'|'CANCELLED';
export interface TaskItem {
  id: string;
  title: string;
  dueISO?: string;           // ISO 8601
  status: TaskStatus;
  accountName?: string;
}

export function TasksWidget({
  title = 'Tareas',
  items = [],
  show = 8,
}: {
  title?: string;
  items: TaskItem[];
  show?: number;
}) {
  const { open } = useDrawer();

  const sorted = useMemo(() => {
    const toTs = (s?: string) => (s ? new Date(s).getTime() : Infinity);
    return [...items].sort((a, b) => toTs(a.dueISO) - toTs(b.dueISO)).slice(0, show);
  }, [items, show]);

  const handleComplete = (taskId: string) => {
    // TODO: Implement complete task
    console.log('Complete task:', taskId);
  };

  const handleReschedule = (taskId: string) => {
    // TODO: Implement reschedule task
    console.log('Reschedule task:', taskId);
  };

  return (
    <WidgetFrame 
      title="Tareas"
      actions={
        items.length > 0 ? (
          <span className="text-xs bg-[--sb-yellow]/20 text-[--sb-copper] px-2 py-0.5 rounded-full font-medium">
            {items.filter(t => t.status === 'OPEN').length} pendientes
          </span>
        ) : undefined
      }
    >
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
          <p>Sin tareas pendientes</p>
          <p className="text-xs mt-1">¡Buen momento para planificar!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(t => {
            const overdue = t.status === 'OPEN' && t.dueISO && new Date(t.dueISO).getTime() < Date.now();
            const isToday = t.dueISO && new Date(t.dueISO).toDateString() === new Date().toDateString();
            
            return (
              <div
                key={t.id}
                className="sb-card-glass-subtle p-3 hover:scale-[1.01] transition-transform group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-1 truncate">{t.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {t.accountName && (
                        <span className="truncate">{t.accountName}</span>
                      )}
                      {t.dueISO && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(t.dueISO).toLocaleDateString('es-ES', { 
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      t.status === 'DONE'
                        ? 'bg-[--sb-green]/20 text-[--sb-green]'
                        : t.status === 'CANCELLED'
                        ? 'bg-muted text-muted-foreground'
                        : overdue
                        ? 'bg-destructive/20 text-destructive'
                        : isToday
                        ? 'bg-[--sb-yellow]/20 text-[--sb-copper]'
                        : 'bg-[--sb-aqua]/20 text-[--sb-green]'
                    }`}
                  >
                    {t.status === 'OPEN' ? (overdue ? 'Vencida' : isToday ? 'Hoy' : 'Abierta') : t.status === 'DONE' ? 'Hecha' : 'Cancelada'}
                  </span>
                </div>

                {/* Action buttons - visible on hover */}
                {t.status === 'OPEN' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleComplete(t.id)}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[--sb-green]/10 text-[--sb-green] hover:bg-[--sb-green]/20 transition-colors font-medium flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={12} />
                      Completar
                    </button>
                    <button
                      onClick={() => handleReschedule(t.id)}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[--sb-yellow]/10 text-[--sb-copper] hover:bg-[--sb-yellow]/20 transition-colors font-medium flex items-center justify-center gap-1"
                    >
                      <Calendar size={12} />
                      Reprogramar
                    </button>
                    <button
                      onClick={() => open('task-edit', { taskId: t.id, title: t.title, dueISO: t.dueISO, status: t.status })}
                      className="text-xs px-2 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
