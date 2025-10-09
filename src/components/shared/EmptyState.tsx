"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FileQuestion, Plus, Search, Filter } from "lucide-react";

/* ===== Types ===== */
type EmptyStateProps = {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

/**
 * EmptyState - Estado vacío con CTA
 * 
 * Usado cuando no hay datos para mostrar:
 * - Listas vacías
 * - Resultados de búsqueda sin resultados
 * - Filtros sin coincidencias
 * - Nueva funcionalidad sin datos
 * 
 * @example
 * <EmptyState
 *   icon={Package}
 *   title="No hay cuentas"
 *   description="Crea tu primera cuenta para empezar a vender"
 *   action={{
 *     label: "Nueva Cuenta",
 *     onClick: () => openCreateModal(),
 *     icon: Plus
 *   }}
 * />
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Icon */}
      <div className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Icon size={32} className="text-muted-foreground" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              {action.icon && <action.icon size={16} />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-secondary transition-colors font-medium text-sm"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Preset EmptyStates ===== */

export const EmptyStates = {
  NoResults: (props: Omit<EmptyStateProps, "icon" | "title">) => (
    <EmptyState
      icon={Search}
      title="No se encontraron resultados"
      description="Intenta ajustar tu búsqueda o filtros"
      {...props}
    />
  ),

  NoData: (props: Omit<EmptyStateProps, "icon">) => (
    <EmptyState icon={FileQuestion} {...props} />
  ),

  NoFiltered: (props: Omit<EmptyStateProps, "icon" | "title">) => (
    <EmptyState
      icon={Filter}
      title="Sin coincidencias"
      description="No hay elementos que cumplan los filtros seleccionados"
      action={{
        label: "Limpiar filtros",
        onClick: props.action?.onClick || (() => {}),
      }}
      {...props}
    />
  ),

  CreateFirst: (props: Omit<EmptyStateProps, "icon">) => (
    <EmptyState
      icon={Plus}
      action={{
        label: "Crear",
        onClick: () => {},
        icon: Plus,
        ...props.action,
      }}
      {...props}
    />
  ),
};
