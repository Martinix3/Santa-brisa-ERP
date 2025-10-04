// FILE: app/agenda/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// FullCalendar
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventContentArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";

// Icons & Utils
import { Calendar, Filter, PlusCircle } from "lucide-react";
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

// Types
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

// --- HELPER FUNCTIONS ---

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
        status: i.status || "open",
        date: plannedISO,
        involvedUserIds: i.involvedUserIds,
        location: i.location || accountMap.get(i.accountId || ""),
        linkedEntity: i.linkedEntity,
      } as Task;
    })
    .filter(Boolean) as Task[];
}

// --- CUSTOM HOOK FOR AGENDA LOGIC ---

function useAgenda(
  santaData: SantaData | null,
  setData: (fn: (d: SantaData | null) => SantaData | null) => void,
  saveCollection: (
    collection: keyof SantaData,
    data: any[],
    debounce?: boolean
  ) => void,
  isPersistenceEnabled: boolean
) {
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  // --- DERIVED DATA (MEMOIZED) ---
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

  const initialCalendarView = useMemo(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sb_calendar_view") || "dayGridMonth";
    }
    return "dayGridMonth";
  }, []);

  // --- EVENT HANDLERS ---
  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    if (!santaData) return;
    const taskToUpdate = allInteractions.find((i) => i.id === id);
    if (!taskToUpdate) return;

    setModal({ type: "none" }); // Close any open detail view

    if (newStatus === "done") {
      const isMarketingEvent =
        taskToUpdate.dept === "MARKETING" &&
        taskToUpdate.linkedEntity?.type === "EVENT";
      if (isMarketingEvent && santaData.marketingEvents) {
        const event = santaData.marketingEvents.find(
          (e) => e.id === taskToUpdate.linkedEntity?.id
        );
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
    if (interaction) {
      setModal({ type: "detail", data: interaction });
    }
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const { event } = dropInfo;
    if (!event.start || !santaData?.interactions) return;
    try {
      const updatedInteractions = santaData.interactions.map((i) =>
        i.id === event.id ? { ...i, plannedFor: sbAsISO(event.start) } : i
      );
      setData(() => ({ ...santaData, interactions: updatedInteractions }));
      if (isPersistenceEnabled)
        saveCollection("interactions", updatedInteractions);
      toast.success("Tarea reagendada.");
    } catch (e) {
      toast.error("No se pudo reagendar la tarea.");
      console.error(e);
      // Revert optimistic update on failure (optional, depends on UX strategy)
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
    // State
    allInteractions,
    calendarEvents,
    allTasks,
    modal,
    filters: {
      responsible: responsibleFilter,
      department: departmentFilter,
    },
    filterOptions,
    initialCalendarView,

    // Handlers
    setModal,
    setResponsibleFilter,
    setDepartmentFilter,
    handleUpdateStatus,
    handleEventClick,
    handleEventDrop,
    handleDeleteEvent,
  };
}

// --- UI COMPONENTS ---

const AgendaToolbar: React.FC<{
  filters: { responsible: string; department: string };
  options: {
    users: { value: string; label: string }[];
    departments: { value: string; label: string }[];
  };
  onFilterChange: {
    responsible: (v: string) => void;
    department: (v: string) => void;
  };
  onNewTask: () => void;
}> = ({ filters, options, onFilterChange, onNewTask }) => (
  <header
    className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 flex-shrink-0 p-4 md:p-6"
    role="toolbar"
    aria-label="Controles de la agenda"
  >
    <h1 className="text-2xl font-bold text-foreground sb-h1">Agenda</h1>
    <div className="flex-grow"></div>
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
      <SBButton
        onClick={onNewTask}
        className="gap-2 px-4 py-2"
        data-variant="primary"
      >
        <PlusCircle size={16} />
        <span className="hidden sm:inline">Nueva Tarea</span>
      </SBButton>
    </div>
  </header>
);

const AgendaSkeleton: React.FC = () => (
  <div className="p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="flex items-center gap-3">
        <div className="h-10 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-[70vh] bg-muted rounded-lg"></div>
      <div className="h-[70vh] bg-muted rounded-lg"></div>
    </div>
  </div>
);

const EmptyState: React.FC<{ onNewTask: () => void }> = ({ onNewTask }) => (
  <div className="flex flex-col items-center justify-center text-center p-10 h-full">
    <Calendar size={48} className="text-muted-foreground mb-4" />
    <h3 className="text-xl font-semibold mb-2">Agenda Despejada</h3>
    <p className="text-muted-foreground mb-6 max-w-md">
      No se encontraron tareas con los filtros actuales. ¡Es un buen momento
      para planificar tu próxima acción!
    </p>
    <SBButton onClick={onNewTask} data-variant="primary">
      Crear primera tarea
    </SBButton>
  </div>
);

// --- MAIN PAGE CONTENT COMPONENT ---

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
    initialCalendarView,
    setModal,
    setResponsibleFilter,
    setDepartmentFilter,
    handleUpdateStatus,
    handleEventClick,
    handleEventDrop,
    handleDeleteEvent,
  } = useAgenda(santaData, setData, saveCollection, isPersistenceEnabled);

  // Lazy load FullCalendar
  const FullCalendar = useMemo(
    () => dynamic(() => import("@fullcalendar/react"), { ssr: false }),
    []
  );

  if (!santaData) {
    return <AgendaSkeleton />;
  }

  return (
    <>
      <div className="h-full bg-background flex flex-col">
        <AgendaToolbar
          filters={filters}
          options={filterOptions}
          onFilterChange={{
            responsible: setResponsibleFilter,
            department: setDepartmentFilter,
          }}
          onNewTask={() => setModal({ type: "new" })}
        />

        <main className="flex-grow min-h-0 px-4 md:px-6 pb-6">
          {allInteractions.length === 0 ? (
            <EmptyState onNewTask={() => setModal({ type: "new" })} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              <div className="sb-card p-1 md:p-3 overflow-hidden h-full">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView={initialCalendarView}
                  viewDidMount={(arg) =>
                    localStorage.setItem("sb_calendar_view", arg.view.type)
                  }
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth",
                  }}
                  events={calendarEvents}
                  eventClick={handleEventClick}
                  editable={isPersistenceEnabled}
                  eventDrop={handleEventDrop}
                  eventContent={(arg: EventContentArg) => {
                    const { status } =
                      arg.event.extendedProps as CalendarEventExtendedProps;
                    return (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 p-1 w-full overflow-hidden",
                          status === "done" && "line-through opacity-70"
                        )}
                      >
                        <span className="sb-event-dot inline-block h-2 w-2 rounded-full flex-shrink-0" />
                        {arg.timeText && (
                          <span className="text-[11px] text-muted-foreground mr-1">
                            {arg.timeText}
                          </span>
                        )}
                        <span className="text-[12px] font-medium text-foreground truncate">
                          {arg.event.title}
                        </span>
                      </div>
                    );
                  }}
                  height="100%"
                  expandRows
                  nowIndicator
                  slotEventOverlap={false}
                  dayMaxEventRows
                  locales={[esLocale]}
                  locale="es"
                  firstDay={1}
                  buttonText={{ today: "hoy", month: "mes" }}
                />
              </div>

              <div className="overflow-y-auto h-full sb-card p-2">
                <TaskBoard
                  tasks={allTasks}
                  onCompleteTask={(id) => handleUpdateStatus(id, "done")}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- MODALS --- */}
      {(modal.type === "new" || modal.type === "edit") && (
        <NewEventDialog
          open={true}
          onOpenChange={(open) => !open && setModal({ type: "none" })}
          onSuccess={() => {
            toast.success(`Tarea ${modal.type === 'edit' ? "actualizada" : "creada"}.`);
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