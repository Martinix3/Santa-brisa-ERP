"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";
import type { TaskNew } from "@/domain/ssot";

interface AccountTasksTabProps {
  accountId: string;
  tasks: TaskNew[];
  onCreateTask?: () => void;
  onToggleTask?: (taskId: string) => void;
}

export function AccountTasksTab({ 
  accountId, 
  tasks, 
  onCreateTask, 
  onToggleTask 
}: AccountTasksTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all');

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return task.status !== 'DONE';
    return task.status === 'DONE';
  });

  // Group by status
  const openTasks = tasks.filter(t => t.status !== 'DONE');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'MEDIUM':
        return <Clock size={16} className="text-orange-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'DONE') {
      return <CheckCircle2 size={20} className="text-green-500" />;
    }
    return <Circle size={20} className="text-muted-foreground" />;
  };

  const isOverdue = (task: TaskNew) => {
    if (!task.dueAt || task.status === 'DONE') return false;
    return new Date(task.dueAt) < new Date();
  };

  if (tasks.length === 0) {
    return (
      <div className="sb-card-glass-light p-8 text-center">
        <h3 className="font-semibold text-lg mb-2">No hay tareas asignadas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Crea una tarea para gestionar el seguimiento de esta cuenta
        </p>
        <button
          onClick={onCreateTask}
          className="sb-btn sb-btn--primary"
        >
          <Plus size={16} />
          <span>Crear Tarea</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`sb-btn ${statusFilter === 'all' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`sb-btn ${statusFilter === 'open' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
          >
            Abiertas ({openTasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('done')}
            className={`sb-btn ${statusFilter === 'done' ? 'sb-btn--primary' : 'sb-btn--ghost'}`}
          >
            Completadas ({doneTasks.length})
          </button>
        </div>

        <button
          onClick={onCreateTask}
          className="sb-btn sb-btn--primary"
        >
          <Plus size={16} />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Tasks list */}
      {filteredTasks.length === 0 ? (
        <div className="sb-card-glass-light p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay tareas {statusFilter === 'open' ? 'abiertas' : 'completadas'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className={`
                  sb-card-glass-light p-4 hover-raise cursor-pointer transition-all
                  ${overdue ? 'border-l-4 border-l-red-500' : ''}
                  ${task.status === 'DONE' ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTask?.(task.id);
                    }}
                    className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    {getStatusIcon(task.status)}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium text-sm ${
                          task.status === 'DONE' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {task.title}
                        </h4>
                        {task.priority && (
                          <div className="flex-shrink-0">
                            {getPriorityIcon(task.priority)}
                          </div>
                        )}
                      </div>
                      {task.dueAt && (
                        <span className={`text-xs whitespace-nowrap ${
                          overdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                        }`}>
                          {overdue && '⚠️ '}
                          {format(new Date(task.dueAt), "dd MMM", { locale: es })}
                        </span>
                      )}
                    </div>

                    {task.desc && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {task.desc}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="sb-badge sb-badge--default">
                        {task.kind}
                      </span>
                      {task.priority && (
                        <span className={`sb-badge ${
                          task.priority === 'URGENT' || task.priority === 'HIGH'
                            ? 'sb-badge--destructive'
                            : 'sb-badge--default'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                      {task.status !== 'DONE' && task.status !== 'BACKLOG' && (
                        <span className="sb-badge sb-badge--primary">
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
