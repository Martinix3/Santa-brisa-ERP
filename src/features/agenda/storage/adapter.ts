// features/agenda/storage/adapter.ts
import type { Task } from '@/domain/ssot';
export type Note = {
  id: string;
  text: string;
  createdAt: string;
  accountName?: string;
  assets?: string[];
  location?: { lat:number; lng:number; ts:number };
  contactName?: string;
  starred?: boolean;
  derived?: { kind: 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA' };
};

export interface IAgendaStorage {
  loadNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
}
