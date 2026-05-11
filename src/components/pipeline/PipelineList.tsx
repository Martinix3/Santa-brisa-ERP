/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/pipeline/PipelineList.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  TrendingDown, 
  Target, 
  Building2, 
  Calendar,
  MapPin,
  Euro,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { PipelineItem, StageKey } from './types';

const STAGE_COLORS: Record<StageKey, string> = {
  POTENCIAL: 'bg-[--sb-yellow]/10 text-[--sb-yellow] border-[--sb-yellow]/20',
  SEGUIMIENTO: 'bg-[--sb-aqua]/10 text-[--sb-aqua] border-[--sb-aqua]/20',
  ACTIVA: 'bg-[--sb-green]/10 text-[--sb-green] border-[--sb-green]/20',
  FALLIDA: 'bg-[--sb-copper]/10 text-[--sb-copper] border-[--sb-copper]/20',
};

const STAGE_LABEL: Record<StageKey, string> = {
  POTENCIAL: 'Potencial',
  SEGUIMIENTO: 'Seguimiento',
  ACTIVA: 'Activa',
  FALLIDA: 'Fallida',
};

const STAGE_ICON: Record<StageKey, React.ReactNode> = {
  POTENCIAL: <Building2 className="w-5 h-5" />,
  SEGUIMIENTO: <Calendar className="w-5 h-5" />,
  ACTIVA: <CheckCircle2 className="w-5 h-5" />,
  FALLIDA: <AlertCircle className="w-5 h-5" />,
};

export function PipelineList({
  items,
  title = 'Pipeline (lista)',
  onMove,
}: {
  items: PipelineItem[];
  title?: string;
  onMove?: (id: string, from: StageKey, to: StageKey) => void | Promise<void>;
}) {
  const router = useRouter();

  const handleAccountClick = (id: string) => {
    router.push(`/accounts/${id}`);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} {items.length === 1 ? 'oportunidad' : 'oportunidades'}
        </p>
      </div>

      {/* Compact Single-Line Layout */}
      <div className="space-y-2">
        {items.map((item) => {
          const formattedDate = item.lastInteractionDate
            ? new Date(item.lastInteractionDate).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
              })
            : null;

          return (
            <div
              key={item.id}
              className="sb-card-glass-light rounded-lg p-3 hover:bg-white/5 transition-all duration-200 border border-white/5"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${STAGE_COLORS[item.stage]}`}>
                    {STAGE_ICON[item.stage]}
                  </div>
                </div>

                {/* Name + Target */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => handleAccountClick(item.id)}
                    className="font-semibold hover:text-[--sb-aqua] transition-colors cursor-pointer text-left truncate"
                  >
                    {item.name}
                  </button>
                  {item.isTarget && (
                    <Target className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>

                {/* City */}
                {item.city && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{item.city}</span>
                  </div>
                )}

                {/* Date */}
                {formattedDate && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{formattedDate}</span>
                  </div>
                )}

                {/* Stage Badge - ONLY colored element */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 ${STAGE_COLORS[item.stage]}`}
                >
                  {STAGE_LABEL[item.stage]}
                </span>

                {/* Value */}
                {item.estValueEUR && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums hidden lg:inline">
                      {item.estValueEUR.toLocaleString('es-ES')}
                    </span>
                  </div>
                )}

                {/* Indicators */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.posInstalled && (
                    <div title="POS Instalado">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  {item.hasAlerts && (
                    <div title="Tiene alertas">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  {item.noConsumption && (
                    <div title="Sin consumo">
                      <TrendingDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Action */}
                <button
                  onClick={() => handleAccountClick(item.id)}
                  className="text-sm font-medium text-[--sb-aqua] hover:text-[--sb-aqua]/80 transition-colors flex-shrink-0 hidden xl:block"
                >
                  Ver →
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="py-12 text-center sb-card-glass-light rounded-xl">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No hay oportunidades para mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}
