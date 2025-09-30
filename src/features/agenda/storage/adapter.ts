// features/agenda/storage/adapter.ts
import type { Department, Interaction, InteractionStatus, InteractionKind } from '@/domain/ssot'; 

export type Note = {
  id: string;
  text: string;
  createdAt: string; // ISO
  accountName?: string;
  assets?: string[];
  location?: { lat:number; lng:number; ts:number };
  contactName?: string;
  starred?: boolean;
  derived?: { kind: 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA' };
};

export type TaskKind = 'PEDIDO'|'VISITA'|'POS_EVT'|'POS_PLV'|'NOTA';
export type TaskStatus = InteractionStatus;

export type Task = Interaction & {
    title?: string; // Add title to Interaction for display purposes
    dueAt?: string;
};


export interface IAgendaStorage {
  loadNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
}
