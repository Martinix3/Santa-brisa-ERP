
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
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from '@/features/marketing/components/MarketingTaskCompletionDialog';
import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Calendar, Filter } from "lucide-react";
import { SB_COLORS, DEPT_META } from "@/domain/ssot";
import type { Department, Interaction, SantaData, OrderSellOut, InteractionStatus, InteractionKind, Account, EventMarketing, OnlineCampaign } from '@/domain/ssot';
import { auth } from '@/lib/firebaseClient';
import { getIdToken } from "firebase/auth";


// Reemplaza tu asISO por esta versión robusta (y renombrada) para evitar colisiones:
const toDate = (d: any): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

  if (typeof d === 'string' || typeof d === 'number') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Firestore Timestamp u objetos parecidos
  if (typeof d === 'object') {
    // Evita arrays u objetos extraños
    if (Array.isArray(d)) return null;
    if (!d) return null;
    // Timestamp de Firestore
    if (typeof d.toDate === 'function') {
      const dt = d.toDate();
      return isNaN(dt.getTime()) ? null : dt;
    }
    if (typeof d.toMillis === 'function') {
      const dt = new Date(d.toMillis());
      return isNaN(dt.getTime()) ? null : dt;
    }
    // { seconds, nanoseconds }
    if ('seconds' in d && typeof d.seconds === 'number') {
      const ms = d.seconds * 1000 + (typeof d.nanoseconds === 'number' ? d.nanoseconds / 1e6 : 0);
      const dt = new Date(ms);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }

  return null;
};

const sbAsISO = (d: any) => {
  const date = toDate(d);
  // Guardas máximas: que exista y que tenga getTime
  if (!date || typeof (date as any).getTime !== 'function') return undefined;
  const t = (date as Date).getTime?.();
  if (typeof t !== 'number' || Number.isNaN(t)) return undefined;
  // Normaliza a “local-aware” ISO (sin desplazar el reloj)
  return new Date(t - new Date().getTimezoneOffset() * 60000).toISOString();
};


function mapDomainToTasks(
  interactions: Interaction[] | undefined,
  accounts: Account[] | undefined
): Task[] {
  if (!interactions || !accounts) return [];

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const interactionTasks: Task[] = interactions
    .filter((i) => i?.plannedFor)
    .map((i) => {
      const plannedISO = sbAsISO(i.plannedFor!);
      if (!plannedISO) {
        console.warn('plannedFor inválido en interacción', i.id, i.plannedFor);
        return null; // <- señalamos que esta no vale
      }

      const title = i.note || `${i.kind}`;
      const type: Department = (i.dept as Department) || "VENTAS";
      return {
        id: i.id,
        title: title,
        type,
        status: i.status || 'open',
        date: plannedISO,
        involvedUserIds: i.involvedUserIds,
        location: i.location || accountMap.get(i.accountId || ''),
        linkedEntity: i.linkedEntity,
      } as Task;
    })
    .filter(Boolean) as Task[]; // <- nos quedamos solo con válidas

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

function FilterSelect({ value, onChange, options, placeholder, className }: { value: string, onChange: (v: string) => void, options: Array<{value: string, label: string}>, placeholder: string, className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full text-sm bg-white border border-zinc-200 rounded-md pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-yellow-300"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <Filter className="h-4 w-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}


export function CalendarPageContent() {
  useFullCalendarStyles();
  const { data: SantaData, setData, currentUser, isPersistenceEnabled, saveCollection } = useData();
  const [activeTab, setActiveTab] = useState<"agenda" | "tareas">("agenda");
  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
  const [completingMarketingTask, setCompletingMarketingTask] = useState<Interaction | null>(null);

  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');


  const allInteractions = useMemo(() => {
    if (!SantaData?.interactions) return [];
    
    return SantaData.interactions.filter(i => {
        const matchesResponsible = !responsibleFilter || i.userId === responsibleFilter || (i.involvedUserIds || []).includes(responsibleFilter);
        const matchesDepartment = !departmentFilter || i.dept === departmentFilter;
        return matchesResponsible && matchesDepartment;
    })

  }, [SantaData?.interactions, responsibleFilter, departmentFilter]);

  const calendarEvents = useMemo(
    () =>
      allInteractions
        .filter(i => !!sbAsISO(i.plannedFor)) // <- solo con fecha válida
        .map((task) => {
        const style = DEPT_META[task.dept as Department] || DEPT_META.VENTAS;
        return {
          id: task.id,
          title: task.note || String(task.kind || 'Tarea'),
          start: sbAsISO(task.plannedFor),
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
      setData(prev => prev ? { ...prev, interactions: updatedInteractions } : null);
      if (isPersistenceEnabled) {
          saveCollection('interactions', updatedInteractions);
      }
  }

  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    const taskToUpdate = allInteractions.find(i => i.id === id);
    setSelectedEvent(null); 
     if (newStatus === 'done' && taskToUpdate) {
        if (taskToUpdate?.dept === 'VENTAS') {
            setCompletingTask(taskToUpdate);
        } else if (taskToUpdate?.dept === 'MARKETING') {
            setCompletingMarketingTask(taskToUpdate);
        } else { // For other depts, just mark as done
            const updatedInteractions = allInteractions.map(i => 
                i.id === id ? { ...i, status: newStatus } : i
            ) as Interaction[];
            updateAndPersistInteractions(updatedInteractions);
        }
    }
  };
  
  const handleAddOrUpdateEvent = async (eventData: any) => {
      if (!currentUser || !SantaData) return;
      
      const { ...event } = eventData;
      let finalData = { ...SantaData };
      let updatedInteractions;

      if (event.id) { // Update existing interaction
          updatedInteractions = finalData.interactions.map(i => i.id === event.id ? { ...i, ...event } as Interaction : i);
      } else { // Create new interaction and potentially a new marketing entity
          const newInteraction: Interaction = {
              id: `int_${Date.now()}`,
              createdAt: new Date().toISOString(),
              status: 'open',
              userId: currentUser.id,
              ...event,
          };

          if (newInteraction.dept === 'MARKETING' && newInteraction.note) {
              const newMktEvent: EventMarketing = {
                  id: `mkt_${Date.now()}`,
                  title: newInteraction.note,
                  kind: 'OTRO', // Default
                  status: 'planned',
                  startAt: newInteraction.plannedFor || new Date().toISOString(),
                  city: newInteraction.location,
              };
              finalData.mktEvents = [...(finalData.mktEvents || []), newMktEvent];
              newInteraction.linkedEntity = { type: 'Campaign', id: newMktEvent.id };
          }

          updatedInteractions = [...(finalData.interactions || []), newInteraction];
      }
      
      finalData.interactions = updatedInteractions;
      
      setData(finalData);

      await saveCollection('interactions', finalData.interactions);
      if (finalData.mktEvents && finalData.mktEvents.length > (SantaData.mktEvents?.length || 0)) {
          await saveCollection('mktEvents', finalData.mktEvents);
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
        i.id === id ? { ...i, plannedFor: sbAsISO(start) } : i
    );
    updateAndPersistInteractions(updatedInteractions as Interaction[]);
  };

  const handleSaveCompletedTask = async (
    taskId: string,
    payload: any
  ) => {
    if (!SantaData || !currentUser) return;

    const originalTask = SantaData.interactions.find(i => i.id === taskId);
    if (!originalTask) return;

    let finalData: SantaData = { ...SantaData };

    finalData.interactions = finalData.interactions.map(i =>
        i.id === taskId ? { ...i, status: 'done' as InteractionStatus, resultNote: payload.note } : i
    );
    
    if (payload.type === 'interaccion' && payload.nextActionDate) {
        const newFollowUp: Interaction = {
            id: `int_${Date.now()}`,
            userId: originalTask.userId,
            involvedUserIds: originalTask.involvedUserIds,
            accountId: originalTask.accountId,
            kind: 'OTRO',
            note: `Seguimiento de: ${payload.note}`,
            plannedFor: payload.nextActionDate,
            createdAt: new Date().toISOString(),
            dept: originalTask.dept,
            status: 'open',
        };
        finalData.interactions.push(newFollowUp);
    }
    
    if (payload.type === 'venta' && originalTask.accountId) {
        const newOrder: OrderSellOut = {
            id: `ord_${Date.now()}`,
            accountId: originalTask.accountId,
            status: 'open',
            currency: 'EUR',
            createdAt: new Date().toISOString(),
            lines: payload.items.map((item: any) => ({
                sku: item.sku,
                qty: item.qty,
                uom: 'uds',
                priceUnit: 0, 
            })),
            notes: `Pedido creado desde tarea ${taskId}`,
        };
        finalData.ordersSellOut = [...(finalData.ordersSellOut || []), newOrder];
    }
    
    if (payload.type === 'marketing' && originalTask.linkedEntity?.id) {
        const mktEventId = originalTask.linkedEntity.id;
        finalData.mktEvents = (finalData.mktEvents || []).map(me => {
            if (me.id === mktEventId) {
                return {
                    ...me,
                    status: 'closed',
                    spend: payload.cost,
                    goal: {
                        ...(me.goal || {}),
                        leads: payload.leads,
                        sampling: payload.attendees,
                    },
                } as EventMarketing;
            }
            return me;
        });
    }
    
    setData(finalData);

    await saveCollection('interactions', finalData.interactions);
    if (payload.type === 'venta') {
        await saveCollection('ordersSellOut', finalData.ordersSellOut);
    }
    if (payload.type === 'marketing' && finalData.mktEvents) {
        await saveCollection('mktEvents', finalData.mktEvents);
    }
    
    setCompletingTask(null);
    setCompletingMarketingTask(null);
  };


  const tasksForBoard = useMemo(() => mapDomainToTasks(allInteractions, SantaData?.accounts), [allInteractions, SantaData?.accounts]);
  
  const userOptions = useMemo(() => (SantaData?.users || []).map(u => ({ value: u.id, label: u.name })), [SantaData?.users]);
  const departmentOptions = useMemo(() => Object.entries(DEPT_META).map(([key, meta]) => ({ value: key, label: meta.label })), []);

  if (!SantaData) return <div className="p-6">Cargando datos…</div>;

  const ACCENT = SB_COLORS.accent;
  
  const handleDeleteEvent = (id: string) => {
      const updatedInteractions = allInteractions.filter(i => i.id !== id);
      updateAndPersistInteractions(updatedInteractions);
      setSelectedEvent(null);
  };
  
  const handleEditRequest = (event: Interaction) => {
      setSelectedEvent(null);
      setEditingEvent(event);
      setIsNewEventDialogOpen(true);
  }
  
  const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

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
          <FilterSelect value={responsibleFilter} onChange={setResponsibleFilter} options={userOptions} placeholder="Responsable" />
          <FilterSelect value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} placeholder="Sector" />
          <button
            onClick={() => { setEditingEvent(null); setIsNewEventDialogOpen(true); }}
            className="flex items-center gap-2 text-sm text-white rounded-lg px-4 py-2 font-semibold hover:brightness-110 transition-colors"
            style={{ backgroundColor: ACCENT }}
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
                editable={!!isPersistenceEnabled}
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
            onComplete={handleSaveCompletedTask}
          />
        )}

        {completingMarketingTask && (
          <MarketingTaskCompletionDialog
            task={completingMarketingTask}
            open={!!completingMarketingTask}
            onClose={() => setCompletingMarketingTask(null)}
            onComplete={handleSaveCompletedTask}
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

