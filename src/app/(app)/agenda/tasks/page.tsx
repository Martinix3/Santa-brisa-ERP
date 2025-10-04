// src/app/(app)/agenda/tasks/page.tsx
"use client";

import React, { Suspense } from 'react';
import { useTasks } from '@/features/agenda/hooks/useTasks';
import { TasksHeader } from '@/features/agenda/components/TasksHeader';
import { TasksSidebar } from '@/features/agenda/components/TasksSidebar';
import { TasksCalendarSwitcher } from '@/features/agenda/components/TasksCalendarSwitcher';

function TasksPageContent() {
  const { filters, setFilters, tasks, aggregates, isLoading, error } = useTasks();

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
          <div className="flex-1 mt-4 rounded-xl bg-card border p-4">
            {isLoading && <p>Loading tasks...</p>}
            {error && <p className="text-destructive">Error: {error}</p>}
            {!isLoading && !error && (
              <div className="text-center text-muted-foreground p-8">
                <p>Task list will be displayed here.</p>
                <p className="text-xs mt-2">({tasks.length} tasks loaded)</p>
              </div>
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
        <Suspense fallback={<div className="p-6">Loading Page...</div>}>
            <TasksPageContent />
        </Suspense>
    );
}
