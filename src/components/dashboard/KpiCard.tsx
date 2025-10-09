"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

/* ===== Types ===== */
type KpiCardProps = {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  target?: number;
  targetLabel?: string;
  icon?: React.ElementType;
  trend?: "up" | "down" | "neutral";
  sparklineData?: number[];
  unit?: string;
  loading?: boolean;
  className?: string;
  accentColor?: string;
};

/* ===== Helper Components ===== */
function Sparkline({ data, color = "currentColor" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      className="w-full h-8 opacity-50"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ProgressRing({
  value,
  max,
  size = 40,
  strokeWidth = 4,
  color = "hsl(var(--primary))", // @ssot-exception: sistema de diseño base
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(var(--muted))" // @ssot-exception: sistema de diseño base
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

/* ===== Main Component ===== */
/**
 * KpiCard - Tarjeta de KPI mejorada con visualizaciones
 * 
 * Features:
 * - Trend indicators (up/down/neutral)
 * - Progress ring para objetivos
 * - Sparkline mini-chart
 * - Change percentage con visual
 * - Loading state
 * - Accent colors por módulo
 * 
 * @example
 * <KpiCard
 *   title="Cajas Vendidas"
 *   value={1250}
 *   unit="cajas"
 *   change={12.5}
 *   changeLabel="vs mes anterior"
 *   target={1500}
 *   targetLabel="Objetivo mensual"
 *   sparklineData={[900, 950, 1100, 1200, 1250]}
 *   trend="up"
 *   icon={Package}
 *   accentColor="hsl(var(--sb-accent-ventas))"
 * />
 */
export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  target,
  targetLabel,
  icon: Icon,
  trend,
  sparklineData,
  unit,
  loading = false,
  className,
  accentColor,
}: KpiCardProps) {
  // Auto-detect trend from change if not provided
  const effectiveTrend = trend || (change !== undefined ? (change > 0 ? "up" : change < 0 ? "down" : "neutral") : undefined);

  const TrendIcon = effectiveTrend === "up" ? TrendingUp : effectiveTrend === "down" ? TrendingDown : Minus;
  
  const trendColor = effectiveTrend === "up" ? "text-green-600" : effectiveTrend === "down" ? "text-red-600" : "text-muted-foreground";

  if (loading) {
    return (
      <div className={cn("rounded-lg border bg-card p-6 animate-pulse", className)}>
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 transition-all hover:shadow-md",
        className
      )}
      style={accentColor ? { borderTopColor: accentColor, borderTopWidth: "3px" } : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        {Icon && (
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center bg-secondary"
            style={accentColor ? { color: accentColor } : undefined}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-2">
        <p className="text-3xl font-bold tracking-tight">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
          {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
        </p>
      </div>

      {/* Change Indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-1 text-sm mb-3">
          <TrendIcon size={16} className={trendColor} />
          <span className={cn("font-medium", trendColor)}>
            {change > 0 ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-muted-foreground text-xs">{changeLabel}</span>
          )}
        </div>
      )}

      {/* Target Progress */}
      {target !== undefined && typeof value === "number" && (
        <div className="flex items-center gap-3 mb-3">
          <ProgressRing
            value={value}
            max={target}
            size={36}
            color={accentColor}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{targetLabel || "Objetivo"}</span>
              <span className="font-medium">
                {Math.round((value / target) * 100)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${Math.min((value / target) * 100, 100)}%`,
                  backgroundColor: accentColor || "hsl(var(--primary))", // @ssot-exception: sistema de diseño base
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-4 pt-4 border-t">
          <Sparkline data={sparklineData} color={accentColor} />
        </div>
      )}
    </div>
  );
}

/* ===== KPI Grid Component ===== */
export function KpiGrid({
  children,
  cols = 4,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[cols], className)}>
      {children}
    </div>
  );
}
