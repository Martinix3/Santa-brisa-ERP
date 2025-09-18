

"use client";
import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventContentArg, EventClickArg } from "@fullcalendar/core";
import { useFullCalendarStyles } from "@/features/agenda/useFullCalendarStyles";
import { TaskBoard, Task } from "@/features/agenda/TaskBoard";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Calendar } from "lucide-react";
import { SB_COLORS, DEPT_META } from "@/domain/ssot";
import type { Department, Interaction, SantaData, OrderSellOut, InteractionStatus, InteractionKind } from '@/domain/ssot';

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

const asISO = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
};

async function saveCollection(collectionName: keyof SantaData, data: any[]) {
    try {
        const response = await fetch('/api/dev/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection: collectionName, data }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Error guardando la colección ${collectionName}`);
        }
    } catch (e: any) {
        console.error(e);
        alert(`Error al guardar: ${e.message}`);
    }
}


function mapDomainToTasks(
  interactions: Interaction[] | undefined,
  accounts: any[] | undefined
): Task[] {
  if (!interactions || !accounts) return [];

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const interactionTasks: Task[] = interactions
    .filter((i) => i?.plannedFor)
    .map((i) => {
      const plannedISO = asISO(i.plannedFor!);
      
      const title = i.note || `${i.kind}`;

      const type: Department = (i.dept as Department) || "VENTAS";
      return {
        id: i.id,
        title: title,
        type,
        status: i.status,
        date: plannedISO,
        involvedUserIds: i.involvedUserIds,
        location: i.location,
      };
    });

  return interactionTasks;
}

function moveTaskStatus(tasks: Task[], id: string, newStatus: InteractionStatus): Task[] {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return tasks;
  const next = [...tasks];
  next[idx] = { ...next[idx], status: newStatus };
  return next;
}

const hexToRgba = (hex: string, a: number) => {
  if (!hex) return `rgba(0,0,0,0)`;
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

function Tabs({
  active,
  setActive,
  tabs,
  accentColor
}: {
  active: string;
  setActive: (id: string) => void;
  tabs: { id: string; label: string }[];
  accentColor: string;
}) {
  return (
    <div className="flex items-center">
      <div className="inline-flex rounded-xl bg-white/70 border border-zinc-200 p-1 shadow-sm">
        {tabs.map((tab) => {
          const on = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={"px-3.5 py-1.5 text-sm rounded-lg transition-all"}
              style={on ? { backgroundColor: 'white', color: accentColor, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', borderColor: hexToRgba(accentColor, 0.4) } : { color: '#3f4d67' }}
              aria-current={on ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarPageContent() {
  useFullCalendarStyles();
  const { data: SantaData, setData, currentUser } = useData();
  const [activeTab, setActiveTab] = useState<"agenda" | "tareas">("agenda");
  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);

  const allInteractions = useMemo(() => SantaData?.interactions || [], [SantaData]);

  const calendarEvents = useMemo(
    () =>
      allInteractions.filter(i => i.plannedFor).map((task) => {
        const style = DEPT_META[task.dept as Department] || DEPT_META.VENTAS;
        return {
          id: task.id,
          title: task.note,
          start: task.plannedFor,
          allDay: task.dept !== "ALMACEN", // Example of allDay logic
          extendedProps: { type: task.dept },
          backgroundColor: hexToRgba(style.color, 0.25),
          borderColor: hexToRgba(style.color, 0.45),
          textColor: style.textColor,
          className: ["sb-event"],
        };
      }),
    [allInteractions]
  );
  
  const updateAndPersistInteractions = (updatedInteractions: Interaction[]) => {
      if (!SantaData) return;
      setData(prev => prev ? ({ ...prev, interactions: updatedInteractions }) : null);
      saveCollection('interactions', updatedInteractions);
  }

  const handleTaskStatusChange = (id: string, newStatus: InteractionStatus) => {
    if (!SantaData) return;
    const updatedInteractions = SantaData.interactions.map(i => 
        i.id === id ? { ...i, status: newStatus } : i
    ) as Interaction[];
    updateAndPersistInteractions(updatedInteractions);
  };
  
  const handleAddEvent = async (event: Omit<Interaction, 'id'|'createdAt'|'status'|'userId'>) => {
    if (!SantaData || !currentUser) return;
    const newInteraction: Interaction = {
        id: `int_${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'open',
        userId: currentUser.id,
        ...event,
    };

    const updatedInteractions = [...(SantaData.interactions || []), newInteraction];
    updateAndPersistInteractions(updatedInteractions);
  };
  
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    const interaction = allInteractions.find(i => i.id === eventId);
    if(interaction) {
        setSelectedEvent(interaction);
    }
  };

  const tasksForBoard = useMemo(() => mapDomainToTasks(SantaData?.interactions, SantaData?.accounts), [SantaData]);

  if (!SantaData) return <div className="p-6">Cargando datos…</div>;

  const ACCENT = SB_COLORS.accent;

  return (
    <>
    <ModuleHeader title="Agenda" icon={Calendar}>
        <div className="flex items-center gap-3">
          <Tabs
            active={activeTab}
            setActive={(id) => setActiveTab(id as any)}
            tabs={[
              { id: "agenda", label: "Agenda" },
              { id: "tareas", label: "Tareas" },
            ]}
            accentColor={ACCENT}
          />
          <NewEventDialog
            onAddEvent={handleAddEvent as any}
            accentColor={ACCENT}
          />
        </div>
    </ModuleHeader>
    <div className="h-full flex flex-col gap-6 p-4 md:p-6 bg-white">
      <div className="flex-grow min-h-0">
        {activeTab === "agenda" && (
          <div className="h-full rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listYear" }}
              events={calendarEvents as any}
              eventClick={handleEventClick}
              eventContent={(arg: EventContentArg) => {
                const type = (arg.event.extendedProps as any).type as Department;
                const dept = DEPT_META[type] || DEPT_META.VENTAS;
                return (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: dept?.color || "#94a3b8" }}
                    />
                    {arg.timeText && <span className="text-[11px] text-zinc-600 mr-1">{arg.timeText}</span>}
                    <span className="text-[12px] font-medium text-zinc-800">{arg.event.title}</span>
                  </div>
                );
              }}
              height="100%"
              expandRows
              nowIndicator
              slotEventOverlap={false}
              dayMaxEventRows
              aspectRatio={1.45}
              locale="es"
              firstDay={1}
              buttonText={{ today: "hoy", month: "mes", week: "semana", day: "día", list: "año" }}
            />
          </div>
        )}

        {activeTab === "tareas" && (
          <div className="h-full rounded-2xl bg-white border border-zinc-200 shadow-sm p-4">
            <TaskBoard
              tasks={tasksForBoard}
              onTaskStatusChange={handleTaskStatusChange}
              onCompleteTask={(id) => handleTaskStatusChange(id, 'done')}
              typeStyles={DEPT_META}
            />
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailDialog
            event={selectedEvent}
            open={!!selectedEvent}
            onOpenChange={() => setSelectedEvent(null)}
            onUpdate={(updatedEvent) => {
                 const updatedInteractions = allInteractions.map(i => i.id === updatedEvent.id ? updatedEvent : i);
                 updateAndPersistInteractions(updatedInteractions as Interaction[]);
                 setSelectedEvent(null);
            }}
            onDelete={(id) => {
                 const updatedInteractions = allInteractions.filter(i => i.id !== id);
                 updateAndPersistInteractions(updatedInteractions);
                 setSelectedEvent(null);
            }}
        />
      )}

      <style jsx global>{`
        /* Toolbar */
        .fc .fc-toolbar.fc-header-toolbar {
                margin-bottom: 1.5rem;
                font-size: 0.875rem;
            }
        .fc .fc-toolbar-title { font-weight: 600; color: ${SB_COLORS.accent}; }
        .fc .fc-button {
          background: #fff; color: #0f172a; border: 1px solid #e5e7eb;
          border-radius: 10px; padding: 6px 10px; text-transform: capitalize;
        }
        .fc .fc-button:hover { background: #f8fafc; }
        .fc .fc-button-primary { background: #fff; border-color: #e5e7eb; }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: hsl(var(--sb-sun)); 
          border-color: hsl(var(--sb-sun));
          color: hsl(var(--sb-neutral-900));
          font-weight: 600;
        }
        .fc-theme-standard td, .fc-theme-standard th { border-color: #e5e7eb; }
        .fc .fc-day-today { background: ${hexToRgba(SB_COLORS.sun || '#F7D15F', 0.12)} !important; }
        .fc .fc-button-primary.fc-today-button {
            background: #fff;
            border: 1px solid #e5e7eb;
            color: #0f172a;
            font-weight: 500;
        }
        .fc .fc-button-primary.fc-today-button:disabled {
            background: ${hexToRgba(ACCENT, 0.15)};
            border: 1px solid ${hexToRgba(ACCENT, 0.3)};
            color: ${ACCENT};
            font-weight: 600;
        }
        /* Eventos */
        .fc .sb-event {
          border-radius: 10px;
          box-shadow: 0 1px 0 rgba(16,24,40,.04);
          padding: 2px 4px;
        }
        .fc .fc-daygrid-event { margin: 2px 4px; }
        .fc .fc-timegrid-event { margin: 2px 6px; }
        /* Cabeceras */
        .fc .fc-col-header-cell-cushion { padding: 8px 0; font-weight: 600; color: #334155; }
        .fc .fc-timegrid-slot-label { color: #64748b; }
      `}</style>
    </div>
    </>
  );
}
