// /features/agenda/components/NotesList.tsx
"use client";
import React, { useState, useRef } from "react";
import type { NoteItem } from '../storage/adapter';

export function NotesList({ notes, onComplete }: { notes: NoteItem[]; onComplete: (note: NoteItem) => void; }) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPointerDown = (id: number) => (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDraggingId(id);
    setDragX(0);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (id: number) => (e: React.PointerEvent) => {
    if (draggingId !== id) return;
    const dx = e.clientX - startRef.current.x;
    const clamped = Math.max(-100, Math.min(100, dx));
    setDragX(clamped);
  };

  const onPointerUp = (id: number) => (e: React.PointerEvent) => {
    if (draggingId !== id) return;
    const threshold = 60;
    if (Math.abs(dragX) > threshold) {
      const note = notes.find((x) => x.id === id);
      if (note) onComplete(note);
    }
    setDraggingId(null);
    setDragX(0);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <ul className="divide-y divide-[#e5e7eb]">
      {notes.map((n) => {
        const isDragging = draggingId === n.id;
        const translate = isDragging ? `translateX(${dragX}px)` : 'translateX(0)';
        const bg = n.done ? '#f3f4f6' : '#ffffff';
        const accent = dragX > 30 ? '#E6F4EA' : dragX < -30 ? '#FEF3F2' : bg;
        return (
          <li key={n.id} className="py-2 select-none">
            <div className="relative">
              <div className="absolute inset-0 rounded" style={{ background: accent, transition: isDragging ? 'none' : 'background 160ms' }} />
              <div
                className={`relative px-0 py-1 text-[14px] leading-snug touch-none ${n.done ? 'line-through text-[#6b7280]' : ''}`}
                style={{ transform: translate, transition: isDragging ? 'none' : 'transform 160ms ease' }}
                onPointerDown={onPointerDown(n.id)}
                onPointerMove={onPointerMove(n.id)}
                onPointerUp={onPointerUp(n.id)}
                onPointerCancel={onPointerUp(n.id)}
              >
                {n.text}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
