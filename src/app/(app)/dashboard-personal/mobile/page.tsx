// src/app/(app)/dashboard-personal/mobile/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { useData } from '@/lib/dataprovider';
import { mapInteractionsToTasks } from '@/features/agenda/mappers';
import { useQuickNotes } from '@/features/agenda/hooks/useQuickNotes';
import type { Interaction, TaskKind, Department, Note, Task } from '@/domain/ssot';
import { DEPT_META } from '@/domain/ssot';
import { Moon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';


// ===================== LocalStorage seguro & Parser =====================
const parseNote = (text: string, userRole = 'ventas') => {
    const RE_ACCOUNT = /@([^\n@#]+?)(?=\s|$|,|\.|;)/i; const RE_TIME = /\b(\d{1,2}):(\d{2})\b/; const RE_DATE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/; const RE_TOMORROW = /\b(mañana|tomorrow)\b/i; const RE_QTY = /\b(\d{1,4})\s*(cajas?|bx|cs)\b/i; const RE_PRODUCT = /\b(santa\s*brisa|sb)\b/i; const RE_POS_EVT = /\b(pos|evento|activaci[oó]n|degustaci[oó]n|flyers|promo|rrss|campaña)\b/i; const RE_POS_PLV = /\b(plv|vasos|cartel)\b/i; 
    const KEYWORDS_DEPT: Record<string, string[]> = { marketing: ["evento", "promo", "flyers", "degustación", "rrss", "campaña"], ventas: ["pedido", "cajas", "visita"], almacen: ["inventario", "picking", "stock"], produccion: ["etiquetar", "lote", "maquila"] };
    const account = (text.match(RE_ACCOUNT)?.[1] || '').trim() || null; const qty = text.match(RE_QTY)?.[1]; let kind: TaskKind = 'NOTA'; let details = {}; let dueDate = null;
    if (account && qty && RE_PRODUCT.test(text)) { kind = 'PEDIDO'; details = { qtyCases: parseInt(qty, 10), product: 'Santa Brisa' }; } else if (RE_POS_PLV.test(text)) { kind = 'POS_PLV'; } else if (RE_POS_EVT.test(text)) { kind = 'POS_EVT'; } else if (account && (RE_TOMORROW.test(text) || RE_DATE.test(text) || RE_TIME.test(text))) { kind = 'VISITA'; }
    if (RE_TOMORROW.test(text) || RE_DATE.test(text) || RE_TIME.test(text)) { const now = new Date(); let d = new Date(now); if (RE_TOMORROW.test(text)) d.setDate(now.getDate() + 1); const md = text.match(RE_DATE); if (md) { const day = +md[1]; const mon = +md[2] - 1; const year = md[3] ? +md[3].padStart(2, '20') : now.getFullYear(); d = new Date(year, mon, day); } const mt = text.match(RE_TIME); d.setHours(mt ? +mt[1] : 10, mt ? +mt[2] : 0, 0, 0); dueDate = d.toISOString(); }
    let department: Department | null = null; for (const dept in KEYWORDS_DEPT) { if (KEYWORDS_DEPT[dept].some(kw => text.toLowerCase().includes(kw))) { department = dept as Department; break; } }
    if (!department) department = 'VENTAS';
    return { kind, account, details, dueDate, department };
}

// ===================== Componentes UI =====================
const Header = ({ view, setView, linkNotes, setLinkNotes, currentDate, setCurrentDate }: { view: string, setView: Dispatch<SetStateAction<string>>, linkNotes: boolean, setLinkNotes: Dispatch<SetStateAction<boolean>>, currentDate: Date, setCurrentDate: Dispatch<SetStateAction<Date>>}) => {
    const changeDate = (amount: number) => {
        const newDate = new Date(currentDate);
        if(view === 'Mes') newDate.setMonth(newDate.getMonth() + amount);
        else if (view === 'Semana') newDate.setDate(newDate.getDate() + (amount * 7));
        else newDate.setDate(newDate.getDate() + amount);
        setCurrentDate(newDate);
    };

    return (
    <div className="bg-background px-4 pt-12 pb-2 sticky top-0 z-20 border-b border-border">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text-primary">Agenda</h1>
                <div className="w-2 h-2 rounded-full bg-accent" title="Online"></div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-text-primary">
                   {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </span>
                <div className="flex items-center gap-1">
                     <button onClick={() => changeDate(-1)} className="p-1 rounded-md hover:bg-secondary text-text-muted"><ChevronLeft /></button>
                     <button onClick={() => changeDate(1)} className="p-1 rounded-md hover:bg-secondary text-text-muted"><ChevronRight /></button>
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                {['Día', 'Semana', 'Mes'].map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-3 py-2 text-sm font-medium transition-colors ${view === v ? 'text-text-primary border-b-2 border-accent' : 'text-text-muted hover:text-text-secondary'}`}>
                        {v}
                    </button>
                ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={linkNotes} onChange={e => setLinkNotes(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent sb-checkbox"/>
                Vincular notas
            </label>
        </div>
    </div>
)};

type MappedTask = Task & { completed?: boolean; date?: string; text?: string; kind?: TaskKind; account?: string; department: Department };

const DayView = ({ tasks, currentDate }: { tasks: MappedTask[], currentDate: Date }) => (
    <div className="p-4 bg-secondary border-b border-border">
         <h3 className="text-base font-semibold mb-2">Eventos - {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}</h3>
         <div className="space-y-2">
            {tasks.length > 0 ? tasks.map(event => (
                <div key={event.id} className="p-2 rounded-md" style={{ borderLeft: `3px solid ${DEPT_META[event.department]?.color || 'gray'}` }}>
                    <p className="text-sm font-medium text-text-primary">{event.title}</p>
                    <p className="text-xs text-text-muted">{event.date ? new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
            )) : <p className="text-sm text-text-muted">No hay eventos para este día.</p>}
         </div>
    </div>
);

const MonthView = ({ currentDate, tasks, onDateClick }: { currentDate: Date, tasks: MappedTask[], onDateClick: (d: Date) => void }) => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : new Date(year, month, i - firstDay + 1));

    return (
         <div className="p-4 bg-secondary border-b border-border">
            <div className="grid grid-cols-7 text-center text-xs text-text-muted font-semibold mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {days.map((day, index) => (
                    <button key={index} onClick={() => day && onDateClick(day)} disabled={!day} className="h-12 flex flex-col items-center justify-start p-1 rounded-lg hover:bg-gray-200/50 disabled:hover:bg-transparent">
                        {day && (
                            <>
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${day.toDateString() === today.toDateString() ? 'bg-accent text-black font-bold' : ''}`}>{day.getDate()}</span>
                                <div className="flex gap-1 mt-1">
                                    {tasks.filter(t => t.date && new Date(t.date).toDateString() === day.toDateString()).slice(0, 3).map(t => (
                                        <div key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DEPT_META[t.department as Department]?.color || 'var(--text-muted)' }}></div>
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

const WeekView = ({ currentDate, tasks }: { currentDate: Date, tasks: MappedTask[] }) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - (currentDate.getDay() + 6) % 7);
    const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
    return (
         <div className="p-4 bg-secondary border-b border-border">
            <div className="grid grid-cols-7 text-center text-xs text-text-muted font-semibold mb-2">
                {weekDays.map(d => <div key={d.toISOString()} className="flex flex-col items-center"><span className="font-normal">{d.toLocaleDateString('es-ES', { weekday: 'short' })[0].toUpperCase()}</span><span>{d.getDate()}</span></div>)}
            </div>
            <div className="mt-2 text-center text-sm text-text-muted">Vista semanal en desarrollo.</div>
         </div>
    );
};

const CalendarView = ({ tasks, view, currentDate, onDateClick }: { tasks: MappedTask[], view: string, currentDate: Date, onDateClick: (d: Date) => void }) => {
    const filteredTasks = tasks.filter(t => t.date && new Date(t.date).toDateString() === currentDate.toDateString());
    if (view === 'Mes') return <MonthView tasks={tasks} currentDate={currentDate} onDateClick={onDateClick} />;
    if (view === 'Semana') return <WeekView tasks={tasks} currentDate={currentDate} />;
    return <DayView tasks={filteredTasks} currentDate={currentDate} />;
};

const TaskItem = ({ task, onSwipe, onLongPress }: { task: MappedTask, onSwipe: (id: string) => void, onLongPress: (id: string) => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const el = ref.current; const bgEl = bgRef.current; if (!el || !bgEl) return;
        let startX = 0, currentX = 0, isDragging = false; const threshold = 80;

        const clearLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
        
        const onPointerDown = (e: PointerEvent) => {
            isDragging = true; startX = e.clientX;
            el.style.transition = 'none'; bgEl.style.transition = 'none'; el.setPointerCapture(e.pointerId);
            clearLongPress();
            longPressTimer.current = setTimeout(() => {
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
            bgEl.style.backgroundColor = currentX > 0 ? 'var(--feedback-green-bg)' : 'var(--feedback-red-bg)';
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

    const done = task.status==='done';

    return (
        <li className="relative">
            <div ref={bgRef} className="absolute inset-0 opacity-0"></div>
            <div ref={ref} className={`relative p-3 transition-colors ${done ? 'text-text-muted' : 'text-text-secondary'}`}>
                <p className={`text-sm ${done ? 'line-through' : ''}`}>{task.title}</p>
            </div>
        </li>
    );
};

const OverdueTasks = ({ tasks, onSwipe, onLongPress }: { tasks: MappedTask[], onSwipe: (id: string) => void, onLongPress: (id: string) => void }) => (
    <details className="px-4" open>
        <summary className="py-2 text-sm font-medium text-text-muted cursor-pointer list-none">Pendientes de ayer ({tasks.length})</summary>
        <div className="border-l-2 border-gray-300 ml-1">
            <ul className="pl-3">
                {tasks.map(task => <TaskItem key={task.id} task={task} onSwipe={onSwipe} onLongPress={onLongPress} />)}
            </ul>
        </div>
    </details>
);

const FooterDialog = ({ task, activationType, onComplete, onClose }: { task: Interaction, activationType: string, onComplete: (task: Interaction, data: any) => void, onClose: () => void }) => {
    if (!task) return null;
    const [responseText, setResponseText] = useState('');
    
    const handleComplete = () => { onComplete(task, { responseText }); onClose(); };

    const renderContent = () => {
         switch(task.kind) {
            case 'LLAMADA': return <div><h3 className="text-base font-semibold">Confirmar Pedido</h3><p className="mt-1 text-sm text-text-secondary">Se guardará el pedido para @{task.accountId}.</p></div>;
            case 'VISITA': return <div><h3 className="text-base font-semibold">¿Cómo fue la visita?</h3><textarea value={responseText} onChange={e => setResponseText(e.target.value)} className="w-full mt-4 p-2 border border-border rounded-md" placeholder="Añadir nota de la visita..."></textarea></div>;
            default: return <div><h3 className="text-base font-semibold">Confirmar Tarea</h3><p className="mt-1 text-sm text-text-secondary">¿Marcar esta nota como completada?</p></div>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
            <div className="bg-background w-full rounded-t-lg border-t border-border shadow-xl" onClick={e => e.stopPropagation()}>
               <div className="animate-slide-up-fade">
                  <div className="w-8 h-1 bg-border rounded-full mx-auto mt-2"></div>
                  <div className="p-4">{renderContent()}</div>
                  <div className="p-4 border-t border-border">
                      <ul className="space-y-1">
                          {activationType === 'long-press' && (
                              <>
                                  <li><button className="w-full text-left p-3 rounded-lg hover:bg-secondary text-text-primary font-medium">📷 Adjuntar</button></li>
                                  <li><button className="w-full text-left p-3 rounded-lg hover:bg-secondary text-text-primary font-medium">✨ Enriquecer</button></li>
                                  <li><button className="w-full text-left p-3 rounded-lg hover:bg-secondary text-text-primary font-medium">ℹ️ Ver detalle</button></li>
                              </>
                          )}
                          <li className={activationType === 'long-press' ? '!mt-3' : ''}>
                              <button onClick={handleComplete} className="w-full p-3 rounded-lg bg-accent text-text-primary font-semibold text-center">Completar Tarea</button>
                          </li>
                      </ul>
                  </div>
               </div>
            </div>
        </div>
    );
};

const KpiFooter = ({ tasks }: { tasks: Interaction[] }) => {
    const kpis = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const vencidas = tasks.filter(t => t.status !== 'done' && t.plannedFor && new Date(t.plannedFor).getTime() < todayStart).length;
        const paraHoy = tasks.filter(t => t.status !== 'done' && t.plannedFor && new Date(t.plannedFor).toDateString() === now.toDateString()).length;
        const posActivos = tasks.filter(t => t.status === 'done' && t.kind === 'EVENTO_MKT').length;
        const cuentasAbiertas = new Set(tasks.filter(t => t.status !== 'done' && t.accountId).map(t => t.accountId)).size;
        return { vencidas, paraHoy, posActivos, cuentasAbiertas };
    }, [tasks]);
    
    const KpiWidget = ({ value, label }: { value: string|number, label: string}) => (
        <div className="text-center"><p className="text-base font-semibold text-text-primary">{value}</p><p className="text-xs text-text-muted">{label}</p></div>
    );

    return (
        <div className="bg-background grid grid-cols-4 gap-4 p-4 border-t border-border h-[64px]">
            <KpiWidget value={kpis.cuentasAbiertas} label="Cuentas" />
            <KpiWidget value={`${kpis.vencidas} / ${kpis.paraHoy}`} label="Tareas" />
            <KpiWidget value={kpis.posActivos} label="POS" />
            <KpiWidget value="Ver" label="Accounts" />
        </div>
    );
};

// ===================== Componente Principal =====================
function QuickNoteApp() {
    const { data: santaData } = useData();
    const agenda = useQuickNotes();
    const [draftText, setDraftText] = useState('');
    const [activeTask, setActiveTask] = useState<Interaction | null>(null);
    const [activationType, setActivationType] = useState<string | null>(null);
    const [view, setView] = useState('Mes');
    const [linkNotes, setLinkNotes] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showSavePulse, setShowSavePulse] = useState(false);
    
    const accounts = useMemo(() => santaData?.accounts || [], [santaData?.accounts]);
    const allTasksMapped = useMemo(() => mapInteractionsToTasks(agenda.tasks, accounts), [agenda.tasks, accounts]);
    const overdueTasks = useMemo(() => mapInteractionsToTasks(agenda.overdue, accounts), [agenda.overdue, accounts]);
    const todayTasksMapped = useMemo(() => mapInteractionsToTasks(agenda.todayTasks, accounts), [agenda.todayTasks, accounts]);
    const rangedNotes = useMemo(() => agenda.rangedNotes, [agenda.rangedNotes]);


    const submitTask = useCallback(() => {
        if (!draftText.trim()) return;
        agenda.addNote(draftText);
        setDraftText('');
    }, [draftText, agenda]);

    const handleDateClick = (date: Date) => {
        setCurrentDate(date);
        setView('Día');
    };
    
    const handleSwipe = (taskId: string) => { const task = agenda.tasks.find(t => t.id === taskId); if(task) { setActiveTask(task); setActivationType('swipe'); }};
    const handleLongPress = (taskId: string) => { const task = agenda.tasks.find(t => t.id === taskId); if(task) { setActiveTask(task); setActivationType('long-press'); }};
    const handleComplete = (task: Interaction, data: any) => { 
        console.log("Completando tarea con datos:", data);
        agenda.completeTask(task.id); 
        setActiveTask(null); 
    };

    return (
        <div className="h-full bg-background text-text-primary flex flex-col">
            <Header view={view} setView={setView as any} linkNotes={linkNotes} setLinkNotes={setLinkNotes as any} currentDate={currentDate} setCurrentDate={setCurrentDate as any} />
            
            <div className="flex-1 overflow-y-auto">
                 <CalendarView tasks={allTasksMapped} view={view} currentDate={currentDate} onDateClick={handleDateClick} />
                 
                 {linkNotes && (
                     <div className="bg-secondary">
                        <div className="bg-background rounded-t-2xl pt-4">
                            {overdueTasks.length > 0 && <OverdueTasks tasks={overdueTasks} onSwipe={handleSwipe} onLongPress={handleLongPress} />}
                            <div className="px-4 pb-4">
                              <h3 className="text-base font-semibold mt-4 mb-2">Notas diarias</h3>
                              <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                                <li className="relative">
                                    <textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={1} placeholder="Escribe una nota..." className="w-full bg-transparent p-3 pr-12 text-sm resize-none outline-none" onKeyDown={(e) => {if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); submitTask();}}}/>
                                    <button onClick={submitTask} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-accent flex items-center justify-center hover:opacity-90">
                                       <div className="relative w-full h-full flex items-center justify-center">
                                         <Plus/>
                                         {showSavePulse && <div className="absolute inset-0 rounded-full bg-black/80 animate-pulse-once"></div>}
                                       </div>
                                    </button>
                                </li>
                                {rangedNotes.map(note => {
                                    const task = todayTasksMapped.find(t => t.id === (note as any).taskId);
                                    return <TaskItem key={note.id} task={task || {id: note.id, title: note.text} as MappedTask} onSwipe={handleSwipe} onLongPress={handleLongPress} />
                                })}
                              </ul>
                            </div>
                        </div>
                     </div>
                 )}
            </div>
            
            <KpiFooter tasks={agenda.tasks} />
            
            {activeTask && <FooterDialog task={activeTask} activationType={activationType as string} onComplete={handleComplete} onClose={() => setActiveTask(null)} />}
        </div>
    );
}

export default QuickNoteApp;
