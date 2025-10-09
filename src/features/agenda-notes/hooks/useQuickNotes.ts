// features/agenda-notes/hooks/useQuickNotes.ts
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Interaction, Note, InteractionStatus, SantaData } from '@/domain/ssot.v7';
import { useData } from '@/lib/dataprovider';

// El hook ahora no gestiona el storage, sino que lee del DataProvider
export function useQuickNotes() {
  const { data: santaData, saveAllCollections } = useData();
  const notes = useMemo(() => (santaData?.notes || []) as Note[], [santaData?.notes]);
  const tasks = useMemo(() => (santaData?.interactions || []) as Interaction[], [santaData?.interactions]);
  const accounts = useMemo(() => (santaData?.accounts || []), [santaData?.accounts]);

  const [linkNotes, setLinkNotes] = useState(true);
  const [range, setRange] = useState<{start:Date; end:Date}>(()=> {
    const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const e = new Date(s.getTime() + 24*60*60*1000);
    return { start: s, end: e };
  });

  const addNote = useCallback(async (text: string) => {
    const newNote: Note = { id: `note_${Date.now()}`, text, createdAt: new Date().toISOString() };
    const newNotes = [...notes, newNote];
    if (saveAllCollections) {
      await saveAllCollections({ notes: newNotes });
    }
  }, [notes, saveAllCollections]);

  const completeTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedTask = { ...task, status: 'done' as InteractionStatus, updatedAt: new Date().toISOString() };
    await saveAllCollections({ interactions: [updatedTask] });
  };

  const deleteTask = async (taskId: string) => {
    if (!santaData) return;
    const updatedTasks = (santaData.interactions || []).filter(t => t.id !== taskId);
    await saveAllCollections({ interactions: updatedTasks });
  };

  // Overdue pinning
  const todayStart = useMemo(()=> new Date(range.start), [range]);
  const openTasks = useMemo(() => tasks.filter(t => t.status === 'open'), [tasks]);

  const overdue = useMemo(()=> openTasks.filter(t => t.plannedFor && new Date(t.plannedFor) < todayStart), [openTasks, todayStart]);
  
  const todayTasks = useMemo(()=> openTasks.filter(t=>{
    if (!t.plannedFor) return true; // sin fecha, se muestran siempre en “hoy”
    const dt = new Date(t.plannedFor).getTime();
    return dt >= range.start.getTime() && dt < range.end.getTime();
  }), [openTasks, range]);

  // Swipe
  const swipeState = useRef<{ id?:string; startX?:number; dx?:number }>({});
  const onItemPointerDown = (id: string) => (e: React.PointerEvent) => {
    swipeState.current = { id, startX: e.clientX, dx: 0 };
  };
  const onItemPointerMove = (id: string) => (e: React.PointerEvent) => {
    if (swipeState.current.id!==id) return;
    swipeState.current.dx = (e.clientX - (swipeState.current.startX || 0));
  };
  const onItemPointerUp = (id: string, openOutcome: (id:string)=>void) => async () => {
    const dx = swipeState.current.dx || 0;
    swipeState.current = {};
    if (Math.abs(dx) > 60) openOutcome(id);
  };

  const rangedNotes = useMemo(()=> {
    if (!linkNotes) return notes;
    return notes.filter(n => {
      const t = new Date(n.createdAt).getTime();
      return t >= range.start.getTime() && t < range.end.getTime();
    });
  }, [notes, linkNotes, range]);

  return {
    accounts,
    notes, tasks, overdue, todayTasks, rangedNotes,
    addNote, completeTask, deleteTask,
    onItemPointerDown, onItemPointerMove, onItemPointerUp,
    linkNotes, setLinkNotes, range, setRange,
  };
}
