
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { DndContext, type DragEndEvent, type DragOverlay } from '@dnd-kit/core';
import { toast } from 'sonner';

import { useData } from '@/lib/dataprovider';
import { CreateTaskModal } from '@/features/ops/components/CreateTaskModal';
import { Kanban, type PipelineItem } from '@/features/ops/components/Kanban';
import { TasksTable, type Task as TaskRow } from '@/features/ops/components/TasksTable';
import { WeekCalendar } from '@/features/ops/components/WeekCalendar';
import { SBButton, SBCard } from '@/components/ui';

import type { Interaction, Department, Account, User, InteractionKind, Stage, TaskKind } from '@/domain/ssot';
import type { CalendarEvent } from '@/domain/ops.types';
import { toEventDept } from '@/domain/ops.types';

import { createTask, rescheduleEvent } from '@/app/(app)/ops/actions';
import { Plus } from 'lucide-react';

// --- Type Mapping ---
function mapInteractionToEvent(i: Interaction, accounts: Account[]): CalendarEvent {
  const account = accounts.find(a => a.id === i.accountId);
  return {
    id: i.id,
    title: (i as any).title || i.note || 'Tarea sin título',
    dept: toEventDept(i.dept as string),
    startAt: (i as any).startAt || i.plannedFor || i.createdAt,
    endAt: (i as any).endAt,
    accountId: i.accountId,
    accountName: account?.name || 'N/A',
    notes: i.note,
  };
}

function mapInteractionToTask(i: Interaction, accounts: Account[]): TaskRow {
  const account = accounts.find(a => a.id === i.accountId);
  return {
    ...i,
    dept: i.dept as Department,
    kind: i.kind,
    status: i.status === 'done' ? 'done' : 'open',
    plannedFor: (i as any).startAt || i.plannedFor,
    accountName: account?.name || 'N/A',
  } as TaskRow;
}

// --- Main Page Component ---
export default function PersonalDashboardPage() {
  const { data, currentUser, saveAllCollections } = useData();
  const [view, setView] = useState<'DIA'|'SEMANA'|'MES'>('SEMANA');
  const [deptFilter, setDeptFilter] = useState<Department | 'TODOS'>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);
  const [presetAccount, setPresetAccount] = useState<{accountId:string; accountName:string;}|null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);

  const { tasks, events } = useMemo(() => {
    if (!data) return { tasks: [], events: [] };
    const validAccounts = data.accounts || [];
    const allTasks: TaskRow[] = (data.interactions || []).map(i => mapInteractionToTask(i, validAccounts));
    const allEvents = (data.interactions || [])
      .filter(i => (i.dept && i.dept !== 'PERSONAL' && i.dept !== 'OPS') && ((i as any).startAt || i.plannedFor))
      .map(i => mapInteractionToEvent(i, validAccounts));
    return { tasks: allTasks, events: allEvents };
  }, [data]);

  const handleTaskDragStart = useCallback((row: TaskRow, e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(row));
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedItem(row);
  }, []);

  const handleDropOnCalendar = useCallback(async (slotISO: string, payload: any) => {
    try {
      await rescheduleEvent(payload.id, slotISO);
      toast.success(`Tarea "${payload.note}" reagendada.`);
      // Optimistic update in DataProvider will handle the UI change
    } catch (err) {
      toast.error("No se pudo reagendar la tarea.");
    }
  }, []);
  
  const handleCreateTask = useCallback(async (payload: any) => {
    if (!data) return;
    const tempId = `tmp_${Date.now()}`;
    const optimisticTask: Interaction = {
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open',
      userId: currentUser?.id || '',
      ...payload
    };
    saveAllCollections({ interactions: [...(data.interactions || []), optimisticTask] });
    setCreateOpen(false);

    try {
      const res = await createTask(payload);
      if (res.ok) {
        toast.success("Tarea creada con éxito");
      } else {
        // Manejo robusto: la respuesta tipada no expone `message`
        const reason =
          (res as any)?.error ??
          (res as any)?.message ??
          "Operación fallida";
        throw new Error(reason);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
      saveAllCollections({ interactions: (data.interactions || []).filter(i => i.id !== tempId) });
    }
  }, [data, currentUser, saveAllCollections]);


  const onProgramFromKanban = useCallback((p: any)=>{
    setPresetAccount(p);
    setCreateOpen(true);
  }, []);


  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mi Dashboard</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
            <SBButton variant={view==='DIA' ? 'primary':'secondary'} onClick={()=>setView('DIA')}>Diaria</SBButton>
            <SBButton variant={view==='SEMANA' ? 'primary':'secondary'} onClick={()=>setView('SEMANA')}>Semanal</SBButton>
            <SBButton variant={view==='MES' ? 'primary':'secondary'} onClick={()=>setView('MES')}>Mensual</SBButton>
            <SBButton onClick={()=>{ setPresetAccount(null); setCreateOpen(true); }}>
              <Plus size={16} className='mr-1'/> Nueva Tarea
            </SBButton>
        </div>
      </header>
      
      <DndContext onDragStart={e => setDraggedItem(e.active.data.current)} onDragEnd={() => setDraggedItem(null)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TasksTable rows={tasks} view={view} deptFilter={deptFilter} onComplete={()=>{}} onDragStart={handleTaskDragStart} />
          </div>
          <div className="lg:col-span-1">
            <WeekCalendar events={events} onDaySelect={(iso) => console.log('Selected:', iso)} />
          </div>
        </div>
      </DndContext>

      {data && (
        <CreateTaskModal
          open={createOpen}
          onClose={()=>setCreateOpen(false)}
          onCreate={(draft:any)=>{
            const payload = {
              ...draft,
              accountId: draft.accountId || presetAccount?.accountId || '',
              dept: draft.dept || 'VENTAS',
            };
            handleCreateTask(payload);
          }}
          accounts={data.accounts || []}
        />
      )}
    </div>
  );
}
