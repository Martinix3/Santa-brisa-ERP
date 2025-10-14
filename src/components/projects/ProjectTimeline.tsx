"use client";

import React from "react";
import type { Project } from "@/domain/ssot";
import { Calendar, CheckCircle2, Circle } from "lucide-react";

type ProjectWithDates = Pick<Project, 'id' | 'title' | 'startAt' | 'deadline' | 'status' | 'milestones'>;

type TimelineProps = {
  projects: ProjectWithDates[];
};

export function ProjectTimeline({ projects }: TimelineProps) {
  if (projects.length === 0) {
    return (
      <div className="sb-card-glass-light p-12 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No hay proyectos con fechas definidas</p>
      </div>
    );
  }

  // Calcular rango de fechas
  const now = new Date();
  const projectDates = projects.flatMap(p => 
    [p.startAt, p.deadline].filter(Boolean).map(d => new Date(d as string))
  );
  
  const minDate = new Date(Math.min(...projectDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...projectDates.map(d => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const getPosition = (date: string) => {
    const d = new Date(date);
    const days = Math.ceil((d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'ACTIVE': return 'bg-blue-500';
      case 'ON_HOLD': return 'bg-yellow-500';
      case 'REVIEW': return 'bg-purple-500';
      case 'PLANNING': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Timeline header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Timeline de Proyectos</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{minDate.toLocaleDateString('es-ES')}</span>
          <span>→</span>
          <span>{maxDate.toLocaleDateString('es-ES')}</span>
        </div>
      </div>

      {/* Línea de tiempo actual */}
      {now >= minDate && now <= maxDate && (
        <div className="relative h-0.5 bg-border">
          <div
            className="absolute top-0 h-0.5 w-0.5 bg-red-500"
            style={{ left: `${getPosition(now.toISOString())}%` }}
          >
            <div className="absolute -top-2 -left-1 w-2 h-2 rounded-full bg-red-500" />
            <div className="absolute -top-6 left-2 text-xs text-red-500 font-medium whitespace-nowrap">
              Hoy
            </div>
          </div>
        </div>
      )}

      {/* Proyectos */}
      <div className="space-y-3">
        {projects.map((project) => {
          if (!project.startAt || !project.deadline) return null;

          const start = getPosition(project.startAt);
          const end = getPosition(project.deadline);
          const width = end - start;
          const isOverdue = new Date(project.deadline) < now && project.status !== 'COMPLETED';

          return (
            <div key={project.id} className="relative">
              {/* Project bar */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium w-48 truncate">
                  {project.title}
                </span>
                <div className="flex-1 relative h-8 bg-secondary/30 rounded-lg overflow-hidden">
                  <div
                    className={`absolute top-0 h-full ${getStatusColor(project.status)} ${
                      isOverdue ? 'opacity-50' : 'opacity-80'
                    } transition-all`}
                    style={{
                      left: `${start}%`,
                      width: `${width}%`,
                    }}
                  >
                    {/* Milestone markers */}
                    {project.milestones?.map((milestone) => {
                      const milestonePos = getPosition(milestone.date);
                      if (milestonePos < start || milestonePos > end) return null;
                      
                      const relativePos = ((milestonePos - start) / width) * 100;
                      
                      return (
                        <div
                          key={milestone.id}
                          className="absolute top-1/2 -translate-y-1/2"
                          style={{ left: `${relativePos}%` }}
                          title={milestone.title}
                        >
                          {milestone.done ? (
                            <CheckCircle2 size={16} className="text-white" />
                          ) : (
                            <Circle size={16} className="text-white/60" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-24 text-right">
                  {Math.ceil((new Date(project.deadline).getTime() - new Date(project.startAt).getTime()) / (1000 * 60 * 60 * 24))} días
                </span>
              </div>

              {/* Warning si está overdue */}
              {isOverdue && (
                <div className="ml-52 text-xs text-destructive">
                  ⚠️ Vencido hace {Math.ceil((now.getTime() - new Date(project.deadline).getTime()) / (1000 * 60 * 60 * 24))} días
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs mt-6 pt-4 border-t">
        <span className="text-muted-foreground">Estado:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Activo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Completado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>En pausa</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>Milestone completado</span>
        </div>
      </div>
    </div>
  );
}
