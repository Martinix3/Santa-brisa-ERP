// src/features/agenda/components/TasksSidebar.tsx
"use client";

import { SBCard } from '@/components/ui';
import type { TaskAggregates } from '../hooks/useTasks';

interface TasksSidebarProps {
  aggregates: TaskAggregates | null;
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex justify-between items-center text-sm p-3 bg-card border rounded-lg">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground">{value}</span>
        </div>
    );
}

export function TasksSidebar({ aggregates }: TasksSidebarProps) {
  return (
    <aside className="space-y-4">
      <SBCard title="Resumen">
        <div className="p-4 space-y-2">
          <Stat label="Vencidas" value={aggregates?.overdue || 0} />
          <Stat label="Próximas" value={aggregates?.next || 0} />
        </div>
      </SBCard>
      
      <SBCard title="Tareas por Día">
        <div className="p-4 space-y-2">
          {aggregates?.byDay && Object.entries(aggregates.byDay).map(([date, count]) => (
            <Stat key={date} label={new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} value={count} />
          ))}
          {(!aggregates?.byDay || Object.keys(aggregates.byDay).length === 0) && (
            <p className="text-xs text-center text-muted-foreground py-4">No hay datos por día.</p>
          )}
        </div>
      </SBCard>
    </aside>
  );
}
