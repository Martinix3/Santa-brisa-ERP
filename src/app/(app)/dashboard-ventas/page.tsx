
"use client";
import React, { useMemo, useState, useEffect } from "react";
import { BarChart3, Target, Users, Briefcase, BrainCircuit, UserPlus, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton, SB_COLORS } from "@/components/ui/ui-primitives";
import type { User as UserType, OrderSellOut, Account } from '@/domain/ssot';
import { orderTotal, inWindow } from '@/domain/ssot';
import { generateInsights } from "@/ai/flows/generate-insights-flow";
import { Avatar } from "@/components/ui/Avatar";


const formatEur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// ===== Componentes UI (locales para este dashboard) =====
function KPI({label, value, icon: Icon}:{label:string; value:number|string; icon: React.ElementType}){
  return (
    <div className="rounded-xl border border-zinc-200 p-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-600">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-2xl font-semibold text-zinc-900">{typeof value==="number"? value.toLocaleString("es-ES"): value}</div>
            </div>
        </div>
    </div>
  );
}

function RaceToGoal({ current, goal, label }: { current: number; goal: number; label: string; }) {
    const percent = Math.min(100, (current / goal) * 100);
    return (
        <SBCard title={label}>
            <div className="p-4 space-y-2">
                <div className="flex justify-between items-baseline">
                    <span className="font-bold text-2xl text-zinc-800">{current.toLocaleString('es-ES')}</span>
                    <span className="text-sm text-zinc-500">Objetivo: {goal.toLocaleString('es-ES')}</span>
                </div>
                <motion.div className="w-full bg-zinc-200 rounded-full h-4 overflow-hidden">
                    <motion.div 
                        className="h-4 rounded-full"
                        style={{ background: SB_COLORS.accent }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%`}}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </motion.div>
            </div>
        </SBCard>
    );
}

type ReportTotals = {
    activeAccounts: number;
    newAccounts: number;
    newOrders: number;
    totalEUR: number;
};
const EMPTY_TOTALS: ReportTotals = { activeAccounts: 0, newAccounts: 0, newOrders: 0, totalEUR: 0 };


function SalesReportTable({ users, data }: { users: UserType[], data: any }) {
    const reportData = useMemo(() => {
        if (!data || !users) return { totals: EMPTY_TOTALS, byUser: [] };

        const monthStart = new Date();
        monthStart.setDate(1);

        const totals: ReportTotals = {
            activeAccounts: data.accounts.filter((a: Account) => a.stage === 'ACTIVA').length,
            newAccounts: data.accounts.filter((a: Account) => inWindow(a.createdAt, monthStart, new Date())).length,
            newOrders: data.ordersSellOut.filter((o: OrderSellOut) => inWindow(o.createdAt, monthStart, new Date())).length,
            totalEUR: data.ordersSellOut.reduce((sum: number, o: OrderSellOut) => sum + orderTotal(o), 0),
        };

        const byUser = users.map(user => {
            const userAccounts = data.accounts.filter((a: Account) => a.ownerId === user.id);
            const userAccountIds = new Set(userAccounts.map(a => a.id));
            const userOrders = data.ordersSellOut.filter((o: OrderSellOut) => userAccountIds.has(o.accountId));
            const totalSales = userOrders.reduce((sum: number, o: OrderSellOut) => sum + orderTotal(o), 0);
            return {
                id: user.id,
                name: user.name,
                activeAccounts: userAccounts.filter((a: Account) => a.stage === 'ACTIVA').length,
                newAccounts: userAccounts.filter((a: Account) => inWindow(a.createdAt, monthStart, new Date())).length,
                newOrders: userOrders.filter((o: OrderSellOut) => inWindow(o.createdAt, monthStart, new Date())).length,
                totalEUR: totalSales,
                avgTicket: userOrders.length > 0 ? totalSales / userOrders.length : 0,
                conversionRate: userAccounts.length > 0 ? (new Set(userOrders.map((o: OrderSellOut) => o.accountId)).size / userAccounts.length) * 100 : 0
            }
        });

        return { totals, byUser };
    }, [users, data]);


    const headers = ['Comercial', 'Cuentas Activas', 'Nuevas Cuentas (mes)', 'Nuevos Pedidos (mes)', 'Total Ventas (€)', 'Ticket Medio (€)', 'Tasa Conversión'];
    const tableTotals = { ...EMPTY_TOTALS, ...reportData.totals };

    return (
        <SBCard title="Informe de Rendimiento del Equipo (Mensual)">
            <div className="overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50">
                        <tr>
                            {headers.map(h => <th key={h} className="px-4 py-2 text-xs font-semibold uppercase text-zinc-500 tracking-wider">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {reportData.byUser.map(row => (
                            <tr key={row.id}>
                                <td className="px-4 py-3 font-medium">{row.name}</td>
                                <td className="px-4 py-3 text-center">{row.activeAccounts}</td>
                                <td className="px-4 py-3 text-center">{row.newAccounts}</td>
                                <td className="px-4 py-3 text-center">{row.newOrders}</td>
                                <td className="px-4 py-3 text-right">{formatEur(row.totalEUR)}</td>
                                <td className="px-4 py-3 text-right">{formatEur(row.avgTicket)}</td>
                                <td className="px-4 py-3 text-center">{row.conversionRate.toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 font-bold">
                        <tr>
                            <td className="px-4 py-3">Total Equipo</td>
                            <td className="px-4 py-3 text-center">{tableTotals.activeAccounts}</td>
                            <td className="px-4 py-3 text-center">{tableTotals.newAccounts}</td>
                            <td className="px-4 py-3 text-center">{tableTotals.newOrders}</td>
                            <td className="px-4 py-3 text-right">{formatEur(tableTotals.totalEUR)}</td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </SBCard>
    );
}

function AIInsightsCard() {
    const { data } = useData();
    const [insights, setInsights] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!data) return;
        setLoading(true);
        setInsights("");
        try {
            const relevantData = {
                users: data.users.map(u => ({ id: u.id, name: u.name, role: u.role })),
                accounts: data.accounts.map(a => ({ id: a.id, name: a.name, city: a.city, stage: a.stage, type: a.type, owner: a.ownerId })),
                orders: data.ordersSellOut.map(o => ({ id: o.id, accountId: o.accountId, status: o.status, total: orderTotal(o), date: o.createdAt })),
                interactions: data.interactions.map(i => ({ id: i.id, accountId: i.accountId, userId: i.userId, kind: i.kind, date: i.createdAt })),
            };
            const result = await generateInsights({ 
                jsonData: JSON.stringify(relevantData),
                context: "Eres un director de ventas. Analiza los datos de comerciales, cuentas y pedidos para encontrar oportunidades de venta, clientes en riesgo, o comerciales con bajo rendimiento."
            });
            setInsights(result);
        } catch (e) {
            console.error(e);
            setInsights("Hubo un error al generar el informe. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SBCard title="Análisis con IA">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-600">Deja que la IA analice los datos y encuentre patrones o recomendaciones.</p>
                    <SBButton onClick={handleGenerate} disabled={loading}>
                        <BrainCircuit className="h-4 w-4" /> {loading ? 'Analizando...' : 'Generar Informe'}
                    </SBButton>
                </div>
                {insights && (
                    <div className="prose prose-sm p-4 bg-zinc-50 rounded-lg border max-w-none whitespace-pre-wrap">
                        {insights}
                    </div>
                )}
            </div>
        </SBCard>
    );
}

function CommercialsRace({ users, data }: { users: UserType[], data: any }) {
    const goal = 70;
    
    const raceData = useMemo(() => {
        if (!data || !users) return [];
        
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        
        return users.map(user => {
            const newAccounts = data.accounts.filter((a: Account) => a.ownerId === user.id && inWindow(a.createdAt, startOfYear, new Date())).length;
            return {
                id: user.id,
                name: user.name,
                newAccounts,
                percentage: Math.min(100, (newAccounts / goal) * 100)
            }
        }).sort((a, b) => b.newAccounts - a.newAccounts);

    }, [data, users]);

    return (
        <SBCard title="Carrera de Cuentas (Anual)">
            <div className="p-4 space-y-4">
                {raceData.map(user => (
                    <div key={user.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <Avatar name={user.name} size="md" />
                                <span className="font-medium">{user.name}</span>
                            </div>
                            <span className="font-semibold">{user.newAccounts} / {goal}</span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
                            <motion.div 
                                className="h-3 rounded-full"
                                style={{ background: SB_COLORS.accent }}
                                initial={{ width: 0 }}
                                animate={{ width: `${user.percentage}%` }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </SBCard>
    )
}

function TeamDashboardContent() {
  const { data } = useData();
  const users = useMemo(() => data?.users.filter((u: UserType) => u.role === 'comercial' || u.role === 'owner') || [], [data]);
  
  const teamStats = useMemo(() => {
    if(!data) return { totalNewAccountsWeekly: 0, totalNewAccountsYearly: 0, conversionRate: 0, attributedSales: 0 };
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const totalNewAccountsWeekly = data.accounts.filter(a => new Date(a.createdAt) >= oneWeekAgo).length;
    const totalNewAccountsYearly = data.accounts.filter(a => new Date(a.createdAt) >= startOfYear).length;
    
    const accountsWithOrders = new Set(data.ordersSellOut.map(o => o.accountId));
    const conversionRate = data.accounts.length > 0 ? (accountsWithOrders.size / data.accounts.length) * 100 : 0;
    
    const attributedSales = data.ordersSellOut.reduce((sum, order) => sum + orderTotal(order), 0);

    return { totalNewAccountsWeekly, totalNewAccountsYearly, conversionRate, attributedSales };
  }, [data]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPI icon={UserPlus} label="Cuentas nuevas (semana)" value={teamStats.totalNewAccountsWeekly} />
            <KPI icon={Target} label="Cuentas abiertas (año)" value={teamStats.totalNewAccountsYearly} />
            <KPI icon={BarChart3} label="Conversión a pedido" value={`${teamStats.conversionRate.toFixed(1)}%`} />
            <KPI icon={Briefcase} label="Ventas totales" value={formatEur(teamStats.attributedSales)} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <AIInsightsCard />
            </div>
            <div>
                 <CommercialsRace users={users} data={data} />
            </div>
        </div>

        {data && <SalesReportTable users={users} data={data}/>}
    </div>
  );
}

export default function SalesDashboardPage() {
    return (
        <>
            <ModuleHeader title="Dashboard de Ventas de Equipo" icon={BarChart3} />
            <div className="p-6 bg-zinc-50 flex-grow">
              <TeamDashboardContent />
            </div>
        </>
    )
}
