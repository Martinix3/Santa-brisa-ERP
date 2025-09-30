// features/agenda/storage/index.ts
import type { IAgendaStorage } from './adapter';
import { LocalAgendaStorage } from './local';
import { FirestoreAgendaStorage } from './firestore';

// Fallback para SSR/hidratación
const MemoryAgendaStorage: IAgendaStorage = {
  async loadNotes(){ return []; },
  async saveNotes(){},
  async loadTasks(){ return []; },
  async saveTasks(){},
};


export function getStorage(): IAgendaStorage {
  // Si estás en SSR → memory
  if (typeof window === 'undefined') return MemoryAgendaStorage;

  // Forzamos el uso de Firestore ahora.
  return FirestoreAgendaStorage;
}

export { LocalAgendaStorage, FirestoreAgendaStorage };
export type { IAgendaStorage };
