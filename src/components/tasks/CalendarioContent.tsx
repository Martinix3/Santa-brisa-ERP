"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useState, useMemo } from "react";
import { Plus, Calendar as CalendarIcon, LayoutList, AlertTriangle, Star } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { TaskDrawer } from "@/features/tasks/components/TaskDrawer";
import { CalendarGrid } from "@/features/tasks/components/CalendarGrid";
import { KpiCard } from "@/components/dashboards/shared/KpiCard";
import { DataToolbar } from "@/components/shared/DataToolbar";
import { useDataFilters } from "@/hooks/useDataFilters";
import { markDoneTask, togglePriorityTask } from "@/features/tasks/actions";
import type { TaskWithKPIs, TasksKPIs } from "@/types/tasks";
import type { Department, TaskPriority } from "@/domain/ssot";
import { cn } from "@/lib/utils";

interface CalendarioContentProps {
  tasks: TaskWithKPIs[];
  kpis: TasksKPIs;
  userId: string;
}

type ViewMode = "calendar" | "kanban" | "list";

export function CalendarioContent({ tasks, kpis, userId }: CalendarioContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithKPIs | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtros con DataToolbar
  const {
    filtered: filteredTasks,
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
  } = useDataFilters<TaskWithKPIs>(tasks, {
    searchFields: ["title", "desc"],
    filters: {
      department: (task, value: any) => task.department === value,
      status: (task, value: any) => task.status === value,
    },
  });

  // Keyboard shortcut: N → nueva tarea
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "n" || e.key === "N") && !drawerOpen) {
        e.preventDefault();
        handleNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function handleNewTask() {
    setSelectedTask(null);
    setPrefilledDate("");
    setDrawerOpen(true);
  }

  function handleTaskClick(task: TaskWithKPIs) {
    setSelectedTask(task);
    setDrawerOpen(true);
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
    setSelectedTask(null);
  }

  function handleTaskCreated() {
    // Recargar página para actualizar datos
    window.location.reload();
  }

  async function handleQuickDone(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    const result = await markDoneTask(taskId);
    if (result.ok) {
      window.location.reload();
    }
  }

  async function handleQuickTogglePriority(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    const result = await togglePriorityTask(taskId);
    if (result.ok) {
      window.location.reload();
    }
  }

  function handleDateClick(date: Date) {
    setCurrentDate(date);
    setViewMode("calendar");
  }

  // Separate tasks for special sections
  const priorityTasks = useMemo(() => 
    filteredTasks.filter(t => t.isPriority && t.status !== "DONE").slice(0, 6),
    [filteredTasks]
  );

  const overdueTasks = useMemo(() =>
    filteredTasks.filter(t => t.isOverdue && t.status !== "DONE").slice(0, 6),
    [filteredTasks]
  );

  // Kanban columns
  const columns = [
    { id: "BACKLOG", label: "Por Hacer", tasks: filteredTasks.filter(t => t.status === "BACKLOG") },
    { id: "IN_PROGRESS", label: "En Progreso", tasks: filteredTasks.filter(t => t.status === "IN_PROGRESS") },
    { id: "DONE", label: "Completadas", tasks: filteredTasks.filter(t => t.status === "DONE") },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold">Calendario y Tareas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona tus tareas diarias y visualiza tu calendario
            </p>
          </div>

          <button
            onClick={handleNewTask}
            className="h-10 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">N</kbd>
          </button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <KpiCard label="TOTAL" value={kpis.total.toString()} variant="dark" />
          <KpiCard label="HOY" value={kpis.today.toString()} variant="light" />
          <KpiCard label="ESTA SEMANA" value={kpis.thisWeek.toString()} variant="light" />
          <KpiCard 
            label="VENCIDAS" 
            value={kpis.overdue.toString()} 
            variant="light"
            trend={kpis.overdue === 0 ? "up" : "down"}
          />
          <KpiCard label="PRIORITARIAS" value={kpis.priority.toString()} variant="subtle" />
        </div>

        {/* View Toggle + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            {[
              { value: "calendar" as ViewMode, label: "Calendario", icon: CalendarIcon },
              { value: "kanban" as ViewMode, label: "Kanban", icon: LayoutList },
              { value: "list" as ViewMode, label: "Lista", icon: LayoutList },
            ].map((view) => (
              <button
                key={view.value}
                onClick={() => setViewMode(view.value)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5",
                  viewMode === view.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <view.icon size={16} />
                {view.label}
              </button>
            ))}
          </div>

          {/* DataToolbar */}
          <div className="flex-1 min-w-[300px]">
            <DataToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar tareas..."
              filters={[
                {
                  key: "department",
                  label: "Departamento",
                  options: [
                    { value: "", label: "Todos" },
                    { value: "MARKETING", label: "Marketing" },
                    { value: "VENTAS", label: "Ventas" },
                    { value: "PRODUCCION", label: "Producción" },
                    { value: "PERSONAL", label: "Personal" },
                  ],
                  value: (filters.department as string) || "",
                  onChange: (value: any) => setFilter("department", value || undefined),
                },
                {
                  key: "status",
                  label: "Estado",
                  options: [
                    { value: "", label: "Todos" },
                    { value: "BACKLOG", label: "Por Hacer" },
                    { value: "IN_PROGRESS", label: "En Progreso" },
                    { value: "DONE", label: "Completadas" },
                  ],
                  value: (filters.status as string) || "",
                  onChange: (value: any) => setFilter("status", value || undefined),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Special Sections: Prioritarias + Vencidas */}
      {(priorityTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Prioritarias */}
          {priorityTasks.length > 0 && (
            <div className="sb-card-glass-light p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-yellow-600" />
                <h3 className="text-sm font-semibold">Prioritarias</h3>
                <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                  {priorityTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {priorityTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    onQuickDone={(e) => handleQuickDone(e, task.id)}
                    onQuickTogglePriority={(e) => handleQuickTogglePriority(e, task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Vencidas */}
          {overdueTasks.length > 0 && (
            <div className="sb-card-glass-light p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-semibold">Vencidas</h3>
                <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                  {overdueTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    onQuickDone={(e) => handleQuickDone(e, task.id)}
                    onQuickTogglePriority={(e) => handleQuickTogglePriority(e, task.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content: Calendar, Kanban, or List */}
      {viewMode === "calendar" && (
        <div className="sb-card-glass-subtle p-6">
          <CalendarGrid
            view="month"
            currentDate={currentDate}
            tasks={filteredTasks as any}
            onTaskClick={handleTaskClick as any}
            onDateClick={handleDateClick}
          />
        </div>
      )}

      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map((col) => (
            <div key={col.id} className="sb-card-glass-light p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                  {col.tasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {col.tasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center opacity-60">
                    Sin tareas
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => handleTaskClick(task)}
                      onQuickDone={(e) => handleQuickDone(e, task.id)}
                      onQuickTogglePriority={(e) => handleQuickTogglePriority(e, task.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="sb-card-glass-light p-5">
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay tareas que mostrar</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  onQuickDone={(e) => handleQuickDone(e, task.id)}
                  onQuickTogglePriority={(e) => handleQuickTogglePriority(e, task.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Task Drawer */}
      <TaskDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onTaskCreated={handleTaskCreated}
        prefilledDate={prefilledDate}
        editTask={selectedTask}
      />
    </div>
  );
}
