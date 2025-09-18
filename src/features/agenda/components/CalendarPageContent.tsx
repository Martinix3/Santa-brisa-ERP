

"use client";
import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventContentArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { useFullCalendarStyles } from "@/features/agenda/useFullCalendarStyles";
import { TaskBoard, Task } from "@/features/agenda/TaskBoard";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Calendar } from "lucide-react";
import { SB_COLORS, DEPT_META } from "@/domain/ssot";
import type { Department, Interaction, SantaData, OrderSellOut, InteractionStatus, InteractionKind, Account } from '@/domain/ssot';

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

const asISO = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
};

export async function saveCollection(collectionName: keyof SantaData, data: any[]) {
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
  accounts: Account[] | undefined
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
        location: i.location || accountMap.get(i.accountId || ''),
      };
    });

  return interactionTasks;
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
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);

  const allInteractions = useMemo(() => SantaData?.interactions || [], [SantaData]);

  const calendarEvents = useMemo(
    () =>
      allInteractions.filter(i => i.plannedFor).map((task) => {
        const style = DEPT_META[task.dept as Department] || DEPT_META.VENTAS;
        return {
          id: task.id,
          title: task.note,
          start: task.plannedFor,
          allDay: task.status === 'done' ? false : (task.dept !== "ALMACEN"), // Example of allDay logic
          extendedProps: { type: task.dept, status: task.status },
          backgroundColor: task.status === 'done' ? '#d1d5db' : hexToRgba(style.color, 0.25),
          borderColor: task.status === 'done' ? '#9ca3af' : hexToRgba(style.color, 0.45),
          textColor: task.status === 'done' ? '#4b5563' : style.textColor,
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

  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    const updatedInteractions = allInteractions.map(i => 
        i.id === id ? { ...i, status: newStatus } : i
    ) as Interaction[];
    updateAndPersistInteractions(updatedInteractions);
  };
  
  const handleAddOrUpdateEvent = async (event: Omit<Interaction, 'createdAt' | 'status' | 'userId'> & { id?: string }) => {
    if (!currentUser) return;
    
    if (event.id) { // Update existing
        const updatedInteractions = allInteractions.map(i => i.id === event.id ? { ...i, ...event } : i);
        updateAndPersistInteractions(updatedInteractions as Interaction[]);
    } else { // Create new
        const newInteraction: Interaction = {
            id: `int_${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'open',
            userId: currentUser.id,
            ...event,
        };
        const updatedInteractions = [...(allInteractions || []), newInteraction];
        updateAndPersistInteractions(updatedInteractions);
    }
    setEditingEvent(null);
    setIsNewEventDialogOpen(false);
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
    
    if (!start) return;

    const updatedInteractions = allInteractions.map(i => 
        i.id === id ? { ...i, plannedFor: start.toISOString() } : i
    );
    updateAndPersistInteractions(updatedInteractions as Interaction[]);
  };


  const tasksForBoard = useMemo(() => mapDomainToTasks(SantaData?.interactions, SantaData?.accounts), [SantaData]);

  if (!SantaData) return <div className="p-6">Cargando datos…</div>;

  const ACCENT = SB_COLORS.accent;
  
  const handleDeleteEvent = (id: string) => {
      const updatedInteractions = allInteractions.filter(i => i.id !== id);
      updateAndPersistInteractions(updatedInteractions);
      setSelectedEvent(null);
  };
  
  const handleEditRequest = (event: Interaction) => {
      setSelectedEvent(null); // Cierra el diálogo de detalle
      setEditingEvent(event);
      setIsNewEventDialogOpen(true);
  }

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
          <button 
            onClick={() => { setEditingEvent(null); setIsNewEventDialogOpen(true); }}
            className="flex items-center gap-2 text-sm text-white rounded-lg px-4 py-2 font-semibold hover:brightness-110 transition-colors"
            style={{backgroundColor: ACCENT}}
          >
             Nueva Tarea
          </button>
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
              editable={true}
              eventDrop={handleEventDrop}
              eventContent={(arg: EventContentArg) => {
                const { type, status } = (arg.event.extendedProps as any);
                const dept = DEPT_META[type as Department] || DEPT_META.VENTAS;
                return (
                  <div className={`flex items-center gap-1.5 ${status === 'done' ? 'line-through' : ''}`}>
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: status === 'done' ? '#9ca3af' : (dept?.color || "#94a3b8") }}
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
              onTaskStatusChange={handleUpdateStatus}
              onCompleteTask={(id) => handleUpdateStatus(id, 'done')}
              typeStyles={DEPT_META}
            />
          </div>
        )}
      </div>
        
      {isNewEventDialogOpen && (
          <NewEventDialog
            open={isNewEventDialogOpen}
            onOpenChange={setIsNewEventDialogOpen}
            onSave={handleAddOrUpdateEvent as any}
            accentColor={ACCENT}
            initialEventData={editingEvent}
          />
      )}

      {selectedEvent && (
        <EventDetailDialog
            event={selectedEvent}
            open={!!selectedEvent}
            onOpenChange={() => setSelectedEvent(null)}
            onUpdateStatus={handleUpdateStatus}
            onEdit={handleEditRequest}
            onDelete={handleDeleteEvent}
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

