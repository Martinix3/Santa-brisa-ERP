// src/features/personal/components/TaskItem.tsx
"use client";
import React from 'react';
import { cn } from '@/lib/utils';
import type { Interaction, Department } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { CheckCircle2, Calendar, Clock } from 'lucide-react';
import { daysSince } from '@/lib/pipeline-helpers';

const getDepartmentInfo = (dept?: Department) => {
  if (!dept) return { label: 'General', color: 'hsl(var(--sb-accent-admin))' };
  const meta = DEPT_META[dept];
  return { label: meta?.label || dept, color: meta?.color || 'hsl(var(--muted-foreground))' };
};

const getTimeUntilDue = (plannedDate: string) => {
  const days = -daysSince(plannedDate);
  if (days < 0) return { text: `Vencida hace ${Math.abs(days)}d`, colorClass: 'text-destructive', urgent: true };
  if (days === 0) return { text: 'Vence hoy', colorClass: 'text-[hsl(var(--sb-accent-ventas))]', urgent: true };
  if (days === 1) return { text: 'Vence mañana', colorClass: 'text-[hsl(var(--primary))]', urgent: false };
  return { text: `En ${days}d`, colorClass: 'text-muted-foreground', urgent: false };
};

interface Props {
  task: Interaction;
  accountName?: string;
  onComplete: (taskId: string) => void;
  onReschedule: (task: Interaction) => void;
}

export function TaskItem({ task, accountName, onComplete, onReschedule }: Props) {
  const plannedDate = (task as any).startAt || task.plannedFor;
  const isOverdue = task.status !== 'done' && plannedDate && new Date(plannedDate) < new Date();
  const deptInfo = getDepartmentInfo(task.dept);
  const timeInfo = plannedDate ? getTimeUntilDue(plannedDate) : null;
  
  return (
    <div className={cn(
      "sb-card p-0 overflow-hidden hover-raise",
      isOverdue && "border-destructive/30",
      task.status === 'done' && "bg-secondary opacity-70",
      timeInfo?.urgent && !isOverdue && "border-primary/30"
    )}>
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch" style={{ backgroundColor: deptInfo.color }} />
        <div className="flex-1 py-3 pr-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium text-sm", task.status === 'done' && "line-through text-muted-foreground")}>
                {task.note || 'Tarea sin descripción'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                {accountName && <span>{accountName}</span>}
                {plannedDate && timeInfo && (
                  <>
                    {accountName && <span>•</span>}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(plannedDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className={cn("font-medium", timeInfo.colorClass)}>
                      ({timeInfo.text})
                    </span>
                  </>
                )}
              </div>
            </div>
            {task.status !== 'done' && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onComplete(task.id)}
                  className="p-1.5 hover:bg-success/10 rounded-lg transition-colors"
                  title="Completar tarea"
                >
                  <CheckCircle2 size={16} className="text-success" />
                </button>
                <button
                  onClick={() => onReschedule(task)}
                  className="p-1.5 hover:bg-info/10 rounded-lg transition-colors"
                  title="Reprogramar tarea"
                >
                  <Calendar size={16} className="text-info-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
