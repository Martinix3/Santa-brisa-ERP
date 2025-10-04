// features/agenda-notes/storage/local.ts
import type { IAgendaStorage, Note, Task } from './adapter';

const NKEY='sb.agenda.notes';
const TKEY='sb.agenda.tasks';

const hasWin = () => typeof window !== 'undefined' && !!window.localStorage;
const safeGet = (k:string) => { try { return hasWin() ? window.localStorage.getItem(k) : null; } catch { return null; } };
const safeSet = (k:string, v:string) => { try { if (hasWin()) window.localStorage.setItem(k, v); } catch {} };

export const LocalAgendaStorage: IAgendaStorage = {
  async loadNotes(){ const raw=safeGet(NKEY); return raw ? JSON.parse(raw) as Note[] : []; },
  async saveNotes(n: Note[]){ safeSet(NKEY, JSON.stringify(n)); },
  async loadTasks(){ const raw=safeGet(TKEY); return raw ? JSON.parse(raw) as Task[] : []; },
  async saveTasks(t: Task[]){ safeSet(TKEY, JSON.stringify(t)); },
};
