// features/agenda/storage/adapter.ts
import type { Department, Interaction, InteractionStatus, InteractionKind, TaskKind } from '@/domain/ssot'; 

export type Note = {
  id: string;
  text: string;
  createdAt: string; // ISO
  accountId?: string;
  accountName?: string;
  assets?: string[];
  location?: { lat:number; lng:number; ts:number };
  contactName?: string;
  starred?: boolean;
  derived?: { kind: 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA' };
};

// La única fuente de verdad para una "tarea" es la Interaction del SSOT
export type Task = Interaction;

export interface IAgendaStorage {
  loadNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
}
