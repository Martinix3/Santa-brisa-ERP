// FILE: src/app/(app)/dashboard-personal/page.tsx
'use client';
import React, { useMemo, useState, useCallback, useTransition } from 'react';
import { Kanban, type PipelineItem } from '@/features/ops/components/Kanban';
import { TasksTable } from '@/features/ops/components/TasksTable';
import { WeekCalendar } from '@/features/ops/components/WeekCalendar';
import { CreateTaskModal } from '@/features/ops/components/CreateTaskModal';
import type { Interaction, Department, Account, User, InteractionKind, Stage, TaskKind } from '@/domain/ssot';
import type { CalendarEvent } from '@/domain/ops.types';
import { scheduleEvent, createTask, completeTask } from '@/app/(app)/ops/actions';
import { Plus, LayoutGrid, ListTodo, LayoutDashboard } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { toast } from 'sonner';
import { ModuleHeader, SBCard, SBButton, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';

// Helper para convertir de forma segura InteractionKind a TaskKind
function interactionKindToTaskKind(kind: InteractionKind | string): TaskKind {
    const taskKinds: Set<string> = new Set(['VISITA', 'LLAMADA', 'PEDIDO', 'POS_EVT', 'POS_PLV', 'NOTA', 'OTRO', 'MKT', 'QC', 'FIN']);
    if (taskKinds.has(kind)) {
        return kind as TaskKind;
    }
    // Mapea otros tipos a 'NOTA' como un valor por defecto seguro.
    return 'NOTA';
}

// ---- Dept narrowing para CalendarEvent ----
// CalendarEvent.dept en ops.types solo permite:
type EventDept = 'VENTAS' | 'MARKETING' | 'PRODUCCION' | 'ALMACEN' | 'FINANZAS' | 'CALIDAD';
const EVENT_DEPTS: ReadonlySet<string> = new Set(['VENTAS','MARKETING','PRODUCCION','ALMACEN','FINANZAS','CALIDAD']);
function toEventDept(d: Department): EventDept {
  // Si llega PERSONAL u OPS (aunque filtramos), fija un fallback seguro
  return EVENT_DEPTS.has(d as string) ? (d as EventDept) : 'VENTAS';
}

function mapInteractionToTask(i: Interaction, accounts: Account[]): Interaction {
  const account = accounts.find(a => a.id === i.accountId);
  return {
    ...i,
    title: (i as any).title || i.note || 'Tarea sin título',
    dept: i.dept as Department,
    kind: i.kind,
    status: i.status === 'done' ? 'done' : 'open',
    plannedFor: (i as any).startAt || i.plannedFor,
    accountName: account?.name || 'N/A',
  };
}

function mapInteractionToEvent(i: Interaction, accounts: Account[]): CalendarEvent {
    const account = accounts.find(a => a.id === i.accountId);
    const startAt = (i as any).startAt || i.plannedFor!;
    return {
        id: i.id,
        title: (i as any).title || i.note || 'Tarea sin título',
        startAt: startAt,
        endAt: (i as any).endAt || new Date(new Date(startAt).getTime() + ((i as any).durationMin || 45) * 60000).toISOString(),
        dept: toEventDept(i.dept as Department),
        accountId: i.accountId,
        accountName: account?.name,
    };
}


function OpsSidebar({ pipeline, tasks, view, deptFilter, onProgramFromKanban, onCompleteTask, onDragStart }: {
    pipeline: PipelineItem[];
    tasks: Interaction[];
    view: 'DIA'|'SEMANA'|'MES';
    deptFilter: Department | 'TODOS';
    onProgramFromKanban: (p: any) => void;
    onCompleteTask: (id: string) => void;
    onDragStart: (row: any, e: React.DragEvent) => void;
}) {
    return (
        <SBCard noPadding className="h-full flex flex-col">
            <Tabs defaultValue="tasks" className="flex flex-col h-full">
                <TabsList className="m-2">
                    <TabsTrigger value="tasks" className="flex-1"><ListTodo size={14} className="mr-2"/> Tareas sin Programar</TabsTrigger>
                    <TabsTrigger value="kanban" className="flex-1"><LayoutGrid size={14} className="mr-2"/> Pipeline</TabsTrigger>
                </TabsList>
                <TabsContent value="tasks" className="flex-grow overflow-y-auto">
                    <TasksTable rows={tasks} view={view} deptFilter={deptFilter} onComplete={onCompleteTask} onDragStart={onDragStart} />
                </TabsContent>
                <TabsContent value="kanban" className="p-2 flex-grow overflow-y-auto">
                    <div className="text-center p-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg mb-2">
                        <h3 className="font-semibold text-foreground">Pipeline (Demo)</h3>
                        <p>La lógica para generar el pipeline real aún no está implementada.</p>
                    </div>
                    <Kanban items={pipeline} onProgram={onProgramFromKanban} />
                </TabsContent>
            </Tabs>
        </SBCard>
    );
}

export default function PersonalDashboardPage() {
  const { data, currentUser } = useData();
  const [isPending, startTransition] = useTransition();

  const { tasks, events, accounts, pipeline } = useMemo(() => {
    if (!data) return { tasks: [], events: [], accounts: [], pipeline: [] };
    
    const validAccounts = data.accounts || [];
    const allTasks: Interaction[] = (data.interactions || []).map(i => mapInteractionToTask(i, validAccounts));
    const allEvents = (data.interactions || [])
        .filter(i => i.dept !== 'PERSONAL' && i.dept !== 'OPS' && ((i as any).startAt || i.plannedFor))
        .map(i => mapInteractionToEvent(i, validAccounts));

    const pipelineStages: Stage[] = ['POTENCIAL', 'ACTIVA', 'SEGUIMIENTO', 'FALLIDA'];
    const demoPipeline: PipelineItem[] = validAccounts.filter(acc => pipelineStages.includes(acc.stage as any)).slice(0, 5).map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        stage: acc.stage as PipelineItem['stage'],
        sales: { revenue: 0, ordersCount: 0 },
        marketing: { hasPLVInstalled: false, activeActivations: 0, ordersWithPromoInPeriod: 0 },
    }));

    return { 
        tasks: allTasks, 
        events: allEvents as CalendarEvent[], 
        accounts: validAccounts,
        pipeline: demoPipeline,
    };
  }, [data]);
  
  const [view, setView] = useState<'DIA'|'SEMANA'|'MES'>('SEMANA');
  const [deptFilter, setDeptFilter] = useState<Department | 'TODOS'>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);

  const onProgramFromKanban = useCallback((p:{accountId:string;accountName:string;dept:Department;title:string})=>{
    startTransition(async () => {
        if (!currentUser?.id) { toast.error("No se ha podido identificar al usuario."); return; }
        const res = await createTask({ accountId: p.accountId, note: p.title, dept: p.dept, userId: currentUser.id });
        if (res.ok) {
            toast.success("Tarea creada para programar.");
        } else {
            toast.error("Error al crear la tarea.");
        }
    });
  }, [currentUser?.id]);

  const onCompleteTask = useCallback((id:string)=>{
      startTransition(async () => {
          const res = await completeTask(id);
          if (res.ok) {
              toast.success("Tarea completada.");
          } else {
              toast.error("Error al completar la tarea.");
          }
      });
  }, []);

  const onTaskDragStart = useCallback((row: any, e:React.DragEvent)=>{
    e.dataTransfer.setData('application/json', JSON.stringify(row));
    e.dataTransfer.effectAllowed='copyMove';
  }, []);

  const onCalendarDrop = useCallback(async (slotISO:string, payload:any)=>{
    startTransition(async () => {
        if (!currentUser?.id) { toast.error("No se ha podido identificar al usuario."); return; }
        const res = await scheduleEvent({
            taskId: payload.id,
            title: payload.title,
            dept: payload.dept,
            startAt: slotISO,
            durationMin: 45
        });
        if (res.ok) {
            toast.success("Tarea programada en el calendario.");
        } else {
            toast.error("Error al programar la tarea.");
        }
    });
  }, [currentUser?.id]);

  const onCreateTask = useCallback((payload:any)=>{
    startTransition(async () => {
        if (!currentUser?.id) { toast.error("No se ha podido identificar al usuario."); return; }
        const res = await createTask({ ...payload, userId: currentUser.id });
        if (res.ok) {
            toast.success("Nueva tarea creada.");
            setCreateOpen(false);
        } else {
            toast.error("No se pudo crear la tarea.");
        }
    });
  }, [currentUser?.id]);

  return (
    <div className="flex flex-col h-full bg-background">
      <ModuleHeader title="Mi Dashboard de Operaciones" icon={LayoutDashboard}>
        <div className="flex items-center gap-2">
            <Select value={view} onChange={e=> setView(e.target.value as any)}>
              <option value="DIA">Día</option>
              <option value="SEMANA">Semana</option>
              <option value="MES">Mes</option>
            </Select>
            <Select value={deptFilter} onChange={e=> setDeptFilter(e.target.value as any)}>
              <option value="TODOS">Todos Dept.</option>
              <option value="VENTAS">Ventas</option>
              <option value="MARKETING">Marketing</option>
              <option value="CALIDAD">Calidad</option>
              <option value="FINANZAS">Finanzas</option>
              <option value="PRODUCCION">Producción</option>
              <option value="ALMACEN">Almacén</option>
              <option value="PERSONAL">Personal</option>
            </Select>
            <SBButton variant="primary" size="sm" onClick={()=>setCreateOpen(true)}><Plus size={14}/> Crear tarea</SBButton>
        </div>
      </ModuleHeader>

      <main className="flex-grow p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[1fr,1.8fr] gap-6 overflow-hidden">
        <OpsSidebar
            pipeline={pipeline}
            tasks={tasks}
            view={view}
            deptFilter={deptFilter}
            onProgramFromKanban={onProgramFromKanban}
            onCompleteTask={onCompleteTask}
            onDragStart={onTaskDragStart}
        />

        <section className="flex flex-col gap-3">
          <WeekCalendar events={events} onDropSchedule={onCalendarDrop} />
          <p className="text-xs text-muted-foreground text-center">
            Arrastra tareas desde la barra lateral a un hueco libre del calendario para programarlas.
          </p>
        </section>
      </main>

      <SBButton 
        variant="primary"
        className="fixed right-4 bottom-4 rounded-full w-14 h-14 p-0 shadow-lg xl:hidden" 
        onClick={()=>setCreateOpen(true)} 
        aria-label="Crear tarea"
      >
        <Plus />
      </SBButton>

      <CreateTaskModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreate={onCreateTask} accounts={accounts} />
    </div>
  );
}
