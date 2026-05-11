'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useMemo } from 'react';
import type { WorkItem } from '@/domain/workitem';
import { normalizeTs } from '@/lib/dates';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  ListTodo,
} from 'lucide-react';

type TimelineEntry = {
  id: string;
  item: WorkItem;
  start: Date;
  end?: Date;
  isOverdue: boolean;
  typeIcon: React.ReactNode;
  statusLabel: string;
  durationLabel?: string;
};

export interface WorkTimelineProps {
  items: WorkItem[];
}

function getTypeIcon(item: WorkItem) {
  switch (item.type) {
    case 'task':
      return <ListTodo className="w-4 h-4 text-[--sb-aqua]" />;
    case 'project':
      return <Briefcase className="w-4 h-4 text-[--sb-copper]" />;
    case 'event':
      return <CalendarDays className="w-4 h-4 text-[--sb-blue]" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status: WorkItem['status']) {
  switch (status) {
    case 'DONE':
      return 'Completado';
    case 'IN_PROGRESS':
      return 'En curso';
    default:
      return 'Backlog';
  }
}

function computeDuration(start: Date, end?: Date) {
  if (!end) return undefined;
  const diff = end.getTime() - start.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return undefined;
  if (days === 1) return '1 día';
  if (days < 7) return `${days} días`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
}

export function WorkTimeline({ items }: WorkTimelineProps) {
  const entries = useMemo<TimelineEntry[]>(() => {
    return items
      .map((item) => {
        const start = normalizeTs(item.createdAt ?? item.dueAt ?? new Date());
        const end = item.dueAt ? normalizeTs(item.dueAt) : undefined;
        const entry: TimelineEntry = {
          id: item.id,
          item,
          start,
          end,
          isOverdue: item.isOverdue ?? (end ? end.getTime() < Date.now() : false),
          typeIcon: getTypeIcon(item),
          statusLabel: getStatusLabel(item.status),
          durationLabel: computeDuration(start, end),
        };
        return entry;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [items]);

  const groups = useMemo(() => {
    return entries.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
      const key = entry.start.toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="sb-card-glass-light p-10 text-center space-y-2">
        <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground" />
        <h3 className="font-medium">Sin elementos en el timeline</h3>
        <p className="text-sm text-muted-foreground">
          Crea tareas o proyectos con fechas para visualizar su evolución.
        </p>
      </div>
    );
  }

  const orderedKeys = Object.keys(groups).sort();

  return (
    <div className="sb-card-glass p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Evolución cronológica de tareas y proyectos.
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="w-2 h-2 rounded-full bg-[--sb-aqua]" />
            Tareas
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="w-2 h-2 rounded-full bg-[--sb-copper]" />
            Proyectos
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" aria-hidden />
        <div className="space-y-8">
          {orderedKeys.map((key) => {
            const dayEntries = groups[key];
            const day = dayEntries[0]?.start;
            return (
              <section key={key} className="relative pl-8">
                <div className="absolute left-0 top-1.5 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-semibold">
                    {day?.toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>

                <div className="space-y-4">
                  {dayEntries.map((entry) => {
                    const { item } = entry;
                    return (
                      <article
                        key={entry.id}
                        className="border border-border/60 rounded-xl p-4 bg-background/80 backdrop-blur-sm shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center ${
                                item.type === 'task'
                                  ? 'bg-[--sb-aqua]/15 text-[--sb-aqua]'
                                  : item.type === 'project'
                                    ? 'bg-[--sb-copper]/15 text-[--sb-copper]'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {entry.typeIcon}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold">{item.title}</h3>
                              {item.desc && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {item.desc}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                            <span className="uppercase tracking-wide font-semibold">
                              {entry.statusLabel}
                            </span>
                            {entry.durationLabel && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                                {entry.durationLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            <span>{entry.start.toLocaleDateString('es-ES')}</span>
                          </div>
                          {entry.end && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>vence {entry.end.toLocaleDateString('es-ES')}</span>
                            </div>
                          )}
                          {entry.isOverdue && (
                            <div className="flex items-center gap-1 text-destructive font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Vencido</span>
                            </div>
                          )}
                          {item.kpis && Object.keys(item.kpis).length > 0 && (
                            <div className="flex items-center gap-2">
                              {Object.entries(item.kpis)
                                .slice(0, 2)
                                .map(([kpi, value]) => (
                                  <span
                                    key={kpi}
                                    className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium"
                                  >
                                    {kpi}: {value}
                                  </span>
                                ))}
                              {Object.keys(item.kpis).length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{Object.keys(item.kpis).length - 2}
                                </span>
                              )}
                            </div>
                          )}
                          {item.participants && item.participants.length > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[--sb-green]" />
                              <span>
                                Equipo:{' '}
                                {item.participants.slice(0, 3).join(', ')}
                                {item.participants.length > 3
                                  ? ` +${item.participants.length - 3}`
                                  : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
