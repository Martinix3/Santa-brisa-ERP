
"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { User, CheckCircle, AlertCircle, Clock, BarChart3, Users, Target } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';
import type { Interaction } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';

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

function TaskCard({ task }: { task: Interaction }) {
    const deptStyle = DEPT_META[task.dept!] || DEPT_META.VENTAS;
    const isOverdue = task.plannedFor ? new Date(task.plannedFor) < new Date() && task.status === 'open' : false;

    return (
        <div className={`p-3 rounded-lg border flex items-start gap-3 ${isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-white'}`}>
            <div className="p-2 rounded-full mt-1" style={{ backgroundColor: deptStyle.color, color: deptStyle.textColor }}>
                 <CheckCircle size={16} />
            </div>
            <div className="flex-1">
                 <p className="font-medium text-sm text-zinc-800">{task.note}</p>
                 <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                    <span>{new Date(task.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                    <span className="font-semibold px-1.5 py-0.5 rounded" style={{backgroundColor: deptStyle.color, color: deptStyle.textColor}}>{task.dept}</span>
                 </div>
            </div>
        </div>
    )
}

export default function PersonalDashboardPage() {
    const { currentUser, data } = useData();

    const { upcoming, overdue, completed } = useMemo(() => {
        if (!data || !currentUser) return { upcoming: [], overdue: [], completed: [] };

        const myInteractions = data.interactions.filter(i => 
            i.userId === currentUser.id || i.involvedUserIds?.includes(currentUser.id)
        );

        const now = new Date();
        
        const upcomingTasks = myInteractions
            .filter(i => i.status === 'open' && i.plannedFor && new Date(i.plannedFor) >= now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
            
        const overdueTasks = myInteractions
            .filter(i => i.status === 'open' && i.plannedFor && new Date(i.plannedFor) < now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());

        const completedTasks = myInteractions
            .filter(i => i.status === 'done')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10);

        return { upcoming: upcomingTasks, overdue: overdueTasks, completed: completedTasks };
    }, [data, currentUser]);

    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Dashboard Personal" icon={User} />
            <div className="p-6 bg-zinc-50 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KPI icon={Clock} label="Tareas Próximas" value={upcoming.length} />
                    <KPI icon={AlertCircle} label="Tareas Caducadas" value={overdue.length} />
                    <KPI icon={CheckCircle} label="Tareas Completadas (30d)" value={completed.length} />
                    <KPI icon={Target} label="KPI Principal" value={"N/A"} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SBCard title="Próximas Tareas">
                        <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                            {upcoming.length > 0 ? upcoming.map(task => (
                                <TaskCard key={task.id} task={task} />
                            )) : <p className="text-center text-sm text-zinc-500 py-4">¡Todo al día!</p>}
                        </div>
                    </SBCard>
                    <SBCard title="Tareas Caducadas">
                         <div className="p-3 space-y-3  max-h-96 overflow-y-auto">
                            {overdue.length > 0 ? overdue.map(task => (
                                <TaskCard key={task.id} task={task} />
                            )) : <p className="text-center text-sm text-zinc-500 py-4">¡Ninguna tarea caducada!</p>}
                        </div>
                    </SBCard>
                    <SBCard title="Completadas Recientemente">
                         <div className="p-3 space-y-3  max-h-96 overflow-y-auto">
                            {completed.length > 0 ? completed.map(task => (
                                <TaskCard key={task.id} task={task} />
                            )) : <p className="text-center text-sm text-zinc-500 py-4">No hay tareas completadas recientemente.</p>}
                        </div>
                    </SBCard>
                </div>
            </div>
        </AuthenticatedLayout>
    )
}
