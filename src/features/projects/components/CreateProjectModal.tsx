"use client";

import React, { useState } from "react";
import { Department, User } from "@/domain/ssot";
import { X } from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    department: Department;
    teamMemberIds: string[];
    description?: string;
    endAt?: string;
  }) => void;
}

export function CreateProjectModal({
  open,
  users,
  currentUserId,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<Department>("MARKETING");
  const [description, setDescription] = useState("");
  const [endAt, setEndAt] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUserId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert("El título es obligatorio");
      return;
    }

    onCreate({
      title: title.trim(),
      department,
      teamMemberIds: selectedMembers,
      description: description.trim() || undefined,
      endAt: endAt || undefined,
    });

    // Reset
    setTitle("");
    setDepartment("MARKETING");
    setDescription("");
    setEndAt("");
    setSelectedMembers([currentUserId]);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Nuevo Proyecto</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Título *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
                placeholder="Nombre del proyecto..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Departamento *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="MARKETING">Marketing</option>
                <option value="VENTAS">Ventas</option>
                <option value="PRODUCCION">Producción</option>
                <option value="CALIDAD">Calidad</option>
                <option value="ALMACEN">Almacén</option>
                <option value="FINANZAS">Finanzas</option>
                <option value="OPS">Operaciones</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
                rows={3}
                placeholder="Descripción del proyecto..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha de Finalización
              </label>
              <input
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Equipo ({selectedMembers.length} miembros)
              </label>
              <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Crear Proyecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
