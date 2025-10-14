"use client";

import React, { useEffect, useState } from "react";
import { useData } from "@/lib/dataprovider";
import { Project, User, Department, ProjectStatus } from "@/domain/ssot";
import { Plus, TrendingUp, TrendingDown, Filter, LayoutGrid, LayoutList } from "lucide-react";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectDrawer } from "@/features/projects/components/ProjectDrawer";
import { CreateProjectDrawer } from "@/features/projects/components/CreateProjectDrawer";
import { IdeasWidget } from "@/features/projects/components/IdeasWidget";
import { KpiCard } from "@/components/dashboards/shared/KpiCard";
import { ProjectKanban } from "@/components/projects/ProjectKanban";
import { listProjects, getProjectProgress, getProjectsKPIs, updateProjectStatus } from "@/server/actions/projects";

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
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [filters, setFilters] = useState<{
    department?: Department;
    status?: string;
  }>({});
  const [kpis, setKpis] = useState({
    activeCount: 0,
    onTimePercentage: 0,
    budgetVariance: 0,
    avgProgress: 0
  });

  const users = data?.users || [];

  useEffect(() => {
    if (currentUser) {
      loadProjects();
      loadKPIs();
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

  async function loadKPIs() {
    try {
      const result = await getProjectsKPIs();
      if (result.success && result.data) {
        setKpis(result.data);
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
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

  async function handleStatusChange(projectId: string, newStatus: ProjectStatus) {
    const result = await updateProjectStatus(projectId, newStatus);
    
    if (result.success) {
      // Recargar proyectos y KPIs
      await loadProjects();
      await loadKPIs();
    } else {
      console.error('Error updating status:', result.error);
      // TODO: Mostrar toast de error
    }
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
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold">Proyectos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona proyectos con ideas y tareas vinculadas
            </p>
          </div>

          <button
            onClick={() => setCreateDrawerOpen(true)}
            className="sb-btn sb-btn--primary"
          >
            <Plus size={18} />
            Nuevo Proyecto
          </button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="ACTIVOS"
            value={kpis.activeCount.toString()}
            variant="dark"
          />
          <KpiCard
            label="ON-TIME %"
            value={`${kpis.onTimePercentage}%`}
            variant="light"
            trend={kpis.onTimePercentage >= 80 ? 'up' : kpis.onTimePercentage >= 60 ? 'neutral' : 'down'}
            icon={kpis.onTimePercentage >= 80 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          />
          <KpiCard
            label="BUDGET VAR"
            value={`${kpis.budgetVariance >= 0 ? '+' : ''}${kpis.budgetVariance}%`}
            variant="light"
            trend={kpis.budgetVariance <= 0 ? 'up' : kpis.budgetVariance <= 10 ? 'neutral' : 'down'}
          />
          <KpiCard
            label="PROGRESO"
            value={`${kpis.avgProgress}%`}
            variant="subtle"
          />
        </div>

        {/* Filtros y Vista Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="sb-tabs">
            <button
              className={`sb-tab ${viewMode === 'grid' ? 'sb-tab--active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Vista de cuadrícula"
            >
              <LayoutGrid size={18} />
              Lista
            </button>
            <button
              className={`sb-tab ${viewMode === 'kanban' ? 'sb-tab--active' : ''}`}
              onClick={() => setViewMode('kanban')}
              aria-label="Vista Kanban"
            >
              <LayoutList size={18} />
              Kanban
            </button>
          </div>

          {/* Filtros (solo en vista grid) */}
          {viewMode === 'grid' && (
            <>
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
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Activos</option>
                <option value="ON_HOLD">En pausa</option>
                <option value="REVIEW">En revisión</option>
                <option value="COMPLETED">Completados</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Content: Grid o Kanban según viewMode */}
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
      ) : viewMode === 'kanban' ? (
        <ProjectKanban
          projects={projects}
          onStatusChange={handleStatusChange}
        />
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
