// features/agenda/storage/local.ts
import { IAgendaStorage, Note } from './adapter';
import type { Task } from '@/domain/ssot';

const NKEY='sb.agenda.notes', TKEY='sb.agenda.tasks';

const safeGet = (k:string) => { try { return localStorage.getItem(k);} catch { return null; } };
const safeSet = (k:string, v:string) => { try { localStorage.setItem(k,v);} catch{} };

export class LocalAgendaStorage implements IAgendaStorage {
  async loadNotes(){ const raw=safeGet(NKEY); return raw? JSON.parse(raw) as Note[]: []; }
  async saveNotes(n: Note[]){ safeSet(NKEY, JSON.stringify(n)); }
  async loadTasks(){ const raw=safeGet(TKEY); return raw? JSON.parse(raw) as Task[]: []; }
  async saveTasks(t: Task[]){ safeSet(TKEY, JSON.stringify(t)); }
}

let storageInstance: IAgendaStorage | null = null;

export function getStorage(): IAgendaStorage {
  if (!storageInstance) {
    storageInstance = new LocalAgendaStorage();
  }
  return storageInstance;
}
