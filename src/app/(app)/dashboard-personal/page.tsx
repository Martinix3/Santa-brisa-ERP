
"use client";
import React, { useMemo, useState } from 'react';
import { BarChart3, Calendar, CheckCircle, Clock, Plus, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { SBCard, SBButton, SB_COLORS } from '@/components/ui/ui-primitives';
import { useData } from '@/lib/dataprovider';
import type { Interaction, InteractionStatus, Account, SantaData, OrderSellOut } from '@/domain/ssot';
import Link from 'next/link';
import { TaskBoard } from '@/features/agenda/TaskBoard';
import type { Task } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { sbAsISO } from '@/features/agenda/helpers';


function PersonalKPI({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-start gap-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color }}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
                <p className="text-sm text-zinc-600">{label}</p>
            </div>
        </div>
    );
}

function mapInteractionsToTasks(
  interactions: Interaction[] | undefined,
  accounts: Account[] | undefined
): Task[] {
  if (!interactions || !accounts) return [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  return interactions
    .filter((i) => i?.plannedFor)
    .map((i) => {
      const plannedISO = sbAsISO(i.plannedFor!);
      if (!plannedISO) return null;
      return {
        id: i.id,
        title: i.note || `${i.kind}`,
        type: i.dept || "VENTAS",
        status: i.status || 'open',
        date: plannedISO,
        involvedUserIds: i.involvedUserIds,
        location: i.location || accountMap.get(i.accountId || ''),
        linkedEntity: i.linkedEntity,
      } as Task;
    })
    .filter(Boolean) as Task[];
}


function PersonalDashboardContent() {
  const { currentUser, data, setData, saveAllCollections, saveCollection } = useData();
  const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  
  const userInteractions = useMemo(() => {
    if (!data || !currentUser) return [];
    return data.interactions.filter(i => {
        // A task belongs to the user if they are involved, or if they created it and no one else is involved.
        const isAssigned = (i.involvedUserIds || []).includes(currentUser.id);
        const isSelfAssigned = (i.involvedUserIds === undefined || i.involvedUserIds.length === 0) && i.userId === currentUser.id;
        return isAssigned || isSelfAssigned;
    });
  }, [data, currentUser]);
  
  const userTasks = useMemo(() => {
    return mapInteractionsToTasks(userInteractions, data?.accounts);
  }, [userInteractions, data?.accounts]);


  const kpis = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const openTasks = userInteractions.filter(t => t.status === 'open');
    const overdueTasks = openTasks.filter(t => t.plannedFor && new Date(t.plannedFor) < todayStart).length;
    const todayTasks = openTasks.filter(t => t.plannedFor && new Date(t.plannedFor) >= todayStart && new Date(t.plannedFor) <= todayEnd).length;
    const futureTasks = openTasks.filter(t => t.plannedFor && new Date(t.plannedFor) > todayEnd).length;

    return { overdueTasks, todayTasks, futureTasks };
  }, [userInteractions]);
  
  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    const taskToUpdate = userInteractions.find(i => i.id === id);
     if (newStatus === 'done' && taskToUpdate) {
        setCompletingTask(taskToUpdate);
    }
  };

  const handleSaveNewTask = async (eventData: Omit<Interaction, 'createdAt' | 'status'> & { id?: string }) => {
      if (!currentUser || !data) return;
      
      const newInteraction: Interaction = {
          id: `int_${Date.now()}`,
          ...(eventData as Omit<Interaction, 'id' | 'createdAt' | 'status'>),
          createdAt: new Date().toISOString(),
          status: 'open',
          userId: currentUser.id,
      };

      const updatedInteractions = [...(data.interactions || []), newInteraction];
      
      setData({ ...data, interactions: updatedInteractions });
      await saveCollection('interactions', updatedInteractions);

      setIsNewEventDialogOpen(false);
  };
  
   const handleSaveCompletedTask = async (
    taskId: string,
    payload: { type: 'venta', items: { sku: string; qty: number }[] } | { type: 'interaccion', note: string, nextActionDate?: string }
  ) => {
      if (!data || !currentUser) return;
      
      const collectionsToSave: Partial<SantaData> = {};

      const updatedInteractions = data.interactions.map(i =>
          i.id === taskId ? { ...i, status: 'done' as InteractionStatus, resultNote: (payload as any).note } : i
      );
      collectionsToSave.interactions = updatedInteractions;

      if (payload.type === 'interaccion' && payload.nextActionDate) {
          const originalTask = data.interactions.find(i => i.id === taskId);
          const newFollowUp: Interaction = {
              id: `int_${Date.now()}`,
              userId: currentUser.id,
              accountId: originalTask?.accountId,
              kind: 'OTRO', 
              note: `Seguimiento de: ${(payload as any).note}`,
              plannedFor: payload.nextActionDate,
              createdAt: new Date().toISOString(),
              dept: originalTask?.dept || 'VENTAS',
              status: 'open',
          };
          collectionsToSave.interactions.push(newFollowUp);
      }

      if (payload.type === 'venta') {
          const originalTask = data.interactions.find(i => i.id === taskId);
          if (originalTask?.accountId) {
              const newOrder: OrderSellOut = {
                  id: `ord_${Date.now()}`,
                  accountId: originalTask.accountId,
                  status: 'open',
                  currency: 'EUR',
                  createdAt: new Date().toISOString(),
                  lines: payload.items.map(item => ({ sku: item.sku, qty: item.qty, uom: 'uds', priceUnit: 0 })),
                  notes: `Pedido rápido creado desde tarea ${taskId}`,
              };
              collectionsToSave.ordersSellOut = [...(data.ordersSellOut || []), newOrder];
          }
      }
    
      setData(prevData => prevData ? { ...prevData, ...collectionsToSave } : null);

      await saveAllCollections(collectionsToSave);
    
      setCompletingTask(null);
  };


  if (!currentUser || !data) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <>
      <div className="p-6 bg-zinc-50 flex-grow space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-800">Bienvenido, {currentUser.name.split(' ')[0]}</h1>
            <p className="text-zinc-600">Aquí tienes un resumen de tu actividad y tus tareas pendientes.</p>
          </div>
          <div className="flex items-center gap-2">
              <SBButton onClick={() => setIsNewEventDialogOpen(true)}>
                  <Plus size={16} /> Nueva Tarea
              </SBButton>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PersonalKPI label="Tareas Pendientes (Hoy)" value={kpis.todayTasks} icon={Clock} color={SB_COLORS.primary.copper} />
          <PersonalKPI label="Tareas Atrasadas" value={kpis.overdueTasks} icon={AlertTriangle} color={SB_COLORS.state.danger} />
          <PersonalKPI label="Tareas Futuras" value={kpis.futureTasks} icon={Calendar} color={SB_COLORS.primary.teal} />
        </div>

        {/* Task Board */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-800 mb-3">Tu Tablero de Tareas</h2>
          <TaskBoard
              tasks={userTasks}
              onTaskStatusChange={handleUpdateStatus}
              onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
          />
        </div>
      </div>

      {isNewEventDialogOpen && (
          <NewEventDialog
            open={isNewEventDialogOpen}
            onOpenChange={setIsNewEventDialogOpen}
            onSave={handleSaveNewTask as any}
            accentColor={SB_COLORS.primary.copper}
          />
      )}

      {completingTask && (
          <TaskCompletionDialog
              task={completingTask}
              open={!!completingTask}
              onClose={() => setCompletingTask(null)}
              onComplete={handleSaveCompletedTask}
          />
      )}
    </>
  );
}


export default function Page() {
  return (
    <>
      <ModuleHeader title="Dashboard Personal" icon={BarChart3} />
      <PersonalDashboardContent />
    </>
  );
}
