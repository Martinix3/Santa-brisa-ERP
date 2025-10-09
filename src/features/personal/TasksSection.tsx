"use client";
import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { CheckCircle2, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { daysSince } from '@/lib/pipeline-helpers';
import { cn } from '@/lib/utils';
import { DEPT_META, Department } from '@/domain/ssot';

type TimeRange = 'day' | 'week' | 'month';

type TasksSectionProps = {
  timeRange: TimeRange;
  onCompleteTask: (taskId: string) => void;
  onRescheduleTask: (taskId: string, date: string) => void;
};

export function TasksSection({ 
  timeRange, 
  onCompleteTask,
  onRescheduleTask 
}: TasksSectionProps) {
  const { data, currentUser } = useData();

  const tasks = useMemo(() => {
    if (!data || !currentUser) return [];

    return (data.interactions || [])
      .filter(i => i.userId === currentUser.id)
      .filter(i => i.status !== 'REJECTED')
      .sort((a, b) => {
        const dateA = (a as any).startAt || a.plannedFor || a.createdAt;
        const dateB = (b as any).startAt || b.plannedFor || b.createdAt;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
  }, [data, currentUser]);

  // Separar tareas vencidas y pendientes
  const { overdueTasks, pendingTasks, completedTasks } = useMemo(() => {
    const now = new Date();
    
    const overdue = tasks.filter(t => {
      if (t.status === 'done') return false;
      const plannedDate = (t as any).startAt || t.plannedFor;
      if (!plannedDate) return false;
      return daysSince(plannedDate) > 0;
    });

    const pending = tasks.filter(t => {
      if (t.status === 'done') return false;
      const plannedDate = (t as any).startAt || t.plannedFor;
      if (!plannedDate) return true; // Sin fecha = pendiente
      return daysSince(plannedDate) <= 0;
    });

    const completed = tasks.filter(t => t.status === 'done');

    return { overdueTasks: overdue, pendingTasks: pending, completedTasks: completed };
  }, [tasks]);

  const getAccountName = (accountId: string) => {
    return data?.accounts?.find(a => a.id === accountId)?.name || 'Sin cuenta';
  };

  const [rescheduleDialogTask, setRescheduleDialogTask] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const getDepartmentInfo = (dept?: Department) => {
    if (!dept) return { label: 'General', color: '#9ca3af', textColor: '#ffffff' };
    return DEPT_META[dept] || { label: dept, color: '#9ca3af', textColor: '#ffffff' };
  };

  const getTimeUntilDue = (plannedDate: string) => {
    const days = -daysSince(plannedDate); // Negativo porque daysSince cuenta desde la fecha
    if (days < 0) return { text: `Vencida hace ${Math.abs(days)}d`, color: 'text-red-600', urgent: true };
    if (days === 0) return { text: 'Vence hoy', color: 'text-orange-600', urgent: true };
    if (days === 1) return { text: 'Vence mañana', color: 'text-amber-600', urgent: false };
    if (days <= 3) return { text: `Vence en ${days}d`, color: 'text-amber-500', urgent: false };
    return { text: `En ${days}d`, color: 'text-slate-500', urgent: false };
  };

  const handleReschedule = (task: any) => {
    setRescheduleDialogTask(task);
    const plannedDate = (task as any).startAt || task.plannedFor;
    setRescheduleDate(plannedDate ? new Date(plannedDate).toISOString().split('T')[0] : '');
  };

  const confirmReschedule = () => {
    if (rescheduleDialogTask && rescheduleDate) {
      onRescheduleTask(rescheduleDialogTask.id, rescheduleDate);
      setRescheduleDialogTask(null);
      setRescheduleDate('');
    }
  };

  const TaskItem = ({ task, isOverdue }: { task: any; isOverdue?: boolean }) => {
    const plannedDate = (task as any).startAt || task.plannedFor;
    const daysOverdue = plannedDate ? daysSince(plannedDate) : 0;
    const deptInfo = getDepartmentInfo(task.dept);
    const timeInfo = plannedDate ? getTimeUntilDue(plannedDate) : null;

    return (
      <div
        className={cn(
          "border rounded-lg p-3 hover:shadow-md transition-shadow relative",
          isOverdue 
            ? "bg-red-50 border-red-300" 
            : task.status === 'done'
            ? "bg-green-50 border-green-200 opacity-60"
            : timeInfo?.urgent
            ? "bg-orange-50 border-orange-200"
            : "bg-card"
        )}
      >
        {/* Barra lateral de departamento */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: deptInfo.color }}
        />

        <div className="flex items-start gap-3 pl-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <p className={cn(
                "font-medium text-sm flex-1",
                task.status === 'done' && "line-through text-muted-foreground"
              )}>
                {task.note || task.title || 'Tarea sin descripción'}
              </p>
              
              {/* Badge de departamento */}
              <span 
                className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                style={{ 
                  backgroundColor: deptInfo.color,
                  color: deptInfo.textColor
                }}
              >
                {deptInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span>{getAccountName(task.accountId)}</span>
              {plannedDate && timeInfo && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(plannedDate).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'short' 
                    })}
                  </span>
                  <span className={cn("font-medium", timeInfo.color)}>
                    ({timeInfo.text})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          {task.status !== 'done' && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onCompleteTask(task.id)}
                className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                title="Completar tarea"
              >
                <CheckCircle2 size={16} className="text-green-600" />
              </button>
              <button
                onClick={() => handleReschedule(task)}
                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                title="Reprogramar tarea"
              >
                <Calendar size={16} className="text-blue-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mis Tareas</h2>

      {/* Tareas Vencidas */}
      {overdueTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Vencidas ({overdueTasks.length})
          </h3>
          <div className="space-y-2">
            {overdueTasks.slice(0, 5).map(task => (
              <TaskItem key={task.id} task={task} isOverdue />
            ))}
          </div>
        </div>
      )}

      {/* Tareas Pendientes */}
      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Pendientes ({pendingTasks.length})
          </h3>
          <div className="space-y-2">
            {pendingTasks.slice(0, 10).map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Tareas Completadas (últimas 5) */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green-700 mb-2">
            Completadas ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tienes tareas</p>
        </div>
      )}

      {/* Dialog de reprogramación */}
      {rescheduleDialogTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRescheduleDialogTask(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Reprogramar Tarea</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {rescheduleDialogTask.note || 'Tarea sin descripción'}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nueva fecha</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRescheduleDialogTask(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReschedule}
                  disabled={!rescheduleDate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
