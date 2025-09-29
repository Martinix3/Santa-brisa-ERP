
// src/app/(app)/dashboard-personal/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, InteractionStatus, Account, OrderSellOut, PosTactic, MarketingEvent } from '@/domain/ssot';
import { orderToBottles } from '@/lib/sb-core';
import { TaskBoard } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

function KpiCard({ title, value, goal, color }: { title: string; value: number; goal: number; color: string }) {
    const progress = goal > 0 ? (value / goal) * 100 : 0;
    return (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value} <span className="text-sm font-normal text-gray-500">/ {goal}</span></p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }}></div>
            </div>
        </div>
    );
}

export default function PersonalDashboardPage() {
    const { currentUser, data, setData, saveCollection, saveAllCollections } = useData();
    const router = useRouter();
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
    const [openNewTask, setOpenNewTask] = useState(false);
    const [completingMarketingEvent, setCompletingMarketingEvent] = useState<any>(null);

    const { personalTasks, kpis } = useMemo(() => {
        if (!data || !currentUser) return { personalTasks: [], kpis: null };

        const myInteractions = (data.interactions || []).filter(i => {
            const isAssigned = (i.involvedUserIds || []).includes(currentUser.id);
            const isSelfAssigned = (i.involvedUserIds === undefined || i.involvedUserIds.length === 0) && i.userId === currentUser.id;
            return isAssigned || isSelfAssigned;
        });
        
        const tasks = mapInteractionsToTasks(myInteractions, data.accounts);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const myAccounts = (data.accounts || []).filter(a => a.ownerId === currentUser.id && new Date(a.createdAt) >= startOfMonth);
        const myOrders = (data.ordersSellOut || []).filter(o => {
            const acc = data.accounts.find(a => a.id === o.accountId);
            return acc?.ownerId === currentUser.id && new Date(o.createdAt) >= startOfMonth;
        });
        const myVisits = myInteractions.filter(i => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfMonth);
        const myPosTactics = (data.posTactics || []).filter(t => t.createdById === currentUser.id && new Date(t.createdAt) >= startOfMonth);

        const boxesSold = myOrders.reduce((sum, o) => {
            const item = data.items.find(it => o.lines[0] && it.id === o.lines[0].itemId);
            const caseUnits = item?.caseUnits ?? 6;
            const bottles = orderToBottles(o, data.items || []);
            return sum + Math.floor(bottles / caseUnits);
        }, 0);

        const kpiData = {
            newAccounts: myAccounts.length,
            boxesSold: boxesSold,
            visits: myVisits.length,
            posTactics: myPosTactics.length
        };

        return { personalTasks: tasks, kpis: kpiData };

    }, [data, currentUser]);

    const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
        if (!data || !data.interactions) return;
        const taskToUpdate = data.interactions.find(i => i.id === id);
        if (!taskToUpdate) return;
    
        if (newStatus === 'done') {
          if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && data.marketingEvents) {
            const event = data.marketingEvents.find((e: any) => e.id === taskToUpdate.linkedEntity?.id);
            if (event) setCompletingMarketingEvent(event);
            else setCompletingTask(taskToUpdate);
          } else {
            setCompletingTask(taskToUpdate);
          }
        }
    };
    
    if (!kpis) {
        return <div className="p-6">Cargando dashboard...</div>;
    }

    return (
        <>
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <KpiCard title="Nuevas Cuentas" value={kpis.newAccounts} goal={10} color="#f5ce3e" />
                        <KpiCard title="Cajas Vendidas" value={kpis.boxesSold} goal={150} color="#f5ce3e" />
                        <KpiCard title="Visitas" value={kpis.visits} goal={60} color="#f5ce3e" />
                        <KpiCard title="POS Tactics" value={kpis.posTactics} goal={20} color="#f5ce3e" />
                    </div>
                    
                    <TaskBoard
                        tasks={personalTasks}
                        onTaskStatusChange={handleUpdateStatus}
                        onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
                    />

                </div>
            </main>

             {completingTask && (
                <TaskCompletionDialog
                    task={completingTask}
                    open={!!completingTask}
                    onClose={() => setCompletingTask(null)}
                    onSuccess={() => {
                        toast.success('Tarea completada con éxito.');
                        router.refresh();
                        setCompletingTask(null);
                    }}
                    onError={(msg) => toast.error(`Error: ${msg}`)}
                />
            )}

            {completingMarketingEvent && (
                <MarketingTaskCompletionDialog
                    entity={completingMarketingEvent}
                    open={!!completingMarketingEvent}
                    onClose={() => setCompletingMarketingEvent(null)}
                    onSuccess={() => {
                        toast.success('Resultados del evento guardados.');
                        router.refresh();
                        setCompletingMarketingEvent(null);
                    }}
                    onError={(msg) => toast.error(`Error: ${msg}`)}
                />
            )}
            
            {openNewTask && currentUser && (
                <NewEventDialog
                  open={openNewTask}
                  onOpenChange={setOpenNewTask}
                  onSuccess={() => {
                    toast.success("Tarea creada");
                    setOpenNewTask(false);
                  }}
                  onError={toast.error}
                  accentColor="#f5ce3e"
                  initialEventData={{ userId: currentUser.id, dept: 'PERSONAL' }}
                />
            )}
        </>
    );
}
