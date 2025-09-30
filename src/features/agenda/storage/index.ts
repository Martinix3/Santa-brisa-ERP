// features/agenda/storage/index.ts
import type { IAgendaStorage } from './adapter';
import { LocalAgendaStorage } from './local';

// Fallback para SSR/hidratación
const MemoryAgendaStorage: IAgendaStorage = {
  async loadNotes(){ return []; },
  async saveNotes(){},
  async loadTasks(){ return []; },
  async saveTasks(){},
};

// (Opcional) feature flag/env para Firestore
// import { FirestoreAgendaStorage } from './firestore';

export function getStorage(): IAgendaStorage {
  // Si estás en SSR → memory
  if (typeof window === 'undefined') return MemoryAgendaStorage;

  // Si quieres condicionar por env/flag:
  // if (window?.SB_USE_FIRESTORE_AGENDA) return FirestoreAgendaStorage;

  // Por defecto: local
  return LocalAgendaStorage;
}

export { LocalAgendaStorage };
export type { IAgendaStorage };
