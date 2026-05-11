/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from "react";
import { Calendar, Flag, Check } from "lucide-react";
import type { TaskWithKPIs } from "@/types/tasks";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithKPIs;
  onClick: () => void;
  onQuickDone?: (e: React.MouseEvent) => void;
  onQuickTogglePriority?: (e: React.MouseEvent) => void;
}

export function TaskCard({ 
  task, 
  onClick, 
  onQuickDone, 
  onQuickTogglePriority 
}: TaskCardProps) {
  // Determine border color based on status
  const getBorderColor = () => {
    if (task.isOverdue) return "border-l-red-500";
    if (task.status === "DONE") return "border-l-green-500";
    if (task.status === "IN_PROGRESS") return "border-l-blue-500";
    if (task.isPriority) return "border-l-yellow-500";
    return "border-l-gray-300";
  };

  // Format due date
  const formatDueDate = () => {
    if (!task.dueAt) return null;
    
    const dueDate = new Date(task.dueAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    if (dueDate < today) {
      return `Vencida hace ${Math.abs(task.daysUntilDue || 0)} días`;
    } else if (dueDate >= today && dueDate < tomorrow) {
      return "Hoy";
    } else if (task.daysUntilDue === 1) {
      return "Mañana";
    } else if (task.daysUntilDue && task.daysUntilDue <= 7) {
      return `En ${task.daysUntilDue} días`;
    } else {
      return dueDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }
  };

  const dueText = formatDueDate();

  return (
    <div
      onClick={onClick}
      className={cn(
        "sb-card-glass-light rounded-xl p-4 border-l-4 cursor-pointer",
        "transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
        getBorderColor()
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1 line-clamp-2">
            {task.title}
          </h3>
          {task.desc && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.desc}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {onQuickDone && task.status !== "DONE" && (
            <button
              onClick={onQuickDone}
              className="p-1.5 rounded border border-border/40 bg-background/60 hover:bg-background hover:scale-110 transition-all"
              title="Marcar como hecha"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {onQuickTogglePriority && (
            <button
              onClick={onQuickTogglePriority}
              className={cn(
                "p-1.5 rounded border border-border/40 hover:scale-110 transition-all",
                task.isPriority 
                  ? "bg-yellow-100 text-yellow-700" 
                  : "bg-background/60 hover:bg-background"
              )}
              title={task.isPriority ? "Quitar prioritaria" : "Marcar como prioritaria"}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Footer: Badges and Info */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Department Badge */}
        <span 
          className={cn(
            `dept-${task.department}`,
            "px-2 py-0.5 rounded-full text-xs font-medium"
          )}
          style={{
            backgroundColor: `rgb(var(--dept-badge-bg) / 0.6)`,
            color: `rgb(var(--dept-badge-text))`,
          }}
        >
          {task.department}
        </span>

        {/* Status Badge */}
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          task.status === "DONE" && "bg-green-100 text-green-700 border border-green-300",
          task.status === "IN_PROGRESS" && "bg-blue-100 text-blue-700 border border-blue-300",
          task.status === "BACKLOG" && "bg-gray-100 text-gray-700 border border-gray-300"
        )}>
          {task.status === "DONE" ? "Completada" : 
           task.status === "IN_PROGRESS" ? "En Progreso" : 
           "Por Hacer"}
        </span>

        {/* Priority Badge */}
        {task.isPriority && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs font-medium">
            PRIORITARIA
          </span>
        )}

        {/* Overdue Badge */}
        {task.isOverdue && (
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-xs font-medium">
            VENCIDA
          </span>
        )}

        {/* Due Date */}
        {dueText && (
          <span className={cn(
            "flex items-center gap-1 text-xs",
            task.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
          )}>
            <Calendar className="w-3 h-3" />
            {dueText}
          </span>
        )}
      </div>
    </div>
  );
}
