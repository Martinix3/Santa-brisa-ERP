"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import { createTask } from "@/features/tasks/actions";
import { listSubtasks, createSubtask, updateSubtask, deleteSubtask } from "@/features/tasks/subtasks/actions";
import { listActivities, addComment } from "@/features/tasks/activities/actions";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { X, FileText, CheckSquare, MessageSquare, Calendar, Check } from "lucide-react";
import type { TaskNew, TaskStatusNew, TaskPriority, Department, TaskSubtask, TaskActivity } from "@/domain/ssot";
import { TaskChecklist } from "./TaskChecklist";
import { TaskTimeline } from "./TaskTimeline";
import { VisitPlannerDialog } from "./VisitPlannerDialog";
import { UserSelector } from "./UserSelector";

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  prefilledDate?: string;
  editTask?: TaskNew | null;
}

type TabId = "info" | "subtasks" | "activity";

export function TaskDrawer({ open, onClose, onTaskCreated, prefilledDate, editTask }: TaskDrawerProps) {
  const { currentUser, data } = useData();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [showVisitPlanner, setShowVisitPlanner] = useState(false);
  
  const [formData, setFormData] = useState<{
    title: string;
    desc: string;
    kind: 'GENERICA' | 'VISITA' | 'COBRO' | 'PEDIDO' | 'MARKETING';
    status: TaskStatusNew;
    priority: TaskPriority;
    department: Department;
    dueAt: string;
    assignedToId: string;
  }>({
    title: "",
    desc: "",
    kind: "GENERICA",
    status: "BACKLOG",
    priority: "MEDIUM",
    department: "PERSONAL",
    dueAt: prefilledDate || "",
    assignedToId: currentUser?.id || "",
  });

  // Priority slider helper
  const priorityToNumber = (p: TaskPriority): number => {
    const map = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
    return map[p] || 1;
  };

  const numberToPriority = (n: number): TaskPriority => {
    const map = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
    return map[n] || 'MEDIUM';
  };

  const priorityLabels: Record<number, { label: string; color: string }> = {
    0: { label: 'Baja', color: 'bg-gray-400' },
    1: { label: 'Media', color: 'bg-yellow-400' },
    2: { label: 'Alta', color: 'bg-orange-500' },
    3: { label: 'Urgente', color: 'bg-red-500' },
  };

  const isEditMode = !!editTask;

  // Load task data when editing
  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title,
        desc: editTask.desc || "",
        kind: (editTask.kind as any) || "GENERICA",
        status: editTask.status,
        priority: editTask.priority || "MEDIUM",
        department: editTask.department,
        dueAt: editTask.dueAt || "",
        assignedToId: editTask.assignedToId || currentUser?.id || "",
      });
      
      // Load subtasks and activities
      loadTaskDetails(editTask.id);
    } else if (prefilledDate) {
      setFormData((prev) => ({ ...prev, dueAt: prefilledDate }));
    }
  }, [editTask, prefilledDate, currentUser?.id]);

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setFormData({
          title: "",
          desc: "",
          kind: "GENERICA",
          status: "BACKLOG",
          priority: "MEDIUM",
          department: "PERSONAL",
          dueAt: prefilledDate || "",
          assignedToId: currentUser?.id || "",
        });
        setSubtasks([]);
        setActivities([]);
        setActiveTab("info");
      }, 300);
    }
  }, [open, prefilledDate, currentUser?.id]);

  async function loadTaskDetails(taskId: string) {
    try {
      const [subtasksData, activitiesData] = await Promise.all([
        listSubtasks(taskId),
        listActivities(taskId),
      ]);
      setSubtasks(subtasksData);
      setActivities(activitiesData);
    } catch (error) {
      console.error("Error loading task details:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUser?.id) {
      alert("Usuario no autenticado");
      return;
    }

    if (!formData.title.trim()) {
      alert("El título es requerido");
      return;
    }

    setLoading(true);

    try {
      let result;
      
      if (isEditMode && editTask) {
        const { updateTask } = await import("@/features/tasks/actions");
        result = await updateTask({
          id: editTask.id,
          title: formData.title,
          desc: formData.desc || undefined,
          kind: formData.kind,
          status: formData.status,
          priority: formData.priority,
          department: formData.department,
          dueAt: formData.dueAt || undefined,
        });
      } else {
        result = await createTask({
          title: formData.title,
          desc: formData.desc || undefined,
          kind: formData.kind,
          status: formData.status,
          priority: formData.priority,
          department: formData.department,
          source: "MANUAL",
          dueAt: formData.dueAt || undefined,
          assignedToId: currentUser.id,
          createdById: currentUser.id,
        });
      }

      if (result.ok) {
        onTaskCreated?.();
        onClose();
      } else {
        alert(result.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} la tarea`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Error al ${isEditMode ? 'actualizar' : 'crear'} la tarea`);
    } finally {
      setLoading(false);
    }
  }

  // Subtask handlers
  async function handleAddSubtask(title: string) {
    if (!editTask?.id || !currentUser?.id) return;

    const result = await createSubtask({
      taskId: editTask.id,
      title,
      order: subtasks.length,
    });

    if (result.ok && result.subtask) {
      setSubtasks([...subtasks, result.subtask]);
    }
  }

  async function handleToggleSubtask(subtaskId: string, completed: boolean) {
    if (!editTask?.id || !currentUser?.id) return;

    const result = await updateSubtask(
      {
        id: subtaskId,
        taskId: editTask.id,
        completed,
      },
      currentUser.id
    );

    if (result.ok && result.subtask) {
      setSubtasks(subtasks.map((s) => (s.id === subtaskId ? result.subtask! : s)));
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    if (!editTask?.id) return;

    const result = await deleteSubtask(editTask.id, subtaskId);

    if (result.ok) {
      setSubtasks(subtasks.filter((s) => s.id !== subtaskId));
    }
  }

  // Comment handler
  async function handleAddComment(comment: string) {
    if (!editTask?.id || !currentUser?.id) return;

    const result = await addComment(
      editTask.id,
      currentUser.id,
      currentUser.name || "Usuario",
      comment
    );

    if (result.ok) {
      await loadTaskDetails(editTask.id);
    }
  }

  if (!open) return null;

  const tabs = [
    { id: "info" as TabId, label: "Información", icon: FileText },
    { id: "subtasks" as TabId, label: "Subtareas", icon: CheckSquare, badge: subtasks.length },
    { id: "activity" as TabId, label: "Actividad", icon: MessageSquare, badge: activities.length },
  ];

  return (
    <>
      <div className="sb-drawer__overlay" onClick={onClose} />

      <div className="sb-drawer">
        <div className="sb-drawer__handle md:hidden" />
        
        <div className="sb-drawer__header">
          <h2 className="text-xl font-semibold">
            {isEditMode ? "Editar Tarea" : "Nueva Tarea"}
          </h2>
          <button onClick={onClose} className="sb-btn sb-btn--ghost sb-btn--icon" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Only show in edit mode */}
        {isEditMode && (
          <div className="flex border-b border-gray-200 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "info" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Título Input Grande - Sin label visible */}
              <div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título de la tarea..."
                  className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 px-0 placeholder:text-muted-foreground/40"
                  required
                  autoFocus
                />
                <div className="h-px bg-border/40 mt-2" />
              </div>

              {/* Descripción */}
              <div>
                <label className="sb-label">Descripción</label>
                <textarea
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className="sb-textarea"
                  rows={3}
                />
              </div>

              {/* Estado Simplificado - Dropdown Moderno */}
              <div>
                <label className="sb-label">Estado</label>
                <div className="relative">
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="sb-select pr-10"
                  >
                    <option value="BACKLOG">📝 Por Hacer</option>
                    <option value="IN_PROGRESS">⚡ En Progreso</option>
                    <option value="DONE">✅ Completada</option>
                  </Select>
                </div>
              </div>

              {/* Prioridad Slider */}
              <div>
                <label className="sb-label mb-3">Prioridad</label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={priorityToNumber(formData.priority)}
                    onChange={(e) => setFormData({ ...formData, priority: numberToPriority(parseInt(e.target.value)) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, 
                        #9ca3af 0%, #9ca3af 25%,
                        #fbbf24 25%, #fbbf24 50%,
                        #f97316 50%, #f97316 75%,
                        #ef4444 75%, #ef4444 100%
                      )`
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${priorityLabels[priorityToNumber(formData.priority)].color}`} />
                      <span className="text-sm font-medium">
                        {priorityLabels[priorityToNumber(formData.priority)].label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`w-6 h-1.5 rounded-full transition-opacity ${
                            level <= priorityToNumber(formData.priority)
                              ? priorityLabels[level].color
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Departamento Visual */}
              <div>
                <label className="sb-label mb-3">Departamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'PERSONAL', label: 'Personal' },
                    { value: 'VENTAS', label: 'Ventas' },
                    { value: 'MARKETING', label: 'Marketing' },
                    { value: 'LOGISTICA', label: 'Logística' },
                    { value: 'PRODUCCION', label: 'Producción' },
                    { value: 'CALIDAD', label: 'Calidad' },
                    { value: 'FINANZAS', label: 'Finanzas' },
                    { value: 'ADMIN', label: 'Admin' },
                  ].map((dept) => {
                    const isSelected = formData.department === dept.value;
                    return (
                      <button
                        key={dept.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, department: dept.value as any })}
                        className={`dept-${dept.value} relative p-2.5 rounded-xl border-2 transition-all hover:scale-105 text-sm font-medium`}
                        style={{
                          backgroundColor: `rgb(var(--dept-bg) / ${isSelected ? '0.9' : '0.6'})`,
                          borderColor: `rgb(var(--dept-border) / ${isSelected ? '0.8' : '0.4'})`,
                          color: `rgb(var(--dept-text))`,
                        }}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                        {dept.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fecha límite */}
              <div>
                <label className="sb-label">Fecha límite</label>
                <Input
                  type="date"
                  value={formData.dueAt}
                  onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                  className="sb-input"
                />
              </div>

              {/* User Selector */}
              {data?.users && data.users.length > 0 && (
                <UserSelector
                  users={data.users}
                  selectedUserId={formData.assignedToId}
                  onSelect={(userId) => setFormData({ ...formData, assignedToId: userId })}
                  currentUserRole={currentUser?.role}
                  disabled={loading}
                />
              )}

              {/* Acciones Especiales */}
              {isEditMode && editTask && editTask.kind === "VISITA" && !editTask.eventId && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    Acciones de Visita
                  </div>
                  <SBButton
                    data-variant="secondary"
                    onClick={() => setShowVisitPlanner(true)}
                    disabled={!editTask.accountId}
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Planificar Visita en Calendario
                  </SBButton>
                  {!editTask.accountId && (
                    <p className="text-xs text-gray-600 mt-2">
                      Asigna una cuenta a la tarea para poder planificar la visita
                    </p>
                  )}
                </div>
              )}

              {isEditMode && editTask?.eventId && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Visita programada en calendario</span>
                  </div>
                </div>
              )}
            </form>
          )}

          {activeTab === "subtasks" && isEditMode && (
            <TaskChecklist
              subtasks={subtasks}
              onToggle={handleToggleSubtask}
              onAdd={handleAddSubtask}
              onDelete={handleDeleteSubtask}
              disabled={loading}
            />
          )}

          {activeTab === "activity" && isEditMode && (
            <TaskTimeline
              activities={activities}
              onAddComment={handleAddComment}
              disabled={loading}
            />
          )}
        </div>

        {/* Visit Planner Dialog */}
        {isEditMode && editTask && showVisitPlanner && (
          <VisitPlannerDialog
            task={editTask}
            open={showVisitPlanner}
            onClose={() => setShowVisitPlanner(false)}
            onVisitPlanned={() => {
              setShowVisitPlanner(false);
              onTaskCreated?.(); // Refresh to show updated status
            }}
            userId={currentUser?.id || ""}
          />
        )}

        {/* Footer */}
        <div className="sb-drawer__footer">
          <div className="flex gap-2">
            <SBButton
              type="submit"
              data-variant="primary"
              disabled={loading}
              className="flex-1"
              onClick={handleSubmit}
            >
              {loading 
                ? (isEditMode ? "Guardando..." : "Creando...") 
                : (isEditMode ? "Guardar Cambios" : "Crear Tarea")
              }
            </SBButton>
            <SBButton type="button" data-variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </SBButton>
          </div>
        </div>
      </div>
    </>
  );
}
