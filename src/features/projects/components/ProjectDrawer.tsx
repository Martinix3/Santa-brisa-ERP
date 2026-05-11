"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useEffect, useState } from "react";
import { Project, ProjectIdea, TaskNew, User } from "@/domain/ssot";
import { X, Calendar, Users, Plus, TrendingUp } from "lucide-react";
import { IdeasBoard } from "./IdeasBoard";
import { ConvertIdeaModal } from "./ConvertIdeaModal";
import {
  getProject,
  listProjectIdeas,
  createIdea,
  deleteIdea,
  convertIdeaToTask,
  getProjectProgress,
} from "../actions";
import { createTask, listProjectTasks } from "@/features/tasks/actions";
import { ProgressCircle } from "./ProgressCircle";

interface ProjectDrawerProps {
  open: boolean;
  projectId: string | null;
  users: User[];
  onClose: () => void;
  onTaskCreated?: () => void;
}

export function ProjectDrawer({
  open,
  projectId,
  users,
  onClose,
  onTaskCreated,
}: ProjectDrawerProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [tasks, setTasks] = useState<TaskNew[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<ProjectIdea | null>(null);

  // Form state para nueva tarea
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);



  const loadProjectData = React.useCallback(async () => {
    if (!projectId) {
      console.log("[ProjectDrawer] No projectId");
      return;
    }

    console.log("[ProjectDrawer] Loading data for project:", projectId);
    setLoading(true);
    try {
      const [projectRes, ideasRes, progressRes, tasksData] = await Promise.all([
        getProject(projectId),
        listProjectIdeas(projectId),
        getProjectProgress(projectId),
        listProjectTasks(projectId),
      ]);

      console.log("[ProjectDrawer] Received tasksData:", tasksData);
      console.log("[ProjectDrawer] tasksData length:", tasksData?.length || 0);

      if (projectRes.ok) setProject(projectRes.data as Project);
      if (ideasRes.ok) setIdeas(ideasRes.data as ProjectIdea[]);
      if (progressRes.ok && progressRes.data) {
        setProgress(progressRes.data.progress);
      }
      setTasks(tasksData);

      console.log("[ProjectDrawer] Tasks state updated. New tasks count:", tasksData?.length || 0);
    } catch (error) {
      console.error("[ProjectDrawer] Error loading project:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) {
      loadProjectData();
    }
  }, [open, projectId, loadProjectData]);

  async function handleCreateIdea(text: string) {
    if (!projectId || !users[0]) return;

    const result = await createIdea({
      projectId,
      text,
      createdById: users[0].id,
    });

    if (result.ok) {
      loadProjectData();
    }
  }

  async function handleDeleteIdea(ideaId: string) {
    const result = await deleteIdea(ideaId);
    if (result.ok) {
      loadProjectData();
    }
  }

  function handleConvertIdeaClick(ideaId: string) {
    const idea = ideas.find((i) => i.id === ideaId);
    if (idea) {
      setSelectedIdea(idea);
      setConvertModalOpen(true);
    }
  }

  async function handleConvertIdea(data: {
    ideaId: string;
    title?: string;
    dueAt?: string;
    assignedToId: string;
  }) {
    const result = await convertIdeaToTask({
      ideaId: data.ideaId,
      taskData: {
        title: data.title,
        dueAt: data.dueAt,
        assignedToId: data.assignedToId,
      },
    });

    if (result.ok) {
      // Si el usuario asignado no está en el equipo, agregarlo
      if (project && projectId && !project.teamMemberIds.includes(data.assignedToId)) {
        const { updateProject } = await import("../actions");
        await updateProject(projectId, {
          teamMemberIds: [...project.teamMemberIds, data.assignedToId],
        });
      }

      setConvertModalOpen(false);
      setSelectedIdea(null);
      loadProjectData();
      onTaskCreated?.();
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !newTaskAssignedTo || !projectId || !users[0]) {
      return;
    }

    setCreatingTask(true);
    try {
      await createTask({
        kind: "GENERICA",
        title: newTaskTitle.trim(),
        status: "BACKLOG",
        department: project?.department || "MARKETING",
        source: "MANUAL",
        projectId: projectId,
        dueAt: newTaskDueAt || undefined,
        assignedToId: newTaskAssignedTo,
        createdById: users[0].id,
      });

      // Si el usuario asignado no está en el equipo, agregarlo
      if (project && !project.teamMemberIds.includes(newTaskAssignedTo)) {
        const { updateProject } = await import("../actions");
        await updateProject(projectId, {
          teamMemberIds: [...project.teamMemberIds, newTaskAssignedTo],
        });
      }

      // Reset form
      setNewTaskTitle("");
      setNewTaskDueAt("");
      setNewTaskAssignedTo("");

      loadProjectData();
      onTaskCreated?.();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setCreatingTask(false);
    }
  }

  if (!open) return null;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="sb-drawer__overlay" onClick={onClose} />

      {/* Drawer */}
      <aside className="sb-drawer sb-drawer--wide" role="dialog" aria-label="Detalle del proyecto">
        {/* Header */}
        <div className="sb-drawer__header">
          <div className="flex items-center gap-4">
            {project && (
              <>
                <ProgressCircle progress={progress} size={50} strokeWidth={6} />
                <div>
                  <h2 className="text-xl font-bold">{project.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `rgb(var(--dept-badge-bg))`,
                        color: `rgb(var(--dept-badge-text))`,
                      }}
                    >
                      {project.department}
                    </span>
                    {project.status === "ACTIVE" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Activo
                      </span>
                    )}
                    {project.endAt && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(project.endAt).toLocaleDateString("es-ES")}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-secondary/50 focus-ring transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando proyecto...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Sección IDEAS */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Ideas
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ideas.length})
                  </span>
                </h3>
                <IdeasBoard
                  ideas={ideas}
                  department={project?.department || "MARKETING"}
                  onConvertIdea={handleConvertIdeaClick}
                  onDeleteIdea={handleDeleteIdea}
                  onCreateIdea={handleCreateIdea}
                />
              </div>

              <div className="divider" />

              {/* 2. Sección TAREAS */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Tareas
                  <span className="text-xs text-muted-foreground font-normal">
                    ({tasks.length})
                  </span>
                </h3>

                {/* Form inline para crear tarea */}
                <div className="mb-4 p-4 border-2 border-dashed border-border rounded-lg bg-secondary/20">
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Título de la tarea..."
                      className="col-span-5 sb-input"
                    />
                    <input
                      type="date"
                      value={newTaskDueAt}
                      onChange={(e) => setNewTaskDueAt(e.target.value)}
                      className="col-span-3 sb-input"
                    />
                    <select
                      value={newTaskAssignedTo}
                      onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                      className="col-span-3 sb-input"
                    >
                      <option value="">Asignar a...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateTask}
                      disabled={!newTaskTitle.trim() || !newTaskAssignedTo || creatingTask}
                      className="col-span-1 sb-btn sb-btn--primary sb-btn--sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Lista de tareas */}
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No hay tareas vinculadas todavía. (Total en estado: {tasks.length})
                    <br />
                    Crea una tarea arriba o convierte una idea.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {task.dueAt && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(task.dueAt).toLocaleDateString("es-ES")}
                              </span>
                            )}
                            <span>
                              {users.find((u) => u.id === task.assignedToId)?.name || "Sin asignar"}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${task.status === "DONE"
                            ? "bg-green-100 text-green-700"
                            : task.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="divider" />

              {/* 3. Sección ESTADÍSTICAS */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Estadísticas</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg border border-border bg-secondary/20">
                    <div className="text-2xl font-bold text-primary">{progress}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Progreso</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-border bg-secondary/20">
                    <div className="text-2xl font-bold">{ideas.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Ideas</div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-border bg-secondary/20">
                    <div className="text-2xl font-bold">{tasks.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Tareas</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Convert Modal */}
      <ConvertIdeaModal
        open={convertModalOpen}
        idea={selectedIdea}
        users={users}
        onClose={() => {
          setConvertModalOpen(false);
          setSelectedIdea(null);
        }}
        onConvert={handleConvertIdea}
      />
    </>
  );
}
