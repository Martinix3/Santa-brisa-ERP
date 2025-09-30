
// /features/agenda/components/NotesList.tsx
import React from 'react';
import type { Note } from '../storage/adapter';
import type { Task } from '@/domain/ssot';

export function NotesList({
  notes, tasks,
  onPointerDown, onPointerMove, onPointerUp,
}:{
  notes: Note[];
  tasks: Task[];
  onPointerDown: (id:string)=> (e:React.PointerEvent)=>void;
  onPointerMove:  (id:string)=> (e:React.PointerEvent)=>void;
  onPointerUp:    (id:string)=> ()=>void;
}) {
  // combinamos visualmente Task + nota ligada (por noteId)
  return (
    <ul className="divide-y">
      {tasks.map(t => {
        const n = notes.find(nn => nn.id===t.noteId);
        const done = t.status==='DONE';
        return (
          <li key={t.id}
              className="py-2 select-none relative"
              onPointerDown={onPointerDown(t.id)}
              onPointerMove={onPointerMove(t.id)}
              onPointerUp={onPointerUp(t.id)}
          >
            {/* fondo swipe: verde/rojo sutil (se pintaría con transform x si quisieras feedback en vivo) */}
            <div className="absolute inset-0 rounded-md pointer-events-none bg-transparent" />
            <div className={`relative ${done?'line-through text-[hsl(var(--sb-neutral-400))]':''}`}>
              <div className="text-[0.95rem] leading-snug whitespace-pre-wrap">{n?.text || t.title}</div>
              {t.dueAt && (
                <div className="mt-0.5 text-[10px] text-[hsl(var(--sb-neutral-500))]">
                  {new Date(t.dueAt).toLocaleString()}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
