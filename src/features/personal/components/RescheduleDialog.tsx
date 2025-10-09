// src/features/personal/components/RescheduleDialog.tsx
"use client";
import React, { useState } from 'react';
import type { Interaction } from '@/domain/ssot';

interface Props {
  task: Interaction;
  onClose: () => void;
  onConfirm: (task: Interaction, newDate: string) => void;
}

export function RescheduleDialog({ task, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(() => (
    task.plannedFor ? new Date(task.plannedFor).toISOString().split('T')[0] : ''
  ));

  return (
    <div className="sb-dialog__overlay" onClick={onClose}>
      <div className="sb-dialog__content">
        <div className="sb-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="sb-dialog__header">
            <h3 className="sb-dialog__title">Reprogramar Tarea</h3>
            <p className="sb-dialog__desc">{task.note || 'Tarea sin descripción'}</p>
          </div>
          <div className="sb-dialog__body">
            <label htmlFor="reschedule-date" className="text-sm font-medium text-foreground block mb-2">
              Nueva fecha
            </label>
            <input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
          <div className="sb-dialog__footer">
            <button
              onClick={onClose}
              className="sb-btn"
              data-variant="secondary"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(task, date)}
              disabled={!date}
              className="sb-btn"
              data-variant="primary"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
