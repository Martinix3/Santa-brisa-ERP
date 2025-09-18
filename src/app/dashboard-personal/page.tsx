

"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { User, CheckCircle, AlertCircle, Clock, Target, Loader } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';
import type { Interaction, InteractionStatus, SantaData } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { TaskBoard, Task } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { saveCollection } from '@/features/agenda/components/CalendarPageContent';
import { runSantaBrain, ChatContext } from '@/ai/flows/santa-brain-flow';
import { Message } from 'genkit';
import { EventDetailDialog } from '@/features/agenda/components/EventDetailDialog';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { SB_COLORS } from '@/components/ui/ui-primitives';

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
    const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
    const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
    const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);


    const allMyInteractions = useMemo(() => {
        if (!data || !currentUser) return [];
        return data.interactions.filter(i => 
            i.userId === currentUser.id || i.involvedUserIds?.includes(currentUser.id)
        );
    }, [data, currentUser]);

    const allTasks = useMemo(() => {
        return mapInteractionsToTasks(allMyInteractions, data?.accounts || []);
    }, [allMyInteractions, data?.accounts]);

    const { openTasks, processingTasks, doneTasks } = useMemo(() => {
        const open = allTasks.filter(t => t.status === 'open');
        const processing = allTasks.filter(t => t.status === 'processing');
        const done = allTasks.filter(t => t.status === 'done');
        return { openTasks: open, processingTasks: processing, doneTasks: done };
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
            if (taskToComplete.status === 'processing') {
                setSelectedEvent(taskToComplete);
            } else {
                setCompletingTask(taskToComplete);
            }
        }
    }

    const handleSaveCompletedTask = async (taskId: string, resultNote: string) => {
      if (!data || !currentUser) return;
    
      // 1. Immediately mark the task as 'processing' and save the note
      const updatedInteractions = data.interactions.map((i) =>
        i.id === taskId
          ? { ...i, status: 'processing' as InteractionStatus, resultNote }
          : i
      );
      setData({ ...data, interactions: updatedInteractions as Interaction[] });
      setCompletingTask(null);
    
      // Persist this intermediate state if enabled
      if (isPersistenceEnabled) {
        saveCollection('interactions', updatedInteractions, isPersistenceEnabled);
      }
    
      // 2. Run Santa Brain in the background
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
    
        // 3. Merge new entities and link them to the original task
        setData((prevData) => {
          if (!prevData) return null;
          let latestData = { ...prevData };
          let linkedEntity: Interaction['linkedEntity'] | undefined = undefined;
    
          for (const key in newEntities) {
            const collectionName = key as keyof SantaData;
            if (newEntities[collectionName] && Array.isArray(newEntities[collectionName])) {
              const newItems = newEntities[collectionName] as any[];
              if (newItems.length > 0) {
                const existingItems = (latestData[collectionName] as any[]) || [];
                latestData[collectionName] = [...existingItems, ...newItems] as any;
                
                // Link the first created entity to the task
                if(!linkedEntity) {
                    if (collectionName === 'ordersSellOut') linkedEntity = { type: 'Order', id: newItems[0].id };
                    if (collectionName === 'interactions') linkedEntity = { type: 'Interaction', id: newItems[0].id };
                    if (collectionName === 'accounts') linkedEntity = { type: 'Account', id: newItems[0].id };
                }
              }
            }
          }

          if (linkedEntity) {
              latestData.interactions = latestData.interactions.map(i => i.id === taskId ? {...i, linkedEntity} : i);
          }
          
          return latestData;
        });

      } catch (error) {
        console.error("Error processing task completion with AI:", error);
        setData((prevData) => {
           if (!prevData) return null;
           const revertedInteractions = prevData.interactions.map((i) =>
             i.id === taskId ? { ...i, status: 'open' as InteractionStatus } : i
           );
            alert("Hubo un error al procesar la tarea con la IA. La tarea se ha vuelto a poner como pendiente.");
           return { ...prevData, interactions: revertedInteractions };
        });
      }
    };
    
    const updateAndPersistInteractions = (updatedInteractions: Interaction[]) => {
      if (!data) return;
      setData(prev => prev ? ({ ...prev, interactions: updatedInteractions }) : null);
      saveCollection('interactions', updatedInteractions, isPersistenceEnabled);
    }
  
    const handleAddOrUpdateEvent = async (event: Omit<Interaction, 'createdAt' | 'status' | 'userId'> & { id?: string }) => {
        if (!currentUser || !data) return;
        if (event.id) { // Update existing
            const updatedInteractions = data.interactions.map(i => i.id === event.id ? { ...i, ...event } : i);
            updateAndPersistInteractions(updatedInteractions as Interaction[]);
        } else { // Create new
            const newInteraction: Interaction = {
                id: `int_${Date.now()}`,
                createdAt: new Date().toISOString(),
                status: 'open',
                userId: currentUser.id,
                ...event,
            };
            const updatedInteractions = [...(data.interactions || []), newInteraction];
            updateAndPersistInteractions(updatedInteractions);
        }
        setEditingEvent(null);
        setIsNewEventDialogOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        if (!data) return;
        const updatedInteractions = data.interactions.filter(i => i.id !== id);
        updateAndPersistInteractions(updatedInteractions);
        setSelectedEvent(null);
    };
    
    const handleEditRequest = (event: Interaction) => {
        setSelectedEvent(null);
        setEditingEvent(event);
        setIsNewEventDialogOpen(true);
    };


    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Dashboard Personal" icon={User} />
            <div className="p-6 bg-zinc-50 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KPI icon={AlertCircle} label="Tareas Pendientes" value={overdue.length} />
                    <KPI icon={Clock} label="Tareas Programadas" value={upcoming.length} />
                    <KPI icon={Loader} label="Pendiente de revisión" value={processingTasks.length} />
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
            
            {selectedEvent && (
                <EventDetailDialog
                    event={selectedEvent}
                    open={!!selectedEvent}
                    onOpenChange={() => setSelectedEvent(null)}
                    onUpdateStatus={handleTaskStatusChange}
                    onEdit={handleEditRequest}
                    onDelete={handleDeleteEvent}
                />
            )}

            {isNewEventDialogOpen && data && (
                <NewEventDialog
                    open={isNewEventDialogOpen}
                    onOpenChange={setIsNewEventDialogOpen}
                    onSave={handleAddOrUpdateEvent as any}
                    accentColor={SB_COLORS.accent}
                    initialEventData={editingEvent}
                />
            )}
        </AuthenticatedLayout>
    )
}
