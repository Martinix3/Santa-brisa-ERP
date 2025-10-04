
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, isToday, startOfToday, addDays, isWithinInterval } from "date-fns";
import { es as esLocale } from "date-fns/locale";

// FullCalendar & Draggable Interaction
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { Draggable, type DropArg } from "@fullcalendar/interaction";
import type { EventApi } from "@fullcalendar/core";

// Icons & Utils
import { PlusCircle, GripVertical, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// App-specific imports
import { useData } from "@/lib/dataprovider";
import type { Interaction, SantaData, Department, User, Account, InteractionStatus } from '@/domain/ssot';
import { sbAsISO } from "@/features/agenda/helpers";
import { DEPT_META } from "@/domain/ssot";
import { createInteraction } from '@/app/(app)/agenda/actions';
import { createAccount } from '@/app/(app)/accounts/actions';

// UI Components
import { SBButton, SBDialog, SBDialogContent } from '@/components/ui';
import { Avatar } from "@/components/ui/Avatar";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import type { Task } from "@/features/agenda/TaskBoard";

// --- TYPES ---
type ViewType = "day" | "week" | "month";
type ModalState =
  | { type: "none" }
  | { type: "new"; initialDate?: string }
  | { type: "edit"; data: Interaction };

// --- DIALOG COMPONENT ---
function EventDialog({ open, onOpenChange, onSuccess, initialState }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialState: ModalState;
}) {
    const { currentUser, data: santaData } = useData();
    const isEditing = initialState.type === 'edit';
    const initialEventData = isEditing ? initialState.data : null;

    const [notes, setNotes] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [type, setType] = useState<Department>('VENTAS');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (open) {
            setIsSaving(false);
            if (isEditing && initialEventData) {
                const planned = initialEventData.plannedFor ? new Date(sbAsISO(initialEventData.plannedFor)!) : null;
                setNotes(initialEventData.note || '');
                setDateTime(planned ? planned.toISOString().slice(0, 16) : '');
                setType(initialEventData.dept || 'VENTAS');
                setInvolvedUserIds(initialEventData.involvedUserIds || []);
            } else if (initialState.type === 'new') {
                const initialDate = initialState.initialDate ? new Date(initialState.initialDate) : new Date();
                setNotes('');
                setDateTime(initialDate.toISOString().slice(0, 16));
                setType('VENTAS');
                setInvolvedUserIds(currentUser ? [currentUser.id] : []);
            }
        }
    }, [initialState, open, currentUser, isEditing, initialEventData]);

    const handleUserToggle = (userId: string) => {
        setInvolvedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notes) {
            toast.error('La descripción es obligatoria.');
            return;
        }
        setIsSaving(true);
        try {
            if (!currentUser?.id) throw new Error("No hay usuario logueado.");
            
            const saveData = {
                accountId: 'acc_1', // Placeholder, needs real account selection logic
                dept: type, 
                kind: 'OTRO',
                plannedFor: dateTime || undefined,
                note: notes,
                createdById: currentUser.id,
                involvedUserIds: involvedUserIds,
            };

            await createInteraction(saveData);
            onSuccess();

        } catch (error: any) {
            toast.error(error.message || "Error al guardar la tarea.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const dialogTitle = isEditing ? "Editar Tarea" : "Crear Nueva Tarea";

    return (
        <SBDialog open={open} onOpenChange={onOpenChange}>
             <SBDialogContent
                title={dialogTitle}
                description="Añade una entrada en tu calendario y asigna responsables."
                onSubmit={handleSubmit}
                primaryAction={{ label: isSaving ? 'Guardando...' : 'Guardar', type: 'submit', disabled: isSaving }}
                secondaryAction={{ label: 'Cancelar', onClick: () => onOpenChange(false), disabled: isSaving }}
             >
                <div className="space-y-4 pt-2">
                    <div className="grid gap-1.5">
                        <label htmlFor="event-notes" className="text-sm font-medium text-zinc-700">Descripción</label>
                        <textarea id="event-notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Llamar para seguimiento..." className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} required />
                    </div>
                    <div className="grid gap-1.5">
                        <label htmlFor="event-date" className="text-sm font-medium text-zinc-700">Fecha y Hora</label>
                        <input id="event-date" name="date" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    </div>
                     <div className="grid gap-1.5">
                       <label className="text-sm font-medium text-zinc-700">Departamento</label>
                       <div className="flex flex-wrap gap-2">
                           {Object.entries(DEPT_META).map(([key, meta]) => (
                               <button type="button" key={key} onClick={() => setType(key as Department)}
                                   className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-150 border-2 ${
                                       type === key 
                                       ? 'text-white' 
                                       : 'text-zinc-700 bg-white hover:border-current'
                                   }`}
                                   style={{ 
                                       backgroundColor: type === key ? meta.color : 'transparent',
                                       borderColor: meta.color,
                                       color: type !== key ? meta.color : meta.textColor
                                   }}
                               >
                                   {meta.label}
                               </button>
                           ))}
                       </div>
                    </div>
                    <div className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">Asignar a</span>
                        <div className="p-2 border rounded-md flex flex-wrap gap-2">
                            {(santaData?.users || []).map((user: User) => (
                                <button
                                    key={user.id} type="button"
                                    onClick={() => handleUserToggle(user.id)}
                                    className={`rounded-full transition-all duration-200 ${involvedUserIds.includes(user.id) ? 'ring-2 ring-offset-1 ring-blue-500' : 'opacity-60 hover:opacity-100 filter grayscale hover:grayscale-0'}`}
                                    title={user.name}
                                >
                                    <Avatar name={user.name} size="lg" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </SBDialogContent>
        </SBDialog>
    );
}

// --- MAIN HOOK FOR PAGE LOGIC ---
function useAgendaDashboard(
  santaData: SantaData | null,
  setData: (fn: (d: SantaData | null) => SantaData | null) => void,
  saveCollection: (c: keyof SantaData, d: any[]) => void,
  isPersistenceEnabled: boolean
) {
  const [view, setView] = useState<ViewType>("week");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const calendarRef = useRef<FullCalendar | null>(null);

  const filteredTasks = useMemo(() => {
    if (!santaData?.interactions) return [];
    const now = startOfToday();
    const interactions = santaData.interactions.filter((i) => i.plannedFor && sbAsISO(i.plannedFor));

    const interval = {
        start: view === 'day' ? now : (view === 'week' ? now : new Date(now.getFullYear(), now.getMonth(), 1)),
        end: view === 'day' ? addDays(now, 1) : (view === 'week' ? addDays(now, 7) : new Date(now.getFullYear(), now.getMonth() + 1, 0))
    };
    
    return interactions
        .filter(i => {
            const date = i.plannedFor ? sbAsISO(i.plannedFor) : undefined;
            return date ? isWithinInterval(new Date(date), interval) : false;
        })
        .sort((a, b) => {
             const dateA = a.plannedFor ? new Date(sbAsISO(a.plannedFor)!).getTime() : 0;
             const dateB = b.plannedFor ? new Date(sbAsISO(b.plannedFor)!).getTime() : 0;
             return dateA - dateB;
        });

  }, [santaData?.interactions, view]);

  const handleTaskDropOnCalendar = (dropInfo: DropArg | { event: EventApi }) => {
    const isExternalDrop = 'draggedEl' in dropInfo;
    const taskId = isExternalDrop ? dropInfo.draggedEl.getAttribute('data-id') : dropInfo.event.id;
    const newDate = isExternalDrop ? dropInfo.date : dropInfo.event.start;
    
    if (!newDate || !taskId || !santaData?.interactions) return;

    try {
        const optimisticInteractions = santaData.interactions.map(i => 
            i.id === taskId ? { ...i, plannedFor: sbAsISO(newDate) } : i
        );
        setData(d => d ? { ...d, interactions: optimisticInteractions } : null);

        if (isPersistenceEnabled) {
            saveCollection("interactions", optimisticInteractions);
        }
        toast.success("Tarea reprogramada.");
    } catch (e: any) {
        toast.error("No se pudo reprogramar la tarea.");
        console.error(e);
    }
  };
  
  const handleCalendarDateClick = (info: { dateStr: string }) => {
      setModal({ type: 'new', initialDate: info.dateStr });
  };

  return {
    view, setView, modal, setModal, filteredTasks, handleTaskDropOnCalendar, calendarRef, handleCalendarDateClick
  };
}

// --- UI SUB-COMPONENTS ---
const DashboardToolbar: React.FC<{
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewTask: () => void;
}> = ({ view, onViewChange, onNewTask }) => {
    const today = new Date();
    return(
        <header className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 flex-shrink-0 px-4 md:px-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Mi Agenda</h1>
                <p className="text-muted-foreground">
                    {format(today, "eeee, d 'de' MMMM", { locale: esLocale })}
                </p>
            </div>
            <div className="flex-grow"></div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="inline-flex items-center rounded-full bg-muted p-1">
                    {(['day', 'week', 'month'] as ViewType[]).map(v => (
                        <button key={v} onClick={() => onViewChange(v)}
                            className={cn("px-3 py-1.5 text-sm rounded-full transition-colors capitalize", view === v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            aria-pressed={view === v}
                        >{v === 'day' ? 'Día' : (v === 'week' ? 'Semana' : 'Mes')}</button>
                    ))}
                </div>
                <SBButton onClick={onNewTask} className="gap-2" data-variant="primary">
                    <PlusCircle size={16} />
                    <span>Nueva Tarea</span>
                </SBButton>
            </div>
        </header>
    );
};

const DraggableTaskItem: React.FC<{ task: Interaction }> = ({ task }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const deptMeta = task.dept ? DEPT_META[task.dept] : DEPT_META.VENTAS;

  useEffect(() => {
    if (elRef.current) {
      new Draggable(elRef.current, {
        eventData: { id: task.id, title: task.note || "Tarea", create: false },
      });
    }
  }, [task]);

  return (
    <div
      ref={elRef}
      data-id={task.id}
      className="flex items-center gap-3 p-3 mb-2 bg-card border rounded-lg cursor-grab active:cursor-grabbing shadow-sm"
    >
      <GripVertical className="text-muted-foreground flex-shrink-0" size={18} />
      <div className="flex-grow overflow-hidden">
        <p className="font-medium text-foreground truncate">{task.note}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <span className="px-2 py-0.5 text-xs rounded-full font-semibold" style={{ backgroundColor: deptMeta ? deptMeta.color + '20' : undefined, color: deptMeta ? deptMeta.color : undefined }}>
              {deptMeta ? deptMeta.label : 'General'}
            </span>
            <span className="text-xs">{task.plannedFor && format(new Date(sbAsISO(task.plannedFor)!), "HH:mm'h'")}</span>
        </div>
      </div>
    </div>
  );
};

const TaskPanel: React.FC<{ tasks: Interaction[], view: ViewType }> = ({ tasks, view }) => {
  const groupedTasks = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const dateKey = task.plannedFor ? format(new Date(sbAsISO(task.plannedFor)!), 'yyyy-MM-dd') : 'Sin fecha';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    }, {} as Record<string, Interaction[]>);
  }, [tasks]);

  if (tasks.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center text-center p-10 h-full">
          <h3 className="text-xl font-semibold mb-2">Todo en orden</h3>
          <p className="text-muted-foreground">No hay tareas para este período.</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full pr-2 space-y-6">
      {Object.entries(groupedTasks).map(([dateKey, tasksInDay]) => (
        <div key={dateKey}>
          <h3 className="font-semibold mb-3 text-lg sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
            {dateKey === 'Sin fecha' ? 'Sin fecha' : format(new Date(dateKey), "EEEE d", { locale: esLocale })}
          </h3>
          {tasksInDay.map((task) => <DraggableTaskItem key={task.id} task={task} />)}
        </div>
      ))}
    </div>
  );
};

const PlanningCalendar: React.FC<{
  calendarRef: React.RefObject<FullCalendar | null>;
  onTaskDrop: (info: any) => void;
  onDateClick: (info: any) => void;
}> = ({ calendarRef, onTaskDrop, onDateClick }) => {

  const calendarApi = calendarRef.current?.getApi();
  
  return (
    <div className="p-1 md:p-3 overflow-hidden h-full bg-card rounded-2xl border flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2 pt-1">
            <h3 className="text-lg font-semibold text-foreground">
                {calendarApi ? format(calendarApi.getDate(), 'MMMM yyyy', {locale: esLocale}) : ''}
            </h3>
            <div className="flex">
                <SBButton onClick={() => calendarApi?.prev()} data-variant="ghost" data-size="icon" aria-label="Previous month"><ChevronLeft size={20}/></SBButton>
                <SBButton onClick={() => calendarApi?.next()} data-variant="ghost" data-size="icon" aria-label="Next month"><ChevronRight size={20}/></SBButton>
            </div>
        </div>
        <div className="flex-grow min-h-0">
             <FullCalendar
                ref={calendarRef as any}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                droppable={true}
                editable={true}
                eventDrop={onTaskDrop}
                drop={onTaskDrop}
                dateClick={onDateClick}
                headerToolbar={false}
                dayHeaderContent={() => <></>}
                height="100%"
                locales={[esLocale]} locale="es" firstDay={1}
                dayCellClassNames={(arg) => cn({ 'fc-day-today-custom': arg.isToday })}
             />
        </div>
    </div>
  );
};


// --- MAIN PAGE COMPONENT ---
export default function AgendaPage() {
  const { data: santaData, setData, isPersistenceEnabled, saveCollection } = useData();
  const router = useRouter();

  const { view, setView, modal, setModal, filteredTasks, handleTaskDropOnCalendar, calendarRef, handleCalendarDateClick } = useAgendaDashboard(
    santaData, setData, saveCollection, isPersistenceEnabled
  );

  if (!santaData) {
    return <div>Cargando...</div>;
  }

  return (
    <>
      <div className="h-full bg-secondary flex flex-col">
        <ModuleHeader title="Agenda" icon={CalendarIcon} />
        <div className="flex-grow min-h-0 bg-background rounded-t-2xl">
            <DashboardToolbar
              view={view}
              onViewChange={setView}
              onNewTask={() => setModal({ type: 'new' })}
            />
            <main className="flex-grow min-h-0 px-4 md:px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
              <div className="lg:col-span-2 h-full">
                  <TaskPanel tasks={filteredTasks} view={view}/>
              </div>
              <div className="lg:col-span-1 h-full hidden lg:block">
                  <PlanningCalendar 
                    calendarRef={calendarRef}
                    onTaskDrop={handleTaskDropOnCalendar}
                    onDateClick={handleCalendarDateClick}
                  />
              </div>
            </main>
        </div>
      </div>
      
      {modal.type !== "none" && (
        <EventDialog
          open={true}
          onOpenChange={(open) => !open && setModal({ type: "none" })}
          onSuccess={() => {
            toast.success(`Tarea guardada.`);
            router.refresh();
            setModal({ type: "none" });
          }}
          initialState={modal}
        />
      )}
    </>
  );
}
