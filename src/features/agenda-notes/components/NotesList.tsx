// /features/agenda-notes/components/NotesList.tsx
import React from 'react';
import type { Note } from '@/domain/ssot';
import type { Task } from '@/features/agenda/TaskBoard';

export function NotesList({
  notes, tasks,
  onPointerDown, onPointerMove, onPointerUp,
}: {
  notes: Note[];
  tasks: Task[];
  onPointerDown: (id: string) => (e: React.PointerEvent) => void;
  onPointerMove: (id: string) => (e: React.PointerEvent) => void;
  onPointerUp: (id: string) => () => void;
}) {
  // combinamos visualmente Task + nota ligada
  return (
    <ul className="divide-y">
      {tasks.map(t => {
        const done = t.status === 'done';
        const taskText = t.title || 'Tarea sin descripción';

        return (
          <li key={t.id}
              className="py-2 select-none relative"
              onPointerDown={onPointerDown(t.id)}
              onPointerMove={onPointerMove(t.id)}
              onPointerUp={onPointerUp(t.id)}
          >
            {/* fondo swipe: verde/rojo sutil (se pintaría con transform x si quisieras feedback en vivo) */}
            <div className="absolute inset-0 rounded-md pointer-events-none bg-transparent" />
            <div className={`relative ${done ? 'line-through text-[hsl(var(--sb-neutral-400))]' : ''}`}>
              <div className="text-[0.95rem] leading-snug whitespace-pre-wrap">{taskText}</div>
              {t.date && (
                <div className="mt-0.5 text-[10px] text-[hsl(var(--sb-neutral-500))]">
                  {new Date(t.date).toLocaleString()}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
