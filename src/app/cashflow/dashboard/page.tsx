
"use client";
import React from 'react';
import { SBCard, KPI, SBButton } from '@/components/ui/ui-primitives';
import { BarChart, TrendingUp, TrendingDown, Banknote, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
