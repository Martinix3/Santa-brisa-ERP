"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project, ProjectStatus, User } from "@/domain/ssot";
import { DEPT_META } from "@/domain/ssot";
import { GripVertical } from "lucide-react";

type ProjectWithProgress = Project & {
  progress: number;
  teamMembers: User[];
};

type KanbanProps = {
  projects: ProjectWithProgress[];
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
};

const COLUMNS: { status: ProjectStatus; label: string }[] = [
  { status: 'PLANNING', label: 'Planning' },
  { status: 'ACTIVE', label: 'Activos' },
  { status: 'ON_HOLD', label: 'En Pausa' },
  { status: 'REVIEW', label: 'Revisión' },
  { status: 'COMPLETED', label: 'Completados' },
];

function ProjectCard({ project }: { project: ProjectWithProgress }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const deptClassName = DEPT_META[project.department]?.className || 'dept-OPS';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sb-card-glass-light p-4 mb-3 cursor-move hover-raise ${
        isDragging ? 'ring-2 ring-primary' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div className="flex items-center gap-2 mb-2">
        <GripVertical size={16} className="text-muted-foreground" />
        <h4 className="font-semibold text-sm flex-1 truncate">{project.title}</h4>
      </div>

      {/* Department Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`sb-badge text-xs ${deptClassName} dept-color-tag`}>
          {DEPT_META[project.department]?.label || project.department}
        </span>
        {project.priority && (
          <span
            className={`sb-badge text-xs ${
              project.priority === 'CRITICAL'
                ? 'sb-badge--destructive'
                : project.priority === 'HIGH'
                ? 'sb-badge--warning'
                : ''
            }`}
          >
            {project.priority}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {project.progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Team Members */}
      {project.teamMembers.length > 0 && (
        <div className="flex items-center gap-1">
          {project.teamMembers.slice(0, 3).map((member) => (
            <div
              key={member.id}
              className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium"
              title={member.name}
            >
              {member.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          {project.teamMembers.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
              +{project.teamMembers.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Deadline Warning */}
      {project.deadline && (
        <div className="mt-2 text-xs text-muted-foreground">
          {new Date(project.deadline) < new Date() ? (
            <span className="text-destructive font-medium">⚠️ Vencido</span>
          ) : (
            <span>📅 {new Date(project.deadline).toLocaleDateString('es-ES')}</span>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  projects,
  onDrop,
}: {
  status: ProjectStatus;
  label: string;
  projects: ProjectWithProgress[];
  onDrop: (projectId: string, newStatus: ProjectStatus) => void;
}) {
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{label}</h3>
          <span className="sb-kpi-badge">{projects.length}</span>
        </div>
        <div className="h-1 bg-primary/20 rounded-full" />
      </div>

      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[400px]">
          {projects.length === 0 ? (
            <div className="sb-card-glass-light p-8 text-center border-2 border-dashed">
              <p className="text-sm text-muted-foreground">
                Arrastra proyectos aquí
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function ProjectKanban({ projects, onStatusChange }: KanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group projects by status
  const projectsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = projects.filter((p) => p.status === col.status);
    return acc;
  }, {} as Record<ProjectStatus, ProjectWithProgress[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeProject = projects.find((p) => p.id === active.id);
    if (!activeProject) {
      setActiveId(null);
      return;
    }

    // Find which column the item was dropped on
    const targetColumn = COLUMNS.find((col) =>
      projectsByStatus[col.status].some((p) => p.id === over.id)
    );

    if (targetColumn && targetColumn.status !== activeProject.status) {
      setLoading(true);
      try {
        await onStatusChange(activeProject.id, targetColumn.status);
      } catch (error) {
        console.error('Error updating status:', error);
      } finally {
        setLoading(false);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeProject = activeId
    ? projects.find((p) => p.id === activeId)
    : null;

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="sb-card-glass-light p-4">
            <p className="text-sm font-medium">Actualizando...</p>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              projects={projectsByStatus[column.status] || []}
              onDrop={onStatusChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProject ? <ProjectCard project={activeProject} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
