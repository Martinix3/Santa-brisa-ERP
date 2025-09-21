// src/features/marketing/components/MarketingTaskCompletionDialog.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { MarketingEvent } from '@/domain/ssot';
import { Euro, Users, Target, BarChart3, Heart } from 'lucide-react';

type CompleteResultsPayload = {
    spend: number;
    leads: number;
    sampling: number;
    impressions: number;
    interactions: number;
    notes?: string;
};

export function MarketingTaskCompletionDialog({
  event,
  open,
  onClose,
  onComplete,
}: {
  event: MarketingEvent;
  open: boolean;
  onClose: () => void;
  onComplete: (eventId: string, payload: CompleteResultsPayload) => void;
}) {
  const [results, setResults] = useState<CompleteResultsPayload>({
    spend: 0,
    leads: 0,
    sampling: 0,
    impressions: 0,
    interactions: 0,
    notes: '',
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setResults({
        spend: event.spend || 0,
        leads: event.kpis?.leads || 0,
        sampling: event.kpis?.sampling || 0,
        impressions: event.kpis?.impressions || 0,
        interactions: event.kpis?.interactions || 0,
        notes: '',
      });
      setTouched({});
    }
  }, [open, event]);

  const handleInputChange = (field: keyof CompleteResultsPayload, value: string | number) => {
    setResults(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = () => {
    const requiredFields: (keyof CompleteResultsPayload)[] = ['spend', 'leads', 'sampling', 'impressions', 'interactions'];
    for (const field of requiredFields) {
      if (results[field] === undefined || results[field] < 0) {
        alert(`El campo '${field}' es obligatorio y no puede ser negativo.`);
        return;
      }
    }
    onComplete(event.id, results);
  };
  
  const canSubmit = useMemo(() => {
      const requiredFields: (keyof CompleteResultsPayload)[] = ['spend', 'leads', 'sampling', 'impressions', 'interactions'];
      return requiredFields.every(field => results[field] !== undefined && results[field] >= 0);
  }, [results]);

  const kpiFields: { key: keyof CompleteResultsPayload, label: string, icon: React.ElementType }[] = [
    { key: 'spend', label: 'Coste total (€)', icon: Euro },
    { key: 'sampling', label: 'Asistentes (Sampling)', icon: Users },
    { key: 'leads', label: 'Leads generados', icon: Target },
    { key: 'impressions', label: 'Impresiones RRSS', icon: BarChart3 },
    { key: 'interactions', label: 'Interacciones RRSS', icon: Heart },
  ];

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={`Resultados de: ${event.title}`}
        description="Registra los KPIs de la acción de marketing para completarla. Todos los campos son obligatorios."
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        primaryAction={{ label: 'Guardar y Completar', type: 'submit', disabled: !canSubmit }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose }}
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpiFields.map(({ key, label, icon: Icon }) => (
              <label key={key} className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
                  <Icon size={14} /> {label}
                </span>
                <input
                  type="number"
                  value={results[key] ?? ''}
                  onChange={(e) => handleInputChange(key, e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => setTouched(prev => ({...prev, [key]: true}))}
                  className={`h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ${touched[key] && (results[key] === undefined || results[key] < 0) ? 'border-red-500' : 'border-zinc-200'}`}
                  min="0"
                />
              </label>
            ))}
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Notas Cualitativas</span>
            <textarea
              value={results.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
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
