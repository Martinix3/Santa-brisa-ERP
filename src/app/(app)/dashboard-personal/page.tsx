
// src/app/(app)/dashboard-personal/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Package, Briefcase, CheckSquare } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { orderToBottles } from '@/lib/sb-core';
import { TaskBoard } from '@/features/agenda/TaskBoard'; // Actualizamos la ruta si lo moviste
// ... (resto de imports de la página)
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Interaction, InteractionStatus, User as CurrentUserType, SantaData, Task as AgendaTask } from '@/domain/ssot';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
// ✅ Agenda integrada
import { useQuickNotes } from '@/features/agenda/hooks/useQuickNotes';
import { getStorage } from '@/features/agenda/storage'; // factory SSR-safe
import { QuickEditor } from '@/features/agenda/components/QuickEditor';
import { NotesList } from '@/features/agenda/components/NotesList';
import { OutcomeDialog } from '@/features/agenda/components/OutcomeDialog';


// ============================================================================
// COPIAMOS AQUÍ EL KPI CARD YA "SANTABRISSEADO" DE LA RESPUESTA ANTERIOR
// ============================================================================
const SANTA_BRISA_COLORS = { brand: { accent: '#F4C542' } };
const KpiCard = ({ icon: Icon, title, value, goal, color }: { icon: React.ElementType; title: string; value: number; goal: number; color: string }) => {
    const progress = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    return (
        <motion.div className="bg-slate-50 p-4 rounded-lg border border-slate-200" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <div className="flex items-center space-x-3 mb-2"><div className="bg-white p-2 rounded-lg border border-slate-200"><Icon className="text-slate-500" size={20} /></div><p className="text-sm text-slate-700 font-medium">{title}</p></div>
            <p className="text-3xl font-bold text-slate-900">{value} <span className="text-base font-normal text-slate-500">/ {goal}</span></p>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden"><div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: color }}></div></div>
        </motion.div>
    );
}


// ============================================================================
// NUEVO COMPONENTE: Gráfico de Evolución de Ventas
// ============================================================================
// ✅ Santabrisseado: Sigue todas las reglas del brief para gráficos.
function PersonalSalesChart({ data, currentUser }: { data: SantaData, currentUser: CurrentUserType }) {
  const chartData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const salesByDay: Record<string, number> = {};

    const myOrders = (data.ordersSellOut || []).filter(o => {
        const acc = data.accounts.find(a => a.id === o.accountId);
        return acc?.ownerId === currentUser.id && new Date(o.createdAt) >= startOfMonth;
    });

    myOrders.forEach(order => {
        const date = new Date(order.createdAt);
        const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const bottles = orderToBottles(order, data.items || []);
        const firstLineItem = order.lines?.[0]?.itemId ? data.items.find(it => it.id === order.lines[0].itemId) : undefined;
        const caseUnits = firstLineItem?.caseUnits || 6;
        const boxes = Math.floor(bottles / caseUnits);
        salesByDay[day] = (salesByDay[day] || 0) + boxes;
    });

    // Asegura que todos los días hasta hoy estén, incluso con 0 ventas
    const result = [];
    for (let i = 1; i <= now.getDate(); i++) {
        const dayDate = new Date(now.getFullYear(), now.getMonth(), i);
        const dayLabel = dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        result.push({ name: dayLabel, Cajas: salesByDay[dayLabel] || 0 });
    }
    return result;

  }, [data, currentUser]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Evolución de Cajas Vendidas (Mes Actual)</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#6b7280" />
            <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '6px', color: '#fff' }} cursor={{ fill: '#f1f5f9' }} />
            <Line type="monotone" dataKey="Cajas" stroke={SANTA_BRISA_COLORS.brand.accent} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================================
// AGENDA DOCK — compacto (reutiliza QuickNotes)
// - Mobile: bloque principal (editor + lista + footer KPIs).
// - Desktop: panel lateral sticky  (tabs compactas + notas del día).
// ============================================================================
function AgendaDock() {
  const storage = getStorage();
  const agenda = useQuickNotes(storage);
  const [outcomeFor, setOutcomeFor] = useState<string|null>(null);
  const openOutcome = (id: string) => setOutcomeFor(id);
  const closeOutcome = () => setOutcomeFor(null);

  const kpis = useMemo(()=> {
    const overdue = agenda.overdue.length;
    const todayOpen = agenda.todayTasks.filter(t=>t.status==='OPEN').length;
    const posToday = agenda.todayTasks.filter(t=> t.kind==='POS_EVT' || t.kind==='POS_PLV').length;
    return { overdue, todayOpen, posToday };
  }, [agenda.overdue, agenda.todayTasks]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl lg:rounded-none lg:border-0 lg:bg-transparent flex flex-col h-full">
      {/* Header compacto + toggle vincular */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 lg:px-0">
        <div className="text-sm font-semibold text-slate-900">Agenda</div>
        <div className="ml-auto text-xs flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={agenda.linkNotes} onChange={(e)=>agenda.setLinkNotes(e.target.checked)} />
            Vincular notas
          </label>
        </div>
      </div>

      {/* Editor rápido */}
      <div className="px-4 lg:px-0">
        <QuickEditor onSubmit={agenda.addNote} />
      </div>

      {/* Overdue plegable (si existe) */}
      {agenda.overdue.length>0 && (
        <details open className="px-4 lg:px-0">
          <summary className="text-xs text-slate-600 py-1">Pendientes de ayer ({agenda.overdue.length})</summary>
          <NotesList
            notes={agenda.rangedNotes}
            tasks={agenda.overdue}
            onPointerDown={agenda.onItemPointerDown}
            onPointerMove={agenda.onItemPointerMove}
            onPointerUp={(id)=>agenda.onItemPointerUp(id, openOutcome)}
          />
        </details>
      )}

      {/* Lista del día */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-0">
        <NotesList
          notes={agenda.rangedNotes}
          tasks={agenda.todayTasks}
          onPointerDown={agenda.onItemPointerDown}
          onPointerMove={agenda.onItemPointerMove}
          onPointerUp={(id)=>agenda.onItemPointerUp(id, openOutcome)}
        />
      </div>

      {/* Footer KPIs táctil (mobile visible, desktop discreto) */}
      <div className="border-t bg-white px-4 py-2 text-sm flex items-center justify-between lg:rounded-xl lg:border lg:mt-3">
        <div className="text-slate-600">Vencidas</div><div className="font-semibold">{kpis.overdue}</div>
        <div className="text-slate-600">Para hoy</div><div className="font-semibold">{kpis.todayOpen}</div>
        <div className="text-slate-600">POS hoy</div><div className="font-semibold">{kpis.posToday}</div>
      </div>

      {/* Outcome inteligente */}
      <OutcomeDialog
        taskId={outcomeFor}
        tasks={agenda.todayTasks.concat(agenda.overdue) as unknown as AgendaTask[]}
        onClose={closeOutcome}
        onConfirm={(task, payload)=>{ agenda.completeTask(task.id); closeOutcome(); }}
      />
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT - ACTUALIZADO
// ============================================================================
export default function PersonalDashboardPage() {
    const { currentUser, data } = useData();
    const router = useRouter();
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
    const [openNewTask, setOpenNewTask] = useState(false);
    const [completingMarketingEvent, setCompletingMarketingEvent] = useState<any>(null);

    const { personalTasks, kpis } = useMemo(() => {
        if (!data || !currentUser) return { personalTasks: [], kpis: null };

        const now = new Date();
        let startOfRange;

        if (timeRange === 'week') {
            const firstDayOfWeek = now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1); // Asume que la semana empieza el lunes
            startOfRange = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
        } else if (timeRange === 'year') {
            startOfRange = new Date(now.getFullYear(), 0, 1);
        } else { // month
            startOfRange = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        startOfRange.setHours(0, 0, 0, 0);

        const myInteractions = (data.interactions || []).filter(i => {
            const isAssigned = (i.involvedUserIds || []).includes(currentUser.id);
            const isSelfAssigned = (i.involvedUserIds === undefined || i.involvedUserIds.length === 0) && i.userId === currentUser.id;
            return isAssigned || isSelfAssigned;
        });

        const tasks = mapInteractionsToTasks(myInteractions, data.accounts);
        
        const myAccounts = (data.accounts || []).filter(a => a.ownerId === currentUser.id && new Date(a.createdAt) >= startOfRange);
        const myOrders = (data.ordersSellOut || []).filter(o => {
            const acc = data.accounts.find(a => a.id === o.accountId);
            return acc?.ownerId === currentUser.id && new Date(o.createdAt) >= startOfRange;
        });
        const myVisits = myInteractions.filter(i => i.kind === 'VISITA' && new Date(i.createdAt) >= startOfRange);
        const myPosTactics = (data.posTactics || []).filter(t => t.createdById === currentUser.id && new Date(t.createdAt) >= startOfRange);
        
        const boxesSold = myOrders.reduce((sum, o) => {
            const bottles = orderToBottles(o, data.items || []);
            const firstLineItem = o.lines?.[0]?.itemId ? data.items.find(it => it.id === o.lines[0].itemId) : undefined;
            const caseUnits = firstLineItem?.caseUnits || 6;
            return sum + Math.floor(bottles / caseUnits);
        }, 0);

        const kpiData = { newAccounts: myAccounts.length, boxesSold: boxesSold, visits: myVisits.length, posTactics: myPosTactics.length };
        return { personalTasks: tasks, kpis: kpiData };
    }, [data, currentUser, timeRange]);

    const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => { if (!data || !data.interactions) return; const taskToUpdate = data.interactions.find(i => i.id === id); if (!taskToUpdate) return; if (newStatus === 'done') { if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && data.marketingEvents) { const event = (data.marketingEvents as any[]).find(e => e.id === taskToUpdate.linkedEntity?.id); if (event) setCompletingMarketingEvent(event); else setCompletingTask(taskToUpdate); } else { setCompletingTask(taskToUpdate); } } };
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

    if (!kpis || !currentUser || !data) {
        return <div className="p-6 bg-white text-slate-700">Cargando dashboard...</div>;
    }

    return (
        <>
            {/* Layout integrado:
               - Mobile: flujo vertical (KPIs → gráfico → TaskBoard → AgendaDock).
               - Desktop: grid con panel lateral fijo para AgendaDock. */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-0 lg:p-6">
                <div className="mx-auto w-full lg:max-w-[1200px] lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">
                  {/* Columna principal */}
                  <div className="p-6 space-y-6">
                     <div className="flex items-center justify-between">
                         <h1 className="text-2xl font-bold text-slate-900">Mi Dashboard</h1>
                         <div className="hidden md:flex items-center gap-1 rounded-lg border p-1 bg-slate-100">
                             {(['week', 'month', 'year'] as const).map(range => (
                                 <button
                                     key={range}
                                     onClick={() => setTimeRange(range)}
                                     className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${timeRange === range ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                 >
                                     {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                         <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts} goal={10} color={SANTA_BRISA_COLORS.brand.accent} />
                         <KpiCard icon={Package} title="Cajas Vendidas" value={kpis.boxesSold} goal={150} color={SANTA_BRISA_COLORS.brand.accent} />
                         <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits} goal={60} color={SANTA_BRISA_COLORS.brand.accent} />
                         <KpiCard icon={CheckSquare} title="POS Tactics" value={kpis.posTactics} goal={20} color={SANTA_BRISA_COLORS.brand.accent} />
                     </motion.div>
                     
                     {/* Gráfico */}
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
                       <PersonalSalesChart data={data} currentUser={currentUser} />
                     </motion.div>
 
                     {/* TaskBoard personal */}
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                         <TaskBoard
                             tasks={personalTasks}
                             onTaskStatusChange={handleUpdateStatus}
                             onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
                             onNewTask={() => setOpenNewTask(true)}
                         />
                     </motion.div>
                  </div>
                  {/* Panel lateral Agenda (desktop sticky) */}
                  <aside className="hidden lg:block sticky top-[76px] h-[calc(100dvh-76px)]">
                    <AgendaDock />
                  </aside>
                  {/* En móvil, colocamos Agenda al final del flujo para foco en “hacer” */}
                  <div className="lg:hidden border-t mt-2">
                    <div className="px-6 pt-4 pb-2 text-sm font-semibold text-slate-900">Mi Agenda</div>
                    <div className="px-6 pb-6">
                      <AgendaDock />
                    </div>
                  </div>
                </div>
            </main>

            {/* ... (Los diálogos no cambian, solo recuerda tener el accentColor correcto en NewEventDialog) */}
            {completingTask && ( <TaskCompletionDialog task={completingTask} open={!!completingTask} onClose={() => setCompletingTask(null)} onSuccess={() => { toast.success('Tarea completada con éxito.'); router.refresh(); setCompletingTask(null); }} onError={(msg) => toast.error(`Error: ${msg}`)} /> )}
            {completingMarketingEvent && ( <MarketingTaskCompletionDialog entity={completingMarketingEvent} open={!!completingMarketingEvent} onClose={() => setCompletingMarketingEvent(null)} onSuccess={() => { toast.success('Resultados del evento guardados.'); router.refresh(); setCompletingMarketingEvent(null); }} onError={(msg) => toast.error(`Error: ${msg}`)} /> )}
            {openNewTask && currentUser && ( <NewEventDialog open={openNewTask} onOpenChange={setOpenNewTask} onSuccess={() => { toast.success("Tarea creada"); setOpenNewTask(false); router.refresh(); }} onError={(msg) => toast.error(msg)} accentColor={SANTA_BRISA_COLORS.brand.accent} initialEventData={{ userId: currentUser.id, dept: 'PERSONAL' }} /> )}
        </>
    );
}
