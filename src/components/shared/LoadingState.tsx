"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/* ===== Types ===== */
type LoadingStateProps = {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * LoadingState - Estado de carga general
 * 
 * @example
 * <LoadingState message="Cargando datos..." />
 */
export function LoadingState({
  message = "Cargando...",
  className,
  size = "md",
}: LoadingStateProps) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size])} />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * SkeletonCard - Skeleton para cards de KPI
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 animate-pulse", className)}>
      <div className="h-4 w-24 bg-muted rounded mb-4" />
      <div className="h-8 w-32 bg-muted rounded mb-2" />
      <div className="h-3 w-20 bg-muted rounded" />
    </div>
  );
}

/**
 * SkeletonTable - Skeleton para tablas
 */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1 animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-8 bg-muted rounded flex-1 animate-pulse"
              style={{ animationDelay: `${rowIndex * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonText - Skeleton para texto
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded animate-pulse"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Spinner - Simple spinner
 */
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={cn("animate-spin", sizes[size], className)} />
  );
}
