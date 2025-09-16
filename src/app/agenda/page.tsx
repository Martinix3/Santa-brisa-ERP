

"use client";

// === SB Agenda — Calendar + Task Board (repo version with aliases) ===
// Esta versión elimina los *stubs* y vuelve a usar tus módulos reales con alias "@/...".
// Requisitos: alias configurado en tsconfig.json (baseUrl + paths) y/o webpack alias en next.config.js.

import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventContentArg } from "@fullcalendar/core";

// ✅ Módulos de tu repo
import { useFullCalendarStyles } from "@/features/agenda/useFullCalendarStyles";
import { TaskBoard, Task, TaskStatus } from "@/features/agenda/TaskBoard";
import { Department, DEPT_META } from "@/domain/schema";
import { NewEventDialog } from "@/features/agenda/components/NewEventDialog";
import { useData } from "@/lib/dataprovider";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layouts/AuthenticatedLayout";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Calendar } from "lucide-react";
import { SB_COLORS } from "@/components/ui/ui-primitives";


// ⚠️ FullCalendar necesita desactivar SSR
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

// ---------------------------------------------
// Helpers comunes
// ---------------------------------------------
const asISO = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
};

// Mapping: Domain → Tasks
function mapDomainToTasks(
  interactions: any[] | undefined,
  orders: any[] | undefined,
  accounts: any[] | undefined
): Task[] {
  if (!interactions || !orders || !accounts) return [];

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const interactionTasks: Task[] = interactions
    .filter((i) => i?.plannedFor)
    .map((i) => {
      const accountName = accountMap.get(i.accountId) || "Cuenta";
      const plannedISO = asISO(i.plannedFor);
      const isPast = new Date(plannedISO) < new Date();
      const status: TaskStatus = isPast ? "HECHA" : "PROGRAMADA";
      const type: Department = (i.dept as Department) || "VENTAS";
      return {
        id: `int_${i.id}`,
        title: `${i.note || i.kind || "Interacción"} - ${accountName}`,
        type,
        status,
        date: plannedISO,
      };
    });

  const orderTasks: Task[] = (orders || []).map((o) => {
    const accountName = accountMap.get(o.accountId) || "Cuenta";
    const status: TaskStatus =
      o.status === "confirmed" ? "HECHA" : o.status === "open" ? "EN_CURSO" : "PROGRAMADA";
    return {
      id: `ord_${o.id}`,
      title: `Pedido - ${accountName}`,
      type: "ALMACEN" as Department,
      status,
      date: asISO(o.createdAt || new Date()),
    };
  });

  return [...interactionTasks, ...orderTasks];
}

export function moveTaskStatus(tasks: Task[], id: string, newStatus: TaskStatus): Task[] {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return tasks;
  const next = [...tasks];
  next[idx] = { ...next[idx], status: newStatus };
  return next;
}

// ======== Diseño Santa Brisa para Agenda (solo UI) ========
// Pegar en el mismo archivo, reemplazando CalendarPageContent y Tabs.
// Requisitos: Tailwind activo. No añade dependencias.

// --- Tokens & helpers de color (inline para no depender de imports) ---
const hexToRgba = (hex: string, a: number) => {
  if (!hex) return `rgba(0,0,0,0)`;
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
};

// --- Tabs en pills (Agenda / Tareas) ---
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

// --- Contenido con estilo renovado ---
function CalendarPageContent() {
  useFullCalendarStyles();
  const { data: SantaData } = useData();

  const initialTasks = useMemo(() => {
    if (!SantaData) return [] as Task[];
    return mapDomainToTasks(
      SantaData.interactions,
      SantaData.ordersSellOut,
      SantaData.accounts
    );
  }, [SantaData]);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"agenda" | "tareas">("agenda");

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const calendarEvents = useMemo(
    () =>
      tasks.map((task) => {
        const style = DEPT_META[task.type] || DEPT_META.GENERAL;
        return {
          id: task.id,
          title: task.title,
          start: task.date,
          allDay: task.type !== "ALMACEN",
          extendedProps: { type: task.type },
          backgroundColor: hexToRgba(style.color, 0.25),
          borderColor: hexToRgba(style.color, 0.45),
          textColor: style.textColor,
          className: ["sb-event"], // para estilos globales
        };
      }),
    [tasks]
  );

  const handleTaskStatusChange = (id: string, newStatus: TaskStatus) => {
    setTasks((prev) => moveTaskStatus(prev, id, newStatus));
  };
  const handleAddEvent = (event: { title: string; type: Department; date: string | Date }) => {
    const newEvent: Task = { id: `task_${Date.now()}`, title: event.title, type: event.type, date: asISO(event.date), status: "PROGRAMADA" };
    setTasks((prev) => [...prev, newEvent]);
  };

  if (!SantaData) return <div className="p-6">Cargando datos…</div>;

  // Diags rápidos
  const __tests = {
    hasAccounts: Array.isArray(SantaData.accounts) && SantaData.accounts.length > 0,
    mappedTasksCount: tasks.length,
    calendarEventsCount: calendarEvents.length,
    deptCoverageOk: tasks.every((t) => Object.prototype.hasOwnProperty.call(DEPT_META, t.type)),
    titlesNonEmpty: tasks.every((t) => !!t.title && t.title.length > 0),
  };

  // Accent compartido
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
            onAddEvent={handleAddEvent}
            accentColor={ACCENT}
          />
        </div>
    </ModuleHeader>
    <div className="h-full flex flex-col gap-6 p-4 md:p-6 bg-white">
      {/* Contenido principal */}
      <div className="flex-grow min-h-0">
        {activeTab === "agenda" && (
          <div className="h-full rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listYear" }}
              events={calendarEvents as any}
              eventContent={(arg: EventContentArg) => {
                const type = (arg.event.extendedProps as any).type as Department;
                const dept = DEPT_META[type] || DEPT_META.GENERAL;
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
          <div className="h-full rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <TaskBoard
              tasks={tasks}
              onTaskStatusChange={handleTaskStatusChange}
              typeStyles={DEPT_META}
            />
          </div>
        )}
      </div>

      {/* Estilos globales para FullCalendar (solo UI) */}
      <style jsx global>{`
        /* Toolbar */
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


export default function CalendarPage() {
  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <CalendarPageContent />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
