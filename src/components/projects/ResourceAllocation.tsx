"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from "react";
import type { Project, User } from "@/domain/ssot";
import { AlertCircle, Users } from "lucide-react";

type ResourceAllocationProps = {
  projects: Project[];
  users: User[];
};

export function ResourceAllocation({ projects, users }: ResourceAllocationProps) {
  // Calcular carga por usuario
  const userWorkload = users.map(user => {
    const allocations = projects.flatMap(project => 
      (project.resourceAllocation || []).filter(alloc => alloc.userId === user.id)
    );

    const totalHours = allocations.reduce((sum, alloc) => sum + alloc.hoursAllocated, 0);
    const projectCount = new Set(
      projects
        .filter(p => p.resourceAllocation?.some(a => a.userId === user.id))
        .map(p => p.id)
    ).size;

    // Roles del usuario en proyectos
    const roles = allocations.map(a => a.role);
    const leadCount = roles.filter(r => r === 'LEAD').length;

    return {
      user,
      totalHours,
      projectCount,
      leadCount,
      isOverloaded: totalHours > 40,
      utilization: Math.min((totalHours / 40) * 100, 100),
      allocations: allocations.map(alloc => {
        const project = projects.find(p => 
          p.resourceAllocation?.some(a => a.userId === user.id && a.hoursAllocated === alloc.hoursAllocated)
        );
        return {
          ...alloc,
          projectTitle: project?.title || 'Unknown'
        };
      })
    };
  });

  // Ordenar por carga (más cargados primero)
  const sortedWorkload = userWorkload.sort((a, b) => b.totalHours - a.totalHours);

  // Stats generales
  const totalAllocatedHours = sortedWorkload.reduce((sum, w) => sum + w.totalHours, 0);
  const overloadedUsers = sortedWorkload.filter(w => w.isOverloaded).length;
  const avgUtilization = sortedWorkload.length > 0
    ? Math.round(sortedWorkload.reduce((sum, w) => sum + w.utilization, 0) / sortedWorkload.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header con stats */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Users size={20} />
            Asignación de Recursos
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Carga de trabajo por persona
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalAllocatedHours}h</div>
            <div className="text-xs text-muted-foreground">Total asignadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <div className="text-xs text-muted-foreground">Utilización media</div>
          </div>
        </div>
      </div>

      {/* Alerta de sobrecarga */}
      {overloadedUsers > 0 && (
        <div className="sb-card-glass-light p-4 border-l-4 border-destructive">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertCircle size={18} />
            <span>⚠️ {overloadedUsers} persona(s) sobrecargada(s) (&gt;40h/semana)</span>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="space-y-3">
        {sortedWorkload.map(({ user, totalHours, projectCount, leadCount, isOverloaded, utilization, allocations }) => (
          <div key={user.id} className="sb-card-glass-light p-4 hover-raise">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-medium">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {projectCount} proyecto{projectCount !== 1 ? 's' : ''}
                    {leadCount > 0 && ` • ${leadCount} como LEAD`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-lg font-bold ${isOverloaded ? 'text-destructive' : ''}`}>
                  {totalHours}h
                </div>
                <div className="text-xs text-muted-foreground">
                  {utilization.toFixed(0)}% utilización
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all ${
                  isOverloaded 
                    ? 'bg-destructive' 
                    : utilization >= 80 
                      ? 'bg-warning' 
                      : 'bg-primary'
                }`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>

            {/* Desglose por proyecto */}
            {allocations.length > 0 && (
              <div className="mt-3 space-y-1">
                {allocations.map((alloc, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {alloc.projectTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="sb-badge sb-badge--sm">
                        {alloc.role}
                      </span>
                      <span className="font-medium">{alloc.hoursAllocated}h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {sortedWorkload.length === 0 && (
          <div className="sb-card-glass-light p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hay asignaciones de recursos</p>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs mt-6 pt-4 border-t">
        <span className="text-muted-foreground">Capacidad:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Normal (&lt;80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning" />
          <span>Alta (80-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive" />
          <span>Sobrecarga (&gt;100%)</span>
        </div>
      </div>
    </div>
  );
}
