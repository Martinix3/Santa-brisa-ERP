

// src/app/(app)/agenda/calendar/page.tsx
"use client";
import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventContentArg, EventClickArg, EventDropArg } from "@fullcalendar/core";

import { useData } from "@/lib/dataprovider";
import { Filter, Calendar } from "lucide-react";
import { SB_COLORS, DEPT_META, SB_THEME } from "@/domain/ssot";
import type { Department, Interaction, SantaData, InteractionStatus, MarketingEvent } from '@/domain/ssot';
import { sbAsISO } from "@/features/agenda/helpers";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { MarketingTaskCompletionDialog } from "@/features/marketing/components/MarketingTaskCompletionDialog";
import { useFullCalendarStyles } from '@/features/agenda/useFullCalendarStyles';
import { FilterSelect } from "@/components/ui/FilterSelect";


const hexToRgba = (hex: string, a: number) => {
  if (!hex) return `rgba(0,0,0,0)`;
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

function CalendarPageContent() {
  useFullCalendarStyles();
  const { data: santaData, setData, currentUser, isPersistenceEnabled, saveCollection, saveAllCollections } = useData();
  const router = useRouter();

  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Interaction | null>(null);
  const [completingMarketingEvent, setCompletingMarketingEvent] = useState<MarketingEvent | null>(null);

  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const initialView = useMemo(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('sb_calendar_view') || 'timeGridWeek';
    }
    return 'timeGridWeek';
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
        const style = DEPT_META[task.dept as Department] || DEPT_META.VENTAS;
        const plannedForISO = sbAsISO(task.plannedFor);
        
        // La tarea es "todo el día" si la fecha no incluye hora
        const isAllDay = !String(plannedForISO).includes('T');

        return {
          id: task.id,
          title: task.note || String(task.kind || 'Tarea'),
          start: plannedForISO,
          allDay: isAllDay,
          extendedProps: { type: task.dept, status: task.status, kind: task.kind, linkedEntity: task.linkedEntity },
          backgroundColor: task.status === 'done' ? '#d1d5db' : hexToRgba(style.color, 0.25),
          borderColor: task.status === 'done' ? '#9ca3af' : hexToRgba(style.color, 0.45),
          textColor: task.status === 'done' ? '#4b5563' : style.textColor,
          className: ["sb-event"],
        };
      });
  }, [allInteractions]);
  
  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    if (!santaData) return;
    const taskToUpdate = allInteractions.find(i => i.id === id);
    setSelectedEvent(null);
    if (newStatus === 'done' && taskToUpdate) {
        if (taskToUpdate.dept === 'MARKETING' && taskToUpdate.linkedEntity?.type === 'EVENT' && santaData.marketingEvents) {
            const event = santaData.marketingEvents.find(e => e.id === taskToUpdate.linkedEntity?.id);
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

  if (!santaData) return <div className="p-6">Cargando datos…</div>;
  
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

  return (
    <>
      <div className="h-full p-4 md:p-6 bg-white flex flex-col">
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <FilterSelect value={responsibleFilter} onChange={setResponsibleFilter} options={userOptions} placeholder="Responsable" />
          <FilterSelect value={departmentFilter} onChange={setDepartmentFilter} options={departmentOptions} placeholder="Sector" />
          <div className="flex-grow"></div>
          <button
            onClick={() => { setEditingEvent(null); setIsNewEventDialogOpen(true); }}
            className="sb-btn-primary flex items-center gap-2 text-sm text-primary-foreground bg-primary rounded-lg px-4 py-2 font-semibold hover:bg-primary/90 transition-colors"
          >
            Nueva Tarea
          </button>
        </div>
        <div className="flex-grow min-h-0">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={initialView}
              viewDidMount={(arg) => localStorage.setItem('sb_calendar_view', arg.view.type)}
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listYear" }}
              events={calendarEvents as any}
              eventClick={handleEventClick}
              editable={isPersistenceEnabled}
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
            onError={(msg) => toast.error(`Error: ${msg}`)}
            accentColor={'hsl(var(--sb-sun-strong))'}
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

export default function CalendarPage() {
    return <CalendarPageContent />;
}
