"use client";

import { useData } from "@/lib/dataprovider";
import { listMyTasks, listPriorityTasks, listOverdueTasks } from "@/features/tasks/actions";
import { useEffect, useState } from "react";
import type { TaskNew, Department, TaskPriority } from "@/domain/ssot";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import { Plus } from "lucide-react";
import { TaskDrawer } from "@/features/tasks/components/TaskDrawer";
import { TaskFilters } from "@/features/tasks/components/TaskFilters";
import { SpecialShelf } from "@/features/tasks/components/SpecialShelf";
import { applyTaskFilters } from "@/features/tasks/utils/dateFilters";
import { IdeasWidget } from "@/features/projects/components";

// Imports de dashboards por rol
import DashboardOps from "@/components/dashboards/DashboardOps";
import DashboardSales from "@/components/dashboards/DashboardSales";
import DashboardAdmin from "@/components/dashboards/DashboardAdmin";
import DashboardManager from "@/components/dashboards/DashboardManager";
import DashboardDistributor from "@/components/dashboards/DashboardDistributor";
import DashboardTechnical from "@/components/dashboards/DashboardTechnical";
import DashboardMarketing from "@/components/dashboards/DashboardMarketing";

export default function DashboardPage() {
  const { currentUser } = useData();

  // Router por rol - Renderiza el dashboard correspondiente
  if (currentUser?.role === "ops") {
    return <DashboardOps />;
  }
  
  if (currentUser?.role === "comercial") {
    return <DashboardSales />;
  }
  
  if (currentUser?.role === "marketing") {
    return <DashboardMarketing />;
  }
  
  if (currentUser?.role === "admin") {
    return <DashboardAdmin />;
  }
  
  if (currentUser?.role === "owner") {
    return <DashboardManager />;
  }
  
  if (currentUser?.role === "inversor") {
    return <DashboardAdmin />; // Inversor ve dashboard admin
  }
  
  if (currentUser?.role === "distribuidor") {
    return <DashboardDistributor />;
  }
  
  // DashboardTechnical se accede desde DashboardManager (owner)
  // No hay rol "technical" en el SSOT

  // Fallback: Dashboard Personal (tareas) para usuarios sin rol específico
  const [tasks, setTasks] = useState<TaskNew[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<TaskNew[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskNew[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskNew | null>(null);
  const [filters, setFilters] = useState<{
    department?: Department;
    priority?: TaskPriority;
    due: 'ALL' | 'TODAY' | 'WEEK' | 'OVERDUE';
  }>({ due: 'ALL' });

  useEffect(() => {
    if (currentUser?.id) {
      loadAllData();
    }
  }, [currentUser?.id]);

  async function loadAllData() {
    if (!currentUser?.id) return;
    
    setLoading(true);
    try {
      // Cargar en paralelo
      const [allTasks, priority, overdue] = await Promise.all([
        listMyTasks(currentUser.id),
        listPriorityTasks(currentUser.id),
        listOverdueTasks(currentUser.id),
      ]);
      
      setTasks(allTasks);
      setPriorityTasks(priority);
      setOverdueTasks(overdue);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleNewTask() {
    setEditingTask(null);
    setDrawerOpen(true);
  }

  function handleTaskClick(task: TaskNew) {
    setEditingTask(task);
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

  const filteredTasks = applyTaskFilters(tasks, filters);

  const columns = [
    { id: "BACKLOG", label: "Backlog" },
    { id: "IN_PROGRESS", label: "En Progreso" },
    { id: "DRAFT", label: "Borrador" },
    { id: "DONE", label: "Completadas" },
  ];

  if (!currentUser) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center py-8">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Personal</h1>
        <SBButton data-variant="primary" onClick={handleNewTask}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva tarea
        </SBButton>
      </header>

      {/* Filters */}
      <TaskFilters filters={filters} onFiltersChange={setFilters} />

      {/* Ideas Widget */}
      {currentUser?.id && (
        <IdeasWidget userId={currentUser.id} onRefresh={loadAllData} />
      )}

      {/* Special Shelves - Prioritarias y Vencidas */}
      {!loading && (
        <div className="space-y-6">
          <SpecialShelf
            title="Prioritarias"
            emoji="⭐"
            items={priorityTasks}
            onTaskClick={handleTaskClick}
          />
          <SpecialShelf
            title="Vencidas"
            emoji="⚠️"
            items={overdueTasks}
            onTaskClick={handleTaskClick}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando tareas...</div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {columns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            
            return (
              <SBCard key={col.id}>
                <div className="sb-card__header">
                  <div className="sb-card__title">
                    {col.label}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({columnTasks.length})
                    </span>
                  </div>
                </div>
                <div className="sb-card__content space-y-2">
                  {columnTasks.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      Sin tareas
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="text-sm font-medium">{task.title}</div>
                        {task.desc && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {task.desc}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">
                            {task.department}
                          </span>
                          {task.priority && (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                task.priority === "URGENT"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "HIGH"
                                  ? "bg-orange-100 text-orange-700"
                                  : task.priority === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.dueAt && (
                            <span>
                              📅 {new Date(task.dueAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SBCard>
            );
          })}
        </section>
      )}

      {/* Task Drawer */}
      <TaskDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onTaskCreated={handleTaskCreated}
        editTask={editingTask}
      />
    </div>
  );
}
