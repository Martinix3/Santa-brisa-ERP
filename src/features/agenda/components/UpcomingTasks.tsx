
"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, Department, SB_THEME } from '@/domain/ssot';
import { SBCard } from '@/components/ui/ui-primitives';
import { AlertCircle, Clock, Building } from 'lucide-react';
import { DEPT_META } from '@/domain/ssot';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';

export function UpcomingTasks({ department }: { department: Department }) {
    const { data } = useData();

    const { overdue, upcoming } = useMemo(() => {
        if (!data?.interactions) return { overdue: [], upcoming: [] };
        
        const now = new Date();
        const openInteractions = data.interactions
            .filter(i => i.dept === department && i.status === 'open' && i.plannedFor);
            
        const overdue = openInteractions
            .filter(i => new Date(i.plannedFor!) < now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
            
        const upcoming = openInteractions
            .filter(i => new Date(i.plannedFor!) >= now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());

        return { overdue, upcoming };
    }, [data, department]);

    const allEvents = [...overdue, ...upcoming].slice(0, 7); // Show a max of 7 tasks

    if (allEvents.length === 0) {
        return (
            <SBCard title={`Próximas Tareas de ${DEPT_META[department].label}`}>
                <p className="p-4 text-sm text-center text-zinc-500">No hay tareas programadas.</p>
            </SBCard>
        );
    }

    return (
        <SBCard title={`Próximas Tareas de ${DEPT_META[department].label}`}>
            <div className="p-2 space-y-1">
                {allEvents.map((event: Interaction) => {
                    const isOverdue = new Date(event.plannedFor!) < new Date();
                    const Icon = isOverdue ? AlertCircle : Clock;
                    
                    const involvedUsers = (event.involvedUserIds && event.involvedUserIds.length > 0 ? event.involvedUserIds : [event.userId])
                        .map(id => data?.users.find(u => u.id === id))
                        .filter(Boolean);
                    
                    const account = data?.accounts.find(a => a.id === event.accountId);

                    return (
                         <Link href="/agenda/calendar" key={event.id} className={`block p-3 rounded-lg border cursor-pointer ${isOverdue ? 'bg-rose-50/50 border-rose-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-full mt-1" style={{ backgroundColor: `${DEPT_META[department].color}22`, color: DEPT_META[department].color }}>
                                    <Icon size={16} className="sb-icon" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{event.note}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-semibold' : ''}`}>
                                            <Clock size={12} className="sb-icon" />
                                            <span>{new Date(event.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                                        </div>
                                        {account && (
                                            <div className="flex items-center gap-1">
                                                <Building size={12} className="sb-icon" />
                                                <span>{account.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex -space-x-2">
                                    {involvedUsers.map(user => user && <Avatar key={user.id} name={user.name} size="md" className="sb-icon" />)}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </SBCard>
    );
}
