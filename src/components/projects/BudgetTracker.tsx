"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React from "react";
import type { Project } from "@/domain/ssot";
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

type BudgetTrackerProps = {
  projects: Project[];
};

export function BudgetTracker({ projects }: BudgetTrackerProps) {
  // Filtrar proyectos con presupuesto
  const projectsWithBudget = projects.filter(p => p.budget && p.budget > 0);

  if (projectsWithBudget.length === 0) {
    return (
      <div className="sb-card-glass-light p-12 text-center">
        <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No hay proyectos con presupuesto definido</p>
      </div>
    );
  }

  // Calcular stats generales
  const totalBudget = projectsWithBudget.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalActual = projectsWithBudget.reduce((sum, p) => sum + (p.actualCost || 0), 0);
  const variance = totalActual - totalBudget;
  const variancePercent = totalBudget > 0 ? ((variance / totalBudget) * 100) : 0;
  const overBudgetCount = projectsWithBudget.filter(p => (p.actualCost || 0) > (p.budget || 0) * 1.1).length;

  return (
    <div className="space-y-4">
      {/* Header con stats generales */}
      <div className="sb-card-glass-dark p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-white mb-2">
              <DollarSign size={20} />
              Presupuesto vs Real
            </h3>
            <p className="text-xs text-white/70">
              Tracking de {projectsWithBudget.length} proyectos
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-white/70">Presupuesto</div>
              <div className="text-2xl font-bold text-white">
                €{(totalBudget / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70">Real</div>
              <div className="text-2xl font-bold text-white">
                €{(totalActual / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70">Varianza</div>
              <div className={`text-2xl font-bold ${
                variance > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {variance > 0 ? '+' : ''}€{(variance / 1000).toFixed(1)}K
              </div>
              <div className={`text-xs ${
                variance > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar global */}
        <div className="mt-4">
          <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                totalActual > totalBudget * 1.1
                  ? 'bg-red-500'
                  : totalActual > totalBudget
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalActual / totalBudget) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alerta de sobrepresupuesto */}
      {overBudgetCount > 0 && (
        <div className="sb-card-glass-light p-4 border-l-4 border-destructive">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle size={18} />
            <span>⚠️ {overBudgetCount} proyecto(s) con sobrepresupuesto (&gt;10%)</span>
          </div>
        </div>
      )}

      {/* Lista de proyectos */}
      <div className="space-y-3">
        {projectsWithBudget.map((project) => {
          const budget = project.budget || 0;
          const actual = project.actualCost || 0;
          const spent = budget > 0 ? (actual / budget) * 100 : 0;
          const variance = actual - budget;
          const variancePercent = budget > 0 ? ((variance / budget) * 100) : 0;
          const isOverBudget = actual > budget * 1.1;
          const isWarning = actual > budget && actual <= budget * 1.1;

          return (
            <div key={project.id} className="sb-card-glass-light p-4 hover-raise">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{project.title}</h4>
                    {isOverBudget && (
                      <span className="sb-badge sb-badge--destructive text-xs">
                        Sobrepresupuesto
                      </span>
                    )}
                    {isWarning && (
                      <span className="sb-badge sb-badge--warning text-xs">
                        Alerta
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {spent.toFixed(0)}% ejecutado
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Presupuesto</div>
                      <div className="font-semibold">€{(budget / 1000).toFixed(1)}K</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Real</div>
                      <div className={`font-semibold ${
                        isOverBudget ? 'text-destructive' : ''
                      }`}>
                        €{(actual / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Var</div>
                      <div className={`font-semibold text-sm ${
                        variance > 0 ? 'text-destructive' : 'text-green-600'
                      }`}>
                        {variance > 0 ? '+' : ''}€{(variance / 1000).toFixed(1)}K
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverBudget
                      ? 'bg-destructive'
                      : isWarning
                      ? 'bg-warning'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(spent, 100)}%` }}
                />
              </div>

              {/* Detalles adicionales */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-muted-foreground">
                  Disponible: €{((budget - actual) / 1000).toFixed(1)}K
                </span>
                <span className={variance > 0 ? 'text-destructive' : 'text-green-600'}>
                  {variance > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs mt-6 pt-4 border-t">
        <span className="text-muted-foreground">Estado:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Dentro presupuesto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning" />
          <span>Alerta (0-10% over)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive" />
          <span>Sobrepresupuesto (&gt;10%)</span>
        </div>
      </div>
    </div>
  );
}
