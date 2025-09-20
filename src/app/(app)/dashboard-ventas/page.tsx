
"use client";
import React, { useMemo, useState, useEffect } from "react";
import { BarChart3, Target, Users, Briefcase, BrainCircuit, UserPlus, MoreHorizontal, Check, AlertCircle, Clock, PieChart as PieChartIcon } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton, SB_COLORS } from "@/components/ui/ui-primitives";
import type { User as UserType, OrderSellOut, Account, Interaction, Product } from '@/domain/ssot';
import { orderTotal, inWindow } from '@/domain/ssot';
import { generateInsights } from "@/ai/flows/generate-insights-flow";
import { Avatar } from "@/components/ui/Avatar";
import { sbAsISO } from '@/features/agenda/helpers';

const formatEur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const formatShortDate = (date: Date) => new Intl.DateTimeFormat('es-ES', { month: 'short', day: 'numeric' }).format(date);


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

type TimeRange = 'week' | 'month' | 'year';

function SalesReportTable({ users, data, timeRange }: { users: UserType[], data: any, timeRange: TimeRange }) {
    const reportData = useMemo(() => {
        if (!data || !users) return { totals: { activeAccounts: 0, newAccounts: 0, newOrders: 0, totalEUR: 0 }, byUser: [] };
        
        const now = new Date();
        let startDate = new Date();
        if (timeRange === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (timeRange === 'month') {
            startDate.setDate(1);
            startDate.setHours(0,0,0,0);
        } else { // year
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const totals = {
            activeAccounts: data.accounts.filter((a: Account) => a.stage === 'ACTIVA').length,
            newAccounts: data.accounts.filter((a: Account) => inWindow(a.createdAt, startDate, now)).length,
            newOrders: data.ordersSellOut.filter((o: OrderSellOut) => inWindow(o.createdAt, startDate, now)).length,
            totalEUR: data.ordersSellOut.filter((o: OrderSellOut) => inWindow(o.createdAt, startDate, now)).reduce((sum: number, o: OrderSellOut) => sum + orderTotal(o), 0),
        };

        const byUser = users.map(user => {
            const userAccounts = data.accounts.filter((a: Account) => a.ownerId === user.id);
            const userAccountIds = new Set(userAccounts.map((a:Account) => a.id));
            const userOrders = data.ordersSellOut.filter((o: OrderSellOut) => userAccountIds.has(o.accountId));
            
            const ordersInPeriod = userOrders.filter((o: OrderSellOut) => inWindow(o.createdAt, startDate, now));
            const totalSales = ordersInPeriod.reduce((sum: number, o: OrderSellOut) => sum + orderTotal(o), 0);
            
            return {
                id: user.id,
                name: user.name,
                activeAccounts: userAccounts.filter((a: Account) => a.stage === 'ACTIVA').length,
                newAccounts: userAccounts.filter((a: Account) => inWindow(a.createdAt, startDate, now)).length,
                newOrders: ordersInPeriod.length,
                totalEUR: totalSales,
                avgTicket: ordersInPeriod.length > 0 ? totalSales / ordersInPeriod.length : 0,
                conversionRate: userAccounts.length > 0 ? (new Set(userOrders.map((o: OrderSellOut) => o.accountId)).size / userAccounts.length) * 100 : 0
            }
        });

        return { totals, byUser };
    }, [users, data, timeRange]);


    const headers = ['Comercial', 'Cuentas Activas', `Nuevas Cuentas (${timeRange})`, `Pedidos (${timeRange})`, `Ventas (${timeRange})`, 'Ticket Medio', 'Tasa Conversión'];

    return (
        <SBCard title={`Informe de Rendimiento del Equipo (${timeRange === 'week' ? 'Semanal' : timeRange === 'month' ? 'Mensual' : 'Anual'})`}>
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
                            <td className="px-4 py-3 text-center">{reportData.totals.activeAccounts}</td>
                            <td className="px-4 py-3 text-center">{reportData.totals.newAccounts}</td>
                            <td className="px-4 py-3 text-center">{reportData.totals.newOrders}</td>
                            <td className="px-4 py-3 text-right">{formatEur(reportData.totals.totalEUR)}</td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
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

function SalesMixDonutChart({ data, timeRange }: { data: any, timeRange: TimeRange }) {
    const salesMix = useMemo(() => {
        if (!data) return [];
        const now = new Date();
        let startDate = new Date();

        if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
        else if (timeRange === 'month') startDate.setDate(1);
        else startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0,0,0,0);

        const ordersInPeriod = data.ordersSellOut.filter((o: OrderSellOut) => inWindow(o.createdAt, startDate, now));
        
        const mix: { [sku: string]: { name: string, value: number } } = {};

        for (const order of ordersInPeriod) {
            for (const line of order.lines) {
                if (!mix[line.sku]) {
                    const product = data.products.find((p: Product) => p.sku === line.sku);
                    mix[line.sku] = { name: product?.name || line.sku, value: 0 };
                }
                mix[line.sku].value += line.priceUnit * line.qty;
            }
        }
        
        return Object.values(mix).filter(item => item.value > 0).sort((a,b) => b.value - a.value);
    }, [data, timeRange]);

    const COLORS = ['#F7D15F', '#D7713E', '#618E8F', '#A7D8D9', '#FFEAA6', '#F2A678'];

    if (salesMix.length === 0) {
        return <SBCard title="Mix de Ventas"><p className="p-4 text-center text-sm text-zinc-500">No hay datos de ventas para este período.</p></SBCard>
    }

    return (
        <SBCard title={`Mix de Ventas (${timeRange})`}>
            <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={salesMix}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                        >
                            {salesMix.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatEur(value)} />
                        <Legend iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </SBCard>
    );
}

type CategorizedTasks = {
  overdue: Interaction[];
  pending: Interaction[];
  done: Interaction[];
};

function TeamTasks({ tasks, accounts, users }: { tasks: Interaction[], accounts: Account[], users: UserType[] }) {
    const categorizedTasks = useMemo((): CategorizedTasks => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const openTasks = tasks.filter(t => t.status === 'open' && t.plannedFor);
        
        return {
            overdue: openTasks.filter(t => new Date(t.plannedFor!) < now).sort((a, b) => +new Date(a.plannedFor!) - +new Date(b.plannedFor!)),
            pending: openTasks.filter(t => new Date(t.plannedFor!) >= now).sort((a, b) => +new Date(a.plannedFor!) - +new Date(b.plannedFor!)),
            done: tasks.filter(t => t.status === 'done').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 10),
        };
    }, [tasks]);

    const TaskList = ({ title, tasks, icon, color }: { title: string, tasks: Interaction[], icon: React.ElementType, color: string }) => {
        const Icon = icon;
        return (
            <div>
                <h3 className={`flex items-center gap-2 font-semibold text-sm mb-3 ${color}`}>
                    <Icon size={16} /> {title} ({tasks.length})
                </h3>
                {tasks.length > 0 ? (
                    <div className="space-y-2">
                        {tasks.map(task => {
                            const account = accounts.find(a => a.id === task.accountId);
                            const assignedUsers = (task.involvedUserIds || []).map(id => users.find(u => u.id === id)).filter(Boolean) as UserType[];
                            return (
                                <div key={task.id} className="p-2 bg-white border rounded-lg text-xs">
                                    <p className="font-medium text-zinc-800">{task.note}</p>
                                    <div className="flex justify-between items-center mt-1 text-zinc-500">
                                        <span>{account?.name || 'Sin cuenta'}</span>
                                        <div className="flex items-center gap-2">
                                            <span>{new Date(task.plannedFor!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                            <div className="flex -space-x-1">
                                                {assignedUsers.map(user => <Avatar key={user.id} name={user.name} size="sm" />)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-center text-zinc-500 bg-zinc-50 py-4 rounded-lg">No hay tareas en esta categoría.</p>
                )}
            </div>
        );
    };

    return (
        <SBCard title="Tareas del Equipo de Ventas">
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <TaskList title="Atrasadas" tasks={categorizedTasks.overdue} icon={AlertCircle} color="text-red-600" />
                <TaskList title="Pendientes" tasks={categorizedTasks.pending} icon={Clock} color="text-blue-600" />
                <TaskList title="Completadas (Recientes)" tasks={categorizedTasks.done} icon={Check} color="text-green-600" />
            </div>
        </SBCard>
    );
}

function TeamDashboardContent() {
  const { data } = useData();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  const users = useMemo(() => data?.users.filter((u: UserType) => u.role === 'comercial' || u.role === 'owner') || [], [data]);
  
  const { teamStats, salesEvolutionData } = useMemo(() => {
    if(!data) return { teamStats: { totalNewAccounts: 0, conversionRate: 0, attributedSales: 0 }, salesEvolutionData: [] };
    
    const now = new Date();
    let startDate = new Date();
    let interval: 'day' | 'month' = 'day';

    if (timeRange === 'week') {
        startDate.setDate(now.getDate() - (now.getDay() - 1)); // Start of week (Monday)
        interval = 'day';
    } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        interval = 'day';
    } else { // year
        startDate = new Date(now.getFullYear(), 0, 1);
        interval = 'month';
    }
    startDate.setHours(0,0,0,0);


    const ordersInPeriod = data.ordersSellOut.filter(o => inWindow(o.createdAt, startDate, now));
    
    const salesByInterval: {[key: string]: number} = {};
    for (const order of ordersInPeriod) {
        const orderDate = new Date(order.createdAt);
        let key = '';
        if (interval === 'day') {
            key = formatShortDate(orderDate);
        } else { // month
            key = orderDate.toLocaleString('es-ES', { month: 'short' });
        }
        salesByInterval[key] = (salesByInterval[key] || 0) + orderTotal(order);
    }
    
    let salesEvolutionData;
    if (interval === 'day' && timeRange === 'week') {
        salesEvolutionData = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(day => {
            const dateKey = Object.keys(salesByInterval).find(k => new Date(k + ' ' + now.getFullYear()).toLocaleString('es-ES', {weekday: 'short'}).startsWith(day.substring(0,2)));
            return { name: day, sales: dateKey ? salesByInterval[dateKey] : 0 };
        });
    } else {
        salesEvolutionData = Object.entries(salesByInterval).map(([name, sales]) => ({ name, sales })).reverse();
    }


    const totalNewAccounts = data.accounts.filter(a => inWindow(a.createdAt, startDate, now)).length;
    
    const accountsWithOrders = new Set(data.ordersSellOut.map(o => o.accountId));
    const conversionRate = data.accounts.length > 0 ? (accountsWithOrders.size / data.accounts.length) * 100 : 0;
    
    const attributedSales = ordersInPeriod.reduce((sum, order) => sum + orderTotal(order), 0);

    const teamStats = { totalNewAccounts, conversionRate, attributedSales };
    return { teamStats, salesEvolutionData };
  }, [data, timeRange]);

  const salesTasks = useMemo(() => {
    if (!data) return [];
    return data.interactions.filter(i => i.dept === 'VENTAS');
  }, [data]);
  
  const handleGenerateInsights = async () => {
    if (!data) return;
    setLoadingInsights(true);
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
        setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center p-1 bg-zinc-100 rounded-lg">
                {(['week', 'month', 'year'] as const).map(range => (
                    <SBButton
                        key={range}
                        size="sm"
                        onClick={() => setTimeRange(range)}
                        className={`font-semibold ${timeRange === range ? 'bg-white shadow-sm' : 'bg-transparent text-zinc-600'}`}
                    >
                        {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                    </SBButton>
                ))}
            </div>
             <SBButton variant="secondary" onClick={handleGenerateInsights} disabled={loadingInsights}>
                <BrainCircuit className="h-4 w-4" /> {loadingInsights ? 'Analizando...' : 'Análisis con IA'}
            </SBButton>
        </div>

        {insights && (
            <div className="prose prose-sm p-4 bg-zinc-50 rounded-lg border max-w-none whitespace-pre-wrap">
                <h3 className="font-semibold text-zinc-800">Análisis con IA</h3>
                {insights}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPI icon={UserPlus} label={`Nuevas Cuentas (${timeRange})`} value={teamStats.totalNewAccounts} />
            <KPI icon={BarChart3} label="Conversión a pedido (total)" value={`${teamStats.conversionRate.toFixed(1)}%`} />
            <KPI icon={Briefcase} label={`Ventas (${timeRange})`} value={formatEur(teamStats.attributedSales)} />
        </div>
        
        <SBCard title="Evolución de Ventas">
            <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesEvolutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(value) => formatEur(value as number)} />
                        <Tooltip formatter={(value) => formatEur(value as number)} />
                        <Line type="monotone" dataKey="sales" stroke={SB_COLORS.cobre} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </SBCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                 {data && <SalesReportTable users={users} data={data} timeRange={timeRange}/>}
            </div>
            <div className="space-y-6">
                <CommercialsRace users={users} data={data} />
                <SalesMixDonutChart data={data} timeRange={timeRange} />
            </div>
        </div>

        <div>
            {data && <TeamTasks tasks={salesTasks} accounts={data.accounts} users={data.users} />}
        </div>
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

    
