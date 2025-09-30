// /app/(app)/agenda/notes/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { useQuickNotes } from '@/features/agenda/hooks/useQuickNotes';
import { QuickEditor } from '@/features/agenda/components/QuickEditor';
import { NotesList } from '@/features/agenda/components/NotesList';
import { OutcomeDialog } from '@/features/agenda/components/OutcomeDialog';
import { FooterKPIs } from '@/features/agenda/components/FooterKPIs';
import type { Interaction, Note } from '@/domain/ssot';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import { useData } from '@/lib/dataprovider';


export default function CalendarNotesPage() {
  const agenda = useQuickNotes();
  const { data } = useData();
  const [view, setView] = useState<'day'|'week'|'month'>('day');
  const [outcomeFor, setOutcomeFor] = useState<string|null>(null);

  const openOutcome = (id: string) => setOutcomeFor(id);
  const closeOutcome = () => setOutcomeFor(null);

  // KPIs footer
  const kpis = useMemo(()=> {
    const overdue = agenda.overdue.length;
    const todayOpen = agenda.todayTasks.filter(t=>t.status==='open').length;
    const posToday = agenda.todayTasks.filter(t=> t.kind==='EVENTO_MKT').length;
    return { overdue, todayOpen, posToday };
  }, [agenda.overdue, agenda.todayTasks]);

  const onConfirmOutcome = (task: Interaction, payload: Record<string,any>) => {
    console.log("Confirming outcome for task", task, "with payload", payload);
    agenda.completeTask(task.id);
    closeOutcome();
  };

  const overdueTasks = useMemo(() => mapInteractionsToTasks(agenda.overdue, data?.accounts), [agenda.overdue, data?.accounts]);
  const todayTasksMapped = useMemo(() => mapInteractionsToTasks(agenda.todayTasks, data?.accounts), [agenda.todayTasks, data?.accounts]);


  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Tabs Día/Semana/Mes + toggle Vincular notas */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="inline-flex rounded-xl border">
          {(['day','week','month'] as const).map(v=>(
            <button key={v}
              onClick={()=>setView(v)}
              className={`px-3 py-1.5 text-sm rounded-xl ${view===v?'bg-[hsl(var(--sb-neutral-50))] font-medium':''}`}>
              {v==='day'?'Día':v==='week'?'Semana':'Mes'}
            </button>
          ))}
        </div>
        <label className="ml-auto text-sm flex items-center gap-2">
          <input type="checkbox" checked={agenda.linkNotes} onChange={(e)=>agenda.setLinkNotes(e.target.checked)} />
          Vincular notas
        </label>
      </div>

      {/* Editor + histórico/Tasks */}
      <div className="px-4">
        <QuickEditor onSubmit={agenda.addNote} />
      </div>

      {/* Lista con overdue fijadas en un bloque plegable */}
      {agenda.overdue.length>0 && (
        <details open className="px-4">
          <summary className="text-xs text-[hsl(var(--sb-neutral-600))] py-1">Pendientes de ayer ({agenda.overdue.length})</summary>
          <NotesList
            notes={agenda.rangedNotes as Note[]}
            tasks={overdueTasks}
            onPointerDown={agenda.onItemPointerDown}
            onPointerMove={agenda.onItemPointerMove}
            onPointerUp={(id)=>agenda.onItemPointerUp(id, openOutcome)}
          />
        </details>
      )}

      <div className="flex-1 overflow-y-auto px-4">
        <NotesList
          notes={agenda.rangedNotes as Note[]}
          tasks={todayTasksMapped}
          onPointerDown={agenda.onItemPointerDown}
          onPointerMove={agenda.onItemPointerMove}
          onPointerUp={(id)=>agenda.onItemPointerUp(id, openOutcome)}
        />
      </div>

      <FooterKPIs {...kpis} />

      <OutcomeDialog
        taskId={outcomeFor}
        tasks={agenda.todayTasks.concat(agenda.overdue)}
        onClose={closeOutcome}
        onConfirm={onConfirmOutcome}
      />
    </div>
  );
}
