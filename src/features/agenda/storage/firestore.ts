// features/agenda/storage/firestore.ts
import type { IAgendaStorage, Note, Task } from './adapter';

// TODO: conecta a tu SDK de Firestore
export const FirestoreAgendaStorage: IAgendaStorage = {
  async loadNotes(){ /* return await ... */ return []; },
  async saveNotes(notes: Note[]){ /* await ... */ },
  async loadTasks(){ /* return await ... */ return []; },
  async saveTasks(tasks: Task[]){ /* await ... */ },
};
