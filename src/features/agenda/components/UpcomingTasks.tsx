
"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import type { Interaction, Department, SB_THEME } from '@/domain/ssot';
import { SBCard } from '@/components/ui/ui-primitives';
import { AlertCircle, Clock, Building } from 'lucide-react';
import { DEPT_META } from '@/domain/ssot';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';

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
        const sourceTasks = data?.interactions || [
            { id: '1', dept: 'VENTAS', note: 'Llamar a Cliente A', status: 'open', plannedFor: new Date(Date.now() - 2 * 86400000).toISOString(), userId: 'user_1' },
            { id: '2', dept: 'VENTAS', note: 'Preparar propuesta B', status: 'open', plannedFor: new Date(Date.now() + 1 * 86400000).toISOString(), userId: 'user_2', involvedUserIds: ['user_1'] },
            { id: '3', dept: 'MARKETING', note: 'Revisar campaña de verano', status: 'open', plannedFor: new Date(Date.now() + 2 * 86400000).toISOString(), userId: 'user_3' },
        ] as Interaction[];
        
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

    const allEvents = [...overdue, ...upcoming].slice(0, 7); // Show a max of 7 tasks
    
    const title = department ? `Próximas Tareas de ${DEPT_META[department].label}` : 'Próximas Tareas';

    const TaskItem = ({ title, status, initials, color }: { title: string; status: string; initials: string; color: string }) => {
        const statusColors: Record<string, { bg: string, text: string, border: string }> = {
          'Vencido': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
          'Próxima': { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
        };
        const s = statusColors[status] || statusColors['Próxima'];
      
        return (
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                  <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                           <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontWeight: 600 }}>{status}</span>
                      </div>
                  </div>
              </div>
              <span style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: color, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials}</span>
          </div>
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <div className="mt-4 space-y-3">
                {allEvents.map((event: Interaction) => {
                    const isOverdue = new Date(event.plannedFor!) < new Date();
                    const owner = data?.users.find(u => u.id === event.userId);
                    const initials = owner?.name.split(' ').map(n => n[0]).join('') || '?';
                    const deptStyle = event.dept ? DEPT_META[event.dept] : DEPT_META.PERSONAL;

                    return (
                        <TaskItem 
                            key={event.id}
                            title={event.note || 'Tarea sin descripción'} 
                            status={isOverdue ? 'Vencido' : 'Próxima'} 
                            initials={initials}
                            color={deptStyle.color}
                        />
                    );
                })}
                 {allEvents.length === 0 && (
                     <p className="p-4 text-sm text-center text-zinc-500">No hay tareas programadas.</p>
                 )}
            </div>
        </div>
    );
}
