// src/app/(app)/dashboard-personal/page.tsx
"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { Avatar } from '@/components/ui/Avatar';
import { Plus, Briefcase, Package, UserPlus, Target } from 'lucide-react';
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';
import type { Department } from '@/domain/ssot';

function KpiCard({ icon: Icon, title, value, goal }: { icon: React.ElementType, title: string, value: number, goal: number }) {
    const progress = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    const color = "hsl(var(--sb-accent-ventas))";

    return (
        <div className="bg-card p-4 rounded-lg border border-zinc-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
                <div className="bg-zinc-100 p-2 rounded-lg">
                    <Icon className="text-zinc-500" size={20} />
                </div>
                <p className="text-sm text-zinc-600 font-medium">{title}</p>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{value} <span className="text-base font-normal text-zinc-400">/ {goal}</span></p>
            <div className="w-full bg-zinc-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: color }}></div>
            </div>
        </div>
    );
}

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
        <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-4xl space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Mi Dashboard</h1>
                        <p className="text-sm text-zinc-600">Resumen de tu actividad y próximas tareas.</p>
                    </div>
                    <Avatar name={currentUser?.name} size="lg" />
                </header>

                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-yellow-400 text-black font-semibold shadow-sm hover:bg-yellow-500 transition-colors">
                    <Plus size={20} />
                    Añadir Rápido
                </button>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon={UserPlus} title="Nuevas Cuentas" value={kpis.newAccounts} goal={10} />
                    <KpiCard icon={Package} title="Cajas Vendidas" value={kpis.boxesSold} goal={150} />
                    <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits} goal={60} />
                    <KpiCard icon={Target} title="POS" value={kpis.posTactics} goal={20} />
                </div>
                
                <UpcomingTasks 
                    department={'VENTAS' as Department}
                    onlyUserId={currentUser?.id}
                    includeDepartments={['VENTAS', 'MARKETING', 'PERSONAL']}
                />
            </div>
        </main>
    );
}
