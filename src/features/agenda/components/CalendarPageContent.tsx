// src/features/agenda/components/CalendarPageContent.tsx
"use client";
import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventContentArg, EventClickArg, EventDropArg } from "@fullcalendar/core";

import { useData } from "@/lib/dataprovider";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Calendar, Filter } from "lucide-react";
import { SB_COLORS, DEPT_META } from "@/domain/ssot";
import type { Department, Interaction, SantaData, InteractionStatus } from '@/domain/ssot';
import { sbAsISO } from "@/features/agenda/helpers";

import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { EventDetailDialog } from "@/features/agenda/components/EventDetailDialog";
import { TaskCompletionDialog } from '@/features/dashboard-ventas/components/TaskCompletionDialog';
import { useFullCalendarStyles } from '@/features/agenda/useFullCalendarStyles';


const hexToRgba = (hex: string, a: number) => {
  if (!hex) return `rgba(0,0,0,0)`;
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

function FilterSelect({ value, onChange, options, placeholder, className }: { value: string, onChange: (v: string) => void, options: Array<{value: string, label: string}>, placeholder: string, className?: string }) {
  return (
    <div className={`relative ${className ?? ''}`}>
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
  const { data: santaData, setData, currentUser, isPersistenceEnabled, saveCollection } = useData();
  
  const [selectedEvent, setSelectedEvent] = useState<Interaction | null>(null);
  const [editingEvent, setEditingEvent] = useState<Interaction | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<Interaction | null>(null);

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

  const calendarEvents = useMemo(
    () =>
      allInteractions
        .filter(i => !!sbAsISO(i.plannedFor))
        .map((task) => {
        const style = DEPT_META[task.dept as Department] || DEPT_META.VENTAS;
        return {
          id: task.id,
          title: task.note || String(task.kind || 'Tarea'),
          start: sbAsISO(task.plannedFor),
          allDay: task.status === 'done' ? false : (task.dept !== "ALMACEN"),
          extendedProps: { type: task.dept, status: task.status },
          backgroundColor: task.status === 'done' ? '#d1d5db' : hexToRgba(style.color, 0.25),
          borderColor: task.status === 'done' ? '#9ca3af' : hexToRgba(style.color, 0.45),
          textColor: task.status === 'done' ? '#4b5563' : style.textColor,
          className: ["sb-event"],
        };
      }),
    [allInteractions]
  );
  
  const updateAndPersistInteractions = (updatedSubset: Interaction[]) => {
    if (!santaData) return;
    const map = new Map((santaData.interactions || []).map(i => [i.id, i]));
    for (const it of updatedSubset) map.set(it.id, it);
    const fullList = Array.from(map.values());
    setData(prev => prev ? { ...prev, interactions: fullList } : null);
    if (isPersistenceEnabled) saveCollection('interactions', fullList);
  }
  
  const handleUpdateStatus = (id: string, newStatus: InteractionStatus) => {
    const taskToUpdate = allInteractions.find(i => i.id === id);
    setSelectedEvent(null); 
     if (newStatus === 'done' && taskToUpdate) {
        if (taskToUpdate?.dept === 'VENTAS') {
            setCompletingTask(taskToUpdate);
        } else { // For other depts, just mark as done
            const updatedInteractions = allInteractions.map(i => 
                i.id === id ? { ...i, status: newStatus } : i
            ) as Interaction[];
            updateAndPersistInteractions(updatedInteractions);
        }
    }
  };
  
  const handleAddOrUpdateEvent = async (eventData: any) => {
      if (!currentUser || !santaData) return;
      
      const { ...event } = eventData;
      let updatedInteractions;

      if (event.id) {
          updatedInteractions = santaData.interactions.map(i => i.id === event.id ? { ...i, ...event } as Interaction : i);
      } else {
          const newInteraction: Interaction = {
              id: `int_${Date.now()}`,
              createdAt: new Date().toISOString(),
              status: 'open',
              userId: currentUser.id,
              ...event,
          };
          updatedInteractions = [...(santaData.interactions || []), newInteraction];
      }
      
      setData({ ...santaData, interactions: updatedInteractions });
      await saveCollection('interactions', updatedInteractions);

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

  const handleSaveCompletedTask = async (taskId: string, payload: any) => {
    if (!santaData || !currentUser) return;
    const updatedInteractions = santaData.interactions.map(i => i.id === taskId ? { ...i, status: 'done' as InteractionStatus, resultNote: payload.note } : i);
    setData(prev => prev ? ({ ...prev, interactions: updatedInteractions }) : null);
    await saveCollection('interactions', updatedInteractions);
    setCompletingTask(null);
  };
  
  const userOptions = useMemo(() => (santaData?.users || []).map(u => ({ value: u.id, label: u.name })), [santaData?.users]);
  const departmentOptions = useMemo(() => Object.entries(DEPT_META).map(([key, meta]) => ({ value: key, label: meta.label })), []);

  if (!santaData) return <div className="p-6">Cargando datos…</div>;

  const ACCENT = SB_COLORS.accent;
  
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
      <ModuleHeader title="Agenda" icon={Calendar}>
        <div className="flex items-center gap-3">
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
          <div className="h-full rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={initialView}
              viewDidMount={(arg) => localStorage.setItem('sb_calendar_view', arg.view.type)}
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
      </div>
    </>
  );
}
