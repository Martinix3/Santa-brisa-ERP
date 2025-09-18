

"use client";
import React, { useMemo, useState, useEffect } from "react";
import { BarChart3, Clock, MapPin, Phone, Target, Users, Briefcase, ChevronDown, MessageSquare, Map as MapIcon, ShoppingCart, UserPlus, User, BrainCircuit, CheckCircle, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SBCard, SBButton, SB_COLORS } from "@/components/ui/ui-primitives";
import type { User as UserType, OrderSellOut, Interaction, Account, InteractionStatus } from '@/domain/ssot';
import { orderTotal, inWindow } from '@/domain/ssot';
import { generateInsights } from "@/ai/flows/generate-insights-flow";
import AuthenticatedLayout from "@/components/layouts/AuthenticatedLayout";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { saveCollection } from '@/features/agenda/components/CalendarPageContent';


const formatEur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// ===== Componentes UI (locales para este dashboard) =====
function KPI({label, value, secondary, icon: Icon}:{label:string; value:number|string; secondary?:React.ReactNode, icon: React.ElementType}){
  return (
    <div className="rounded-xl border border-zinc-200 p-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-zinc-100 text-zinc-600">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-2xl font-semibold text-zinc-900">{typeof value==="number"? value.toLocaleString("es-ES"): value}</div>
                {secondary && <div className="text-[11px] text-zinc-600 mt-0.5">{secondary}</div>}
            </div>
        </div>
    </div>
  );
}

// ===== Dashboard Personal =====
function PersonalDashboardContent({ displayedUser, timePeriod, setTimePeriod }: { 
    displayedUser: UserType | null,
    timePeriod: 'week' | 'month' | 'year',
    setTimePeriod: (p: 'week' | 'month' | 'year') => void,
}){
  const { data: santaData, setData, currentUser } = useData();
  const accent = SB_COLORS.accent;

  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);

  const userStats = useMemo(() => {
    if (!santaData || !displayedUser) {
        return {
            revenue: 0, pipeline: 0, visits: 0, accounts: 0,
            teamAvg: { revenue: 0, visits: 0 },
            topAccounts: [],
            upcomingInteractions: [],
            trendData: [],
            teamTrendData: [],
        };
    }

    const endDate = new Date();
    const startDate = new Date();
    if(timePeriod === 'week') startDate.setDate(endDate.getDate() - 7);
    else if(timePeriod === 'month') startDate.setMonth(endDate.getMonth() - 1);
    else if(timePeriod === 'year') startDate.setFullYear(endDate.getFullYear() - 1);

    const userAccountIds = new Set(santaData.accounts.filter(a => a.ownerId === displayedUser.id).map(a => a.id));
    const userOrders = santaData.ordersSellOut.filter(o => userAccountIds.has(o.accountId) && inWindow(o.createdAt, startDate, endDate));
    
    // Filtra las interacciones del usuario, no las de las cuentas del usuario
    const userInteractions = santaData.interactions.filter(i => i.userId === displayedUser.id);
    const userAccounts = santaData.accounts.filter(a => a.ownerId === displayedUser.id);

    const revenue = userOrders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + orderTotal(o), 0);
    const pipeline = userOrders.filter(o => o.status === 'open').reduce((sum, o) => sum + orderTotal(o), 0);
    const visits = userInteractions.filter(i => inWindow(i.createdAt, startDate, endDate) && i.kind === 'VISITA').length;
    
    // Team average
    const salesUsers = santaData.users.filter(u => u.role === 'comercial' || u.role === 'owner');
    const totalRevenue = santaData.ordersSellOut.filter(o => inWindow(o.createdAt, startDate, endDate)).reduce((sum, o) => sum + orderTotal(o), 0);
    const totalVisits = santaData.interactions.filter(i => inWindow(i.createdAt, startDate, endDate) && i.kind === 'VISITA').length;
    const teamAvg = {
        revenue: totalRevenue / (salesUsers.length || 1),
        visits: totalVisits / (salesUsers.length || 1)
    };
    
    // Top Accounts
    const accountRevenue = userOrders.reduce((acc, order) => {
        if (order.status === 'confirmed') {
            const current = acc.get(order.accountId) || { revenue: 0, last: '1970-01-01' };
            acc.set(order.accountId, {
                revenue: current.revenue + orderTotal(order),
                last: order.createdAt > current.last ? order.createdAt : current.last,
            });
        }
        return acc;
    }, new Map<string, { revenue: number; last: string }>());

    const topAccounts = Array.from(accountRevenue.entries())
        .map(([id, data]) => ({
            id,
            name: santaData.accounts.find(a => a.id === id)?.name || id,
            city: santaData.accounts.find(a => a.id === id)?.city || '',
            ...data
        }))
        .sort((a,b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Upcoming Interactions
    const upcomingInteractions = userInteractions
        .filter(i => i.plannedFor && new Date(i.plannedFor) >= new Date() && i.status === 'open')
        .sort((a,b) => new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime())
        .slice(0, 5)
        .map(i => ({
            ...i,
            title: i.note || `${i.kind} - ${santaData.accounts.find(a=>a.id===i.accountId)?.name}`,
            when: new Date(i.plannedFor!).toLocaleString('es-ES', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
            icon: i.kind === 'LLAMADA' ? Phone : MapPin
        }));
        
    // Trend data
    const points = timePeriod === 'week' ? 7 : timePeriod === 'month' ? 30 : 12;
    const interval = timePeriod === 'year' ? 'month' : 'day';
    
    const userTrend = Array.from({length: points}).map((_, i) => {
        const pointEnd = new Date(endDate);
        const pointStart = new Date(endDate);
        if(interval === 'day') {
            pointStart.setDate(pointEnd.getDate() - (points - 1 - i));
            pointEnd.setDate(pointEnd.getDate() - (points - 1 - i));
            pointEnd.setHours(23, 59, 59, 999);
        } else { // month
            pointStart.setMonth(pointEnd.getMonth() - (points - 1 - i), 1);
            pointEnd.setMonth(pointEnd.getMonth() - (points - 1 - i) + 1, 0);
        }
        
        const sales = userOrders.filter(o => inWindow(o.createdAt, pointStart, pointEnd)).reduce((s,o) => s + orderTotal(o), 0);
        return { x: interval === 'day' ? pointStart.getDate().toString() : pointStart.toLocaleString('es-ES',{month:'short'}), y: sales };
    });
    
    const teamTrendData = Array.from({length: points}).map((_, i) => {
        const pointEnd = new Date(endDate);
        const pointStart = new Date(endDate);
        if(interval === 'day') {
            pointStart.setDate(pointEnd.getDate() - (points - 1 - i));
            pointEnd.setDate(pointEnd.getDate() - (points - 1 - i));
            pointEnd.setHours(23, 59, 59, 999);
        } else { // month
            pointStart.setMonth(pointEnd.getMonth() - (points - 1 - i), 1);
            pointEnd.setMonth(pointEnd.getMonth() - (points - 1 - i) + 1, 0);
        }
        const teamSales = santaData.ordersSellOut.filter(o => inWindow(o.createdAt, pointStart, pointEnd)).reduce((s,o) => s + orderTotal(o), 0) / (salesUsers.length || 1);
        return { x: interval === 'day' ? pointStart.getDate().toString() : pointStart.toLocaleString('es-ES',{month:'short'}), y: teamSales };
    });


    return { revenue, pipeline, visits, accounts: userAccounts.length, teamAvg, topAccounts, upcomingInteractions, trendData: userTrend, teamTrendData };
  }, [santaData, displayedUser, timePeriod]);


  // Benchmarks
  const revVsTeamPct = Math.round(((userStats.revenue - userStats.teamAvg.revenue) / (userStats.teamAvg.revenue || 1)) * 1000) / 10;
  const visitsVsTeamPct = Math.round(((userStats.visits - userStats.teamAvg.visits) / (userStats.teamAvg.visits || 1)) * 1000) / 10;
  
    const updateAndPersistInteractions = (updatedInteractions: Interaction[]) => {
      if (!santaData) return;
      setData(prev => prev ? ({ ...prev, interactions: updatedInteractions }) : null);
      saveCollection('interactions', updatedInteractions);
    }
  
    const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
        const updatedInteractions = santaData.interactions.map(i => 
            i.id === id ? { ...i, status: newStatus } : i
        ) as Interaction[];
        updateAndPersistInteractions(updatedInteractions);
    };

    const handleAddOrUpdateEvent = async (event: Omit<Interaction, 'createdAt' | 'status' | 'userId'> & { id?: string }) => {
        if (!currentUser) return;
        if (event.id) { // Update existing
            const updatedInteractions = santaData.interactions.map(i => i.id === event.id ? { ...i, ...event } : i);
            updateAndPersistInteractions(updatedInteractions as Interaction[]);
        } else { // Create new
            const newInteraction: Interaction = {
                id: `int_${Date.now()}`,
                createdAt: new Date().toISOString(),
                status: 'open',
                userId: currentUser.id,
                ...event,
            };
            const updatedInteractions = [...(santaData.interactions || []), newInteraction];
            updateAndPersistInteractions(updatedInteractions);
        }
        setEditingEvent(null);
        setIsNewEventDialogOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        const updatedInteractions = santaData.interactions.filter(i => i.id !== id);
        updateAndPersistInteractions(updatedInteractions);
        setSelectedEvent(null);
    };

    const handleEditRequest = (event: Interaction) => {
        setSelectedEvent(null);
        setEditingEvent(event);
        setIsNewEventDialogOpen(true);
    };


  if (!displayedUser) {
      return <div className="p-6 text-center text-zinc-500">Selecciona un usuario para ver su dashboard.</div>
  }

  return (
    <>
    <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPI icon={BarChart3} label={`Ventas (${timePeriod})`} value={formatEur(userStats.revenue)}
            secondary={<span>Equipo: {formatEur(userStats.teamAvg.revenue)} · <span className={revVsTeamPct>=0?"text-emerald-600":"text-rose-600"}>{revVsTeamPct>=0?"+":""}{revVsTeamPct}%</span> vs media</span>}
            />
            <KPI icon={Target} label="Pipeline" value={formatEur(userStats.pipeline)} />
            <KPI icon={MapIcon} label={`Visitas (${timePeriod})`} value={userStats.visits}
            secondary={<span>Equipo: {userStats.teamAvg.visits.toFixed(0)} · <span className={visitsVsTeamPct>=0?"text-emerald-600":"text-rose-600"}>{visitsVsTeamPct>=0?"+":""}{visitsVsTeamPct}%</span> vs media</span>}
            />
            <KPI icon={Users} label="Cuentas activas" value={userStats.accounts} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6">
            {/* Chart taking full width */}
            <SBCard title={`Evolución de ventas — ${displayedUser?.name} vs Equipo`}>
                <div className="p-4">
                    <div className="flex justify-end gap-1 mb-4">
                        {(['week', 'month', 'year'] as const).map(p => (
                            <SBButton key={p} variant={timePeriod === p ? 'primary' : 'secondary'} size="sm" onClick={() => setTimePeriod(p)} className="capitalize !px-3 !py-1 !text-xs">
                                {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
                            </SBButton>
                        ))}
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userStats.trendData} margin={{left:8,right:8,top:8,bottom:8}}>
                            <defs>
                                <linearGradient id="sbFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={accent} stopOpacity={0.35}/>
                                <stop offset="100%" stopColor={accent} stopOpacity={0.05}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
                            <XAxis dataKey="x"/>
                            <YAxis tickFormatter={(val) => formatEur(val as number)}/>
                            <Tooltip formatter={(val) => formatEur(val as number)}/>
                            <Area type="monotone" dataKey="y" name={displayedUser?.name} stroke={accent} fill="url(#sbFill)" strokeWidth={2}/>
                            <Line type="monotone" data={userStats.teamTrendData} dataKey="y" name="Equipo" stroke="#0f172a" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </SBCard>
            
            {/* Lower cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SBCard title="Próximas actividades">
                    <ul className="space-y-1 p-2">
                    {userStats.upcomingInteractions.map((t,i)=>{
                        const Icon = t.icon;
                        return (
                        <li key={i} className="flex items-center gap-2 p-2 rounded-xl group hover:bg-zinc-50">
                            <button onClick={() => setSelectedEvent(t)} className="flex-1 flex items-center gap-3 text-left">
                                <div className="p-2 rounded-lg" style={{backgroundColor: `${accent}20`, color: accent}}><Icon className="h-4 w-4"/></div>
                                <div className="flex-1">
                                <div className="text-sm text-zinc-800 font-medium">{t.note}</div>
                                <div className="text-xs text-zinc-500">{t.when}</div>
                                </div>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <SBButton variant="ghost" size="sm" title="Completar" onClick={() => handleUpdateStatus(t.id, 'done')}><CheckCircle size={16} className="text-green-600"/></SBButton>
                                <SBButton variant="ghost" size="sm" title="Editar" onClick={() => handleEditRequest(t)}><Edit size={16} /></SBButton>
                                <SBButton variant="ghost" size="sm" title="Eliminar" onClick={() => handleDeleteEvent(t.id)}><Trash2 size={16} className="text-red-600"/></SBButton>
                            </div>
                        </li>
                        );
                    })}
                     {userStats.upcomingInteractions.length === 0 && <p className="text-sm text-center text-zinc-400 py-4">No hay actividades próximas.</p>}
                    </ul>
                </SBCard>

                <SBCard title={`Top cuentas de ${displayedUser?.name}`}>
                    <div className="overflow-auto rounded-b-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50">
                        <tr>
                            <th className="text-left px-3 py-2 font-medium text-zinc-600">Cuenta</th>
                            <th className="text-right px-3 py-2 font-medium text-zinc-600">Ventas (€)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {userStats.topAccounts.map((a,i)=> (
                            <tr key={i} className="border-t">
                            <td className="px-3 py-2">
                                <a href={`/accounts/${a.id}`} className="font-medium hover:underline">{a.name}</a>
                                <div className="text-xs text-zinc-500">{a.city}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">{formatEur(a.revenue)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </SBCard>
            </div>
      </div>
    </div>

    {selectedEvent && (
        <EventDetailDialog
            event={selectedEvent}
            open={!!selectedEvent}
            onOpenChange={() => setSelectedEvent(null)}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditRequest}
            onDelete={handleDeleteEvent}
        />
    )}

    {isNewEventDialogOpen && (
        <NewEventDialog
            open={isNewEventDialogOpen}
            onOpenChange={setIsNewEventDialogOpen}
            onSave={handleAddOrUpdateEvent as any}
            accentColor={SB_COLORS.accent}
            initialEventData={editingEvent}
        />
    )}
    </>
  );
}


// Team Dashboard Components
function UserChip({ id, name, newAccounts, weeklyGoal, onNewOrder, onNewVisit, onNewInteraction }: { id: string; name: string; newAccounts: number; weeklyGoal: number; onNewOrder?: (userId: string) => void; onNewVisit?: (userId: string) => void; onNewInteraction?: (userId: string) => void; }) {
  const ok = newAccounts >= weeklyGoal;
  return (
    <div className="flex items-center gap-2 border rounded-full px-3 py-1.5 bg-white shadow-sm">
      <User className="h-4 w-4 text-zinc-500"/>
      <span className="text-sm font-medium">{name}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        {newAccounts}/{weeklyGoal}
      </span>
      <SBButton size="sm" variant="ghost" onClick={() => onNewOrder?.(id)} title="Nuevo pedido"><ShoppingCart className="h-4 w-4"/></SBButton>
      <SBButton size="sm" variant="ghost" onClick={() => onNewVisit?.(id)} title="Nueva visita"><MapIcon className="h-4 w-4"/></SBButton>
      <SBButton size="sm" variant="ghost" onClick={() => onNewInteraction?.(id)} title="Nueva interacción"><MessageSquare className="h-4 w-4"/></SBButton>
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


    const headers = ['Comercial', 'Cuentas Activas', 'Nuevas Cuentas', 'Nuevos Pedidos', 'Total €', 'Ticket Medio', 'Tasa Conversión'];
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
            const result = await generateInsights({ jsonData: JSON.stringify(relevantData) });
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


function TeamDashboardContent() {
  const { data } = useData();
  const users = useMemo(() => data?.users.filter((u: UserType) => u.role === 'comercial' || u.role === 'owner') || [], [data]);
  
  const weeklyGoal = 3;
  const yearlyGoal = 250;
  
  const teamStats = useMemo(() => {
    if(!data) return { totalNewAccountsWeekly: 0, totalNewAccountsYearly: 0, conversionRate: 0, attributedSales: 0, usersWithData: []};
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const usersWithData = users.map(user => {
      const newAccounts = data.accounts.filter(acc => acc.ownerId === user.id && new Date(acc.createdAt) >= oneWeekAgo);
      return {
        ...user,
        newAccounts: newAccounts.length,
      };
    });
    
    const totalNewAccountsWeekly = usersWithData.reduce((s, u) => s + u.newAccounts, 0);
    const totalNewAccountsYearly = data.accounts.filter(a => new Date(a.createdAt) >= startOfYear).length;
    const accountsWithOrders = new Set(data.ordersSellOut.map(o => o.accountId));
    const conversionRate = data.accounts.length > 0 ? (accountsWithOrders.size / data.accounts.length) * 100 : 0;
    const attributedSales = data.ordersSellOut.reduce((sum, order) => sum + orderTotal(order), 0);

    return { totalNewAccountsWeekly, totalNewAccountsYearly, conversionRate, attributedSales, usersWithData };
  }, [data, users]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPI icon={UserPlus} label="Cuentas abiertas (semana)" value={teamStats.totalNewAccountsWeekly} />
            <KPI icon={Target} label="Cuentas abiertas (mes)" value={teamStats.totalNewAccountsWeekly * 4} />
            <KPI icon={BarChart3} label="Conversión a pedido" value={`${teamStats.conversionRate.toFixed(1)}%`} />
            <KPI icon={Briefcase} label="Ventas atribuidas" value={formatEur(teamStats.attributedSales)} />
        </div>
        
        <AIInsightsCard />

        <RaceToGoal current={teamStats.totalNewAccountsYearly} goal={yearlyGoal} label="Carrera de Cuentas Anual" />

        <SBCard title="Comerciales">
            <div className="p-4">
                <div className="flex flex-wrap gap-3">
                {teamStats.usersWithData.map(u => (
                    <UserChip 
                        key={u.id} 
                        id={u.id} 
                        name={u.name} 
                        newAccounts={u.newAccounts} 
                        weeklyGoal={weeklyGoal}
                        onNewOrder={(id) => alert('Nuevo pedido para ' + id)}
                        onNewVisit={(id) => alert('Nueva visita para ' + id)}
                        onNewInteraction={(id) => alert('Nueva interacción para ' + id)}
                    />
                ))}
                </div>
            </div>
        </SBCard>
        {data && <SalesReportTable users={users} data={data}/>}
    </div>
  );
}


// Main Page Component
function SalesDashboardPageContent(){
    const { currentUser, data } = useData();
    const [view, setView] = useState<'personal' | 'team'>('personal');
    const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
    const [displayedUser, setDisplayedUser] = useState<UserType | null>(currentUser);
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
    const salesTeam = useMemo(() => data?.users.filter(u => u.role === 'comercial' || u.role === 'owner'), [data?.users]);

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const user = salesTeam?.find(u => u.id === selectedId) || null;
        setDisplayedUser(user);
    }
    
    // Set initial user on load
    useEffect(() => {
        setDisplayedUser(currentUser);
    }, [currentUser]);
    
    useEffect(() => {
        // If an admin is viewing the team dashboard, default to it
        if(isAdmin) {
            setView('team');
        }
    }, [isAdmin]);

    return (
        <div className="p-6 bg-zinc-50 flex-grow">
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <select 
                            value={view} 
                            onChange={e => setView(e.target.value as any)}
                            className="text-lg font-semibold bg-transparent border-b-2 border-zinc-300 focus:outline-none focus:border-yellow-400"
                        >
                            <option value="team">Vista de Equipo</option>
                            <option value="personal">Vista Personal</option>
                        </select>
                    )}

                    {view === 'personal' && (
                        <div className="relative">
                            <select 
                                value={displayedUser?.id || ''}
                                onChange={handleUserChange}
                                className="pl-3 pr-8 py-1.5 text-sm font-medium bg-zinc-100 border border-zinc-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            >
                                {salesTeam?.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" />
                        </div>
                    )}
                </div>
            </div>
            
            {view === 'personal' ? 
                <PersonalDashboardContent 
                    displayedUser={displayedUser}
                    timePeriod={timePeriod}
                    setTimePeriod={setTimePeriod}
                /> 
                : <TeamDashboardContent />}
        </div>
    );
}

export default function SalesDashboardPage() {
    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Dashboards de Ventas" icon={BarChart3} />
            <SalesDashboardPageContent />
        </AuthenticatedLayout>
    )
}
