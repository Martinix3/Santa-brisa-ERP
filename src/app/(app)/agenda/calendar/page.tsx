"use client";
import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventContentArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import esLocale from '@fullcalendar/core/locales/es';

import { useData } from "@/lib/dataprovider";
import { Filter, Calendar, ListTodo } from "lucide-react";
import { DEPT_META } from "@/domain/ssot";
import type { Department, Interaction, SantaData, InteractionStatus, MarketingEvent, Account } from '@/domain/ssot';
import { sbAsISO } from "@/features/agenda/helpers";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from "@/features/marketing/components/MarketingTaskCompletionDialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { TaskBoard } from '@/features/agenda/TaskBoard';
import type { Task } from '@/features/agenda/TaskBoard';
import { SBButton } from "@/components/ui";

function mapInteractionsToTasks(
  interactions: Interaction[] | undefined,
  accounts: Account[] | undefined
): Task[] {
  if (!interactions || !accounts) return [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  return interactions
    .filter((i) => i?.plannedFor)
    .map((i) => {
      const plannedISO = sbAsISO(i.plannedFor!);
      if (!plannedISO) return null;
      return {
        id: i.id,
        title: i.note || `${i.kind}`,
        type: i.dept || "VENTAS",
        status: i.status || 'open',
        date: plannedISO,
        involvedUserIds: i.involvedUserIds,
        location: i.location || accountMap.get(i.accountId || ''),
        linkedEntity: i.linkedEntity,
      } as Task;
    })
    .filter(Boolean) as Task[];
}

function AgendaPageContent() {
  const { data: santaData, setData, currentUser, isPersistenceEnabled, saveCollection } = useData();
  const router = useRouter();

  const [view, setView] = useState<'calendar' | 'tasks'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
  const [completingMarketingEvent, setCompletingMarketingEvent] = useState<MarketingEvent | null>(null);

  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

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

  const calendarEvents = useMemo(() => {
    return allInteractions
      .filter(i => !!sbAsISO(i.plannedFor))
      .map((task) => {
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
      });
  }, [allInteractions]);
  
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
  
  const handleEventDrop = (dropInfo: EventDropArg) => {
    const { event } = dropInfo;
    const { id, start } = event;
    if (!start || !santaData) return;

    const updatedInteractions = allInteractions.map(i =>
        i.id === id ? { ...i, plannedFor: sbAsISO(start) } : i
    );
    setData(d => d ? ({ ...d, interactions: updatedInteractions }) : null);
    if(isPersistenceEnabled) saveCollection('interactions', updatedInteractions as Interaction[]);
  };
  
  const userOptions = useMemo(() => (santaData?.users || []).map(u => ({ value: u.id, label: u.name })), [santaData?.users]);
  const departmentOptions = useMemo(() => Object.entries(DEPT_META).map(([key, meta]) => ({ value: key, label: meta.label })), []);
  
  const handleDeleteEvent = (id: string) => {
    if (!santaData?.interactions) return;
    const fullList = santaData.interactions.filter(i => i.id !== id);
    setData(prev => prev ? { ...prev, interactions: fullList } : null);
    if (isPersistenceEnabled) saveCollection('interactions', fullList);
    setSelectedEvent(null);
  };
  
  const handleEditRequest = (event: Interaction) => {
      setSelectedEvent(null);
      setEditingEvent(event);
      setIsNewEventDialogOpen(true);
  }
  
  const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

  if (!santaData) return <div className="p-6">Cargando datos…</div>;

  return (
    <>
      <div className="h-full p-4 md:p-6 bg-background flex flex-col">
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="flex items-center p-1 bg-secondary rounded-lg">
                <SBButton size="sm" variant={view === 'calendar' ? 'primary' : 'ghost'} onClick={() => setView('calendar')} className="flex items-center gap-2">
                    <Calendar size={16} /> Calendario
                </SBButton>
                <SBButton size="sm" variant={view === 'tasks' ? 'primary' : 'ghost'} onClick={() => setView('tasks')} className="flex items-center gap-2">
                    <ListTodo size={16} /> Tareas
                </SBButton>
            </div>
            <div className="flex-grow"></div>
            <FilterSelect value={responsibleFilter} onChange={setResponsibleFilter} options={userOptions} placeholder="Responsable" />
            <FilterSelect value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} placeholder="Sector" />
            <SBButton
                onClick={() => { setEditingEvent(null); setIsNewEventDialogOpen(true); }}
                className="gap-2 px-4 py-2"
            >
                <span>Nueva Tarea</span>
            </SBButton>
        </div>
        
        {view === 'calendar' ? (
             <div className="flex-grow min-h-0">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView={initialView}
                  viewDidMount={(arg) => localStorage.setItem('sb_calendar_view', arg.view.type)}
                  headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth" }}
                  events={calendarEvents as any}
                  eventClick={handleEventClick}
                  editable={isPersistenceEnabled}
                  eventDrop={handleEventDrop}
                  eventContent={(arg: EventContentArg) => {
                    const { status } = (arg.event.extendedProps as any);
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

        {isNewEventDialogOpen && (
          <NewEventDialog
            open={isNewEventDialogOpen}
            onOpenChange={setIsNewEventDialogOpen}
            onSuccess={() => {
              toast.success(`Tarea ${editingEvent ? 'actualizada' : 'creada'}.`);
              router.refresh();
              setIsNewEventDialogOpen(false);
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
            onSuccess={() => {
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

export default function AgendaPage() {
    return <AgendaPageContent />;
}