// features/agenda/hooks/useQuickNotes.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseNoteToAction, inferDepartment } from '../parser/parser';
import type { IAgendaStorage, Note } from '../storage/adapter';
import type { Task, TaskKind, TaskStatus, Department } from '@/domain/ssot';

export function useQuickNotes(storage: IAgendaStorage) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkNotes, setLinkNotes] = useState(true);  // toggle “Vincular notas”
  const [range, setRange] = useState<{start:Date; end:Date}>(()=> {
    const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const e = new Date(s.getTime() + 24*60*60*1000);
    return { start: s, end: e };
  });

  useEffect(()=>{ (async()=>{
    setNotes(await storage.loadNotes());
    setTasks(await storage.loadTasks());
  })(); }, [storage]);

  const addNote = async (text: string) => {
    const n: Note = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
    const parsed = parseNoteToAction(text);
    n.derived = { kind: parsed.kind as any };
    const next = [n, ...notes].slice(0, 500);
    setNotes(next); await storage.saveNotes(next);

    // crear Task automáticamente (OPEN)
    const kindMap: Record<string, TaskKind> = {
      PEDIDO:'PEDIDO', VISITA:'VISITA', POS_EVT:'POS_EVT', POS_PLV:'POS_PLV', NOTA:'NOTA'
    };
    const dep = inferDepartment(text);
    const t: Task = {
      id: crypto.randomUUID(),
      kind: kindMap[parsed.kind],
      status: 'OPEN',
      title: text.split('\n')[0].slice(0,120),
      noteId: n.id,
      accountId: ('account' in parsed) ? (parsed as any).account : undefined,
      dueAt: ('whenISO' in parsed) ? (parsed as any).whenISO : undefined,
      createdAt: n.createdAt,
      updatedAt: n.createdAt,
      department: dep,
      meta: ('qtyCases' in parsed) ? { qtyCases: (parsed as any).qtyCases } :
            ('description' in parsed) ? { description: (parsed as any).description } : undefined
    };
    const tNext = [t, ...tasks];
    setTasks(tNext); await storage.saveTasks(tNext);
  };

  const completeTask = async (taskId: string) => {
    const tNext = tasks.map(t => t.id===taskId ? {...t, status:'DONE' as TaskStatus, updatedAt: new Date().toISOString() } : t);
    setTasks(tNext); await storage.saveTasks(tNext);
  };

  const deleteNote = async (noteId: string) => {
    const nNext = notes.filter(n => n.id!==noteId);
    setNotes(nNext); await storage.saveNotes(nNext);
    // opcional: borrar Task ligada
  };

  // Overdue pinning (sin reordenar todo el día)
  const todayStart = useMemo(()=> new Date(range.start), [range]);
  const overdue = useMemo(()=> tasks.filter(t => t.status==='OPEN' && t.dueAt && new Date(t.dueAt) < todayStart), [tasks, todayStart]);
  const todayTasks = useMemo(()=> tasks.filter(t=>{
    if (!t.dueAt) return true; // sin fecha, se muestran siempre en “hoy”
    const dt = new Date(t.dueAt).getTime();
    return dt >= range.start.getTime() && dt < range.end.getTime();
  }), [tasks, range]);

  // Swipe (umbral ~60px)
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
    if (Math.abs(dx) > 60) openOutcome(id); // no completamos directo: abre OutcomeDialog
  };

  // Vincular notas al rango visible
  const rangedNotes = useMemo(()=> {
    if (!linkNotes) return notes;
    return notes.filter(n => {
      const t = new Date(n.createdAt).getTime();
      return t >= range.start.getTime() && t < range.end.getTime();
    });
  }, [notes, linkNotes, range]);

  return {
    notes, tasks, overdue, todayTasks, rangedNotes,
    addNote, completeTask, deleteNote,
    onItemPointerDown, onItemPointerMove, onItemPointerUp,
    linkNotes, setLinkNotes, range, setRange,
  };
}
