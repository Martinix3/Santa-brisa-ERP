"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useEffect, useState } from "react";
import { ProjectIdea, Project } from "@/domain/ssot";
import { listFreeIdeas, listProjects, assignIdeaToProject, convertIdeaToProject } from "../actions";
import { Lightbulb, Plus, FolderPlus } from "lucide-react";
import Link from "next/link";
// import { DraggableIdea, DroppableZone } from "@/features/dnd";

interface IdeasWidgetProps {
  userId: string;
  onRefresh?: () => void;
}

export function IdeasWidget({ userId, onRefresh }: IdeasWidgetProps) {
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdeaText, setNewIdeaText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ideasRes, projectsRes] = await Promise.all([
        listFreeIdeas(),
        listProjects({ status: "ACTIVE" }),
      ]);

      if (ideasRes.ok && ideasRes.data) {
        setIdeas(ideasRes.data as ProjectIdea[]);
      }
      if (projectsRes.ok && projectsRes.data) {
        setProjects(projectsRes.data as Project[]);
      }
    } catch (error) {
      console.error("Error loading ideas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateIdea() {
    if (!newIdeaText.trim()) return;

    try {
      const { createIdea } = await import("../actions");
      const result = await createIdea({
        projectId: null,
        text: newIdeaText.trim(),
        createdById: userId,
      });

      if (result.ok) {
        setNewIdeaText("");
        setIsAdding(false);
        loadData();
        onRefresh?.();
      }
    } catch (error) {
      console.error("Error creating idea:", error);
    }
  }

  async function handleConvertToProject(ideaId: string) {
    try {
      const result = await convertIdeaToProject({
        ideaId,
        ownerId: userId,
      });

      if (result.ok) {
        loadData();
        onRefresh?.();
      }
    } catch (error) {
      console.error("Error converting idea:", error);
    }
  }

  async function handleAssignToProject(ideaId: string, projectId: string) {
    try {
      const result = await assignIdeaToProject(ideaId, projectId);

      if (result.ok) {
        loadData();
        onRefresh?.();
      }
    } catch (error) {
      console.error("Error assigning idea:", error);
    }
  }

  if (loading) {
    return (
      <div className="sb-card-glass-light p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5" />
          <h3 className="font-semibold">Ideas Sueltas</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i: number) => (
            <div key={i} className="animate-pulse">
              <div className="h-8 bg-gray-100 rounded-full w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 border border-border bg-background transition-all hover:scale-[1.02] hover:shadow-lg">
      {/* Título */}
      <h3 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
        <Lightbulb className="w-6 h-6" />
        Ideas Sueltas
      </h3>

      {/* Contador circular */}
      <div className="flex justify-center mb-6">
        <div className="w-[100px] h-[100px] rounded-full bg-secondary/30 flex items-center justify-center border-4 border-border">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{ideas.length}</div>
            <div className="text-xs text-muted-foreground">ideas</div>
          </div>
        </div>
      </div>

      {/* Add new idea - Always visible */}
      <div className="mb-4">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-dashed border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus size={16} />
            <span>Nueva Idea</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newIdeaText}
              onChange={(e) => setNewIdeaText(e.target.value)}
              placeholder="Escribe..."
              autoFocus
              className="sb-input flex-1 text-sm py-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateIdea();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewIdeaText("");
                }
              }}
            />
            <button
              onClick={handleCreateIdea}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewIdeaText("");
              }}
              className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Ideas list (compacta para caber en tarjeta) */}
      <div className="max-h-32 overflow-y-auto">
        {ideas.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Sin ideas todavía
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ideas.slice(0, 6).map((idea, index: number) => (
              <div key={idea.id} className="group relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-border bg-background/50 hover:bg-background transition-colors">
                <span className="max-w-[100px] truncate">{idea.text}</span>
                
                {/* Hover actions - simplificado */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvertToProject(idea.id);
                    }}
                    title="Convertir en proyecto"
                    className="p-0.5 rounded-full hover:bg-primary/10"
                  >
                    <FolderPlus size={12} className="text-primary" />
                  </button>
                </div>
              </div>
            ))}
            {ideas.length > 6 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{ideas.length - 6} más
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
