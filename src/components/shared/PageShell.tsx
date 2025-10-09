"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MODULE_ACCENTS } from "@/domain/ssot";
import { moduleFromPath } from "../layout/Sidebar";
import { usePathname } from "next/navigation";

/* ===== Types ===== */
type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  module?: keyof typeof MODULE_ACCENTS;
  className?: string;
  fullWidth?: boolean;
  headerContent?: React.ReactNode; // Contenido personalizado para el header (dashboards)
};

/* ===== PageShell Component ===== */
/**
 * PageShell - Wrapper estándar para todas las páginas del CRM
 * 
 * Proporciona:
 * - Header de página con título y descripción
 * - Área de acciones (botones, etc)
 * - Área de filtros opcionales
 * - Container con padding consistente
 * - Accent color basado en módulo
 * 
 * @example
 * <PageShell
 *   title="Dashboard Ventas"
 *   description="Resumen de actividad comercial"
 *   module="sales"
 *   actions={<Button>Nueva Cuenta</Button>}
 *   filters={<FilterBar />}
 * >
 *   <KpiGrid />
 *   <ChartsSection />
 * </PageShell>
 */
export function PageShell({
  children,
  title,
  description,
  actions,
  filters,
  module,
  className,
  fullWidth = false,
  headerContent,
}: PageShellProps) {
  const pathname = usePathname();
  const detectedModule = module || moduleFromPath(pathname || "");
  
  // Get accent color for module
  const accentVar = detectedModule ? MODULE_ACCENTS[detectedModule] : null;

  return (
    <div className={cn("min-h-full bg-secondary", className)}>
      {/* Page Header - Custom Content (para dashboards) */}
      {headerContent && (
        <div
          className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          style={
            accentVar
              ? {
                  borderColor: `hsl(${accentVar})`,
                  borderBottomWidth: "2px",
                }
              : undefined
          }
        >
          <div
            className={cn(
              "py-3 px-4",
              !fullWidth && "mx-auto max-w-7xl"
            )}
          >
            {headerContent}
          </div>
        </div>
      )}

      {/* Page Header - Standard */}
      {!headerContent && (title || actions) && (
        <div
          className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          style={
            accentVar
              ? {
                  borderColor: `hsl(${accentVar})`,
                  borderBottomWidth: "2px",
                }
              : undefined
          }
        >
          <div
            className={cn(
              "py-4 px-4 sm:px-6",
              !fullWidth && "mx-auto max-w-7xl"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                {title && (
                  <h1
                    className="text-2xl font-bold tracking-tight truncate"
                    style={
                      accentVar
                        ? { color: `hsl(${accentVar})` }
                        : undefined
                    }
                  >
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>

              {/* Actions */}
              {actions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {actions}
                </div>
              )}
            </div>

            {/* Filters Row */}
            {filters && (
              <div className="mt-4 pt-4 border-t border-border">{filters}</div>
            )}
          </div>
        </div>
      )}

      {/* Page Content */}
      <div
        className={cn(
          headerContent ? "py-4 px-4" : "py-6 px-4 sm:px-6",
          !fullWidth && "mx-auto max-w-7xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ===== Subcomponents for common patterns ===== */

/**
 * PageShell.Section - Sección dentro de una página
 */
PageShell.Section = function PageShellSection({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * PageShell.Grid - Grid responsive común
 */
PageShell.Grid = function PageShellGrid({
  children,
  cols = 3,
  className,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[cols], className)}>
      {children}
    </div>
  );
};
