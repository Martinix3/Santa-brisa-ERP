// src/features/marketing/components/MarketingTaskCompletionDialog.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { SBDialog, SBDialogContent } from '@/components/ui/SBDialog';
import type { MarketingEvent, OnlineCampaign, InfluencerCollab } from '@/domain/ssot';
import { Euro, Users, Target, BarChart3, Heart, MousePointerClick, TrendingUp, DollarSign } from 'lucide-react';

type Entity = MarketingEvent | OnlineCampaign | InfluencerCollab;

export type CompleteResultsPayload = {
    // Shared
    spend?: number;
    notes?: string;
    impressions?: number;
    // Event specific
    leads?: number;
    sampling?: number;
    interactions?: number;
    // Online specific
    clicks?: number;
    roas?: number;
    // Collab specific
    cashPaid?: number;
    productCost?: number;
    shippingCost?: number;
    revenue?: number;
    engagements?: number;
    orders?: number;
};

type KpiField = {
    key: keyof CompleteResultsPayload;
    label: string;
    icon: React.ElementType;
    step?: string;
};

const EVENT_KPI_FIELDS: KpiField[] = [
    { key: 'spend', label: 'Coste total (€)', icon: Euro },
    { key: 'sampling', label: 'Asistentes (Sampling)', icon: Users },
    { key: 'leads', label: 'Leads generados', icon: Target },
    { key: 'impressions', label: 'Impresiones RRSS', icon: BarChart3 },
    { key: 'interactions', label: 'Interacciones RRSS', icon: Heart },
];

const CAMPAIGN_KPI_FIELDS: KpiField[] = [
    { key: 'spend', label: 'Gasto Final (€)', icon: Euro },
    { key: 'impressions', label: 'Impresiones', icon: BarChart3 },
    { key: 'clicks', label: 'Clicks', icon: MousePointerClick },
    { key: 'roas', label: 'ROAS (ej: 3.5)', icon: TrendingUp, step: "0.01" },
];

const COLLAB_KPI_FIELDS: KpiField[] = [
    { key: 'cashPaid', label: 'Pago en metálico (€)', icon: Euro },
    { key: 'productCost', label: 'Coste de producto (€)', icon: Euro },
    { key: 'shippingCost', label: 'Coste de envío (€)', icon: Euro },
    { key: 'impressions', label: 'Impresiones', icon: BarChart3 },
    { key: 'clicks', label: 'Clicks', icon: MousePointerClick },
    { key: 'engagements', label: 'Engagements (opcional)', icon: Heart },
    { key: 'revenue', label: 'Ingresos atribuidos (€)', icon: TrendingUp },
    { key: 'orders', label: 'Pedidos (opcional)', icon: Target },
];

function getEntityType(entity: Entity): 'event' | 'campaign' | 'collab' {
    if ('kind' in entity && typeof entity.kind === 'string') return 'event';
    if ('channel' in entity) return 'campaign';
    if ('creatorName' in entity) return 'collab';
    return 'event'; // Default
}

function getEntityTitle(entity: Entity): string {
    const e = entity as any;
    if (e.title) return e.title;
    if (e.creatorName) return `Collab con ${e.creatorName}`;
    return "Evento de Marketing";
}


export function MarketingTaskCompletionDialog({
  entity,
  open,
  onClose,
  onComplete,
}: {
  entity: Entity;
  open: boolean;
  onClose: () => void;
  onComplete: (entityId: string, payload: CompleteResultsPayload) => void;
}) {
  const [results, setResults] = useState<CompleteResultsPayload>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const entityType = useMemo(() => getEntityType(entity), [entity]);
  const entityTitle = useMemo(() => getEntityTitle(entity), [entity]);

  const kpiFields = useMemo(() => {
      if (entityType === 'campaign') return CAMPAIGN_KPI_FIELDS;
      if (entityType === 'collab') return COLLAB_KPI_FIELDS;
      return EVENT_KPI_FIELDS;
  }, [entityType]);

  useEffect(() => {
    if (open) {
      const initialResults: CompleteResultsPayload = {};
      if (entityType === 'event') {
        const e = entity as MarketingEvent;
        initialResults.spend = e.spend || 0;
        initialResults.leads = e.kpis?.leads || 0;
        initialResults.sampling = e.kpis?.sampling || 0;
        initialResults.impressions = e.kpis?.impressions || 0;
        initialResults.interactions = e.kpis?.interactions || 0;
      } else if (entityType === 'campaign') {
        const c = entity as OnlineCampaign;
        initialResults.spend = c.spend || 0;
        initialResults.impressions = c.metrics?.impressions || 0;
        initialResults.clicks = c.metrics?.clicks || 0;
        initialResults.roas = c.metrics?.roas || 0;
      } else if (entityType === 'collab') {
        const c = entity as InfluencerCollab;
        initialResults.cashPaid = c.costs?.cashPaid || 0;
        initialResults.productCost = c.costs?.productCost || 0;
        initialResults.shippingCost = c.costs?.shippingCost || 0;
        initialResults.impressions = c.metrics?.impressions || 0;
        initialResults.clicks = c.metrics?.clicks || 0;
        initialResults.engagements = c.metrics?.engagements || 0;
        initialResults.revenue = c.tracking?.revenue || 0;
        initialResults.orders = c.metrics?.orders || 0;
      }
      setResults(initialResults);
      setTouched({});
    }
  }, [open, entity, entityType]);

  const handleInputChange = (field: keyof CompleteResultsPayload, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setResults(prev => ({ ...prev, [field]: numValue }));
    setTouched(prev => ({...prev, [field]: true}));
  };

  const handleSubmit = () => {
    const requiredFields = kpiFields
        .filter(f => !['engagements', 'orders'].includes(f.key)) // Optional fields
        .map(f => f.key);

    for (const field of requiredFields) {
        const value = results[field];
        if (value === undefined || Number(value) < 0) {
            alert(`El campo '${kpiFields.find(f => f.key === field)?.label}' es obligatorio y no puede ser negativo.`);
            return;
        }
    }
    
    // For collabs, we sum up the costs into a single 'spend' field for the payload if needed
    let finalPayload = { ...results };
    if (entityType === 'collab') {
        finalPayload.spend = (results.cashPaid || 0) + (results.productCost || 0) + (results.shippingCost || 0);
    }
    
    onComplete(entity.id, finalPayload);
  };
  
  const canSubmit = useMemo(() => {
      const requiredFields = kpiFields
        .filter(f => !['engagements', 'orders'].includes(f.key))
        .map(f => f.key);
      return requiredFields.every(field => {
          const value = results[field];
          return value !== undefined && Number(value) >= 0;
      });
  }, [results, kpiFields]);


  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title={`Resultados de: ${entityTitle}`}
        description="Registra los KPIs de la acción de marketing para completarla. Todos los campos son obligatorios."
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        primaryAction={{ label: 'Guardar y Completar', type: 'submit', disabled: !canSubmit }}
        secondaryAction={{ label: 'Cancelar', onClick: onClose }}
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpiFields.map(({ key, label, icon: Icon, step }) => (
              <label key={key} className="grid gap-1.5">
                <span className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
                  <Icon size={14} /> {label}
                </span>
                <input
                  type="number"
                  step={step || "1"}
                  value={results[key] ?? ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  onBlur={() => setTouched(prev => ({...prev, [key]: true}))}
                  className={`h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ${touched[key] && (results[key] === undefined || Number(results[key]) < 0) ? 'border-red-500' : 'border-zinc-200'}`}
                  min="0"
                />
              </label>
            ))}
          </div>
          {entityType === 'event' && (
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
