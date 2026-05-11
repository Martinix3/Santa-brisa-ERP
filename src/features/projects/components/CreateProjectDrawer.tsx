"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useState } from "react";
import { Department, User } from "@/domain/ssot";
import { X } from "lucide-react";
import { createProject } from "../actions";

interface CreateProjectDrawerProps {
  open: boolean;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProjectDrawer({
  open,
  users,
  currentUserId,
  onClose,
  onSuccess,
}: CreateProjectDrawerProps) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<Department>("MARKETING");
  const [description, setDescription] = useState("");
  const [endAt, setEndAt] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUserId]);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("El título es obligatorio");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createProject({
        title: title.trim(),
        department,
        description: description.trim() || undefined,
        endAt: endAt || undefined,
        status: "ACTIVE",
        teamMemberIds: selectedMembers,
        createdById: currentUserId,
      });

      if (result.ok) {
        // Reset form
        setTitle("");
        setDepartment("MARKETING");
        setDescription("");
        setEndAt("");
        setSelectedMembers([currentUserId]);
        
        onSuccess?.();
        onClose();
      } else {
        alert(result.error || "Error al crear el proyecto");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error al crear el proyecto");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <>
      {/* Overlay */}
      <div className="sb-drawer__overlay" onClick={onClose} />

      {/* Drawer */}
      <aside className="sb-drawer" role="dialog" aria-label="Crear nuevo proyecto">
        {/* Header */}
        <div className="sb-drawer__header">
          <h2 className="text-xl font-bold">Nuevo Proyecto</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-secondary/50 focus-ring transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
            {/* Título */}
            <div>
              <label className="sb-label">
                Título del Proyecto *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Campaña Caterings Q1"
                className="sb-input"
                required
              />
            </div>

            {/* Departamento */}
            <div>
              <label className="sb-label">
                Departamento *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="sb-input"
              >
                <option value="MARKETING">Marketing</option>
                <option value="VENTAS">Ventas</option>
                <option value="PRODUCCION">Producción</option>
                <option value="ALMACEN">Almacén</option>
                <option value="CALIDAD">Calidad</option>
                <option value="FINANZAS">Finanzas</option>
                <option value="PERSONAL">Personal</option>
                <option value="OPS">Operaciones</option>
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="sb-label">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el proyecto..."
                rows={4}
                className="sb-input"
              />
            </div>

            {/* Fecha límite */}
            <div>
              <label className="sb-label">
                Fecha Límite
              </label>
              <input
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="sb-input"
              />
            </div>

            {/* Equipo */}
            <div>
              <label className="sb-label">
                Equipo del Proyecto
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3 bg-secondary/10">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{user.name}</span>
                    {user.id === currentUserId && (
                      <span className="text-xs text-muted-foreground">(Tú)</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedMembers.length} miembro(s) seleccionado(s)
              </p>
            </div>
        </form>

        {/* Footer */}
        <div className="sb-drawer__footer">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="sb-btn sb-btn--ghost flex-1"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="sb-btn sb-btn--primary flex-1"
              disabled={submitting || !title.trim()}
            >
              {submitting ? "Creando..." : "Crear Proyecto"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
