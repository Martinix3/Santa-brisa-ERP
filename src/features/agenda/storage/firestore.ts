// features/agenda/storage/firestore.ts
import type { IAgendaStorage, Note, Task } from './adapter';
import { firestoreDb } from '@/lib/firebaseClient';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';


async function getCollection<T>(name: string): Promise<T[]> {
    if (!firestoreDb) return [];
    const querySnapshot = await getDocs(collection(firestoreDb, name));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

async function saveCollection<T extends { id: string }>(name: string, data: T[]): Promise<void> {
    if (!firestoreDb) return;
    const batch = writeBatch(firestoreDb);
    const colRef = collection(firestoreDb, name);
    data.forEach(item => {
        const docRef = doc(colRef, item.id);
        batch.set(docRef, item);
    });
    await batch.commit();
}


export const FirestoreAgendaStorage: IAgendaStorage = {
  async loadNotes(){ return getCollection<Note>('notes'); },
  async saveNotes(notes: Note[]){ return saveCollection<Note>('notes', notes); },
  async loadTasks(){ return getCollection<Task>('interactions'); },
  async saveTasks(tasks: Task[]){ return saveCollection<Task>('interactions', tasks); },
};
