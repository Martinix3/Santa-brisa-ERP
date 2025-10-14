"use client";

import { useData } from "@/lib/dataprovider";
import { 
  listMyTasks, 
  listPriorityTasks, 
  listOverdueTasks,
  togglePriorityTask,
  markDoneTask 
} from "@/features/tasks/actions";
import { useEffect, useState } from "react";
import type { TaskNew, Department, TaskPriority } from "@/domain/ssot";
import { Plus, Calendar, Star, AlertTriangle, Check, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { TaskDrawer } from "@/features/tasks/components/TaskDrawer";
import { MiniCalendar } from "@/features/tasks/components/MiniCalendar";
import { TaskFilters } from "@/features/tasks/components/TaskFilters";
import { CalendarGrid } from "@/features/tasks/components/CalendarGrid";
import { applyTaskFilters } from "@/features/tasks/utils/dateFilters";

export default function CalendarioPage() {
  const { currentUser } = useData();
  const [tasks, setTasks] = useState<TaskNew[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<TaskNew[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskNew[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string>("");
  const [editingTask, setEditingTask] = useState<TaskNew | null>(null);
  const [filters, setFilters] = useState<{
    department?: Department;
    priority?: TaskPriority;
    due: 'ALL' | 'TODAY' | 'WEEK' | 'OVERDUE';
  }>({ due: 'ALL' });
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (currentUser?.id) {
      loadAllData();
    }
  }, [currentUser?.id]);

  // Atajo de teclado: N → nueva tarea
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if ((e.key === "n" || e.key === "N") && !drawerOpen) {
        e.preventDefault();
        handleNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  async function loadAllData() {
    if (!currentUser?.id) return;
    
    setLoading(true);
    try {
      const [tasksData, priorityData, overdueData] = await Promise.all([
        listMyTasks(currentUser.id),
        listPriorityTasks(currentUser.id),
        listOverdueTasks(currentUser.id),
      ]);
      
      setTasks(tasksData);
      setPriorityTasks(priorityData.slice(0, 9));
      setOverdueTasks(overdueData.slice(0, 9));
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleDateSelect(date: string | null) {
    setSelectedDate(date);
    
    if (date) {
      setEditingTask(null);
      setPrefilledDate(date);
      setDrawerOpen(true);
    }
  }

  function handleDateClick(date: Date) {
    setCurrentDate(date);
    setCalendarView('day');
  }

  function handleNewTask() {
    setEditingTask(null);
    setPrefilledDate("");
    setDrawerOpen(true);
  }

  function handleTaskClick(task: TaskNew) {
    setEditingTask(task);
    setPrefilledDate("");
    setDrawerOpen(true);
  }

  function handleTaskCreated() {
    loadAllData();
    setEditingTask(null);
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
    setEditingTask(null);
  }

  async function handleQuickDone(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    const result = await markDoneTask(taskId);
    if (result.ok) {
      loadAllData();
    }
  }

  async function handleQuickTogglePriority(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    const result = await togglePriorityTask(taskId);
    if (result.ok) {
      loadAllData();
    }
  }

  const filteredTasks = applyTaskFilters(
    selectedDate
      ? tasks.filter((task) => task.dueAt?.startsWith(selectedDate))
      : tasks,
    filters
  );

  const columns = [
    { id: "BACKLOG", label: "Por Hacer" },
    { id: "IN_PROGRESS", label: "En Progreso" },
    { id: "DONE", label: "Completadas" },
  ];

  // Vista AÑO: Full page
  if (calendarView === 'year') {
    return (
      <div className="p-4 md:p-6 space-y-5">
        {/* Header con todos los controles en una línea */}
      <div className="sb-header-glass p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* View Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            {[
              { value: 'day', label: 'Día' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'year', label: 'Año' }
            ].map((view) => (
              <button
                key={view.value}
                onClick={() => setCalendarView(view.value as any)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  calendarView === view.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(newDate.getFullYear() - 1);
                setCurrentDate(newDate);
              }}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary/50 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(newDate.getFullYear() + 1);
                setCurrentDate(newDate);
              }}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Filtros inline */}
          <div className="flex-1 min-w-[300px]">
            <TaskFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Nueva tarea */}
          <button 
            onClick={handleNewTask}
            className="h-10 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">N</kbd>
          </button>
        </div>
      </div>

        {/* Calendar Grid - Full Page */}
        <div className="sb-card-glass-subtle p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando calendario...</p>
              </div>
            </div>
          ) : (
            <CalendarGrid
              view="year"
              currentDate={currentDate}
              tasks={applyTaskFilters(tasks, filters)}
              onTaskClick={handleTaskClick}
              onDateClick={handleDateClick}
            />
          )}
        </div>

        {/* Task Drawer */}
        <TaskDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          onTaskCreated={handleTaskCreated}
          prefilledDate={prefilledDate}
          editTask={editingTask}
        />
      </div>
    );
  }

  // Vistas DÍA/SEMANA/MES: Layout con sidebar + Kanban
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header con todos los controles en una línea */}
      <div className="sb-header-glass p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* View Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            {[
              { value: 'day', label: 'Día' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'year', label: 'Año' }
            ].map((view) => (
              <button
                key={view.value}
                onClick={() => setCalendarView(view.value as any)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  calendarView === view.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                if (calendarView === 'day') newDate.setDate(newDate.getDate() - 1);
                else if (calendarView === 'week') newDate.setDate(newDate.getDate() - 7);
                else newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary/50 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                if (calendarView === 'day') newDate.setDate(newDate.getDate() + 1);
                else if (calendarView === 'week') newDate.setDate(newDate.getDate() + 7);
                else newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Filtros inline */}
          <div className="flex-1 min-w-[300px]">
            <TaskFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Nueva tarea */}
          <button 
            onClick={handleNewTask}
            className="h-10 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">N</kbd>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sidebar with CalendarGrid */}
        <aside className="space-y-5">
          <div className="sb-card-glass-subtle p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              <h2 className="text-sm font-semibold">
                {calendarView === 'day' ? 'Vista Día' : calendarView === 'week' ? 'Vista Semana' : 'Vista Mes'}
              </h2>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent mb-2"></div>
                  <p className="text-xs text-muted-foreground">Cargando...</p>
                </div>
              </div>
            ) : (
              <CalendarGrid
                view={calendarView}
                currentDate={currentDate}
                tasks={applyTaskFilters(tasks, filters)}
                onTaskClick={handleTaskClick}
                onDateClick={handleDateClick}
              />
            )}
          </div>
        </aside>

        {/* Main content - Kanban */}
        <main className="space-y-5">
          {/* Bloques Superiores: Prioritarias + Vencidas */}
          {!loading && (priorityTasks.length > 0 || overdueTasks.length > 0) && (
            <section className="space-y-4">
              {/* Prioritarias */}
              {priorityTasks.length > 0 && (
                <div className="sb-card-glass-light p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <h3 className="text-sm font-semibold">Prioritarias</h3>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                      {priorityTasks.length}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {priorityTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`dept-${task.department} rounded-xl p-3 border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
                        style={{
                          backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
                          borderColor: `rgb(var(--dept-border) / 0.4)`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div 
                            className="text-sm font-medium flex-1"
                            style={{ color: `rgb(var(--dept-text))` }}
                          >
                            {task.title}
                          </div>
                          {task.isPriority && <Flag className="w-3.5 h-3.5 opacity-70 shrink-0" />}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] flex-wrap">
                          <span 
                            className="px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `rgb(var(--dept-badge-bg) / 0.6)`,
                              color: `rgb(var(--dept-badge-text))`,
                            }}
                          >
                            {task.department}
                          </span>
                          {task.dueAt && (
                            <span className="text-muted-foreground">
                              📅 {new Date(task.dueAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vencidas */}
              {overdueTasks.length > 0 && (
                <div className="sb-card-glass-light p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h3 className="text-sm font-semibold">Vencidas</h3>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                      {overdueTasks.length}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {overdueTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`dept-${task.department} rounded-xl p-3 border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
                        style={{
                          backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
                          borderColor: `rgb(var(--dept-border) / 0.4)`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div 
                            className="text-sm font-medium flex-1"
                            style={{ color: `rgb(var(--dept-text))` }}
                          >
                            {task.title}
                          </div>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-medium shrink-0">
                            OVERDUE
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] flex-wrap">
                          <span 
                            className="px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `rgb(var(--dept-badge-bg) / 0.6)`,
                              color: `rgb(var(--dept-badge-text))`,
                            }}
                          >
                            {task.department}
                          </span>
                          {task.dueAt && (
                            <span className="text-muted-foreground">
                              📅 {new Date(task.dueAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Kanban Board */}
          {loading ? (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="sb-card-glass-light p-5">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-4" />
                  <div className="space-y-2">
                    {[...Array(3)].map((__, j) => (
                      <div key={j} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {columns.map((col) => {
                const columnTasks = filteredTasks
                  .filter((t) => t.status === col.id)
                  .sort((a, b) => 
                    ((b.priorityRank || 0) - (a.priorityRank || 0)) || 
                    ((a.dueAt || '').localeCompare(b.dueAt || ''))
                  );
                
                return (
                  <div key={col.id} className="sb-card-glass-light p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
                        {columnTasks.length}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {columnTasks.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center opacity-60">
                          Sin tareas
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className={`dept-${task.department} rounded-xl backdrop-blur-sm p-3 border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
                            style={{
                              backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
                              borderColor: `rgb(var(--dept-border) / 0.4)`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div 
                                  className="text-sm font-medium mb-2"
                                  style={{ color: `rgb(var(--dept-text))` }}
                                >
                                  {task.title}
                                </div>
                                
                                {task.desc && (
                                  <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    {task.desc}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                  <span 
                                    className="px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      backgroundColor: `rgb(var(--dept-badge-bg) / 0.6)`,
                                      color: `rgb(var(--dept-badge-text))`,
                                    }}
                                  >
                                    {task.department}
                                  </span>
                                  
                                  {task.isPriority && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300 font-medium">
                                      PRIO
                                    </span>
                                  )}
                                  
                                  {task.dueAt && (
                                    <span className="text-muted-foreground">
                                      📅 {new Date(task.dueAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  
                                  {task.slaBucket === 'OVERDUE' && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-medium">
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Acciones rápidas */}
                              <div className="shrink-0 flex flex-col gap-1">
                                <button
                                  className="p-1.5 rounded border border-border/40 bg-background/60 hover:bg-background hover:scale-110 transition-all"
                                  title="Marcar como hecha"
                                  onClick={(e) => handleQuickDone(e, task.id)}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className={`p-1.5 rounded border border-border/40 hover:scale-110 transition-all ${
                                    task.isPriority 
                                      ? 'bg-yellow-100 text-yellow-700' 
                                      : 'bg-background/60 hover:bg-background'
                                  }`}
                                  title={task.isPriority ? "Quitar prioritaria" : "Marcar como prioritaria"}
                                  onClick={(e) => handleQuickTogglePriority(e, task.id)}
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </main>
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onTaskCreated={handleTaskCreated}
        prefilledDate={prefilledDate}
        editTask={editingTask}
      />
    </div>
  );
}
