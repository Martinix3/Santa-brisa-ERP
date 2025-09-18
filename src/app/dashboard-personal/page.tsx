
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { User, CheckCircle, Clock, AlertCircle as AlertCircleIcon } from 'lucide-react';
import type { Interaction, InteractionStatus, SantaData, OrderSellOut, Department, EventMarketing } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { TaskBoard, Task } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { saveCollection } from '@/features/agenda/components/CalendarPageContent';

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
    const [completingMarketingTask, setCompletingMarketingTask] = useState<Interaction | null>(null);

    const allMyInteractions = useMemo(() => {
        if (!data || !currentUser) return [];
        return data.interactions.filter(i => 
            i.userId === currentUser.id || i.involvedUserIds?.includes(currentUser.id)
        );
    }, [data, currentUser]);

    const allTasks = useMemo(() => {
        return mapInteractionsToTasks(allMyInteractions, data?.accounts || []);
    }, [allMyInteractions, data?.accounts]);

    const { openTasks, doneTasks, processingTasks } = useMemo(() => {
        const open = allTasks.filter(t => t.status === 'open');
        const done = allTasks.filter(t => t.status === 'done');
        const processing = allTasks.filter(t => t.status === 'processing');
        return { openTasks: open, doneTasks: done, processingTasks: processing };
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
        if (newStatus === 'done' && taskToUpdate) {
             handleCompleteTask(taskId);
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
        if(!taskToComplete) return;

        if (taskToComplete.dept === 'MARKETING') {
            setCompletingMarketingTask(taskToComplete);
        } else if (taskToComplete.dept === 'VENTAS') {
            setCompletingTask(taskToComplete);
        } else {
            // For other depts, just mark as done for now
            const updatedInteractions = data.interactions.map(i => 
                i.id === taskId ? { ...i, status: 'done' as InteractionStatus } : i
            );
            setData({ ...data, interactions: updatedInteractions });
            if (isPersistenceEnabled) {
                saveCollection('interactions', updatedInteractions, isPersistenceEnabled);
            }
        }
    }

    const handleSaveCompletedTask = async (
        taskId: string,
        payload: any
    ) => {
        if (!data || !currentUser) return;
    
        const originalTask = data.interactions.find(i => i.id === taskId);
        if (!originalTask) return;
    
        let finalData: SantaData = { ...data };

        // 1. Mark the original task as 'done' and add result note
        const updatedInteractions = finalData.interactions.map(i =>
            i.id === taskId ? { ...i, status: 'done' as InteractionStatus, resultNote: (payload as any).note } : i
        );
        finalData.interactions = updatedInteractions;
        
        // 2. Handle different payload types
        if (payload.type === 'interaccion' && payload.nextActionDate) {
            const newFollowUp: Interaction = {
                id: `int_${Date.now()}`,
                userId: originalTask.userId,
                involvedUserIds: originalTask.involvedUserIds,
                accountId: originalTask.accountId,
                kind: 'OTRO',
                note: `Seguimiento de: ${payload.note}`,
                plannedFor: payload.nextActionDate,
                createdAt: new Date().toISOString(),
                dept: originalTask.dept,
                status: 'open',
            };
            finalData.interactions.push(newFollowUp);
        }
        else if (payload.type === 'venta' && originalTask.accountId) {
            const newOrder: OrderSellOut = {
                id: `ord_${Date.now()}`,
                accountId: originalTask.accountId,
                status: 'open',
                currency: 'EUR',
                createdAt: new Date().toISOString(),
                lines: payload.items.map((item: any) => ({
                    sku: item.sku,
                    qty: item.qty,
                    unit: 'uds',
                    priceUnit: 0,
                })),
                notes: `Pedido creado desde tarea ${taskId}`,
            };
            finalData.ordersSellOut = [...(finalData.ordersSellOut || []), newOrder];
            if (isPersistenceEnabled) {
                await saveCollection('ordersSellOut', finalData.ordersSellOut, isPersistenceEnabled);
            }
        }
        else if (payload.type === 'marketing' && originalTask.linkedEntity?.id) {
             const mktEventId = originalTask.linkedEntity.id;
             finalData.mktEvents = (finalData.mktEvents || []).map(me => {
                 if (me.id === mktEventId) {
                     return {
                         ...me,
                         status: 'closed',
                         spend: payload.cost,
                         goal: {
                             ...(me.goal || {}),
                             leads: payload.leads,
                             sampling: payload.attendees,
                         },
                     } as EventMarketing;
                 }
                 return me;
             });
             if (isPersistenceEnabled) {
                 await saveCollection('mktEvents', finalData.mktEvents, isPersistenceEnabled);
             }
        }
    
        // 4. Update state and persist interactions
        setData(finalData);

        if (isPersistenceEnabled) {
            await saveCollection('interactions', finalData.interactions, isPersistenceEnabled);
        }
    
        setCompletingTask(null);
        setCompletingMarketingTask(null);
    };
    
    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Dashboard Personal" icon={User} />
            <div className="p-6 bg-zinc-50 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KPI icon={AlertCircleIcon} label="Tareas Pendientes" value={overdue.length} />
                    <KPI icon={Clock} label="Tareas Programadas" value={upcoming.length} />
                    <KPI icon={CheckCircle} label="Tareas Hechas (30d)" value={doneTasks.filter(t => t.date && new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} />
                    <KPI icon={User} label="Tareas en Revisión" value={processingTasks.length} />
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

            {completingMarketingTask && (
                <MarketingTaskCompletionDialog
                    task={completingMarketingTask}
                    open={!!completingMarketingTask}
                    onClose={() => setCompletingMarketingTask(null)}
                    onComplete={handleSaveCompletedTask}
                />
            )}
            
        </AuthenticatedLayout>
    )
}
