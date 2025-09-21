

"use client";
import React, { useMemo } from 'react';
import { DndContext, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import type { Department, InteractionStatus, User, Interaction } from '@/domain';
import { Check, AlertCircle, Clock } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { DEPT_META } from '@/domain';
import { Avatar } from '@/components/ui/Avatar';

export type Task = {
  id: string;
  title: string;
  type: Department;
  status: InteractionStatus;
  date?: string;
  involvedUserIds?: string[];
  location?: string;
  linkedEntity?: Interaction['linkedEntity'];
};

type ColumnId = 'overdue' | 'upcoming' | 'done';

const KANBAN_COLS: { id: ColumnId; label: string; icon: React.ElementType; headerColor: string }[] = [
  { id: 'overdue', label: 'Atrasadas', icon: AlertCircle, headerColor: 'text-rose-600' },
  { id: 'upcoming', label: 'Programadas', icon: Clock, headerColor: 'text-cyan-600' },
  { id: 'done', label: 'Hechas', icon: Check, headerColor: 'text-emerald-600' },
];

function TaskCard({
  task,
  typeStyles,
  onComplete,
}: {
  task: Task;
  typeStyles: Record<Department, { label: string; color: string; textColor: string }>;
  onComplete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const { data: santaData } = useData();
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const typeStyle = (typeStyles as Record<Department, { label: string; color: string; textColor: string }>)[task.type] || {};

  const involvedUsers = (task.involvedUserIds || [])
    .map((id) => santaData?.users.find((u) => u.id === id))
    .filter(Boolean) as User[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-white rounded-lg border shadow-sm group cursor-grab active:cursor-grabbing"
      role="listitem"
    >
      <p className="font-medium text-sm text-zinc-800">{task.title}</p>
      {task.location && <p className="text-xs text-zinc-500 mt-1">{task.location}</p>}

      <div className="mt-2 flex justify-between items-center">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: typeStyle.color, color: typeStyle.textColor }}
        >
          {typeStyle.label}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {involvedUsers.map((user) => (
              <Avatar key={user.id} name={user.name} size="sm" />
            ))}
          </div>
          {task.date && (
            <time className="text-xs text-zinc-500" dateTime={new Date(task.date).toISOString()}>
              {new Date(task.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
            </time>
          )}
          {task.status === 'open' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
              className="p-1 rounded-md text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-green-100 hover:text-green-600 transition-opacity"
              title="Marcar como completada"
            >
              <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusColumn({
  col,
  tasks,
  typeStyles,
  onCompleteTask,
  subGroups,
}: {
  col: (typeof KANBAN_COLS)[number];
  tasks: Task[];
  typeStyles: Record<Department, { label: string; color: string; textColor: string }>;
  onCompleteTask: (id: string) => void;
  subGroups?: { title: string; tasks: Task[] }[];
}) {
  const { setNodeRef } = useDroppable({ id: col.id });

  const renderTasks = (tasksToRender: Task[]) => {
    if (tasksToRender.length === 0) {
      return (
        <div className="text-xs text-zinc-500 bg-white/60 border border-dashed border-zinc-300 rounded-lg px-3 py-6 text-center">
          Sin tareas
        </div>
      );
    }
    return tasksToRender.map((task) => (
      <TaskCard key={task.id} task={task} typeStyles={typeStyles} onComplete={onCompleteTask} />
    ));
  };

  return (
    <div ref={setNodeRef} className="bg-zinc-100/70 p-3 rounded-xl w-full" role="list" aria-label={col.label}>
      <h3 className={`flex items-center gap-2 font-semibold px-1 mb-3 ${col.headerColor}`}>
        <col.icon size={18} />
        {col.label}
        <span className="text-sm font-normal text-zinc-500">{tasks.length}</span>
      </h3>

      <div className="space-y-3 min-h-[100px]">
        {subGroups ? (
          subGroups.map((group, index) => (
            <div key={index}>
              {group.tasks.length > 0 && (
                 <>
                    <h4 className="text-xs font-semibold text-zinc-500 mb-2 px-1">{group.title} ({group.tasks.length})</h4>
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

export function TaskBoard({
  tasks,
  onTaskStatusChange,
  onCompleteTask,
  typeStyles = DEPT_META,
}: {
  tasks: Task[];
  onTaskStatusChange: (id: string, newStatus: InteractionStatus) => void;
  onCompleteTask: (id: string) => void;
  typeStyles?: Record<Department, { label: string; color: string; textColor: string }>;
}) {
  const categorizedTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const byDateAsc = (a?: string, b?: string) => (a ? +new Date(a) : 0) - (b ? +new Date(b) : 0);
    
    const openTasks = tasks.filter((t) => t.status === 'open');
    
    const upcoming = openTasks
      .filter((t) => t.date && new Date(t.date) >= todayStart)
      .sort((a, b) => byDateAsc(a.date, b.date));

    const today = upcoming.filter(t => t.date && new Date(t.date) <= todayEnd);
    const future = upcoming.filter(t => t.date && new Date(t.date) > todayEnd);
    
    const overdue = openTasks
      .filter((t) => !t.date || new Date(t.date) < todayStart)
      .sort((a, b) => byDateAsc(a.date, b.date));
      
    const done = tasks.filter((t) => t.status === 'done');

    return { upcoming, today, future, overdue, done };
  }, [tasks]);

  function handleDragEnd(event: any) {
    const { over, active } = event;
    if (!over || !active) return;
    const newColId = over.id as ColumnId;
    if (newColId !== 'done') return; // solo acción al soltar en "Hechas"
    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'done') return;
    onCompleteTask(taskId);
  }

  const upcomingSubgroups = [
      { title: 'Hoy', tasks: categorizedTasks.today },
      { title: 'Próximos Días', tasks: categorizedTasks.future },
  ];

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusColumn
          key="overdue"
          col={KANBAN_COLS[0]}
          tasks={categorizedTasks.overdue}
          typeStyles={typeStyles}
          onCompleteTask={onCompleteTask}
        />
        <StatusColumn
          key="upcoming"
          col={KANBAN_COLS[1]}
          tasks={categorizedTasks.upcoming}
          typeStyles={typeStyles}
          onCompleteTask={onCompleteTask}
          subGroups={upcomingSubgroups}
        />
        <StatusColumn
          key="done"
          col={KANBAN_COLS[2]}
          tasks={categorizedTasks.done}
          typeStyles={typeStyles}
          onCompleteTask={onCompleteTask}
        />
      </div>
    </DndContext>
  );
}
