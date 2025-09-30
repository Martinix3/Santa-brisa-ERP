// /features/agenda/hooks/useQuickNotes.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { parseNoteToAction, type ParsedNoteAction } from '../parser/parser';
import { getStorage, type NoteItem, type IAgendaStorage } from '../storage/adapter';

export function useQuickNotes(storage: IAgendaStorage) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const items = await storage.getAll();
      setNotes(items);
      setIsLoading(false);
    }
    load();
  }, [storage]);

  const addNote = useCallback(async (text: string) => {
    const newNote = await storage.add(text);
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, [storage]);

  const updateNote = useCallback(async (id: number, updates: Partial<NoteItem>) => {
    const updatedNote = await storage.update(id, updates);
    setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
    return updatedNote;
  }, [storage]);
  
  const removeNote = useCallback(async (id: number) => {
    await storage.remove(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, [storage]);

  const markDone = useCallback((id: number, done: boolean = true) => {
    return updateNote(id, { done });
  }, [updateNote]);

  const parseText = (text: string): ParsedNoteAction => {
    return parseNoteToAction(text);
  };

  return {
    notes,
    isLoading,
    addNote,
    updateNote,
    removeNote,
    markDone,
    parseText,
  };
}
