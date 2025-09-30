// src/app/(app)/dashboard-personal/mobile/page.tsx
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
import type { Interaction, InteractionStatus, User as CurrentUserType, SantaData, Note } from '@/domain/ssot';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useQuickNotes } from '@/features/agenda/hooks/useQuickNotes';
import { QuickEditor } from '@/features/agenda/components/QuickEditor';
import { NotesList } from '@/features/agenda/components/NotesList';
import { OutcomeDialog } from '@/features/agenda/components/OutcomeDialog';

import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { useFullCalendarStyles } from '@/features/agenda/useFullCalendarStyles';
import { DEPT_META } from '@/domain/ssot';
import { sbAsISO } from '@/features/agenda/helpers';


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
  
  const onConfirm = (task: Interaction, payload: Record<string,any>) => {
      console.log("Confirming outcome for task", task, "with payload", payload);
      agenda.completeTask(task.id);
      closeOutcome();
    };

    const overdueTasks = useMemo(() => mapInteractionsToTasks(agenda.overdue, agenda.accounts), [agenda.overdue, agenda.accounts]);
    const todayTasksMapped = useMemo(() => mapInteractionsToTasks(agenda.todayTasks, agenda.accounts), [agenda.todayTasks, agenda.accounts]);
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl lg:rounded-none lg:border-0 lg:bg-transparent flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 lg:px-0">
        <div className="text-sm font-semibold text-slate-900">Agenda</div>
        <div className="ml-auto text-xs flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={agenda.linkNotes} onChange={e=>agenda.setLinkNotes(e.target.checked)} />
            Vincular notas
          </label>
        </div>
      </div>

      <div className="px-4 lg:px-0">
        <QuickEditor onSubmit={agenda.addNote} />
      </div>

      {agenda.overdue.length>0 && (
        <details open className="px-4 lg:px-0">
          <summary className="text-xs text-slate-600 py-1">Pendientes de ayer ({agenda.overdue.length})</summary>
          <NotesList
            notes={agenda.rangedNotes as Note[]}
            tasks={overdueTasks}
            onPointerDown={agenda.onItemPointerDown}
            onPointerMove={agenda.onItemPointerMove}
            onPointerUp={(id)=>agenda.onItemPointerUp(id, openOutcome)}
          />
        </details>
      )}

      <div className="flex-1 overflow-y-auto px-4 lg:px-0">
        <NotesList
          notes={agenda.rangedNotes as Note[]}
          tasks={todayTasksMapped}
          onPointerDown={agenda.onItemPointerDown}
          onPointerMove={agenda.onItemPointerMove