// src/features/agenda/components/UpcomingTasks.tsx
"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, Department } from '@/domain/ssot.v7';
import { SBCard } from '@/components/ui/ui-primitives';
import { AlertCircle, Clock, Building } from 'lucide-react';
import { DEPT_META } from '@/domain/ssot.v7';
import Link from 'next/link';

export function UpcomingTasks({ 
    department,
    scope = 'personal',
    onlyUserId,
    includeDepartments = ['VENTAS'],
    onRequestComplete
}: { 
    department?: Department,
    scope?: 'personal' | 'global',
    onlyUserId?: string,
    includeDepartments?: Department[],
    onRequestComplete?: (task: Interaction) => void,
}) {
    const { data } = useData();

    const { overdue, upcoming } = useMemo(() => {
        const sourceTasks = data?.interactions || [];
        
        const now = new Date();
        const openInteractions = sourceTasks
            .filter(i => {
                const matchesDept = department ? i.dept === department : (includeDepartments ? includeDepartments.includes(i.dept!) : true);
                const matchesUser = !onlyUserId || i.userId === onlyUserId || (i.involvedUserIds || []).includes(onlyUserId);
                return matchesDept && matchesUser && i.status === 'open' && i.plannedFor;
            });
            
        const overdue = openInteractions
            .filter(i => new Date(i.plannedFor!) < now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
            
        const upcoming = openInteractions
            .filter(i => new Date(i.plannedFor!) >= now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());

        return { overdue, upcoming };
    }, [data, department, includeDepartments, onlyUserId]);

    const allEvents = [...overdue, ...upcoming].slice(0, 5); // Show a max of 5 tasks
    
    const title = department ? `Próximas Tareas de ${DEPT_META[department].label}` : 'Próximas Tareas';
    
    const deptColor = department ? DEPT_META[department].color : '#6b7280';

    return (
        <SBCard title="">
            <div className="p-5" style={{ borderTop: `1px solid #e5e7eb` }}>
                <h3 className="font-semibold" style={{ fontSize: 16, color: "#111827" }}>{title}</h3>
                <div className="mt-4 space-y-3">
                    {allEvents.map((event: Interaction) => {
                        const isOverdue = new Date(event.plannedFor!) < new Date();
                        const Icon = isOverdue ? AlertCircle : Clock;
                        const iconColor = isOverdue ? "#991b1b" : "#6b7280";
                        const account = data?.accounts.find(a => a.id === event.accountId);
                        
                        return (
                            <Link href="/agenda/calendar" key={event.id} className="block p-3 rounded-lg bg-card hover:bg-gray-50" style={{border: '1px solid #e5e7eb'}}>
                                <div className="flex items-start gap-3">
                                    <Icon size={16} style={{ color: iconColor, marginTop: 2 }} />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm" style={{color: "#374151"}}>{event.note}</p>
                                        <div className="flex items-center gap-4 mt-1 text-xs" style={{color: "#6b7280"}}>
                                            <div className={`flex items-center gap-1 ${isOverdue ? 'font-semibold text-red-700' : ''}`}>
                                                <Clock size={12} />
                                                <span>{new Date(event.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                            {account && (
                                                <div className="flex items-center gap-1">
                                                    <Building size={12} />
                                                    <span>{account.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                    {allEvents.length === 0 && (
                        <p className="p-4 text-sm text-center" style={{color: "#6b7280"}}>No hay tareas programadas.</p>
                    )}
                </div>
            </div>
        </SBCard>
    );
}
