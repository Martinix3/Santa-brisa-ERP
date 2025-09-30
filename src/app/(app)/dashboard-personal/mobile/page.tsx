// src/app/(app)/dashboard-personal/mobile/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useData } from '@/lib/dataprovider';
import { useQuickNotes } from '@/features/agenda/hooks/useQuickNotes';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import type { Note, Interaction, Task } from '@/domain/ssot';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { DEPT_META } from '@/domain/ssot';

// ===================== Componentes UI Refactorizados =====================

const Header = ({ view, setView, linkNotes, setLinkNotes, currentDate, setCurrentDate }: {
    view: string;
    setView: (v: string) => void;
    linkNotes: boolean;
    setLinkNotes: (b: boolean) => void;
    currentDate: Date;
    setCurrentDate: (d: Date) => void;
}) => {
    const changeDate = (amount: number) => {
        const newDate = new Date(currentDate);
        if (view === 'Mes') newDate.setMonth(newDate.getMonth() + amount);
        else if (view === 'Semana') newDate.setDate(newDate.getDate() + (amount * 7));
        else newDate.setDate(newDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    return (
        <div className="bg-white px-4 pt-12 pb-2 sticky top-0 z-20 border-b border-zinc-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-zinc-900">Agenda</h1>
                    <div className="w-2 h-2 rounded-full bg-yellow-400" title="Online"></div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-zinc-900">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                    <div className="flex items-center gap-1">
                         <button onClick={() => changeDate(-1)} className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500"><ChevronLeft size={20} /></button>
                         <button onClick={() => changeDate(1)} className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {['Día', 'Semana', 'Mes'].map(v => (
                        <button key={v} onClick={() => setView(v)} className={`px-3 py-2 text-sm font-medium transition-colors ${view === v ? 'text-zinc-900 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            {v}
                        </button>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={linkNotes} onChange={e => setLinkNotes(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-yellow-400 focus:ring-yellow-400"/>
                    Vincular notas
                </label>
            </div>
        </div>
    );
};

const DayView = ({ tasks, currentDate }: { tasks: Task[], currentDate: Date }) => (
    <div className="p-4 bg-zinc-50 border-b border-zinc-200">
         <h3 className="text-base font-semibold mb-2">Eventos - {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}</h3>
         <div className="space-y-2">
            {tasks.length > 0 ? tasks.map(event => (
                <div key={event.id} className="p-2 rounded-md" style={{ borderLeft: `3px solid ${DEPT_META[event.type]?.color || 'gray'}` }}>
                    <p className="text-sm font-medium text-zinc-900">{event.title}</p>
                    <p className="text-xs text-zinc-500">{event.date ? new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
            )) : <p className="text-sm text-zinc-500">No hay eventos para este día.</p>}
         </div>
    </div>
);

const MonthView = ({ currentDate, tasks, onDateClick }: { currentDate: Date, tasks: Task[], onDateClick: (d: Date) => void }) => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : new Date(year, month, i - firstDay + 1));
    const colorMap: Record<string, string> = { 'VENTAS': '#B25A32', 'MARKETING': '#77D9CF', 'PRODUCCION': '#F26D3D' };

    return (
         <div className="p-4 bg-zinc-50 border-b border-zinc-200">
            <div className="grid grid-cols-7 text-center text-xs text-zinc-500 font-semibold mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {days.map((day, index) => (
                    <button key={index} onClick={() => day && onDateClick(day)} disabled={!day} className="h-12 flex flex-col items-center justify-start p-1 rounded-lg hover:bg-gray-200/50 disabled:hover:bg-transparent">
                        {day && (
                            <>
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${day.toDateString() === today.toDateString() ? 'bg-yellow-400 text-black font-bold' : ''}`}>{day.getDate()}</span>
                                <div className="flex gap-1 mt-1">
                                    {tasks.filter(t => t.date && new Date(t.date).toDateString() === day.toDateString()).slice(0, 3).map(t => (
                                        <div key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DEPT_META[t.type]?.color || 'var(--text-muted)' }}></div>
                                    ))}
                                </div>
                            </>
                        )}
                    </button>
                ))}
            </div>
         </div>
    );
};

const WeekView = ({ currentDate, tasks }: { currentDate: Date, tasks: Task[] }) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - (currentDate.getDay() + 6) % 7);
    const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
    return (
         <div className="p-4 bg-zinc-50 border-b border-zinc-200">
            <div className="grid grid-cols-7 text-center text-xs text-zinc-500 font-semibold mb-2">
                {weekDays.map(d => <div key={d.toISOString()} className="flex flex-col items-center"><span className="font-normal">{d.toLocaleDateString('es-ES', { weekday: 'short' })[0].toUpperCase()}</span><span>{d.getDate()}</span></div>)}
            </div>
            <div className="mt-2 text-center text-sm text-zinc-500">Vista semanal en desarrollo.</div>
         </div>
    );
};

const CalendarView = ({ tasks, view, currentDate, onDateClick }: { tasks: Task[], view: string, currentDate: Date, onDateClick: (d: Date) => void }) => {
    const filteredTasks = tasks.filter(t => t.date && new Date(t.date).toDateString() === currentDate.toDateString() && t.kind !== 'NOTA');
    if (view === 'Mes') return <MonthView tasks={tasks} currentDate={currentDate} onDateClick={onDateClick} />;
    if (view === 'Semana') return <WeekView tasks={tasks} currentDate={currentDate} />;
    return <DayView tasks={filteredTasks} currentDate={currentDate} />;
};

const TaskItem = ({ task, onSwipe, onLongPress }: { task: Note, onSwipe: (id: string) => void, onLongPress: (id: string) => void }) => {
    const ref = useRef<HTMLLIElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<number | null>(null);

    useEffect(() => {
        const el = ref.current; const bgEl = bgRef.current; if (!el || !bgEl) return;
        let startX = 0, currentX = 0, isDragging = false; const threshold = 80;

        const clearLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
        
        const onPointerDown = (e: PointerEvent) => {
            isDragging = true; startX = e.clientX;
            el.style.transition = 'none'; bgEl.style.transition = 'none'; el.setPointerCapture(e.pointerId);
            clearLongPress();
            longPressTimer.current = window.setTimeout(() => {
                onLongPress(task.id);
                if (navigator.vibrate) navigator.vibrate(50);
                isDragging = false;
            }, 500);
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!isDragging) return;
            currentX = e.clientX - startX;
            if (Math.abs(currentX) > 10) clearLongPress();
            el.style.transform = `translateX(${currentX}px)`;
            bgEl.style.backgroundColor = currentX > 0 ? '#E6F4EA' : '#FEF3F2';
            bgEl.style.opacity = String(Math.min(Math.abs(currentX) / threshold, 1));
        };
        const onPointerUp = (e: PointerEvent) => {
            clearLongPress(); if (!isDragging) return;
            isDragging = false; el.releasePointerCapture(e.pointerId);
            el.style.transition = 'transform 0.3s ease'; bgEl.style.transition = 'opacity 0.3s ease';
            if (Math.abs(currentX) > threshold) { onSwipe(task.id); } 
            else { el.style.transform = `translateX(0px)`; bgEl.style.opacity = '0'; }
            currentX = 0;
        };

        el.addEventListener('pointerdown', onPointerDown); el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp); el.addEventListener('pointercancel', onPointerUp);
        return () => {
            el.removeEventListener('pointerdown', onPointerDown); el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp); el.removeEventListener('pointercancel', onPointerUp);
            clearLongPress();
        };
    }, [task.id, onSwipe, onLongPress]);

    return (
        <li ref={ref} className="relative">
            <div ref={bgRef} className="absolute inset-0 opacity-0"></div>
            <div className={`relative p-3 transition-colors`}>
                <p className={`text-sm`}>{task.text}</p>
            </div>
        </li>
    );
};

const KpiFooter = ({ tasks }: { tasks: Interaction[] }) => {
    const kpis = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const vencidas = tasks.filter(t => t.status==='open' && t.plannedFor && new Date(t.plannedFor) < now && new Date(t.plannedFor).getTime() !== todayStart).length;
        const paraHoy = tasks.filter(t => t.status==='open' && t.plannedFor && new Date(t.plannedFor).toDateString() === now.toDateString()).length;
        const posActivos = tasks.filter(t => t.status==='done' && t.kind === 'EVENTO_MKT').length;
        const cuentasAbiertas = new Set(tasks.filter(t => t.status==='open' && t.accountId).map(t => t.accountId)).size;
        return { vencidas, paraHoy, posActivos, cuentasAbiertas };
    }, [tasks]);
    
    const KpiWidget = ({ value, label }: { value: string | number, label: string }) => (
        <div className="text-center"><p className="text-base font-semibold text-zinc-900">{value}</p><p className="text-xs text-zinc-500">{label}</p></div>
    );

    return (
        <div className="bg-white grid grid-cols-4 gap-4 p-4 border-t border-zinc-200 h-[64px]">
            <KpiWidget value={kpis.cuentasAbiertas} label="Cuentas" />
            <KpiWidget value={`${kpis.vencidas} / ${kpis.paraHoy}`} label="Tareas" />
            <KpiWidget value={kpis.posActivos} label="POS" />
            <KpiWidget value="Ver" label="Accounts" />
        </div>
    );
};

export default function PersonalDashboardPageMobile() {
    const agenda = useQuickNotes();
    const { data } = useData();
    const [view, setView] = useState('Mes');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showSavePulse, setShowSavePulse] = useState(false);
    const [draftText, setDraftText] = useState('');
    
    const overdueTasks = useMemo(() => mapInteractionsToTasks(agenda.overdue, data?.accounts), [agenda.overdue, data?.accounts]);
    const todayTasksMapped = useMemo(() => mapInteractionsToTasks(agenda.todayTasks, data?.accounts), [agenda.todayTasks, data?.accounts]);
    const allTasksMapped = useMemo(() => mapInteractionsToTasks(agenda.tasks, data?.accounts), [agenda.tasks, data?.accounts]);

    const submitTask = useCallback(() => {
        if (!draftText.trim()) return;
        agenda.addNote(draftText);
        setDraftText('');
        setShowSavePulse(true);
        setTimeout(() => setShowSavePulse(false), 600);
    }, [draftText, agenda]);

    const handleDateClick = (date: Date) => {
        setCurrentDate(date);
        setView('Día');
    };

    return (
        <div className="h-full bg-white text-zinc-900 flex flex-col">
            <Header view={view} setView={setView} linkNotes={agenda.linkNotes} setLinkNotes={agenda.setLinkNotes} currentDate={currentDate} setCurrentDate={setCurrentDate} />
            
            <div className="flex-1 overflow-y-auto">
                 <CalendarView tasks={allTasksMapped} view={view} currentDate={currentDate} onDateClick={handleDateClick} />
                 
                 {agenda.linkNotes && (
                     <div className="bg-zinc-50">
                        <div className="bg-white rounded-t-2xl pt-4">
                            {overdueTasks.length > 0 && (
                               <details className="px-4" open>
                                  <summary className="py-2 text-sm font-medium text-zinc-500 cursor-pointer list-none">Pendientes de ayer ({overdueTasks.length})</summary>
                                  <div className="border-l-2 border-gray-300 ml-1">
                                    <ul className="pl-3">
                                      {overdueTasks.map(task => <li key={task.id}>{task.title}</li>)}
                                    </ul>
                                  </div>
                               </details>
                            )}
                            <div className="px-4 pb-4">
                              <h3 className="text-base font-semibold mt-4 mb-2">Notas diarias</h3>
                              <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
                                <li className="relative">
                                    <textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={1} placeholder="Escribe una nota..." className="w-full bg-transparent p-3 pr-12 text-sm resize-none outline-none" onKeyDown={(e) => {if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); submitTask();}}}/>
                                    <button onClick={submitTask} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-yellow-400 flex items-center justify-center hover:opacity-90">
                                       <div className="relative w-full h-full flex items-center justify-center">
                                         <Plus />
                                         {showSavePulse && <div className="absolute inset-0 rounded-full bg-black/80 animate-pulse-once"></div>}
                                       </div>
                                    </button>
                                </li>
                                {agenda.rangedNotes.map(task => <TaskItem key={task.id} task={task} onSwipe={() => {}} onLongPress={() => {}} />)}
                              </ul>
                            </div>
                        </div>
                     </div>
                 )}
            </div>
            
            <KpiFooter tasks={agenda.tasks} />
        </div>
    );
}
