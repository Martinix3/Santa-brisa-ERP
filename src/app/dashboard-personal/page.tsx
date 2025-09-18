
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { User, CheckCircle, AlertCircle, Clock, BarChart3, Users, Target, Calendar, LayoutGrid } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';
import type { Interaction, InteractionStatus } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { TaskBoard, Task } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
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
    .filter(i => i.plannedFor)
    .map(i => ({
      id: i.id,
      title: i.note || 'Tarea sin título',
      type: i.dept || 'VENTAS',
      status: i.status || 'open',
      date: i.plannedFor,
      involvedUserIds: i.involvedUserIds || [i.userId],
      location: i.location || accountMap.get(i.accountId || ''),
    }));
}


export default function PersonalDashboardPage() {
    const { currentUser, data, setData, isPersistenceEnabled } = useData();
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);

    const { upcoming, overdue, completed, allTasks } = useMemo(() => {
        if (!data || !currentUser) return { upcoming: [], overdue: [], completed: [], allTasks: [] };

        const myInteractions = data.interactions.filter(i => 
            i.userId === currentUser.id || i.involvedUserIds?.includes(currentUser.id)
        );

        const now = new Date();
        
        const upcomingTasks = myInteractions
            .filter(i => i.status === 'open' && i.plannedFor && new Date(i.plannedFor) >= now);
            
        const overdueTasks = myInteractions
            .filter(i => i.status === 'open' && i.plannedFor && new Date(i.plannedFor) < now);

        const completedTasks = myInteractions
            .filter(i => i.status === 'done');
            
        const allOpenTasks = mapInteractionsToTasks([...overdueTasks, ...upcomingTasks], data.accounts || []);
        const allCompletedTasks = mapInteractionsToTasks(completedTasks, data.accounts || []);

        return { 
            upcoming: upcomingTasks, 
            overdue: overdueTasks, 
            completed: completedTasks,
            allTasks: [...allOpenTasks, ...allCompletedTasks]
        };
    }, [data, currentUser]);

    const handleTaskStatusChange = (taskId: string, newStatus: InteractionStatus) => {
        if (!data) return;

        if (newStatus === 'done') {
            const taskToComplete = data.interactions.find(i => i.id === taskId);
            if(taskToComplete) {
                setCompletingTask(taskToComplete);
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
        handleTaskStatusChange(taskId, 'done');
    }

    const handleSaveCompletedTask = (
      taskId: string,
      resultNote: string
    ) => {
        if (!data) return;
        const updatedInteractions = data.interactions.map((i) => {
            if (i.id === taskId) {
                return {
                    ...i,
                    status: 'done' as InteractionStatus,
                    resultNote,
                };
            }
            return i;
        });
        setData({ ...data, interactions: updatedInteractions as Interaction[] });
        if (isPersistenceEnabled) {
            saveCollection('interactions', updatedInteractions, isPersistenceEnabled);
        }
        setCompletingTask(null);
    };

    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Dashboard Personal" icon={User} />
            <div className="p-6 bg-zinc-50 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KPI icon={Clock} label="Tareas Próximas" value={upcoming.length} />
                    <KPI icon={AlertCircle} label="Tareas Pendientes" value={overdue.length} />
                    <KPI icon={CheckCircle} label="Tareas Completadas (30d)" value={completed.filter(t => new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} />
                    <KPI icon={Target} label="KPI Principal" value={"N/A"} />
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
