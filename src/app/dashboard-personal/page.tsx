

"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { User, CheckCircle, AlertCircle, Clock, Target } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';
import type { Interaction, InteractionStatus, SantaData } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { TaskBoard, Task } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { saveCollection } from '@/features/agenda/components/CalendarPageContent';
import { runSantaBrain, ChatContext } from '@/ai/flows/santa-brain-flow';
import { Message } from 'genkit';

function KPI({label, value, icon: Icon}:{label:string; value:number|string; icon: React.ElementType}){
  return (
    <div className="rounded-xl border border-zinc-200 p-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-600">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-2xl font-semibold text-zinc-900">{value}</div>
            </div>
        </div>
    </div>
  );
}


function mapInteractionsToTasks(interactions: Interaction[], accounts: any[]): Task[] {
  if (!interactions) return [];
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  return interactions
    .map(i => ({
      id: i.id,
      title: i.note || 'Tarea sin título',
      type: i.dept || 'VENTAS',
      status: i.status || 'open',
      date: i.plannedFor,
      involvedUserIds: i.involvedUserIds || [i.userId],
      location: i.location || accountMap.get(i.accountId || ''),
      linkedEntity: i.linkedEntity,
    }));
}


export default function PersonalDashboardPage() {
    const { currentUser, data, setData, isPersistenceEnabled } = useData();
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);

    const allMyInteractions = useMemo(() => {
        if (!data || !currentUser) return [];
        return data.interactions.filter(i => 
            i.userId === currentUser.id || i.involvedUserIds?.includes(currentUser.id)
        );
    }, [data, currentUser]);

    const allTasks = useMemo(() => {
        return mapInteractionsToTasks(allMyInteractions, data?.accounts || []);
    }, [allMyInteractions, data?.accounts]);

    const { openTasks, doneTasks } = useMemo(() => {
        const open = allTasks.filter(t => t.status === 'open');
        const done = allTasks.filter(t => t.status === 'done');
        return { openTasks: open, doneTasks: done };
    }, [allTasks]);

    const { upcoming, overdue } = useMemo(() => {
        const now = new Date();
        const upcomingTasks = openTasks.filter(i => i.date && new Date(i.date) >= now);
        const overdueTasks = openTasks.filter(i => !i.date || new Date(i.date) < now);
        return { upcoming: upcomingTasks, overdue: overdueTasks };
    }, [openTasks]);

    const handleTaskStatusChange = (taskId: string, newStatus: InteractionStatus) => {
        if (!data) return;

        const taskToUpdate = allMyInteractions.find(i => i.id === taskId);
        if (newStatus === 'done' && taskToUpdate && taskToUpdate.dept === 'VENTAS') {
             if(taskToUpdate) {
                setCompletingTask(taskToUpdate);
            }
        } else {
            const updatedInteractions = data.interactions.map(i => 
                i.id === taskId ? { ...i, status: newStatus } : i
            );
            setData({ ...data, interactions: updatedInteractions });
            if (isPersistenceEnabled) {
                saveCollection('interactions', updatedInteractions, isPersistenceEnabled);
            }
        }
    };
    
    const handleCompleteTask = (taskId: string) => {
        const taskToComplete = allMyInteractions.find(i => i.id === taskId);
        if(taskToComplete) {
            setCompletingTask(taskToComplete);
        }
    }

    const handleSaveCompletedTask = async (taskId: string, resultNote: string) => {
      if (!data || !currentUser) return;
    
      // 1. Immediately mark the task as 'done' and save the note
      const updatedInteractions = data.interactions.map((i) =>
        i.id === taskId
          ? { ...i, status: 'done' as InteractionStatus, resultNote }
          : i
      );
      setData({ ...data, interactions: updatedInteractions as Interaction[] });
      setCompletingTask(null);
    
      // Persist this final state if enabled
      if (isPersistenceEnabled) {
        saveCollection('interactions', updatedInteractions, isPersistenceEnabled);
      }
    
      // 2. Run Santa Brain in the background to create entities, without waiting for it
      try {
        const chatContext: ChatContext = {
          accounts: data.accounts,
          products: data.products,
          orders: data.ordersSellOut,
          interactions: data.interactions,
          inventory: data.inventory,
          mktEvents: data.mktEvents,
          currentUser: currentUser,
        };
    
        const { newEntities } = await runSantaBrain([], resultNote, chatContext);
    
        // 3. Merge new entities silently into the state
        setData((prevData) => {
          if (!prevData) return null;
          let latestData = { ...prevData };
    
          for (const key in newEntities) {
            const collectionName = key as keyof SantaData;
            if (newEntities[collectionName] && Array.isArray(newEntities[collectionName])) {
              const newItems = newEntities[collectionName] as any[];
              if (newItems.length > 0) {
                const existingItems = (latestData[collectionName] as any[]) || [];
                latestData[collectionName] = [...existingItems, ...newItems] as any;
              }
            }
          }
          return latestData;
        });

      } catch (error) {
        console.error("Error processing task completion with AI:", error);
        // We don't revert the task status, as the user has already marked it as done.
        // We just log the error.
        alert("Hubo un error al procesar la tarea con la IA. La tarea se ha marcado como hecha, pero puede que falten acciones automáticas.");
      }
    };
    
    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Dashboard Personal" icon={User} />
            <div className="p-6 bg-zinc-50 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <KPI icon={AlertCircle} label="Tareas Pendientes" value={overdue.length} />
                    <KPI icon={Clock} label="Tareas Programadas" value={upcoming.length} />
                    <KPI icon={CheckCircle} label="Tareas Completadas (30d)" value={doneTasks.filter(t => t.date && new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} />
                </div>
                
                <TaskBoard 
                    tasks={allTasks}
                    onTaskStatusChange={handleTaskStatusChange}
                    onCompleteTask={handleCompleteTask}
                    typeStyles={DEPT_META}
                />
            </div>
            {completingTask && (
                <TaskCompletionDialog
                    task={completingTask}
                    open={!!completingTask}
                    onClose={() => setCompletingTask(null)}
                    onComplete={handleSaveCompletedTask}
                />
            )}
            
        </AuthenticatedLayout>
    )
}
