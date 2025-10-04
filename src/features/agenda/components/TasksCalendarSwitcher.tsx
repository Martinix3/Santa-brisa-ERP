// src/features/agenda/components/TasksCalendarSwitcher.tsx
"use client";

import { SBButton } from '@/components/ui';

type View = 'day' | 'week' | 'month';

interface TasksCalendarSwitcherProps {
  view: View;
  onViewChange: (view: View) => void;
}

export function TasksCalendarSwitcher({ view, onViewChange }: TasksCalendarSwitcherProps) {
  return (
    <div className="flex-shrink-0">
      <div className="inline-flex p-1 bg-card border rounded-lg">
        {(['day', 'week', 'month'] as const).map(v => (
          <SBButton
            key={v}
            variant={view === v ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange(v)}
            className="capitalize"
          >
            {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
          </SBButton>
        ))}
      </div>
    </div>
  );
}
