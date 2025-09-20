
"use client";
import React, { useMemo } from 'react';
import { MarketingDashboardPage as MarketingDashboardPageContent } from '@/features/marketing/components/ui-sb-marketing';
import { useData } from '@/lib/dataprovider';
import { SBCard } from '@/components/ui/ui-primitives';
import { DEPT_META } from '@/domain/ssot';
import type { Interaction } from '@/domain/ssot';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

function UpcomingEvents() {
    const { data } = useData();
    const { overdue, upcoming } = useMemo(() => {
        if (!data?.interactions) return { overdue: [], upcoming: [] };
        
        const now = new Date();
        const openInteractions = data.interactions
            .filter(i => i.dept === 'MARKETING' && i.status === 'open' && i.plannedFor);
            
        const overdue = openInteractions
            .filter(i => new Date(i.plannedFor!) < now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());
            
        const upcoming = openInteractions
            .filter(i => new Date(i.plannedFor!) >= now)
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime());

        return { overdue, upcoming };
    }, [data]);

    const allEvents = [...overdue, ...upcoming].slice(0, 5);

    if (allEvents.length === 0) {
        return null;
    }

    return (
        <SBCard title="Próximas Tareas de Marketing">
            <div className="p-4 space-y-3">
                {allEvents.map((event: Interaction) => {
                    const isOverdue = new Date(event.plannedFor!) < new Date();
                    const Icon = isOverdue ? AlertCircle : Clock;
                    const iconColor = isOverdue ? 'text-rose-500' : 'text-cyan-500';

                    return (
                         <div key={event.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${isOverdue ? 'bg-rose-50/50 border-rose-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                            <div className="p-2 rounded-full" style={{ backgroundColor: DEPT_META.MARKETING.color, color: DEPT_META.MARKETING.textColor }}>
                                <Icon size={16} className={iconColor} />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{event.note}</p>
                                <p className={`text-xs ${isOverdue ? 'text-rose-600 font-semibold' : 'text-zinc-500'}`}>{new Date(event.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SBCard>
    );
}

export default function Page(){
  return (
    <div className="space-y-6">
      <MarketingDashboardPageContent/>
      <div className="pt-6">
        <UpcomingEvents/>
      </div>
    </div>
  );
}
