"use client";

import React, { useState } from "react";
import { ProjectIdea, Department } from "@/domain/ssot";
import { Check, X } from "lucide-react";

interface IdeaBadgeProps {
  idea: ProjectIdea;
  department: Department;
  onConvert?: (ideaId: string) => void;
  onDelete?: (ideaId: string) => void;
}

export function IdeaBadge({ idea, department, onConvert, onDelete }: IdeaBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Si ya está convertida, mostrar como disabled
  if (idea.convertedToTaskId) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border opacity-50 bg-muted text-muted-foreground border-border`}
      >
        <Check size={14} />
        <span className="line-through">{idea.text}</span>
      </div>
    );
  }

  return (
    <div
      className={`dept-${department} inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:scale-105 cursor-pointer`}
      style={{
        backgroundColor: `rgb(var(--dept-badge-bg) / 0.7)`,
        borderColor: `rgb(var(--dept-border) / 0.5)`,
        color: `rgb(var(--dept-badge-text))`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span>{idea.text}</span>
      
      {isHovered && (
        <div className="flex items-center gap-1">
          {onConvert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvert(idea.id);
              }}
              className="p-1 rounded-full hover:bg-white/50 transition-colors"
              title="Convertir en tarea"
            >
              <Check size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idea.id);
              }}
              className="p-1 rounded-full hover:bg-white/50 transition-colors"
              title="Eliminar idea"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
