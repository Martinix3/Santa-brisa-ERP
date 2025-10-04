// src/app/(app)/agenda/tasks/page.tsx
"use client";

import React, { Suspense, useEffect, useCallback } from 'react';
import { useTasks } from '@/features/agenda/hooks/useTasks';
import { TasksHeader } from '@/features/agenda/components/TasksHeader';
import { TasksSidebar } from '@/features/agenda/components/TasksSidebar';
import { TasksCalendarSwitcher } from '@/features/agenda/components/TasksCalendarSwitcher';
import { TaskList } from '@/features/agenda/components/TaskList';
import { toast } from 'sonner';

function TasksPageContent() {
  const { filters, setFilters, tasks, aggregates, isLoading, error } = useTasks();

  const handleNewTask = useCallback(() => {
    toast.info("Funcionalidad 'Nueva Tarea' pendiente de implementación.");
    // En un futuro, esto abriría un diálogo:
    // setCreateTaskOpen(true);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    toast.info(`Editar Tarea (ID: ${taskId}) - pendiente de implementación.`);
  }, []);

  const handleCompleteTask = useCallback((taskId: string) => {
    toast.success(`Tarea (ID: ${taskId}) marcada como completada.`);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    toast.warning(`Borrar Tarea (ID: ${taskId}) - pendiente de implementación.`);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        if (e.key.toLowerCase() === 'n') {
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
    <div className="flex flex-col h-full bg-secondary">
      <TasksHeader filters={filters} onFiltersChange={setFilters} />
      
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
