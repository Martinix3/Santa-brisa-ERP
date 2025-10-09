"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { Department } from '@/domain/ssot.v7';
import { TimeRange } from '@/lib/time-range-helpers';
import { getTareasDepartamento, formatTaskInfo } from '@/lib/dashboard-helpers';
import { AlertTriangle, Clock, User } from 'lucide-react';

type TasksPanelProps = {
  departamento: Department;
  timeRange: TimeRange;
  className?: string;
};

export function TasksPanel({ departamento, timeRange, className = '' }: TasksPanelProps) {
  const { data } = useData();
  
  const { vencidas, pendientes } = useMemo(() => {
    if (!data) return { vencidas: [], pendientes: [] };
    return getTareasDepartamento(data.interactions || [], departamento, timeRange);
  }, [data, departamento, timeRange]);
  
  if (!data) {
    return (
      <div className={`bg-card border rounded-lg p-4 ${className}`}>
        <p className="text-sm text-muted-foreground">Cargando tareas...</p>
      </div>
    );
  }
  
  return (
    <div className={`bg-card border rounded-lg ${className}`}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Tareas del Departamento</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Solo lectura - Para editar, ir a la sección de tareas
        </p>
      </div>
      
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {/* Tareas Vencidas */}
        {vencidas.length > 0 && (
          <div className="p-4 bg-orange-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-orange-600" />
              <h4 className="font-semibold text-sm text-orange-800">
                Vencidas ({vencidas.length})
              </h4>
            </div>
            <div className="space-y-2">
              {vencidas.map(task => {
                const info = formatTaskInfo(task, data);
                return (
                  <div
                    key={task.id}
                    className="bg-white rounded border border-orange-200 p-3"
                  >
                    <p className="font-medium text-sm text-gray-900 mb-2">
                      {info.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {info.owner}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {info.date}
                        {info.daysOverdue && (
                          <span className="text-orange-600 font-medium">
                            (hace {info.daysOverdue}d)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Tareas Pendientes */}
        {pendientes.length > 0 && (
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-3 text-muted-foreground">
              Pendientes ({pendientes.length})
            </h4>
            <div className="space-y-2">
              {pendientes.map(task => {
                const info = formatTaskInfo(task, data);
                return (
                  <div
                    key={task.id}
                    className="bg-secondary/50 rounded border p-3"
                  >
                    <p className="font-medium text-sm text-gray-900 mb-2">
                      {info.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {info.owner}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {info.date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Estado vacío */}
        {vencidas.length === 0 && pendientes.length === 0 && (
          <div className="p-8 text-center">
            <Clock size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay tareas para este periodo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
