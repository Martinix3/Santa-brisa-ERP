"use client";

import { useState } from "react";
import { Calendar, Clock, X } from "lucide-react";
import { SBButton, Input, Select } from "@/components/ui/ui-primitives";
import { createEventFromTask } from "../actions";
import type { TaskNew } from "@/domain/ssot";

interface VisitPlannerDialogProps {
  task: TaskNew;
  open: boolean;
  onClose: () => void;
  onVisitPlanned: () => void;
  userId: string;
}

export function VisitPlannerDialog({
  task,
  open,
  onClose,
  onVisitPlanned,
  userId,
}: VisitPlannerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    time: "10:00",
    duration: 60, // minutos
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.date || !formData.time) {
      alert("Fecha y hora son requeridas");
      return;
    }

    setLoading(true);

    try {
      const startDateTime = `${formData.date}T${formData.time}:00`;
      
      const result = await createEventFromTask({
        taskId: task.id,
        startAt: startDateTime,
        durationMinutes: formData.duration,
        notes: formData.notes,
        createdById: userId,
      });

      if (result.ok) {
        onVisitPlanned();
        onClose();
      } else {
        alert(result.error || "Error al planificar visita");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al planificar visita");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Planificar Visita</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <div className="text-sm text-gray-700 mb-2">
                <strong>Tarea:</strong> {task.title}
              </div>
              {task.accountId && (
                <div className="text-sm text-gray-600">
                  Cuenta: {task.accountId}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="sb-label">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="sb-input"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="sb-label">
                  Hora <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="sb-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="sb-label">Duración</label>
              <Select
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) })
                }
                className="sb-select"
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
              </Select>
            </div>

            <div>
              <label className="sb-label">Notas adicionales</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Objetivo de la visita, temas a tratar..."
                className="sb-textarea"
                rows={3}
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-blue-800">
                  <strong>Al confirmar:</strong>
                  <ul className="list-disc list-inside mt-1">
                    <li>Se creará un evento en el calendario</li>
                    <li>La tarea cambiará a estado PROGRAMADA</li>
                    <li>Se bloqueará la hora en tu agenda</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex gap-2 p-4 border-t">
            <SBButton
              data-variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? "Programando..." : "Programar Visita"}
            </SBButton>
            <SBButton data-variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </SBButton>
          </div>
        </div>
      </div>
    </>
  );
}
