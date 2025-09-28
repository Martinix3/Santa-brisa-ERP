

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
import { DEPT_META } from '@/domain/ssot';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
    const router = useRouter();
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
        if (!data || !data.interactions) return;
        const taskToUpdate = data.interactions.find(i => i.id === id);
        if (newStatus === 'done' && taskToUpdate) {
            if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && data.marketingEvents) {
                const event = data.marketingEvents.find(e => e.id === taskToUpdate.linkedEntity?.id);
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
                        toast.success('Resultados del evento de marketing guardados.');
                        router.refresh();
                        setCompletingMarketingEvent(null);
                    }}
                    onError={(msg) => toast.error(`Error: ${msg}`)}
                />
            )}
        </>
    );
}
