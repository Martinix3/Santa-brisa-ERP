
"use client";
import React, { useMemo } from 'react';
import { SBCard, KPI, SBButton } from '@/components/ui/ui-primitives';
import { BarChart, TrendingUp, TrendingDown, Banknote, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useData } from '@/lib/dataprovider';
import { DEPT_META } from '@/domain/ssot';
import type { Interaction } from '@/domain/ssot';

// Mock data - replace with real data fetching
const cashflowData = {
    currentBalance: 125340,
    inflow30d: 45200,
    outflow30d: 22800,
    netCashflow: 22400,
    forecast: [
        { name: 'Sem 1', inflow: 10000, outflow: 5000 },
        { name: 'Sem 2', inflow: 12000, outflow: 6000 },
        { name: 'Sem 3', inflow: 8000, outflow: 7000 },
        { name: 'Sem 4', inflow: 15200, outflow: 4800 },
    ]
}

function UpcomingEvents() {
    const { data } = useData();
    const upcomingFinanceEvents = useMemo(() => {
        if (!data?.interactions) return [];
        return data.interactions
            .filter(i => i.dept === 'FINANZAS' && i.plannedFor && new Date(i.plannedFor) >= new Date())
            .sort((a, b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime())
            .slice(0, 5);
    }, [data]);

    if (upcomingFinanceEvents.length === 0) {
        return null;
    }

    return (
        <SBCard title="Próximas Tareas Financieras">
            <div className="p-4 space-y-3">
                {upcomingFinanceEvents.map((event: Interaction) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 border">
                        <div className="p-2 rounded-full" style={{ backgroundColor: DEPT_META.FINANZAS.color, color: DEPT_META.FINANZAS.textColor }}>
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

export default function CashflowDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-zinc-800">Dashboard de Tesorería</h1>
                <Link href="/cashflow/settings" passHref>
                    <SBButton as="a" variant="secondary">Ajustes</SBButton>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPI label="Saldo Actual" value={cashflowData.currentBalance.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} />
                <KPI label="Entradas (30d)" value={cashflowData.inflow30d.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} delta="+5%" />
                <KPI label="Salidas (30d)" value={cashflowData.outflow30d.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} delta="-2%" />
                <KPI label="Cash Flow Neto (30d)" value={cashflowData.netCashflow.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SBCard title="Previsión de Tesorería (Próximas 4 semanas)">
                        <div className="p-4">
                             <div className="h-72">
                                {/* Aquí iría un gráfico real, p.ej. con Recharts */}
                                <div className="w-full h-full bg-zinc-50 border-2 border-dashed rounded-lg flex items-center justify-center">
                                    <BarChart size={48} className="text-zinc-300" />
                                </div>
                            </div>
                        </div>
                    </SBCard>
                </div>
                <div className="space-y-6">
                    <UpcomingEvents />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SBCard title="Cuentas por Cobrar">
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <p>Total Pendiente</p>
                            <p className="font-bold text-lg">€35,100</p>
                        </div>
                        <div className="flex justify-between items-center text-red-600">
                            <p>Vencido (&gt;30d)</p>
                            <p className="font-bold">€4,500</p>
                        </div>
                         <Link href="/cashflow/collections" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                            Ver todos los cobros <ArrowRight size={16} />
                        </Link>
                    </div>
                </SBCard>
                 <SBCard title="Cuentas por Pagar">
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <p>Total a Pagar</p>
                            <p className="font-bold text-lg">€18,600</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <p>Próximo vencimiento</p>
                            <p className="font-bold">€1,200</p>
                        </div>
                         <Link href="/cashflow/payments" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                            Ver todos los pagos <ArrowRight size={16} />
                        </Link>
                    </div>
                </SBCard>
            </div>
        </div>
    );
}
