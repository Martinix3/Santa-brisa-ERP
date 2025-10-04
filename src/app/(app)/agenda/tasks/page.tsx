// src/app/(app)/agenda/tasks/page.tsx
"use client";

import React, { Suspense, useEffect, useCallback, useState } from 'react';
import type { Task } from '@/features/agenda/hooks/useTasks';
import { useTasks } from '@/features/agenda/hooks/useTasks';
import { TasksHeader } from '@/features/agenda/components/TasksHeader';
import { TasksSidebar } from '@/features/agenda/components/TasksSidebar';
import { TasksCalendarSwitcher } from '@/features/agenda/components/TasksCalendarSwitcher';
import { TaskList } from '@/features/agenda/components/TaskList';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { NewTaskDialog } from '@/features/agenda/components/NewTaskDialog';
import { toast } from 'sonner';

function TasksPageContent() {
  const { 
    filters, setFilters, tasks, aggregates, isLoading, error,
    addTask, updateTask, completeTask, deleteTask
  } = useTasks();

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  const handleNewTask = useCallback(() => {
    console.info('[Telemetry] task_dialog_opened', { variant: 'create' });
    setIsNewTaskOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    console.info('[Telemetry] task_dialog_opened', { variant: 'edit', taskId: task.id });
    setEditingTask(task);
    // For simplicity, we reuse the NewTaskDialog for editing
    setIsNewTaskOpen(true); 
  }, []);

  const handleCompleteTask = useCallback((task: Task) => {
    console.info('[Telemetry] task_dialog_opened', { variant: 'complete', taskId: task.id });
    setCompletingTask(task);
  }, []);
  
  const handleDeleteTask = useCallback((taskId: string) => {
    if(window.confirm("¿Seguro que quieres borrar esta tarea?")) {
        deleteTask(taskId);
        toast.warning(`Tarea (ID: ${taskId}) borrada localmente.`);
    }
  }, [deleteTask]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }
        if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleNewTask();
        }
        if (e.key === '/') {
            e.preventDefault();
            const searchInput = document.getElementById('tasks-search-input');
            searchInput?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewTask]);

  return (
    <>
      <div className="flex flex-col h-full bg-secondary">
        <TasksHeader filters={filters} onFiltersChange={setFilters} onNewTask={handleNewTask}/>
        
        <div className="flex-1 grid grid-cols-[280px_1fr] gap-6 p-6 min-h-0">
          <TasksSidebar aggregates={aggregates} />
          
          <main className="flex flex-col min-h-0">
            <TasksCalendarSwitcher
              view={filters.view || 'week'}
              onViewChange={(view) => setFilters({ ...filters, view })}
            />
            <div className="flex-1 mt-4 rounded-xl bg-card border overflow-y-auto">
              {isLoading && <div className="p-8 text-center text-muted-foreground">Cargando tareas...</div>}
              {error && <p className="p-8 text-center text-destructive">Error: {error}</p>}
              {!isLoading && !error && (
                <TaskList
                  tasks={tasks}
                  onEdit={handleEditTask}
                  onComplete={handleCompleteTask}
                  onDelete={handleDeleteTask}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* --- DIALOGS --- */}
      <NewTaskDialog
        open={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onCreate={(payload) => {
            addTask(payload);
            toast.success("Nueva tarea creada (simulado).");
        }}
      />
      
      {completingTask && (
        <TaskCompletionDialog
          task={completingTask as any}
          open={!!completingTask}
          onClose={() => setCompletingTask(null)}
          onSuccess={() => {
              completeTask(completingTask.id);
              toast.success("Tarea completada (simulado).");
              setCompletingTask(null);
          }}
          onError={(msg) => toast.error(msg)}
        />
      )}
    </>
  );
}

// Use Suspense to handle client-side data fetching and query param reading gracefully.
export default function TasksPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando Página...</div>}>
            <TasksPageContent />
        </Suspense>
    );
}
