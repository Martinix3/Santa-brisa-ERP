'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useMemo, useState } from 'react';
import type { WorkItem } from '@/domain/workitem';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface WorkCalendarProps {
  items: WorkItem[];
}

type DayBucket = {
  date: Date;
  iso: string;
  entries: WorkItem[];
};

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function WorkCalendar({ items }: WorkCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const { days, buckets, currentMonthLabel, totalCount } = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const grouped: Record<string, WorkItem[]> = {};
    items.forEach((item) => {
      const target = item.dueAt ?? item.createdAt;
      if (!target) return;
      const dayIso = format(new Date(target), 'yyyy-MM-dd');
      if (!grouped[dayIso]) grouped[dayIso] = [];
      grouped[dayIso].push(item);
    });

    const buckets: Record<string, DayBucket> = allDays.reduce((acc, day) => {
      const iso = format(day, 'yyyy-MM-dd');
      acc[iso] = {
        date: day,
        iso,
        entries: (grouped[iso] ?? []).sort((a, b) => {
          const aPriority = priorityWeight(a.priority);
          const bPriority = priorityWeight(b.priority);
          if (aPriority !== bPriority) return bPriority - aPriority;
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return aDue - bDue;
        }),
      };
      return acc;
    }, {} as Record<string, DayBucket>);

    return {
      days: allDays,
      buckets,
      currentMonthLabel: format(monthStart, "MMMM yyyy", { locale: es }),
      totalCount: items.length,
    };
  }, [items, cursor]);

  return (
    <div className="sb-card-glass p-6 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold capitalize">{currentMonthLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'elemento planificado' : 'elementos planificados'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              aria-label="Mes anterior"
              className="sb-btn sb-btn--ghost"
              onClick={() => setCursor((value) => subMonths(value, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Mes siguiente"
              className="sb-btn sb-btn--ghost"
              onClick={() => setCursor((value) => addMonths(value, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className="sb-btn sb-btn--secondary"
              onClick={() => setCursor(startOfMonth(new Date()))}
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <LegendDot className="bg-[--sb-aqua]" label="Tareas" />
            <LegendDot className="bg-[--sb-copper]" label="Proyectos" />
            <LegendDot className="bg-primary/80" label="En curso" />
            <LegendDot className="bg-muted" label="Backlog" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="px-2 py-1 text-center uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd');
          const bucket = buckets[iso];
          const entries = bucket?.entries ?? [];
          const displayEntries = entries.slice(0, 3);
          const overflow = entries.length - displayEntries.length;
          const perType = summariseByType(entries);

          const isCurrentMonth = isSameMonth(day, cursor);
          const today = isToday(day);

          return (
            <article
              key={iso}
              className={[
                'relative min-h-[110px] rounded-xl border p-2 transition-all',
                today ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : '',
                !isCurrentMonth ? 'border-border/40 bg-muted/20 text-muted-foreground' : 'border-border bg-card hover:border-primary/40',
              ].join(' ')}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className={['text-sm font-semibold', today ? 'text-primary' : ''].join(' ')}>
                    {format(day, 'd')}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {perType.task > 0 && <TypeBadge tone="task" label={`${perType.task} T`} />}
                    {perType.project > 0 && <TypeBadge tone="project" label={`${perType.project} P`} />}
                  </div>
                </div>

                <span className="text-[10px] font-medium text-muted-foreground">
                  {format(day, 'MMM', { locale: es })}
                </span>
              </header>

              <ul className="mt-3 space-y-1.5">
                {displayEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className={[
                      'rounded-lg border px-2 py-1.5 text-[11px] leading-tight shadow-sm',
                      entry.type === 'task'
                        ? 'border-[--sb-aqua]/40 bg-[--sb-aqua]/10 text-[--sb-aqua-strong]'
                        : 'border-[--sb-copper]/40 bg-[--sb-copper]/10 text-[--sb-copper-strong]',
                      entry.status === 'IN_PROGRESS' ? 'ring-1 ring-primary/40' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-medium">{entry.title}</span>
                      <span className="uppercase text-[9px] text-muted-foreground">
                        {statusLabel(entry.status)}
                      </span>
                    </div>
                    {entry.dueAt && (
                      <div className="mt-0.5 text-[9px] text-muted-foreground">
                        {format(new Date(entry.dueAt), 'HH:mm')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {overflow > 0 && (
                <div className="mt-2 text-[10px] font-medium text-muted-foreground">
                  +{overflow} más
                </div>
              )}

              {entries.length === 0 && (
                <div className="mt-4 flex h-[60px] flex-col items-center justify-center text-[10px] text-muted-foreground">
                  <CalendarDays className="mb-1 h-4 w-4 opacity-60" />
                  Sin planes
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function priorityWeight(priority?: WorkItem['priority']) {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function statusLabel(status?: WorkItem['status']) {
  switch (status) {
    case 'DONE':
      return 'Done';
    case 'IN_PROGRESS':
      return 'En curso';
    default:
      return 'Backlog';
  }
}

function summariseByType(entries: WorkItem[]) {
  return entries.reduce(
    (acc, entry) => {
      if (entry.type === 'project') acc.project += 1;
      else acc.task += 1;
      return acc;
    },
    { task: 0, project: 0 }
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function TypeBadge({ tone, label }: { tone: 'task' | 'project'; label: string }) {
  const palette =
    tone === 'task'
      ? 'bg-[--sb-aqua]/15 text-[--sb-aqua-strong]'
      : 'bg-[--sb-copper]/15 text-[--sb-copper-strong]';
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${palette}`}>{label}</span>;
}
