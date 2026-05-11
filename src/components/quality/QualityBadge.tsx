"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { QcStatus } from "@/domain/ssot";

interface QualityBadgeProps {
  status: QcStatus;
  className?: string;
}

const statusConfig: Record<QcStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-muted text-muted-foreground border-border"
  },
  IN_PROGRESS: {
    label: "En revisión",
    className: "bg-info/10 text-info border-info/20"
  },
  PASSED: {
    label: "Aprobado",
    className: "bg-success/10 text-success border-success/20"
  },
  FAILED: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20"
  },
  CONDITIONAL: {
    label: "Condicional",
    className: "bg-warning/10 text-warning border-warning/20"
  },
  HOLD: {
    label: "En espera",
    className: "bg-warning/10 text-warning border-warning/20"
  },
  WAIVED: {
    label: "Exonerado",
    className: "bg-accent/10 text-accent-foreground border-accent/20"
  }
};

export function QualityBadge({ status, className = "" }: QualityBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

interface DecisionBadgeProps {
  decision: "APPROVED" | "REJECTED" | "CONDITIONAL" | "HOLD";
  className?: string;
}

const decisionConfig: Record<DecisionBadgeProps["decision"], { label: string; className: string }> = {
  APPROVED: {
    label: "Aprobado",
    className: "bg-success/10 text-success border-success/20"
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-destructive/10 text-destructive border-destructive/20"
  },
  CONDITIONAL: {
    label: "Condicional",
    className: "bg-warning/10 text-warning border-warning/20"
  },
  HOLD: {
    label: "En espera",
    className: "bg-warning/10 text-warning border-warning/20"
  }
};

export function DecisionBadge({ decision, className = "" }: DecisionBadgeProps) {
  const config = decisionConfig[decision];
  
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
