// src/app/(app)/dashboard-personal/page.tsx
'use client';

import React, { useMemo, useState, useCallback, useTransition } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, Account, Department, Stage } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { DndContext, useDroppable, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { Plus, Check, Clock, Waypoints, Droplet, Users } from 'lucide-react';
import { SBButton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { DayPicker } from 'react-day-picker';
import es from 'date-fns/locale/es';
import { toast } from 'sonner';
import { CreateTaskModal } from '@/features/ops/components/CreateTaskModal';
import { createTask, completeTask } from '@/app/(app)/ops/actions';

// --- HELPERS & STYLES ---
const formatEur = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);

const TaskStatusBadge = ({ status, date }: { status: 'Vencida' | 'Hecho'; date?: string }) => {
  const baseClasses = 'text-xs font-semibold px-2 py-0.5 rounded-full';
  const styles = {
    Vencida: 'bg-red-100 text-red-800',
    Hecho: 'bg-green-100 text-green-800',
  };
  return (
    <div className="text-right">
      <span className={cn(baseClasses, styles[status])}>{status}</span>
      {date && <p className="text-xs text-muted-foreground mt-1">{date}</p>}
    </div>
  );
};

// --- COMPONENTS ---
function DailyTasksCard({ tasks, onComplete }: { tasks: Interaction[]; onComplete: (id:string)=>void }) {
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const dateA = a.plannedFor ? new Date(a.plannedFor).getTime() : Infinity;
            const dateB = b.plannedFor ? new Date(b.plannedFor).getTime() : -Infinity;
            return dateA - dateB;
        });
    }, [tasks]);

    const getStatus = (task: Interaction): { status?: 'Vencida' | 'Hecho'; date?: string } => {
        if (task.status === 'done') return { status: 'Hecho' };
        if (task.plannedFor) {
            const now = new Date();
            const taskDate = new Date(task.plannedFor);
            if (taskDate < now) return { status: 'Vencida' };
            const time = taskDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            if (taskDate.toDateString() === now.toDateString()) {
                return { date: `Hoy, ${time}h` };
            }
        }
        return {};
    };

    return (
        <div className="bg-card border rounded-xl shadow-sm">
            <header className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2"><Clock size={16} /> Tareas del Día</h2>
            </header>
            <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                {sortedTasks.length > 0 ? sortedTasks.map(task => {
                    const deptMeta = task.dept ? DEPT_META[task.dept] : DEPT_META['OPS'];
                    const { status, date } = getStatus(task);
                    return (
                        <div key={task.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-2 rounded-lg hover:bg-secondary">
                            <input
                              type="checkbox"
                              className="sb-checkbox"
                              onChange={() => onComplete(task.id)}
                              aria-label="Completar tarea"
                            />
                            <div>
                                <p className="text-sm font-medium text-foreground">{task.note}</p>
                                {deptMeta && (
                                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: deptMeta.color + '20', color: deptMeta.color }}>
                                        {deptMeta.label}
                                    </span>
                                )}
                            </div>
                            {status && <TaskStatusBadge status={status} date={date} />}
                        </div>
                    );
                }) : <p className="p-4 text-center text-sm text-muted-foreground">No hay tareas para hoy.</p>}
            </div>
        </div>
    );
}

function DealCard({ deal, onProgram }: { deal: Account; onProgram:(preset:{accountId:string; accountName?:string})=>void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-3 bg-card border rounded-lg shadow-sm touch-none">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-sm">{deal.name}</p>
        {(deal.subType === 'PLV') && <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">PLV</span>}
      </div>
      <p className="text-xs text-muted-foreground">{formatEur(Math.random() * 25000)} · {Math.floor(Math.random() * 5 + 1)} ped.</p>
      <button
        className="text-right text-xs font-semibold text-primary mt-1 hover:underline"
        onClick={() => onProgram({ accountId: deal.id, accountName: deal.name })}
      >
        Programar
      </button>
    </div>
  );
}

function KanbanColumn({ id, title, count, deals, onProgram }: { id: string; title: string; count: number; deals: Account[]; onProgram:(preset:{accountId:string; accountName?:string})=>void }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-1 p-2 rounded-lg bg-secondary min-w-[200px]">
      <h3 className="font-semibold text-sm px-2 mb-2">{title} <span className="text-muted-foreground font-normal">({count})</span></h3>
      <div className="space-y-2">
        {deals.map(deal => <DealCard key={deal.id} deal={deal} onProgram={onProgram} />)}
        {deals.length === 0 && id === 'Fallida' && (
             <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground">Arrastra aquí</div>
        )}
      </div>
    </div>
  );
}

function SalesPipelineKanban({ accounts, onStageChange, onProgram }: { accounts: Account[], onStageChange: (accountId: string, newStage: Stage) => void; onProgram:(preset:{accountId:string; accountName?:string})=>void }) {
    const pipelineData = useMemo(() => ({
        'POTENCIAL': accounts.filter(a => a.stage === 'POTENCIAL'),
        'SEGUIMIENTO': accounts.filter(a => a.stage === 'SEGUIMIENTO'),
        'ACTIVA': accounts.filter(a => a.stage === 'ACTIVA'),
        'FALLIDA': accounts.filter(a => a.stage === 'FALLIDA'),
    }), [accounts]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { over, active } = event;
        if (over && active.id !== over.id) {
            onStageChange(active.id as string, over.id as Stage);
        }
    };
    
    return (
        <div className="bg-card border rounded-xl shadow-sm">
            <header className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2"><Waypoints size={16} /> Pipeline de Ventas</h2>
            </header>
            <DndContext onDragEnd={handleDragEnd}>
                <div className="p-4 flex gap-4 overflow-x-auto">
                    {Object.entries(pipelineData).map(([stage, deals]) => (
                        <KanbanColumn key={stage} id={stage} title={stage} count={deals.length} deals={deals} onProgram={onProgram} />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}

function WeeklyKpisCard({ tasks, orders }: { tasks: Interaction[], orders: any[] }) {
    const kpis = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0, 0, 0, 0);

        const tasksThisWeek = tasks.filter(t => t.status === 'done' && new Date(t.createdAt) >= startOfWeek);
        const salesThisWeek = orders.filter(o => new Date(o.createdAt) >= startOfWeek);

        return {
            tasksCompleted: tasksThisWeek.length,
            salesClosed: salesThisWeek.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
        };
    }, [tasks, orders]);

    return (
        <div className="bg-card border rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Droplet size={16}/> KPIs Clave (Semanal)</h3>
            <div className="flex justify-around text-center">
                <div>
                    <p className="text-xs text-muted-foreground">Tareas Completadas</p>
                    <p className="text-2xl font-bold">{kpis.tasksCompleted}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Ventas Cerradas</p>
                    <p className="text-2xl font-bold">{formatEur(kpis.salesClosed)}</p>
                </div>
            </div>
        </div>
    );
}


// --- MAIN PAGE ---
export default function PersonalDashboardPage() {
  const { data, setData } = useData();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [presetAccount, setPresetAccount] = useState<{accountId?:string; accountName?:string}|null>(null);

  const { todayTasks, pipelineAccounts, allTasks, allOrders } = useMemo(() => {
    if (!data) return { todayTasks: [], pipelineAccounts: [], allTasks: [], allOrders: [] };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const tasks = (data.interactions || []).filter(i => {
      if (i.status === 'done') return false;
      if (!i.plannedFor) return true;
      const taskDate = new Date(i.plannedFor);
      return taskDate >= startOfToday && taskDate < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    });

    return {
        todayTasks: tasks,
        pipelineAccounts: data.accounts || [],
        allTasks: data.interactions || [],
        allOrders: data.ordersSellOut || []
    };
  }, [data]);

  // completar tarea (UI optimista)
  const handleComplete = useCallback((id:string) => {
    if (!data) return;
    // Optimista en memoria
    setData(prev => {
      if (!prev) return prev;
      const interactions = prev.interactions.map(t => t.id === id ? { ...t, status:'done', updatedAt: new Date().toISOString() } : t);
      return { ...prev, interactions };
    });
    startTransition(async ()=>{
      const res = await completeTask(id);
      if (res.ok) toast.success('Tarea completada.');
      else toast.error('No se pudo completar la tarea.');
    });
  }, [data, setData, startTransition]);

  const handleStageChange = useCallback((accountId: string, newStage: Stage) => {
    if (!data) return;
    const updatedAccounts = data.accounts.map(acc => 
        acc.id === accountId ? { ...acc, stage: newStage, updatedAt: new Date().toISOString() } : acc
    );
    setData(prevData => prevData ? { ...prevData, accounts: updatedAccounts } : null);
    toast.success(`Cuenta movida a ${newStage}`);
    // Here you would also call a server action to persist the change
    // saveCollection('accounts', updatedAccounts);
  }, [data, setData]);

  // abrir modal pre-rellenado desde pipeline
  const handleProgramFromPipeline = useCallback((preset:{accountId:string; accountName?:string})=>{
    setPresetAccount(preset);
    setCreateOpen(true);
  }, []);

  // crear nueva tarea desde modal
  const handleCreateTask = useCallback((payload:any)=>{
    if (!data) return;
    // Optimista: insertamos al inicio de interactions
    const tempId = `tmp_${Date.now()}`;
    const optimistic = { id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status:'open', ...payload } as Interaction;
    setData(prev => prev ? { ...prev, interactions: [optimistic, ...(prev.interactions||[])] } : prev);
    setCreateOpen(false);
    startTransition(async ()=>{
      const res = await createTask(payload);
      if (res.ok) {
        toast.success('Tarea creada.');
        // opcional: podrías reconciliar el id real aquí
      } else {
        toast.error('No se pudo crear la tarea.');
        // revert (simple): filtra el temp
        setData(prev => prev ? { ...prev, interactions: (prev.interactions||[]).filter(i=>i.id!==tempId) } : prev);
      }
    });
  }, [data, setData, startTransition]);

  return (
    <div className="p-6 bg-secondary/70 min-h-full">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Dashboard</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
            <SBButton variant='secondary'>Diaria</SBButton>
            <SBButton variant='secondary'>Semanal</SBButton>
            <SBButton variant='secondary'>Mensual</SBButton>
            <SBButton onClick={()=>{ setPresetAccount(null); setCreateOpen(true); }} disabled={isPending}>
              <Plus size={16} className='mr-1'/> Nueva Tarea
            </SBButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DailyTasksCard tasks={todayTasks} onComplete={handleComplete} />
          <SalesPipelineKanban
            accounts={pipelineAccounts}
            onStageChange={handleStageChange}
            onProgram={handleProgramFromPipeline}
          />
        </div>
        <div className="space-y-6">
            <div className="bg-card border rounded-xl shadow-sm p-2">
                 <DayPicker
                    mode="single"
                    selected={new Date()}
                    locale={es}
                    showOutsideDays
                    fixedWeeks
                  />
            </div>
            <WeeklyKpisCard tasks={allTasks} orders={allOrders} />
        </div>
      </div>

      {/* Modal crear tarea */}
      {data && (
        <CreateTaskModal
          open={createOpen}
          onClose={()=>setCreateOpen(false)}
          onCreate={(draft:any)=>{
            // si venimos del pipeline, aplica preset
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
