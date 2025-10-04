// src/features/agenda/TaskBoard.tsx
"use client";

import React, { useMemo } from 'react';
import type { Department, Interaction, InteractionStatus, User } from '@/domain/ssot';
import { Check, AlertCircle, Clock, Plus } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useData } from '@/lib/dataprovider';
import { DEPT_META } from '@/domain/ssot';
import { Avatar } from '@/components/ui/Avatar';
import { SBCard, SBButton } from '@/components/ui';

// This is the VIEW MODEL for a task card.
export type Task = Interaction & {
  originalInteraction: Interaction;
};

// ===============================
// Tarjeta de tarea
// ===============================
function TaskCard({ task, onComplete }: { task: Task; onComplete: (id: string) => void; }) {
  const { data } = useData();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: task.id,
      data: task.originalInteraction,
  });
  const deptMeta = DEPT_META[task.dept as Department];

  const involvedUsers = useMemo(() => 
    (task.involvedUserIds || [])
      .map((id) => data?.users.find((u) => u.id === id))
      .filter((u): u is User => !!u),
    [task.involvedUserIds, data?.users]
  );

  const dateLabel = task.plannedFor ? new Date(task.plannedFor) : null;
  
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        data-event={JSON.stringify(task.originalInteraction)}
        className="touch-none"
    >
        <SBCard noPadding className="group">
            <div className="p-3">
                <div className="flex items-start justify-between">
                    <p className="font-medium text-sm text-text-primary">{task.title}</p>
                </div>

                {task.location && <p className="text-xs mt-1 text-text-muted">{task.location}</p>}

                <div className="mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                    {dateLabel && (
                        <time className="text-xs text-text-muted" dateTime={dateLabel.toISOString()}>
                        {dateLabel.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </time>
                    )}
                    {task.status === 'open' && (
                        <SBButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onComplete(task.id); } }}
                        className="p-1 rounded-md transition-opacity text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-green-100 hover:text-green-600"
                        title="Marcar como completada"
                        aria-label="Marcar como completada"
                        >
                        <Check size={16} />
                        </SBButton>
                    )}
                </div>
                <div className="flex -space-x-2">
                    {involvedUsers.map((user) => (
                        <Avatar key={user.id} name={user.name} size="md" />
                    ))}
                    </div>
                </div>
            </div>
        </SBCard>
    </div>
  );
}

// ===============================
// Columnas Kanban
// ===============================

type ColumnId = 'overdue' | 'upcoming' | 'done';

const KANBAN_COLS: { id: ColumnId; label: string; icon: React.ElementType; headerColor: string }[] = [
  { id: 'overdue', label: 'Atrasadas',  icon: AlertCircle, headerColor: '#991b1b' }, // rojo semántico sólo aquí
  { id: 'upcoming', label: 'Programadas', icon: Clock,      headerColor: '#374151' },
  { id: 'done',    label: 'Hechas',      icon: Check,      headerColor: '#065f46' },
];

// ===============================
// Utilidades de fecha
// ===============================
const toISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);


// ===============================
// Columna de estado (ahora sección vertical)
// ===============================
function StatusSection({
  col,
  tasks,
  onCompleteTask,
  subGroups,
  onNewTask,
}: {
  col: (typeof KANBAN_COLS)[number];
  tasks: Task[];
  onCompleteTask: (id: string) => void;
  subGroups?: { title: string; tasks: Task[] }[];
  onNewTask?: () => void;
}) {
  const renderTasks = (tasksToRender: Task[]) => {
    if (tasksToRender.length === 0) {
      return (
        <div className="text-xs text-zinc-500 bg-white/60 border border-dashed rounded-lg px-3 py-6 text-center">
          Sin tareas
        </div>
      );
    }
    return tasksToRender.map((task) => (
      <TaskCard key={task.id} task={task} onComplete={onCompleteTask} />
    ));
  };

  return (
    <div role="list" aria-label={col.label}>
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="flex items-center gap-2 font-semibold" style={{ color: col.headerColor }}>
          <col.icon size={18} />
          {col.label}
          <span className="text-sm font-normal text-text-muted">{tasks.length}</span>
        </h3>
        {onNewTask && col.id === 'upcoming' && (
          <SBButton variant="secondary" size="sm" onClick={onNewTask} title="Añadir nueva tarea" aria-label="Añadir nueva tarea">
            <Plus size={16} strokeWidth={2.5} />
          </SBButton>
        )}
      </div>

      <div className="space-y-3">
        {subGroups ? (
          subGroups.map((group, index) => (
            <div key={index}>
              {group.tasks.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold mb-2 px-1 text-text-muted">
                    {group.title} ({group.tasks.length})
                  </h4>
                  <div className="space-y-3">{renderTasks(group.tasks)}</div>
                </>
              )}
            </div>
          ))
        ) : (
          renderTasks(tasks)
        )}
      </div>
    </div>
  );
}

// ===============================
// Tablero
// ===============================
export function TaskBoard({
  tasks,
  onCompleteTask,
  onNewTask,
}: {
  tasks: Task[];
  onCompleteTask: (id: string) => void;
  onNewTask?: () => void;
}) {

  const categorizedTasks = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const byDateAsc = (a?: string, b?: string) => (a ? +new Date(a) : 0) - (b ? +new Date(b) : 0);

    const openTasks = tasks.filter((t) => t.status === 'open');

    const upcoming = openTasks
      .filter((t) => t.plannedFor && new Date(t.plannedFor) >= todayStart)
      .sort((a, b) => byDateAsc(a.plannedFor, b.plannedFor));

    const today = upcoming.filter((t) => t.plannedFor && new Date(t.plannedFor) <= todayEnd);
    const future = upcoming.filter((t) => t.plannedFor && new Date(t.plannedFor) > todayEnd);

    const overdue = openTasks
      .filter((t) => !t.plannedFor || new Date(t.plannedFor) < todayStart)
      .sort((a, b) => byDateAsc(a.plannedFor, b.plannedFor));

    const done = tasks.filter((t) => t.status === 'done');

    return { upcoming, today, future, overdue, done };
  }, [tasks]);


  const upcomingSubgroups = [
    { title: 'Hoy', tasks: categorizedTasks.today },
    { title: 'Próximos Días', tasks: categorizedTasks.future },
  ];

  return (
    <div className="space-y-8">
      <StatusSection col={KANBAN_COLS[0]} tasks={categorizedTasks.overdue} onCompleteTask={onCompleteTask} />
      <StatusSection col={KANBAN_COLS[1]} tasks={categorizedTasks.upcoming} onCompleteTask={onCompleteTask} subGroups={upcomingSubgroups} onNewTask={onNewTask} />
      <StatusSection col={KANBAN_COLS[2]} tasks={categorizedTasks.done} onCompleteTask={onCompleteTask} />
    </div>
  );
}
