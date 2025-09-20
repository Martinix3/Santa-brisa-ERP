
// src/features/marketing/components/MarketingTaskCompletionDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/features/agenda/ui';
import type { Interaction } from '@/domain/ssot';
import { Euro, Users, Target, BarChart3, Heart } from 'lucide-react';

export function MarketingTaskCompletionDialog({
  task,
  open,
  onClose,
  onComplete,
}: {
  task: Interaction;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: string, payload: { type: 'marketing'; [key: string]: any }) => void;
}) {
  const [cost, setCost] = useState(0);
  const [attendees, setAttendees] = useState(0);
  const [leads, setLeads] = useState(0);
  const [impressions, setImpressions] = useState(0);
  const [interactions, setInteractions] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setCost(0);
      setAttendees(0);
      setLeads(0);
      setImpressions(0);
      setInteractions(0);
      setNotes('');
    }
  }, [open]);

  const handleSubmit = () => {
    if ([cost, attendees, leads, impressions, interactions].some((v) => v < 0)) {
      alert('Los valores no pueden ser negativos.');
      return;
    }
    onComplete(task.id, {
      type: 'marketing',
      cost,
      attendees,
      leads,
      impressions,
      interactions,
      note: notes,
    });
  };

  const kpiFields = [
    { label: 'Coste total (€)', value: cost, setter: setCost, icon: Euro },
    { label: 'Asistentes', value: attendees, setter: setAttendees, icon: Users },
    { label: 'Leads generados', value: leads, setter: setLeads, icon: Target },
    { label: 'Impresiones RRSS', value: impressions, setter: setImpressions, icon: BarChart3 },
    { label: 'Interacciones RRSS', value: interactions, setter: setInteractions, icon: Heart },
  ];

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={`Resultados de: ${task.note}`}
        description="Registra los KPIs de la acción de marketing para completarla."
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        primaryAction={{ label: 'Guardar y Completar', type: 'submit' }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose }}
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpiFields.map(({ label, value, setter, icon: Icon }) => (
              <label key={label} className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
                  <Icon size={14} /> {label}
                </span>
                <input
                  type="number"
                  value={value || ''}
                  onChange={(e) => setter(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Notas Cualitativas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Qué tal fue? ¿Repetir? ¿Lecciones aprendidas? ¿Sentimiento general?"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              rows={4}
            />
          </label>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
