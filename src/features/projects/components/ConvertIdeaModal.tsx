"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useState } from "react";
import { ProjectIdea, User } from "@/domain/ssot";
import { X } from "lucide-react";

interface ConvertIdeaModalProps {
  open: boolean;
  idea: ProjectIdea | null;
  users: User[];
  onClose: () => void;
  onConvert: (data: {
    ideaId: string;
    title?: string;
    dueAt?: string;
    assignedToId: string;
  }) => void;
}

export function ConvertIdeaModal({
  open,
  idea,
  users,
  onClose,
  onConvert,
}: ConvertIdeaModalProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  if (!open || !idea) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignedToId) {
      alert("Debes asignar la tarea a alguien");
      return;
    }

    onConvert({
      ideaId: idea.id,
      title: title || idea.text,
      dueAt: dueAt || undefined,
      assignedToId,
    });

    // Reset
    setTitle("");
    setDueAt("");
    setAssignedToId("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Convertir idea en tarea</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Idea original */}
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
          <span className="font-medium">Idea: </span>
          <span>{idea.text}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título (opcional) */}
          <div>
            <label className="sb-label">
              Título de la tarea <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={idea.text}
              className="sb-input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si lo dejas vacío, se usará el texto de la idea
            </p>
          </div>

          {/* Fecha */}
          <div>
            <label className="sb-label">Fecha límite</label>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="sb-input"
            />
          </div>

          {/* Asignar a */}
          <div>
            <label className="sb-label">
              Asignar a <span className="text-destructive">*</span>
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="sb-select"
              required
            >
              <option value="">Selecciona usuario...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="sb-btn sb-btn--primary flex-1"
            >
              Crear Tarea
            </button>
            <button
              type="button"
              onClick={onClose}
              className="sb-btn sb-btn--secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
