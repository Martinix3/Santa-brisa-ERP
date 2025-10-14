"use client";

import React, { useEffect, useState } from "react";
import { useData } from "@/lib/dataprovider";
import { Project, User, Department } from "@/domain/ssot";
import { Plus, Filter } from "lucide-react";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectDrawer } from "@/features/projects/components/ProjectDrawer";
import { CreateProjectDrawer } from "@/features/projects/components/CreateProjectDrawer";
import { IdeasWidget } from "@/features/projects/components/IdeasWidget";
import { listProjects, getProjectProgress } from "@/features/projects/actions";
// import { GlobalDragProvider, DROP_IDS, DroppableZone } from "@/features/dnd";

type ProjectWithProgress = Project & {
  progress: number;
  teamMembers: User[];
};

export default function ProyectosPage() {
  const { currentUser, data } = useData();
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<{
    department?: Department;
    status?: string;
  }>({});

  const users = data?.users || [];

  useEffect(() => {
    if (currentUser) {
      loadProjects();
    }
  }, [currentUser, filters]);

  async function loadProjects() {
    setLoading(true);
    try {
      const result = await listProjects(filters);
      
      if (result.ok && result.data) {
        // Enriquecer con progreso y miembros
        const enriched = await Promise.all(
          result.data.map(async (proj: Project) => {
            const progressRes = await getProjectProgress(proj.id);
            const progress = progressRes.ok && progressRes.data ? progressRes.data.progress : 0;
            
            // Obtener miembros del equipo
            const teamMembers = users.filter((u: User) => 
              proj.teamMemberIds.includes(u.id)
            );

            return {
              ...proj,
              progress,
              teamMembers,
            };
          })
        );
        
        setProjects(enriched);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleProjectClick(projectId: string) {
    setSelectedProjectId(projectId);
    setDrawerOpen(true);
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
    setSelectedProjectId(null);
  }

  function handleTaskCreated() {
    loadProjects(); // Recargar para actualizar progreso
  }

  if (!currentUser) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div className="sb-card-glass-light p-12 text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="sb-header-glass p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Proyectos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona proyectos con ideas y tareas vinculadas
            </p>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            <select
              value={filters.department || ""}
              onChange={(e) => setFilters({ ...filters, department: (e.target.value || undefined) as Department | undefined })}
              className="sb-select"
            >
              <option value="">Todos los departamentos</option>
              <option value="MARKETING">Marketing</option>
              <option value="VENTAS">Ventas</option>
              <option value="PRODUCCION">Producción</option>
              <option value="PERSONAL">Personal</option>
            </select>

            <select
              value={filters.status || ""}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="sb-select"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="ON_HOLD">En pausa</option>
              <option value="COMPLETED">Completados</option>
            </select>
          </div>

          {/* Nuevo Proyecto */}
          <button
            onClick={() => setCreateDrawerOpen(true)}
            className="h-10 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Grid Unificado: Ideas + Nuevo Proyecto + Proyectos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="sb-card-glass-light p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4" />
              <div className="h-24 bg-gray-100 rounded mb-4" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {/* Tarjeta: Ideas Sueltas */}
          {currentUser?.id && (
            <IdeasWidget userId={currentUser.id} onRefresh={loadProjects} />
          )}

          {/* Tarjeta: Nuevo Proyecto */}
          <div 
            className="rounded-2xl p-6 border-2 border-dashed border-border bg-background cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
            onClick={() => setCreateDrawerOpen(true)}
          >
            <h3 className="text-2xl font-bold text-center mb-6">
              Nuevo Proyecto
            </h3>
            <div className="flex justify-center mb-6">
              <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center border-4 bg-secondary/30 border-border">
                <Plus size={48} className="text-primary" />
              </div>
            </div>
            <div className="text-sm text-center text-muted-foreground">
              Crea un nuevo proyecto
            </div>
          </div>

          {/* Tarjetas: Proyectos Existentes */}
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={project.progress}
              teamMembers={project.teamMembers}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}

          {/* Empty state dentro del grid si no hay proyectos */}
          {projects.length === 0 && !currentUser && (
            <div className="col-span-full sb-card-glass-light p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No hay proyectos</h3>
                <p className="text-sm text-muted-foreground">
                  {filters.department || filters.status
                    ? "No se encontraron proyectos con los filtros aplicados"
                    : "Crea tu primer proyecto para empezar a organizar ideas y tareas"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Drawer */}
      <ProjectDrawer
        open={drawerOpen}
        projectId={selectedProjectId}
        users={users}
        onClose={handleDrawerClose}
        onTaskCreated={handleTaskCreated}
      />

      {/* Create Project Drawer */}
      {currentUser && (
        <CreateProjectDrawer
          open={createDrawerOpen}
          users={users}
          currentUserId={currentUser.id}
          onClose={() => setCreateDrawerOpen(false)}
          onSuccess={loadProjects}
        />
      )}
    </div>
  );
}
