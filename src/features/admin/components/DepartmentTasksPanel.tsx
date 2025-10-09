// src/features/admin/components/DepartmentTasksPanel.tsx
"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { DEPT_META, type Department } from '@/domain/ssot';

export function DepartmentTasksPanel() {
  const { data } = useData();

  const tasksByDept = useMemo(() => {
    if (!data) return [];

    const depts: Department[] = ['VENTAS', 'MARKETING', 'PRODUCCION', 'CALIDAD', 'ALMACEN', 'FINANZAS'];
    
    return depts.map(dept => {
      const deptTasks = (data.interactions || []).filter(
        i => i.dept === dept && i.status === 'open'
      );
      
      const tasksWithUsers = deptTasks.map(task => {
        const user = data.teamMembers?.find(u => u.id === task.userId);
        const account = data.accounts?.find(a => a.id === task.accountId);
        return {
          task,
          userName: user?.name || user?.email || 'Sin asignar',
          accountName: account?.name || 'Sin cuenta',
        };
      });

      return {
        dept,
        label: DEPT_META[dept]?.label || dept,
        color: DEPT_META[dept]?.color || '#9ca3af',
        count: deptTasks.length,
        tasks: tasksWithUsers.slice(0, 5), // Mostrar solo las primeras 5
      };
    }).filter(d => d.count > 0); // Solo departamentos con tareas pendientes
  }, [data]);

  if (tasksByDept.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No hay tareas pendientes en ningún departamento
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasksByDept.map(({ dept, label, color, count, tasks }) => (
        <div key={dept} className="sb-card">
          <div className="sb-card__header">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: color }}
            />
            <h3 className="sb-card__title">{label}</h3>
            <div className="sb-badge ml-auto" data-variant="secondary">
              {count}
            </div>
          </div>
          <div className="sb-card__content">
            <div className="space-y-2">
              {tasks.map(({ task, userName, accountName }) => (
                <div 
                  key={task.id} 
                  className="p-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.note || task.title || 'Sin descripción'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {userName}
                    </span>
                    {task.plannedFor && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {new Date(task.plannedFor).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'short' 
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
