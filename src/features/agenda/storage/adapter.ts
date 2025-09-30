// /features/agenda/storage/adapter.ts
import { LocalStorageAgenda } from './local';

export type NoteItem = {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
};

export interface IAgendaStorage {
  getAll(): Promise<NoteItem[]>;
  add(text: string): Promise<NoteItem>;
  update(id: number, updates: Partial<NoteItem>): Promise<NoteItem>;
  remove(id: number): Promise<void>;
}

// Singleton pattern to get the storage adapter
let storageInstance: IAgendaStorage | null = null;

export function getStorage(): IAgendaStorage {
  if (!storageInstance) {
    // For now, we default to localStorage.
    // In the future, we could switch this based on an environment variable or user setting.
    storageInstance = new LocalStorageAgenda();
  }
  return storageInstance;
}
