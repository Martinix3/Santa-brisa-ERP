// src/features/marketing/components/MarketingTaskCompletionDialog.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { MarketingEvent, OnlineCampaign } from '@/domain/ssot';
import { Euro, Users, Target, BarChart3, Heart, MousePointerClick, TrendingUp } from 'lucide-react';

type CompleteResultsPayload = {
    spend: number;
    leads: number;
    sampling: number;
    impressions: number;
    interactions: number;
    clicks?: number;
    roas?: number;
    notes?: string;
};

export function MarketingTaskCompletionDialog({
  event,
  open,
  onClose,
  onComplete,
  isOnlineCampaign = false,
}: {
  event: MarketingEvent | OnlineCampaign;
  open: boolean;
  onClose: () => void;
  onComplete: (eventId: string, payload: Partial<CompleteResultsPayload>) => void;
  isOnlineCampaign?: boolean;
}) {
  const [results, setResults] = useState<Partial<CompleteResultsPayload>>({});
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      if(isOnlineCampaign){
        const campaign = event as OnlineCampaign;
        setResults({
            spend: campaign.spend || 0,
            impressions: campaign.metrics?.impressions || 0,
            clicks: campaign.metrics?.clicks || 0,
            roas: campaign.metrics?.roas || 0,
        });
      } else {
        const mktEvent = event as MarketingEvent;
        setResults({
            spend: mktEvent.spend || 0,
            leads: mktEvent.kpis?.leads || 0,
            sampling: mktEvent.kpis?.sampling || 0,
            impressions: mktEvent.kpis?.impressions || 0,
            interactions: mktEvent.kpis?.interactions || 0,
            notes: '',
        });
      }
      setTouched({});
    }
  }, [open, event, isOnlineCampaign]);

  const handleInputChange = (field: keyof CompleteResultsPayload, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setResults(prev => ({ ...prev, [field]: numValue }));
    setTouched(prev => ({...prev, [field]: true}));
  };

  const handleSubmit = () => {
    const requiredFields: (keyof CompleteResultsPayload)[] = isOnlineCampaign
        ? ['spend', 'impressions', 'clicks', 'roas']
        : ['spend', 'leads', 'sampling', 'impressions', 'interactions'];
    
    for (const field of requiredFields) {
        const value = results[field as keyof CompleteResultsPayload];
        if (value === undefined || Number(value) < 0) {
            alert(`El campo '${field}' es obligatorio y no puede ser negativo.`);
            return;
        }
    }
    onComplete(event.id, results);
  };
  
  const canSubmit = useMemo(() => {
      const requiredFields: (keyof CompleteResultsPayload)[] = isOnlineCampaign
        ? ['spend', 'impressions', 'clicks', 'roas']
        : ['spend', 'leads', 'sampling', 'impressions', 'interactions'];
      return requiredFields.every(field => {
          const value = results[field];
          return value !== undefined && Number(value) >= 0;
      });
  }, [results, isOnlineCampaign]);

  const eventKpiFields: { key: keyof CompleteResultsPayload, label: string, icon: React.ElementType }[] = [
    { key: 'spend', label: 'Coste total (€)', icon: Euro },
    { key: 'sampling', label: 'Asistentes (Sampling)', icon: Users },
    { key: 'leads', label: 'Leads generados', icon: Target },
    { key: 'impressions', label: 'Impresiones RRSS', icon: BarChart3 },
    { key: 'interactions', label: 'Interacciones RRSS', icon: Heart },
  ];

  const campaignKpiFields: { key: keyof CompleteResultsPayload, label: string, icon: React.ElementType }[] = [
    { key: 'spend', label: 'Gasto Final (€)', icon: Euro },
    { key: 'impressions', label: 'Impresiones', icon: BarChart3 },
    { key: 'clicks', label: 'Clicks', icon: MousePointerClick },
    { key: 'roas', label: 'ROAS (ej: 3.5)', icon: TrendingUp },
  ];

  const kpiFields = isOnlineCampaign ? campaignKpiFields : eventKpiFields;

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
                  step={key === 'roas' ? '0.01' : '1'}
                  value={results[key] ?? ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  onBlur={() => setTouched(prev => ({...prev, [key]: true}))}
                  className={`h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ${touched[key] && (results[key] === undefined || Number(results[key]) < 0) ? 'border-red-500' : 'border-zinc-200'}`}
                  min="0"
                />
              </label>
            ))}
          </div>
          {!isOnlineCampaign && (
            <label className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700">Notas Cualitativas</span>
                <textarea
                value={results.notes || ''}
                onChange={(e) => setResults(prev => ({ ...prev, notes: e.target.value}))}
                placeholder="¿Qué tal fue? ¿Repetir? ¿Lecciones aprendidas? ¿Sentimiento general?"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                rows={4}
                />
            </label>
           )}
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
