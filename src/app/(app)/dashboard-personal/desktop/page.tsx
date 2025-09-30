
// src/app/(app)/dashboard-personal/desktop/page.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Package, Briefcase, CheckSquare } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { orderToBottles } from '@/lib/sb-core';
import { TaskBoard } from '@/features/agenda/TaskBoard';
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { NewEventDialog } from '@/features/agenda/components/NewEventDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Interaction, InteractionStatus, User as CurrentUserType, SantaData } from '@/domain/ssot';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useQuickNotes } from '@/features/agenda/hooks/useQuickNotes';
import { getStorage } from '@/features/agenda/storage';
import { QuickEditor } from '@/features/agenda/components/QuickEditor';
import { NotesList } from '@/features/agenda/components/NotesList';
import { OutcomeDialog } from '@/features/agenda/components/OutcomeDialog';
import type { Task as AgendaTask } from '@/features/agenda/storage/adapter';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { useFullCalendarStyles } from '@/features/agenda/useFullCalendarStyles';
import { DEPT_META } from '@/domain/ssot';
import { sbAsISO } from '@/features/agenda/helpers';


const SANTA_BRISA_COLORS = { brand: { accent: '#F4C542' } };

// --- COMPONENTES INTERNOS RESTAURADOS AL TEMA CLARO ---

const KpiCard = ({ icon: Icon, title, value, goal, color }: { icon: React.ElementType; title: string; value: number; goal: number; color: string }) => {
    const progress = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    return (
        <motion.div className="bg-white p-4 rounded-lg border border-slate-200" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <div className="flex items-center space-x-3 mb-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <Icon className="text-slate-500" size={20} />
                </div>
                <p className="text-sm text-slate-700 font-medium">{title}</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value} <span className="text-base font-normal text-slate-500">/ {goal}</span></p>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: color }}></div>
            </div>
        </motion.div>
    );
}

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
    const result = [];
    for (let i = 1; i <= now.getDate(); i++) {
        const dayDate = new Date(now.getFullYear(), now.getMonth(), i);
        const dayLabel = dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        result.push({ name: dayLabel, Cajas: salesByDay[dayLabel] || 0 });
    }
    return result;
  }, [data, currentUser]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm h-full">
      <h3 className="font-semibold text-slate-900 mb-4">Evolución de Cajas Vendidas (Mes Actual)</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#6b7280" />
            <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#334155' }} cursor={{ fill: '#f1f5f9' }} />
            <Line type="monotone" dataKey="Cajas" stroke={SANTA_BRISA_COLORS.brand.accent} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MiniCalendarCard() {
  useFullCalendarStyles();
  const { data } = useData();
  const router = useRouter();
  const FullCalendar = useMemo(
    () => dynamic(() => import('@fullcalendar/react'), { ssr: false }),
    []
  );
  const calendarEvents = useMemo(() => {
    const interactions = data?.interactions || [];
    return interactions
      .map(i => {
        const start = sbAsISO(i.plannedFor);
        if (!start) return null;
        const dept = (i.dept as keyof typeof DEPT_META) || 'VENTAS';
        const style = DEPT_META[dept] || DEPT_META.VENTAS;
        return {
          id: i.id,
          title: i.note || String(i.kind || 'Tarea'),
          start,
          allDay: true,
          extendedProps: { dept, status: i.status },
          backgroundColor: i.status === 'done' ? '#e5e7eb' : 'transparent',
          borderColor: i.status === 'done' ? '#9ca3af' : style.color,
          textColor: i.status === 'done' ? '#374151' : style.textColor,
          className: ['sb-event-compact'],
        };
      })
      .filter(Boolean) as any[];
  }, [data?.interactions]);
  const onEventClick = (arg: EventClickArg) => {
    const d = arg.event.start;
    if (!d) return;
    const iso = d.toISOString().slice(0, 10);
    router.push(`/agenda/calendar?d=${iso}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-full flex flex-col">
      <h3 className="font-semibold text-slate-900 mb-3">Calendario</h3>
      <div className="min-h-0 flex-1">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
          events={calendarEvents}
          eventClick={onEventClick}
          height="100%"
          dayMaxEventRows={2}
          locales={[esLocale]}
          locale="es"
          aspectRatio={1.1}
        />
      </div>
    </div>
  );
}

function AgendaDock() {
  const {data} = useData();
  const agenda = useQuickNotes();
  const [outcomeFor, setOutcomeFor] = useState<string|null>(null);
  const openOutcome = (id: string) => setOutcomeFor(id);
  const closeOutcome = () => setOutcomeFor(null);
  const kpis = useMemo(()=> {
    const overdue = agenda.overdue.length;
    const todayOpen = agenda.todayTasks.filter(t=>t.status==='open').length;
    const posToday = agenda.todayTasks.filter(t=> t.kind==='EVENTO_MKT').length;
    return { overdue, todayOpen, posToday };
  }, [agenda.overdue, agenda.todayTasks]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full shadow-sm">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="text-sm font-semibold text-slate-900">Agenda</div>
        <div className="ml-auto text-xs flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={agenda.linkNotes} onChange={e=>agenda.setLinkNotes(e.target.checked)} />
            Vincular notas
          </label>
        </div>
      </div>
      <div className="px-4">
        <QuickEditor onSubmit={agenda.addNote} />
      </div>
      {agenda.overdue.length > 0 && (
        <details open className="px-4 mt-2">
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
      <div className="flex-1 overflow-y-auto px-4 mt-2">
        <NotesList
          notes={agenda.rangedNotes}
          tasks={agenda.todayTasks}
          onPointerDown={agenda.onItemPointerDown}
          onPointerMove={agenda.onItemPointerMove}
          onPointerUp={(id)=>agenda.onItemPointerUp(id, openOutcome)}
        />
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-2 text-sm flex items-center justify-between rounded-b-xl mt-3">
        <div className="text-slate-600">Vencidas</div><div className="font-semibold">{kpis.overdue}</div>
        <div className="text-slate-600">Para hoy</div><div className="font-semibold">{kpis.todayOpen}</div>
        <div className="text-slate-600">POS hoy</div><div className="font-semibold">{kpis.posToday}</div>
      </div>
      <OutcomeDialog
        taskId={outcomeFor}
        tasks={agenda.todayTasks.concat(agenda.overdue)}
        onClose={closeOutcome}
        onConfirm={(task, payload)=>{ agenda.completeTask(task.id); closeOutcome(); }}
      />
    </div>
  );
}

// --- COMPONENTE PRINCIPAL CON EL NUEVO LAYOUT Y TEMA CLARO ---
export default function PersonalDashboardPageDesktop() {
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
            const firstDayOfWeek = now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1);
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
        const myPosTactics = (data.posTactics || []).filter(t => (t as any).createdById === currentUser.id && new Date(t.createdAt) >= startOfRange);
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
        return <div className="p-6 bg-white text-slate-700 min-h-screen">Cargando dashboard...</div>;
    }

    return (
        <>
            <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-[1400px] lg:grid lg:grid-cols-12 lg:gap-6">
                  
                  {/* Columna principal */}
                  <div className="space-y-6 lg:col-span-8">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                         <h1 className="text-3xl font-bold text-slate-900">
                             Mi Dashboard
                         </h1>
                         <div className="flex items-center gap-1 rounded-lg border p-1 bg-slate-100">
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

                     <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                         <KpiCard icon={Users} title="Nuevas Cuentas" value={kpis.newAccounts} goal={10} color={SANTA_BRISA_COLORS.brand.accent} />
                         <KpiCard icon={Package} title="Cajas Vendidas" value={kpis.boxesSold} goal={150} color={SANTA_BRISA_COLORS.brand.accent} />
                         <KpiCard icon={Briefcase} title="Visitas" value={kpis.visits} goal={60} color={SANTA_BRISA_COLORS.brand.accent} />
                         <KpiCard icon={CheckSquare} title="POS Tactics" value={kpis.posTactics} goal={20} color={SANTA_BRISA_COLORS.brand.accent} />
                     </motion.div>

                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
                       <PersonalSalesChart data={data} currentUser={currentUser} />
                     </motion.div>

                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                         <TaskBoard
                             tasks={personalTasks}
                             onTaskStatusChange={handleUpdateStatus}
                             onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
                             onNewTask={() => setOpenNewTask(true)}
                         />
                     </motion.div>
                  </div>
                  
                  {/* Columna Lateral */}
                  <aside className="hidden lg:block lg:col-span-4 sticky top-[76px] h-[calc(100dvh-96px)] space-y-6">
                    <div className="h-1/2">
                      <MiniCalendarCard />
                    </div>
                    <div className="h-1/2">
                      <AgendaDock />
                    </div>
                  </aside>

                </div>
            </main>

            {/* Layout para móvil */}
            <section className="lg:hidden mt-6 pt-6 border-t space-y-6">
              <div className="px-6">
                <h3 className="font-semibold text-slate-900 mb-3">Calendario</h3>
                <MiniCalendarCard />
              </div>
              <div className="px-6">
                <h3 className="font-semibold text-slate-900 mb-3">Mi Agenda</h3>
                <AgendaDock />
              </div>
            </section>

            {/* --- DIÁLOGOS MODALES (Sin cambios) --- */}
            {completingTask && ( <TaskCompletionDialog task={completingTask} open={!!completingTask} onClose={() => setCompletingTask(null)} onSuccess={() => { toast.success('Tarea completada con éxito.'); router.refresh(); setCompletingTask(null); }} onError={(msg) => toast.error(`Error: ${msg}`)} /> )}
            {completingMarketingEvent && ( <MarketingTaskCompletionDialog entity={completingMarketingEvent} open={!!completingMarketingEvent} onClose={() => setCompletingMarketingEvent(null)} onSuccess={() => { toast.success('Resultados del evento guardados.'); router.refresh(); setCompletingMarketingEvent(null); }} onError={(msg) => toast.error(`Error: ${msg}`)} /> )}
            {openNewTask && currentUser && ( <NewEventDialog open={openNewTask} onOpenChange={setOpenNewTask} onSuccess={() => { toast.success("Tarea creada"); setOpenNewTask(false); router.refresh(); }} onError={(msg) => toast.error(msg)} accentColor={SANTA_BRISA_COLORS.brand.accent} initialEventData={{ userId: currentUser.id, dept: 'PERSONAL' }} /> )}
        </>
    );
}
