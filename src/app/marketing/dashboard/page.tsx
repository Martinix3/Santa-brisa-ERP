
"use client";
import React, { useMemo } from 'react';
import { MarketingDashboardPage as MarketingDashboardPageContent } from '@/features/marketing/components/ui-sb-marketing';
import { useData } from '@/lib/dataprovider';
import { SBCard } from '@/components/ui/ui-primitives';
import { DEPT_META } from '@/domain/ssot';
import type { Interaction } from '@/domain/ssot';
import { Calendar } from 'lucide-react';

function UpcomingEvents() {
    const { data } = useData();
    const upcomingMarketingEvents = useMemo(() => {
        if (!data?.interactions) return [];
        return data.interactions
            .filter(i => i.dept === 'MARKETING' && i.plannedFor && new Date(i.plannedFor) >= new Date())
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime())
            .slice(0, 5);
    }, [data]);

    if (upcomingMarketingEvents.length === 0) {
        return null;
    }

    return (
        <SBCard title="Próximos Eventos y Tareas de Marketing">
            <div className="p-4 space-y-3">
                {upcomingMarketingEvents.map((event: Interaction) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 border">
                        <div className="p-2 rounded-full" style={{ backgroundColor: DEPT_META.MARKETING.color, color: DEPT_META.MARKETING.textColor }}>
                            <Calendar size={16} />
                        </div>
                        <div>
                            <p className="font-medium text-sm">{event.note}</p>
                            <p className="text-xs text-zinc-500">{new Date(event.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
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
