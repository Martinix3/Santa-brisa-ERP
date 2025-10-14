"use client";

import React, { useState } from "react";
import { ProjectIdea, Department } from "@/domain/ssot";
import { IdeaBadge } from "./IdeaBadge";
import { Plus } from "lucide-react";

interface IdeasBoardProps {
  ideas: ProjectIdea[];
  department: Department;
  onConvertIdea: (ideaId: string) => void;
  onDeleteIdea: (ideaId: string) => void;
  onCreateIdea: (text: string) => void;
}

export function IdeasBoard({
  ideas,
  department,
  onConvertIdea,
  onDeleteIdea,
  onCreateIdea,
}: IdeasBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newIdeaText, setNewIdeaText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIdeaText.trim()) {
      onCreateIdea(newIdeaText.trim());
      setNewIdeaText("");
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botón añadir idea */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} />
          <span>nueva idea</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            placeholder="Escribe tu idea..."
            autoFocus
            className="sb-input flex-1"
          />
          <button
            type="submit"
            className="sb-btn sb-btn--primary sb-btn--sm"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewIdeaText("");
            }}
            className="sb-btn sb-btn--ghost sb-btn--sm"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Grid de ideas */}
      {ideas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {ideas.map((idea) => (
            <IdeaBadge
              key={idea.id}
              idea={idea}
              department={department}
              onConvert={onConvertIdea}
              onDelete={onDeleteIdea}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No hay ideas todavía. Añade tu primera idea.
        </div>
      )}
    </div>
  );
}
