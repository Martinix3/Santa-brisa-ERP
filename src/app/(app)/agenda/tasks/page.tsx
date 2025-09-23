
"use client";

import React, { useMemo, useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { TaskBoard } from '@/features/agenda/TaskBoard';
import type { Task } from '@/features/agenda/TaskBoard';
import { sbAsISO } from '@/features/agenda/helpers';
import type { Interaction, InteractionStatus, Account, SantaData, Payload, MarketingEvent, Department } from '@/domain/ssot';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { DEPT_META } from '@/domain';


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


export default function GlobalTasksPage() {
    const { data, setData, saveAllCollections } = useData();
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
    const [completingMarketingEvent, setCompletingMarketingEvent] = useState<MarketingEvent | null>(null);

    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');

    const userOptions = useMemo(() => (data?.users || []).map(u => ({ value: u.id, label: u.name })), [data?.users]);
    const departmentOptions = useMemo(() => Object.entries(DEPT_META).map(([key, meta]) => ({ value: key, label: meta.label })), []);

    const allTasks = useMemo(() => {
        if (!data?.interactions || !data?.accounts) return [];

        const filteredInteractions = data.interactions.filter(i => {
            const matchesResponsible = !responsibleFilter || i.userId === responsibleFilter || (i.involvedUserIds || []).includes(responsibleFilter);
            const matchesDepartment = !departmentFilter || i.dept === departmentFilter;
            return matchesResponsible && matchesDepartment;
        });

        return mapInteractionsToTasks(filteredInteractions, data.accounts);
    }, [data?.interactions, data?.accounts, responsibleFilter, departmentFilter]);
    
    const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
        if (!data) return;
        const taskToUpdate = data?.interactions.find(i => i.id === id);
        if (newStatus === 'done' && taskToUpdate) {
            if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT') {
                const event = data?.marketingEvents.find(e => e.id === taskToUpdate.linkedEntity?.id);
                if (event) {
                    setCompletingMarketingEvent(event);
                } else {
                    setCompletingTask(taskToUpdate);
                }
            } else {
                setCompletingTask(taskToUpdate);
            }
        }
    };

    const handleSaveCompletedTask = async (
        taskId: string,
        payload: Payload
    ) => {
        if (!data) return;
        
        const collectionsToSave: Partial<SantaData> = {};

        const updatedInteractions = data.interactions.map(i =>
            i.id === taskId ? { ...i, status: 'done' as InteractionStatus, resultNote: (payload as any).note } : i
        );
        collectionsToSave.interactions = updatedInteractions;

        if (payload.type === 'interaccion' && payload.nextActionDate) {
            const originalTask = data.interactions.find(i => i.id === taskId);
            const newFollowUp: Interaction = {
                id: `int_${Date.now()}`,
                userId: originalTask?.userId || '',
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

        // Venta no se maneja aquí directamente, pero se podría
        
        setData(prevData => prevData ? { ...prevData, ...collectionsToSave } : null);

        await saveAllCollections(collectionsToSave);
        
        setCompletingTask(null);
    };

    const handleSaveMarketingEventTask = async (eventId: string, payload: any) => {
        if (!data) return;
        
        const updatedMktEvents = data.marketingEvents.map(me => {
            if (me.id === eventId) {
                return {
                    ...me,
                    status: 'closed',
                    spend: payload.spend,
                    kpis: {
                        leads: payload.leads,
                        sampling: payload.sampling,
                        impressions: payload.impressions,
                        interactions: payload.interactions,
                        completedAt: new Date().toISOString(),
                    }
                } as MarketingEvent;
            }
            return me;
        });
    
        const interactionToClose = data.interactions.find(i => i.linkedEntity?.id === eventId);
        const updatedInteractions = interactionToClose ? data.interactions.map(i => i.id === interactionToClose.id ? {...i, status: 'done' as InteractionStatus} : i) : data.interactions;
    
        await saveAllCollections({ marketingEvents: updatedMktEvents, interactions: updatedInteractions });
        setCompletingMarketingEvent(null);
    };

    if (!data) {
        return <div className="p-6">Cargando...</div>;
    }
    
    return (
        <>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-zinc-800">Tablero de Tareas Global</h1>
                        <p className="text-zinc-600 mt-1">Vista de todas las tareas programadas para todos los usuarios.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <FilterSelect value={responsibleFilter} onChange={setResponsibleFilter} options={userOptions} placeholder="Responsable" />
                        <FilterSelect value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} placeholder="Sector" />
                    </div>
                </div>
                <TaskBoard
                    tasks={allTasks}
                    onTaskStatusChange={handleUpdateStatus}
                    onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
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
            {completingMarketingEvent && (
                <MarketingTaskCompletionDialog
                    entity={completingMarketingEvent}
                    open={!!completingMarketingEvent}
                    onClose={() => setCompletingMarketingEvent(null)}
                    onComplete={handleSaveMarketingEventTask}
                />
            )}
        </>
    );
}
