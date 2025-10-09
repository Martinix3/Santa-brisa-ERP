"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PipelineData, PipelineAlert, PipelineStage } from "@/lib/pipeline-helpers";
import { AlertCircle, Info } from "lucide-react";

const STAGE_CONFIG: Record<PipelineStage, { 
  label: string; 
  color: string;
  description: string;
}> = {
  POTENCIAL: {
    label: "Potencial",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Sin interacción",
  },
  SEGUIMIENTO: {
    label: "Seguimiento",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    description: "Con interacción sin pedido",
  },
  ACTIVA: {
    label: "Activa",
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Con pedido",
  },
  FALLIDA: {
    label: "Fallida",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Cerrada",
  },
};

type PipelineVisualProps = {
  data: PipelineData[];
  alerts?: PipelineAlert[];
  onStageClick?: (stage: PipelineStage) => void;
  className?: string;
};

export function PipelineVisual({
  data,
  alerts,
  onStageClick,
  className,
}: PipelineVisualProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Pipeline Stages Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {data.map((stage) => (
          <PipelineStageCard
            key={stage.stage}
            stage={stage}
            onClick={onStageClick}
          />
        ))}
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <PipelineAlertBanner key={index} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineStageCard({
  stage,
  onClick,
}: {
  stage: PipelineData;
  onClick?: (stage: PipelineStage) => void;
}) {
  const config = STAGE_CONFIG[stage.stage];
  const isClickable = !!onClick;

  return (
    <button
      onClick={() => onClick?.(stage.stage)}
      disabled={!isClickable}
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all text-left",
        config.color,
        isClickable && "hover:shadow-md hover:scale-[1.02] cursor-pointer",
        !isClickable && "cursor-default"
      )}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-xs font-medium uppercase tracking-wide opacity-75">
          {config.label}
        </h3>
        <p className="text-[10px] opacity-60 mt-0.5">{config.description}</p>
      </div>

      {/* Count */}
      <div className="mb-2">
        <p className="text-3xl font-bold tabular-nums">{stage.count}</p>
        <p className="text-xs opacity-75">
          {stage.count === 1 ? "cuenta" : "cuentas"}
        </p>
      </div>

      {/* Cajas (solo para ACTIVA) */}
      {stage.cajasTotal !== undefined && (
        <div className="pt-2 border-t border-current border-opacity-20">
          <p className="text-lg font-semibold tabular-nums">
            {stage.cajasTotal.toLocaleString("es-ES")}
          </p>
          <p className="text-xs opacity-75">cajas vendidas</p>
        </div>
      )}

      {/* Indicator Arrow (excepto última) */}
      {stage.stage !== 'FALLIDA' && (
        <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="opacity-40"
          >
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </div>
      )}
    </button>
  );
}

function PipelineAlertBanner({ alert }: { alert: PipelineAlert }) {
  const Icon = alert.type === "warning" ? AlertCircle : Info;
  const colorClass =
    alert.type === "warning"
      ? "bg-orange-50 border-orange-200 text-orange-800"
      : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        colorClass
      )}
    >
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{alert.message}</p>
    </div>
  );
}

// Mini Pipeline (para tablas)
export function PipelineMini({
  pipeline,
  className,
}: {
  pipeline: { potencial: number; seguimiento: number; activa: number; fallida: number };
  className?: string;
}) {
  return (
    <span className={cn("font-mono text-xs text-muted-foreground", className)}>
      {pipeline.potencial}→{pipeline.seguimiento}→{pipeline.activa}→{pipeline.fallida}
    </span>
  );
}
