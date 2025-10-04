

"use client";

import React, { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, type DragEndEvent } from '@dnd-kit/core';


// FullCalendar
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DropArg } from "@fullcalendar/interaction";
import type { EventContentArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";

// Icons & Utils
import { Calendar, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// App-specific imports
import { useData } from "@/lib/dataprovider";
import { DEPT_META } from "@/domain/ssot";
import type {
  Interaction,
  SantaData,
  InteractionStatus,
  MarketingEvent,
  Account,
} from "@/domain/ssot";
import { sbAsISO } from "@/features/agenda/helpers";
import { Task } from "@/features/agenda/TaskBoard";

// UI Components
import { FilterSelect } from "@/components/ui/FilterSelect";
import { TaskBoard } from "@/features/agenda/TaskBoard";
import { SBButton } from "@/components/ui";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { TaskCompletionDialog } from "@/features/dashboard-ventas/components/TaskCompletionDialog";
import { MarketingTaskCompletionDialog } from "@/features/marketing/components/MarketingTaskCompletionDialog";
import { rescheduleEvent } from '@/app/(app)/ops/actions';

// --- Types ---
type CalendarEventExtendedProps = {
  type: string;
  status: InteractionStatus;
  kind: string;
  linkedEntity: Interaction["linkedEntity"];
};

type ModalState =
  | { type: "none" }
  | { type: "new"; data?: null }
  | { type: "edit"; data: Interaction }
  | { type: "detail"; data: Interaction }
  | { type: "complete-task"; data: Interaction }
  | { type: "complete-marketing-event"; data: MarketingEvent };

// --- Helpers ---

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
        originalInteraction: i,
      } as Task;
    })
    .filter(Boolean) as Task[];
}

// --- Hook principal de agenda ---

function useAgenda(
  santaData: SantaData | null,
  setData: (fn: (d: SantaData | null) => SantaData | null) => void,
  saveCollection: (collection: keyof SantaData, data: any[], debounce?: boolean) => void,
  isPersistenceEnabled: boolean
) {
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  // Datos derivados
  const allInteractions = useMemo(() => {
    if (!santaData?.interactions) return [];
    return santaData.interactions.filter((i) => {
      const matchesResponsible =
        !responsibleFilter ||
        i.userId === responsibleFilter ||
        (i.involvedUserIds || []).includes(responsibleFilter);
      const matchesDepartment = !departmentFilter || i.dept === departmentFilter;
      return matchesResponsible && matchesDepartment;
    });
  }, [santaData?.interactions, responsibleFilter, departmentFilter]);

  const calendarEvents = useMemo(() => {
    return allInteractions
      .filter((i) => !!sbAsISO(i.plannedFor))
      .map((task) => {
        const plannedForISO = sbAsISO(task.plannedFor);
        const isAllDay = !String(plannedForISO).includes("T");
        return {
          id: task.id,
          title: task.note || String(task.kind || "Tarea"),
          start: plannedForISO,
          allDay: isAllDay,
          extendedProps: {
            type: task.dept,
            status: task.status,
            kind: task.kind,
            linkedEntity: task.linkedEntity,
          } as CalendarEventExtendedProps,
          className: cn("sb-event", `sb-event--${task.dept}`, {
            "sb-event--done": task.status === "done",
            "border-l-4": !isAllDay,
          }),
        };
      });
  }, [allInteractions]);

  const allTasks = useMemo(
    () => mapInteractionsToTasks(allInteractions, santaData?.accounts),
    [allInteractions, santaData?.accounts]
  );

  const filterOptions = useMemo(
    () => ({
      users: (santaData?.users || []).map((u) => ({
        value: u.id,
        label: u.name,
      })),
      departments: Object.entries(DEPT_META).map(([key, meta]) => ({
        value: key,
        label: meta.label,
      })),
    }),
    [santaData?.users]
  );

  // Handlers
  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    if (!santaData) return;
    const taskToUpdate = allInteractions.find((i) => i.id === id);
    if (!taskToUpdate) return;

    setModal({ type: "none" });

    if (newStatus === "done") {
      const isMarketingEvent =
        taskToUpdate.dept === "MARKETING" && taskToUpdate.linkedEntity?.type === "EVENT";
      if (isMarketingEvent && santaData.marketingEvents) {
        const event = santaData.marketingEvents.find((e) => e.id === taskToUpdate.linkedEntity?.id);
        if (event) {
          setModal({ type: "complete-marketing-event", data: event });
          return;
        }
      }
      setModal({ type: "complete-task", data: taskToUpdate });
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const interaction = allInteractions.find((i) => i.id === clickInfo.event.id);
    if (interaction) setModal({ type: "detail", data: interaction });
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const { event } = dropInfo;
    if (!event.start || !santaData?.interactions) return;
    try {
      const updatedInteractions = santaData.interactions.map((i) =>
        i.id === event.id ? { ...i, plannedFor: sbAsISO(event.start) } : i
      );
      setData(() => ({ ...santaData, interactions: updatedInteractions }));
      if (isPersistenceEnabled) saveCollection("interactions", updatedInteractions);
      toast.success("Tarea reagendada.");
    } catch (e) {
      toast.error("No se pudo reagendar la tarea.");
      console.error(e);
      dropInfo.revert();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!santaData?.interactions) return;
    try {
      const fullList = santaData.interactions.filter((i) => i.id !== id);
      setData((prev) => (prev ? { ...prev, interactions: fullList } : null));
      if (isPersistenceEnabled) saveCollection("interactions", fullList);
      setModal({ type: "none" });
      toast.success("Tarea eliminada.");
    } catch (e) {
      toast.error("No se pudo eliminar la tarea.");
      console.error(e);
    }
  };

  return {
    allInteractions,
    calendarEvents,
    allTasks,
    modal,
    filters: { responsible: responsibleFilter, department: departmentFilter },
    filterOptions,
    setModal,
    setResponsibleFilter,
    setDepartmentFilter,
    handleUpdateStatus,
    handleEventClick,
    handleEventDrop,
    handleDeleteEvent,
  };
}

// --- Subcomponentes UI (minimal & modern) ---

const ViewSegmented: React.FC<{
  value: "calendar" | "tasks";
  onChange: (v: "calendar" | "tasks") => void;
}> = ({ value, onChange }) => {
  const views: Array<{ id: "calendar" | "tasks"; label: string }> = [
    { id: "calendar", label: "Calendario" },
    { id: "tasks", label: "Tareas" },
  ];

  return (
    <div className="inline-flex items-center rounded-full bg-muted p-1">
      {views.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full transition-colors",
            value === v.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={value === v.id}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
};

const AgendaToolbar: React.FC<{
  currentView: "calendar" | "tasks";
  onViewChange: (v: "calendar" | "tasks") => void;
  filters: { responsible: string; department: string };
  options: {
    users: { value: string; label: string }[];
    departments: { value: string; label: string }[];
  };
  onFilterChange: { responsible: (v: string) => void; department: (v: string) => void };
  onNewTask: () => void;
}> = ({ currentView, onViewChange, filters, options, onFilterChange, onNewTask }) => (
  <header
    className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 flex-shrink-0 p-4 md:p-6"
    role="toolbar"
    aria-label="Controles de la agenda"
  >
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
      <ViewSegmented value={currentView} onChange={onViewChange} />
    </div>
    <div className="flex-grow" />
    <div className="flex items-center gap-3 w-full md:w-auto">
      <FilterSelect
        value={filters.responsible}
        onChange={onFilterChange.responsible}
        options={options.users}
        placeholder="Responsable"
        className="w-full md:w-[180px]"
      />
      <FilterSelect
        value={filters.department}
        onChange={onFilterChange.department}
        options={options.departments}
        placeholder="Sector"
        className="w-full md:w-[180px]"
      />
      <SBButton onClick={onNewTask} className="gap-2 px-4 py-2" data-variant="primary">
        <PlusCircle size={16} />
        <span className="hidden sm:inline">Nueva Tarea</span>
      </SBButton>
    </div>
  </header>
);

const AgendaSkeleton: React.FC = () => (
  <div className="p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-8 bg-muted rounded w-1/4" />
      <div className="flex items-center gap-3">
        <div className="h-10 bg-muted rounded w-32" />
        <div className="h-10 bg-muted rounded w-32" />
        <div className="h-10 bg-muted rounded w-32" />
      </div>
    </div>
    <div className="h-[70vh] bg-muted rounded-lg" />
  </div>
);

const EmptyState: React.FC<{ onNewTask: () => void }> = ({ onNewTask }) => (
  <div className="flex flex-col items-center justify-center text-center p-10 h-full">
    <Calendar size={48} className="text-muted-foreground mb-4" />
    <h3 className="text-xl font-semibold mb-2">Agenda despejada</h3>
    <p className="text-muted-foreground mb-6 max-w-md">
      No se encontraron tareas con los filtros actuales. ¡Buen momento para planificar tu próxima acción!
    </p>
    <SBButton onClick={onNewTask} data-variant="primary">
      Crear primera tarea
    </SBButton>
  </div>
);

// --- Página principal ---

function AgendaPageContent() {
  const { data: santaData, setData, isPersistenceEnabled, saveCollection } = useData();
  const router = useRouter();

  const {
    allInteractions,
    calendarEvents,
    allTasks,
    modal,
    filters,
    filterOptions,
    setModal,
    setResponsibleFilter,
    setDepartmentFilter,
    handleUpdateStatus,
    handleEventClick,
    handleEventDrop,
    handleDeleteEvent,
  } = useAgenda(santaData, setData, saveCollection, isPersistenceEnabled);
  
  const [view, setView] = useState<'calendar' | 'tasks'>(() => {
      if (typeof window !== 'undefined') {
          return (localStorage.getItem('sb_agenda_view') as 'calendar' | 'tasks') || 'calendar';
      }
      return 'calendar';
  });

  const handleViewChange = (v: 'calendar' | 'tasks') => {
      setView(v);
      localStorage.setItem('sb_agenda_view', v);
  };
  
  const handleDrop = async (e: DropArg) => {
      const droppedData = e.draggedEl.getAttribute('data-event');
      if (!droppedData) return;
      const task = JSON.parse(droppedData) as Task;
      const newDate = e.dateStr;

      // Optimistic update
      setData(prev => {
          if (!prev) return prev;
          const interactions = prev.interactions.map(t =>
              t.id === task.id ? { ...t, plannedFor: newDate } : t
          );
          return { ...prev, interactions };
      });
      toast.success(`Tarea "${task.title}" reagendada al ${new Date(newDate).toLocaleDateString()}`);

      try {
          await rescheduleEvent(task.id, newDate);
      } catch (err) {
          toast.error("Error al guardar el cambio.");
          // Revert optimistic update
          setData(prev => {
              if (!prev) return prev;
              const interactions = prev.interactions.map(t =>
                  t.id === task.id ? { ...t, plannedFor: task.date } : t
              );
              return { ...prev, interactions };
          });
      }
  };


  // FullCalendar lazy
  const FullCalendar = useMemo(() => dynamic(() => import("@fullcalendar/react"), { ssr: false }), []);
  const calendarRef = useRef<any>(null);

  if (!santaData) return <AgendaSkeleton />;

  return (
    <>
      <DndContext onDragEnd={() => {}}>
        <div className="h-full bg-background flex flex-col">
          <AgendaToolbar
            currentView={view}
            onViewChange={handleViewChange}
            filters={filters}
            options={filterOptions}
            onFilterChange={{ responsible: setResponsibleFilter, department: setDepartmentFilter }}
            onNewTask={() => setModal({ type: "new" })}
          />

          <main className="flex-grow min-h-0 px-4 md:px-6 pb-6">
            {allInteractions.length === 0 ? (
              <EmptyState onNewTask={() => setModal({ type: "new" })} />
            ) : (
                view === 'calendar' ? (
                  <div className="h-[78vh] rounded-2xl border bg-card/60 backdrop-blur-sm p-2 md:p-3 overflow-hidden">
                    <FullCalendar
                      ref={calendarRef}
                      plugins={[dayGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      droppable={true}
                      editable={isPersistenceEnabled}
                      eventDrop={handleEventDrop}
                      drop={handleDrop}
                      headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "dayGridMonth",
                      }}
                      events={calendarEvents}
                      eventClick={handleEventClick}
                      eventContent={(arg: EventContentArg) => {
                        const { status } = arg.event.extendedProps as CalendarEventExtendedProps;
                        return (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 p-1 w-full overflow-hidden rounded-md",
                              status === "done" && "line-through opacity-70"
                            )}
                          >
                            <span className="sb-event-dot inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" />
                            {arg.timeText && (
                              <span className="text-[11px] text-muted-foreground mr-1">{arg.timeText}</span>
                            )}
                            <span className="text-[12px] font-medium text-foreground truncate">{arg.event.title}</span>
                          </div>
                        );
                      }}
                      height="100%"
                      expandRows
                      nowIndicator
                      dayMaxEventRows
                      slotEventOverlap={false}
                      locales={[esLocale]}
                      locale="es"
                      firstDay={1}
                      buttonText={{ today: "hoy", month: "mes" }}
                    />
                  </div>
                ) : (
                  <div className="h-[78vh] rounded-2xl border bg-card/60 backdrop-blur-sm p-2 overflow-y-auto">
                    <TaskBoard tasks={allTasks} onCompleteTask={(id) => handleUpdateStatus(id, "done")} />
                  </div>
                )
            )}
          </main>
        </div>
      </DndContext>

      {/* Modales */}
      {(modal.type === "new" || modal.type === "edit") && (
        <NewEventDialog
          open={true}
          onOpenChange={(open) => !open && setModal({ type: "none" })}
          onSuccess={() => {
            toast.success(`Tarea ${modal.type === "edit" ? "actualizada" : "creada"}.`);
            router.refresh();
            setModal({ type: "none" });
          }}
          initialEventData={modal.type === "edit" ? modal.data : null}
          dept={modal.type === "edit" ? modal.data.dept : "VENTAS"}
        />
      )}

      {modal.type === "detail" && (
        <EventDetailDialog
          event={modal.data}
          open={true}
          onOpenChange={(open) => !open && setModal({ type: "none" })}
          onUpdateStatus={handleUpdateStatus}
          onEdit={(event) => setModal({ type: "edit", data: event })}
          onDelete={handleDeleteEvent}
        />
      )}

      {modal.type === "complete-task" && (
        <TaskCompletionDialog
          task={modal.data}
          open={true}
          onClose={() => setModal({ type: "none" })}
          onSuccess={() => {
            toast.success("Tarea completada con éxito.");
            router.refresh();
            setModal({ type: "none" });
          }}
          onError={(msg) => toast.error(`Error: ${msg}`)}
        />
      )}

      {modal.type === "complete-marketing-event" && (
        <MarketingTaskCompletionDialog
          entity={modal.data}
          open={true}
          onClose={() => setModal({ type: "none" })}
          onSuccess={() => {
            toast.success("Resultados del evento guardados.");
            router.refresh();
            setModal({ type: "none" });
          }}
          onError={(msg) => toast.error(`Error: ${msg}`)}
        />
      )}
    </>
  );
}

export default function AgendaPage() {
  return <AgendaPageContent />;
}

