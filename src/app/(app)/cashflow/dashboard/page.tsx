// src/app/(app)/cashflow/dashboard/page.tsx

"use client";
import React, { useMemo, useState } from 'react';
import { SBCard, KPI, SBButton } from '@/components/ui/ui-primitives';
import { BarChart, TrendingUp, TrendingDown, Banknote, ArrowRight, Calendar, BrainCircuit, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useData } from '@/lib/dataprovider';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { DEPT_META } from '@/domain/ssot';
import { calculateCashflowMetrics, getCashflowForecast, getAccountsReceivable, getAccountsPayable } from '@/lib/finance-helpers';
import { UpcomingTasks } from '@/features/agenda/components/UpcomingTasks';

export default function CashflowDashboardPage() {
    const { data } = useData();
    const { config } = useSystemConfig();
    
    // Obtener colores del departamento FINANZAS desde SSOT
    const finanzasTheme = config?.theme.departments.FINANZAS || DEPT_META.FINANZAS;
    
    // Calcular métricas desde datos reales
    const cashflowData = useMemo(() => {
        if (!data) return null;
        
        const metrics = calculateCashflowMetrics(
            data.financeLinks || [],
            data.paymentLinks || [],
            30
        );
        
        const forecast = getCashflowForecast(data.financeLinks || [], 4);
        
        return {
            ...metrics,
            forecast
        };
    }, [data]);
    
    // Cuentas por cobrar y pagar
    const accountsData = useMemo(() => {
        if (!data) return null;
        
        const receivables = getAccountsReceivable(data.financeLinks || []);
        const payables = getAccountsPayable(data.financeLinks || []);
        
        return { receivables, payables };
    }, [data]);
    
    if (!data || !cashflowData || !accountsData) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold" style={{ color: finanzasTheme.color }}>
                    Dashboard de Tesorería
                </h1>
                <div>Cargando datos financieros...</div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 
                    className="text-2xl font-semibold"
                    style={{ color: finanzasTheme.color }}
                >
                    Dashboard de Tesorería
                </h1>
                <Link href="/cashflow/settings" passHref>
                    <SBButton variant="secondary">Ajustes</SBButton>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPI label="Saldo Actual" value={cashflowData.currentBalance.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} />
                <KPI label="Entradas (30d)" value={cashflowData.inflow.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} />
                <KPI label="Salidas (30d)" value={cashflowData.outflow.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} />
                <KPI label="Cash Flow Neto (30d)" value={cashflowData.netCashflow.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SBCard title="Previsión de Tesorería (Próximas 4 semanas)">
                        <div className="p-4">
                             <div className="h-72">
                                {/* Aquí iría un gráfico real, p.ej. con Recharts */}
                                <div className="w-full h-full bg-zinc-50 border-2 border-dashed rounded-lg flex items-center justify-center">
                                    <BarChart size={48} className="sb-icon text-zinc-300" />
                                </div>
                            </div>
                        </div>
                    </SBCard>
                </div>
                <div className="space-y-6">
                    <UpcomingTasks department="FINANZAS" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SBCard title="Cuentas por Cobrar">
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <p>Total Pendiente</p>
                            <p className="font-bold text-lg">
                                {accountsData.receivables.total.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                            </p>
                        </div>
                        <div className="flex justify-between items-center text-red-600">
                            <p>Vencido ({'>'}30d)</p>
                            <p className="font-bold">
                                {accountsData.receivables.overdue.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                            </p>
                        </div>
                         <Link href="/cashflow/collections" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                            Ver todos los cobros <ArrowRight size={16} className="sb-icon" />
                        </Link>
                    </div>
                </SBCard>
                 <SBCard title="Cuentas por Pagar">
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <p>Total a Pagar</p>
                            <p className="font-bold text-lg">
                                {accountsData.payables.total.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                            </p>
                        </div>
                        <div className="flex justify-between items-center">
                            <p>Próximo vencimiento</p>
                            <p className="font-bold">
                                {accountsData.payables.nextDue.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                            </p>
                        </div>
                         <Link href="/cashflow/payments" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1">
                            Ver todos los pagos <ArrowRight size={16} className="sb-icon" />
                        </Link>
                    </div>
                </SBCard>
            </div>
        </div>
    );
}
