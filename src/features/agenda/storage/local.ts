// /features/agenda/storage/local.ts
import type { IAgendaStorage, NoteItem } from './adapter';

const STORAGE_KEY = 'sb-agenda-notes';

export class LocalStorageAgenda implements IAgendaStorage {
  private async _read(): Promise<NoteItem[]> {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private async _write(notes: NoteItem[]): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  async getAll(): Promise<NoteItem[]> {
    const notes = await this._read();
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async add(text: string): Promise<NoteItem> {
    const notes = await this._read();
    const newNote: NoteItem = {
      id: Date.now(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    await this._write([newNote, ...notes]);
    return newNote;
  }

  async update(id: number, updates: Partial<NoteItem>): Promise<NoteItem> {
    const notes = await this._read();
    let updatedNote: NoteItem | null = null;
    const newNotes = notes.map(n => {
      if (n.id === id) {
        updatedNote = { ...n, ...updates };
        return updatedNote;
      }
      return n;
    });
    if (!updatedNote) throw new Error("Note not found");
    await this._write(newNotes);
    return updatedNote;
  }
  
  async remove(id: number): Promise<void> {
      const notes = await this._read();
      const newNotes = notes.filter(n => n.id !== id);
      await this._write(newNotes);
  }
}
