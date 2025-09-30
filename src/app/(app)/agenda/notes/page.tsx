// /app/(app)/agenda/notes/page.tsx
"use client";
import React, { useState } from "react";
import { useQuickNotes } from "@/features/agenda/hooks/useQuickNotes";
import { getStorage, type NoteItem } from "@/features/agenda/storage/adapter";
import { QuickEditor } from "@/features/agenda/components/QuickEditor";
import { NotesList } from "@/features/agenda/components/NotesList";
import { OutcomeDialog } from "@/features/agenda/components/OutcomeDialog";
import { FooterKPIs } from "@/features/agenda/components/FooterKPIs";

const storage = getStorage();

export default function CalendarNotesPage() {
  const { notes, addNote, markDone } = useQuickNotes(storage);
  const [outcomeFor, setOutcomeFor] = useState<NoteItem | null>(null);

  const handleSaveNote = (text: string) => {
    addNote(text);
  };
  
  const handleCompleteNote = (note: NoteItem) => {
    setOutcomeFor(note);
  };

  const handleCloseDialog = () => {
    setOutcomeFor(null);
  };
  
  const handleConfirmOutcome = () => {
    if (outcomeFor) {
      markDone(outcomeFor.id, true);
    }
    setOutcomeFor(null);
  };

  return (
    <div className="min-h-dvh bg-white text-[#111827] flex flex-col font-sans">
      <div className="flex-1 px-4 pt-3 pb-6 overflow-y-auto bg-[#f9fafb]">
        <h3 className="text-[16px] font-semibold mb-2 text-[#111827]">Notas diarias</h3>
        <QuickEditor onSave={handleSaveNote} />
        <NotesList notes={notes.filter(n => !n.done)} onComplete={handleCompleteNote} />
      </div>

      <FooterKPIs />

      {outcomeFor && (
        <OutcomeDialog
          text={outcomeFor.text}
          onCancel={handleCloseDialog}
          onComplete={handleConfirmOutcome}
        />
      )}
    </div>
  );
}
