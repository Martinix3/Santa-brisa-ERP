'use client';
import React, { useMemo, useState, useCallback, useTransition } from 'react';
import { addMinutes, startOfWeek, format } from 'date-fns';
import { Kanban, type PipelineItem } from '@/features/ops/components/Kanban';
import { TasksTable } from '@/features/ops/components/TasksTable';
import { WeekCalendar } from '@/features/ops/components/WeekCalendar';
import { CreateTaskModal } from '@/features/ops/components/CreateTaskModal';
import type { Interaction, Department, Account, User, Task } from '@/domain/ssot';
import { scheduleEvent, createTask, completeTask } from '@/app/(app)/ops/actions';
import { Plus } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';

function mapInteractionToTask(i: Interaction, accounts: Account[]): Task {
  const account = accounts.find(a => a.id === i.accountId);
  return {
    id: i.id,
    title: i.title || i.note || 'Tarea sin título',
    department: i.dept as Department,
    kind: (i.uiKind || i.kind) as any,
    status: i.status === 'done' ? 'done' : 'open',
    dueAt: i.plannedFor || i.startAt,
    durationMin: i.durationMin,
    accountId: i.accountId,
    accountName: account?.name || 'N/A',
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

function mapInteractionToEvent(i: Interaction, accounts: Account[]): any {
    const account = accounts.find(a => a.id === i.accountId);
    return {
        id: i.id,
        title: i.title || i.note || 'Tarea sin título',
        startAt: i.startAt || i.plannedFor!,
        endAt: i.endAt || new Date(new Date(i.startAt || i.plannedFor!).getTime() + (i.durationMin || 45) * 60000).toISOString(),
        dept: i.dept as Department,
        accountId: i.accountId,
        accountName: account?.name,
    };
}


export default function OpsDashboardPage(){
  const { data, currentUser, saveAllCollections } = useData();
  const [isPending, startTransition] = useTransition();

  const { pipeline, tasks, events, accounts, users } = useMemo(() => {
    if (!data) return { pipeline: [], tasks: [], events: [], accounts: [], users: [] };
    
    // Convert interactions to tasks and events
    const allTasks = (data.interactions || []).map(i => mapInteractionToTask(i, data.accounts));
    const allEvents = (data.interactions || []).filter(i => i.startAt || i.plannedFor).map(i => mapInteractionToEvent(i, data.accounts));

    // Mock pipeline data for now
    const demoPipeline: PipelineItem[] = (data.accounts || []).slice(0, 5).map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        stage: acc.stage,
        sales: { revenue: 0, ordersCount: 0 },
        marketing: { hasPLVInstalled: false, activeActivations: 0, ordersWithPromoInPeriod: 0 },
    }));

    return { 
        pipeline: demoPipeline, 
        tasks: allTasks, 
        events: allEvents, 
        accounts: data.accounts,
        users: data.users
    };
  }, [data]);
  
  const [view, setView] = useState<'DIA'|'SEMANA'|'MES'>('SEMANA');
  const [deptFilter, setDeptFilter] = useState<Department | 'TODOS'>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);

  const onProgramFromKanban = (p:{accountId:string;accountName:string;dept:Department;title:string})=>{
    startTransition(async () => {
        const { ok } = await createTask({
            accountId: p.accountId,
            title: p.title,
            note: p.title,
            dept: p.dept,
            userId: currentUser?.id
        });
        if (ok) toast.success("Tarea creada para programar.");
    });
  };

  const onCompleteTask = (id:string)=>{
      startTransition(async () => {
          const { ok } = await completeTask(id);
          if (ok) toast.success("Tarea completada.");
      });
  };

  const onTaskDragStart = (row: Task, e:React.DragEvent)=>{
    e.dataTransfer.setData('application/json', JSON.stringify(row));
    e.dataTransfer.effectAllowed='copyMove';
  };

  const onCalendarDrop = async (slotISO:string, payload:any)=>{
    startTransition(async () => {
        const { ok } = await scheduleEvent({
            taskId: payload.id,
            accountId: payload.accountId,
            title: payload.title,
            dept: payload.dept,
            startAt: slotISO,
            durationMin: 45
        });
        if (ok) toast.success("Tarea programada en el calendario.");
    });
  };

  const onCreateTask = (payload:any)=>{
    startTransition(async () => {
        const { ok } = await createTask({
            ...payload,
            userId: currentUser?.id
        });
        if (ok) {
            toast.success("Nueva tarea creada.");
            setCreateOpen(false);
        } else {
            toast.error("No se pudo crear la tarea.");
        }
    });
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr,1.1fr] gap-4">
        <section className="space-y-3">
          <div className="sb-card" data-variant="plain">
            <div className="sb-card__header">
              <h2 className="sb-card__title">Pipeline (Kanban)</h2>
              <div className="ml-auto text-sm text-neutral-600">Arrastra al calendario para programar</div>
            </div>
          </div>
          <Kanban items={pipeline} onProgram={onProgramFromKanban} />
        </section>

        <section className="space-y-3">
          <div className="sb-card" data-variant="plain">
            <div className="sb-card__header">
              <h2 className="sb-card__title">Tareas</h2>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <select className="border rounded-lg px-2 py-1" value={view} onChange={e=> setView(e.target.value as any)}>
                  <option value="DIA">Día</option>
                  <option value="SEMANA">Semana</option>
                  <option value="MES">Mes</option>
                </select>
                <select className="border rounded-lg px-2 py-1" value={deptFilter} onChange={e=> setDeptFilter(e.target.value as any)}>
                  <option value="TODOS">Todos</option>
                  <option value="VENTAS">Ventas</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="CALIDAD">Calidad</option>
                  <option value="FINANZAS">Finanzas</option>
                  <option value="PRODUCCION">Producción</option>
                  <option value="ALMACEN">Almacén</option>
                </select>
                <button className="sb-btn-primary px-2 py-1 flex items-center gap-1" onClick={()=>setCreateOpen(true)}><Plus size={14}/> Crear tarea</button>
              </div>
            </div>
          </div>
          <TasksTable rows={tasks} view={view} deptFilter={deptFilter} onComplete={onCompleteTask} onDragStart={onTaskDragStart} />
        </section>

        <section className="space-y-3">
          <WeekCalendar events={events} onDropSchedule={onCalendarDrop} />
          <div className="text-xs text-neutral-600">Consejo: Arrastra tareas desde el Kanban o la Tabla al hueco libre del calendario para programar o reprogramar.</div>
        </section>
      </div>

      <button className="fixed right-4 bottom-4 sb-btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-lg xl:hidden" onClick={()=>setCreateOpen(true)} aria-label="Crear tarea">
        <Plus />
      </button>

      <CreateTaskModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreate={onCreateTask} accounts={accounts} />
    </main>
  );
}
