
// src/app/(app)/agenda/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// FullCalendar & Draggable Interaction
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DropArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, EventContentArg, ViewMountArg } from "@fullcalendar/core";
import { es as esLocale } from "date-fns/locale";

// Icons, Types & Utils
import { Calendar as CalendarIcon, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/dataprovider";
import type { Interaction, SantaData, Department, User, Account, InteractionStatus, MarketingEvent } from '@/domain/ssot';
import { sbAsISO } from "@/features/agenda/helpers";
import { DEPT_META } from "@/domain/ssot";
import { rescheduleEvent } from '@/app/(app)/agenda/actions';
// UI Components
import { SBButton } from "@/components/ui";
import { TaskBoard, type Task } from "@/features/agenda/TaskBoard";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from "@/features/marketing/components/MarketingTaskCompletionDialog";
import { AgendaHeader } from "@/features/agenda/components/AgendaHeader";
import { AgendaSkeleton } from "@/features/agenda/components/AgendaSkeleton";


// --- TYPES ---
type ViewType = 'calendar' | 'tasks';

const FullCalendarNoSSR = dynamic(() => import('@fullcalendar/react'), { ssr: false });


// --- MAIN PAGE COMPONENT ---
export default function AgendaPage() {
  const { data: santaData, setData, currentUser, isPersistenceEnabled, saveCollection } = useData();
  const router = useRouter();

  const [view, setView] = useState<ViewType>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [open, onOpenChange] = useState(false);
  const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
  const [completingMarketingEvent, setCompletingMarketingEvent] = useState<MarketingEvent | null>(null);

  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const calendarRef = useRef<FullCalendar | null>(null);

  const initialView = useMemo(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('sb_calendar_view') || 'dayGridMonth';
    }
    return 'dayGridMonth';
  }, []);

  const allInteractions = useMemo(() => {
    if (!santaData?.interactions) return [];
    
    return santaData.interactions.filter(i => {
        const matchesResponsible = !responsibleFilter || i.userId === responsibleFilter || (i.involvedUserIds || []).includes(responsibleFilter);
        const matchesDepartment = !departmentFilter || i.dept === departmentFilter;
        return matchesResponsible && matchesDepartment;
    })

  }, [santaData?.interactions, responsibleFilter, departmentFilter]);
  
  const allTasks = useMemo(() => {
    if (!santaData?.interactions || !santaData?.accounts) return [];
    return mapInteractionsToTasks(allInteractions, santaData.accounts);
  }, [allInteractions, santaData?.accounts]);

  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    if (!santaData) return;
    const taskToUpdate = allInteractions.find(i => i.id === id);
    setSelectedEvent(null);
    if (newStatus === 'done' && taskToUpdate) {
        if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && santaData.marketingEvents) {
            const event = santaData.marketingEvents.find((e: MarketingEvent) => e.id === taskToUpdate.linkedEntity?.id);
            if (event) {
                setCompletingMarketingEvent(event);
            } else {
                setCompletingTask(taskToUpdate);
            }
        } else {
            setCompletingTask(taskToUpdate);
        }
    }
  };
  
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    const interaction = allInteractions.find(i => i.id === eventId);
    if(interaction) {
        setSelectedEvent(interaction);
    }
  };
  
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const { event } = dropInfo;
    const { id, start } = event;
    if (!start || !santaData) return;

    const optimisticInteractions = allInteractions.map(i =>
      i.id === id ? { ...i, plannedFor: sbAsISO(start) } : i
    );
    setData(d => d ? { ...d, interactions: optimisticInteractions } : null);

    try {
        await rescheduleEvent(id, start.toISOString());
        toast.success("Tarea reprogramada.");
        router.refresh(); // Revalida la data
    } catch(e) {
        toast.error("No se pudo reprogramar la tarea.");
        // Revert optimistic update
        setData(d => d ? { ...d, interactions: allInteractions } : null);
    }
  };
  
  const userOptions = useMemo(() => (santaData?.users || []).map(u => ({ value: u.id, label: u.name })), [santaData?.users]);
  const departmentOptions = useMemo(() => Object.entries(DEPT_META).map(([key, meta]) => ({ value: key, label: meta.label })), []);
  
  const handleDeleteEvent = (id: string) => { /* ... lógica de borrado ... */ };
  
  const handleEditRequest = (event: Interaction) => {
      setSelectedEvent(null);
      setEditingEvent(event);
      onOpenChange(true);
  }
  
  const handleDrop = (drop: DropArg) => {
    const draggedEvent = JSON.parse(drop.draggedEl.getAttribute('data-event') || '{}');
    const newDate = drop.date;
    
    if (draggedEvent.id && newDate) {
      handleEventDrop({
        event: { ...draggedEvent, start: newDate } as any,
      } as EventDropArg);
    }
  };
  
  if (!santaData) return <AgendaSkeleton />;

  return (
    <>
      <div className="h-full p-4 md:p-6 bg-background flex flex-col">
        <AgendaHeader
            view={view}
            onViewChange={setView}
            responsibleFilter={responsibleFilter}
            onResponsibleChange={setResponsibleFilter}
            departmentFilter={departmentFilter}
            onDepartmentChange={setDepartmentFilter}
            userOptions={userOptions}
            departmentOptions={departmentOptions}
            onNewEvent={() => { setEditingEvent(null); onOpenChange(true); }}
        />
        
        {view === 'calendar' ? (
             <div className="flex-grow min-h-0">
                <FullCalendarNoSSR
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView={initialView}
                  viewDidMount={(arg: ViewMountArg) => localStorage.setItem('sb_calendar_view', arg.view.type)}
                  headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth" }}
                  events={allInteractions.filter(i => !!sbAsISO(i.plannedFor)).map(task => {
                      const plannedForISO = sbAsISO(task.plannedFor);
                      const isAllDay = !String(plannedForISO).includes('T');
                      return {
                          id: task.id,
                          title: task.note || String(task.kind || 'Tarea'),
                          start: plannedForISO,
                          allDay: isAllDay,
                          extendedProps: { type: task.dept, status: task.status, kind: task.kind, linkedEntity: task.linkedEntity },
                          className: cn("sb-event", `sb-event--${task.dept}`, {
                              "sb-event--done": task.status === 'done',
                              "border-l-4": !isAllDay
                          }),
                      };
                  })}
                  eventClick={handleEventClick}
                  editable={isPersistenceEnabled}
                  eventDrop={handleEventDrop}
                  droppable={true}
                  drop={handleDrop}
                  eventContent={(arg: EventContentArg) => {
                    const { status } = arg.event.extendedProps as any;
                    return (
                      <div className={cn("flex items-center gap-1.5 p-1", status === 'done' && 'line-through opacity-70')}>
                        <span
                          className="sb-event-dot inline-block h-2 w-2 rounded-full flex-shrink-0"
                        />
                        {arg.timeText && <span className="text-[11px] text-muted-foreground mr-1">{arg.timeText}</span>}
                        <span className="text-[12px] font-medium text-foreground truncate">{arg.event.title}</span>
                      </div>
                    );
                  }}
                  height="100%"
                  expandRows
                  nowIndicator
                  slotEventOverlap={false}
                  dayMaxEventRows
                  aspectRatio={1.45}
                  locales={[esLocale]}
                  locale="es"
                  firstDay={1}
                  buttonText={{ today: "hoy", month: "mes" }}
                />
            </div>
        ) : (
            <div className="flex-grow min-h-0 overflow-y-auto">
                 <TaskBoard
                    tasks={allTasks}
                    onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
                />
            </div>
        )}

        {open && (
           <NewEventDialog
            open={open}
            onOpenChange={onOpenChange}
            onSuccess={() => {
              toast.success(`Tarea ${editingEvent ? 'actualizada' : 'creada'}.`);
              router.refresh();
              onOpenChange(false);
              setEditingEvent(null);
            }}
            initialEventData={editingEvent}
            dept={editingEvent?.dept || 'VENTAS'}
          />
        )}

        {selectedEvent && (
          <EventDetailDialog
            event={selectedEvent}
            open={!!selectedEvent}
            onOpenChange={(open) => { if (!open) setSelectedEvent(null) }}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditRequest}
            onDelete={handleDeleteEvent}
          />
        )}

        {completingTask && (
          <TaskCompletionDialog
            task={completingTask}
            open={!!completingTask}
            onClose={() => setCompletingTask(null)}
            onSuccess={(id) => {
              handleUpdateStatus(id, 'done');
              toast.success('Tarea completada con éxito.');
              router.refresh();
              setCompletingTask(null);
            }}
            onError={(msg) => toast.error(`Error: ${msg}`)}
          />
        )}

        {completingMarketingEvent && (
            <MarketingTaskCompletionDialog
                entity={completingMarketingEvent}
                open={!!completingMarketingEvent}
                onClose={() => setCompletingMarketingEvent(null)}
                onSuccess={() => {
                  toast.success('Resultados del evento de marketing guardados.');
                  router.refresh();
                  setCompletingMarketingEvent(null);
                }}
                onError={(msg) => toast.error(`Error: ${msg}`)}
            />
        )}
      </div>
    </>
  );
}

function mapInteractionsToTasks(
    interactions: Interaction[] | undefined,
    accounts: Account[] | undefined
): Task[] {
    if (!interactions || !accounts) return [];
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  
    return interactions
      .map((i) => {
        if (!i) return null;
        const plannedISO = i.plannedFor ? sbAsISO(i.plannedFor) : undefined;
        const task: Task = {
          ...i,
          title: i.note || `${i.kind}`,
          plannedFor: plannedISO,
          originalInteraction: i,
          location: i.location || accountMap.get(i.accountId || ''),
        };
        return task;
      })
      .filter(Boolean) as Task[];
}
