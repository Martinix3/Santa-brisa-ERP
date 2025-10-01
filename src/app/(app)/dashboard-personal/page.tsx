
// src/app/(app)/dashboard-personal/page.tsx
"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { Avatar } from '@/components/ui/Avatar';
import { Plus, Briefcase, Package, UserPlus, Target } from 'lucide-react';
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';
import type { Department } from '@/domain/ssot';
import { SBButton, SBCard } from '@/components/ui/ui-primitives';
import KpiCard from '@/components/ui/KpiCard';
import { ModuleHeader } from '@/components/ui';
import { Home } from 'lucide-react';

export default function PersonalDashboardPage() {
    const { currentUser, data } = useData();

    const kpis = useMemo(() => {
        if (!data || !currentUser) {
            return { newAccounts: 0, boxesSold: 0, visits: 0, posTactics: 0 };
        }
        
        const userInteractions = (data.interactions || []).filter(i => i.userId === currentUser.id);
        const userAccounts = (data.accounts || []).filter(a => a.ownerId === currentUser.id);
        
        // Mock data for now
        return {
            newAccounts: userAccounts.length,
            boxesSold: 58, 
            visits: userInteractions.filter(i => i.kind === 'VISITA').length,
            posTactics: 4,
        };
    }, [data, currentUser]);

    return (
        <>
            <ModuleHeader title="Mi Dashboard" icon={Home} />
            <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-4xl space-y-6">
                    <header className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900">Resumen de Actividad</h1>
                            <p className="text-sm text-zinc-600">Tu actividad y próximas tareas.</p>
                        </div>
                        <Avatar name={currentUser?.name} size="lg" />
                    </header>

                    <SBButton className="w-full font-semibold" size="lg">
                        <Plus size={20} />
                        Añadir Rápido
                    </SBButton>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard icon={UserPlus} title="Nuevas Cuentas" value={kpis.newAccounts.toString()} goal={`${kpis.newAccounts} / 10`} />
                        <KpiCard icon={Package} title="Cajas Vendidas" value={kpis.boxesSold.toString()} goal={`${kpis.boxesSold} / 150`} />
                        <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits.toString()} goal={`${kpis.visits} / 60`} />
                        <KpiCard icon={Target} title="POS" value={kpis.posTactics.toString()} goal={`${kpis.posTactics} / 20`} />
                    </div>
                    
                    <UpcomingTasks 
                        department={'VENTAS' as Department}
                        onlyUserId={currentUser?.id}
                        includeDepartments={['VENTAS', 'MARKETING', 'PERSONAL']}
                    />
                </div>
            </main>
        </>
    );
}
