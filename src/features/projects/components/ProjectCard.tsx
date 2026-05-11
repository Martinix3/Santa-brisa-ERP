"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from "react";
import { Project, Department } from "@/domain/ssot";
import { ProgressCircle } from "./ProgressCircle";
import { Calendar } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  progress?: number;
  teamMembers?: Array<{ id: string; name: string; avatarUrl?: string }>;
  onClick?: () => void;
}

export function ProjectCard({
  project,
  progress = 0,
  teamMembers = [],
  onClick,
}: ProjectCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "numeric",
      year: "2-digit",
    });
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Colores de avatar usando tokens del sistema
  const avatarColors = [
    "bg-primary/10 text-primary",
    "bg-secondary/30 text-foreground",
    "bg-accent/20 text-accent-foreground",
    "bg-muted/50 text-muted-foreground",
  ];

  return (
    <div
      onClick={onClick}
      className={`dept-${project.department} rounded-2xl p-6 border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg`}
      style={{
        backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
        borderColor: `rgb(var(--dept-border) / 0.4)`,
      }}
    >
      {/* Título del proyecto */}
      <h3
        className="text-2xl font-bold text-center mb-6"
        style={{ color: `rgb(var(--dept-text))` }}
      >
        {project.title}
      </h3>

      {/* Círculo de progreso centrado */}
      <div className="flex justify-center mb-6">
        <ProgressCircle progress={progress} size={100} strokeWidth={10} />
      </div>

      {/* Footer: Avatares + Fecha */}
      <div className="flex items-center justify-between">
        {/* Avatares superpuestos */}
        <div className="flex -space-x-2">
          {teamMembers.slice(0, 4).map((member, idx: number) => (
            <div
              key={member.id}
              className={`w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-sm font-bold ${
                avatarColors[idx % avatarColors.length]
              }`}
              title={member.name}
            >
              {getInitials(member.name)}
            </div>
          ))}
          {teamMembers.length > 4 && (
            <div className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
              +{teamMembers.length - 4}
            </div>
          )}
          {teamMembers.length === 0 && (
            <div className="text-sm text-muted-foreground">Sin equipo</div>
          )}
        </div>

        {/* Fecha */}
        {project.endAt && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar size={14} />
            <span>{formatDate(project.endAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
