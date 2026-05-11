"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Clock, Package, Zap } from "lucide-react";
import type { PredictiveAlert } from "@/server/gemini/analyzers/quality-analyzer";

interface GeminiAlertsCardProps {
  alerts: PredictiveAlert[];
  loading?: boolean;
}

export function GeminiAlertsCard({ alerts, loading }: GeminiAlertsCardProps) {
  if (loading) {
    return (
      <div className="sb-card-glass-light p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Alertas Gemini Intelligence
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="sb-card-glass-light p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Alertas Gemini Intelligence
          </h2>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hay alertas predictivas en este momento
        </div>
      </div>
    );
  }

  const getAlertIcon = (type: PredictiveAlert['type']) => {
    switch (type) {
      case 'rejection_risk':
        return <AlertTriangle className="w-4 h-4" />;
      case 'supplier_degradation':
        return <TrendingUp className="w-4 h-4" />;
      case 'expiry_warning':
        return <Clock className="w-4 h-4" />;
      case 'parameter_drift':
        return <Package className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertStyles = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-destructive/10 border-destructive/20',
          icon: 'text-destructive',
          badge: 'bg-destructive/15 text-destructive',
          confidence: 'text-destructive',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10 border-warning/20',
          icon: 'text-warning',
          badge: 'bg-warning/15 text-warning',
          confidence: 'text-warning',
        };
      case 'info':
        return {
          bg: 'bg-info/10 border-info/20',
          icon: 'text-info',
          badge: 'bg-info/15 text-info',
          confidence: 'text-info',
        };
      default:
        return {
          bg: 'bg-muted/50 border-border',
          icon: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
          confidence: 'text-muted-foreground',
        };
    }
  };

  const getTypeLabel = (type: PredictiveAlert['type']) => {
    switch (type) {
      case 'rejection_risk':
        return 'Riesgo de Rechazo';
      case 'supplier_degradation':
        return 'Degradación Proveedor';
      case 'expiry_warning':
        return 'Alerta Expiración';
      case 'parameter_drift':
        return 'Deriva de Parámetros';
      default:
        return type;
    }
  };

  return (
    <div className="sb-card-glass-light p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Alertas Gemini Intelligence
        </h2>
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/15 text-primary rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert) => {
          const styles = getAlertStyles(alert.severity);

          return (
            <div
              key={alert.id}
              className={`p-3 border rounded-lg ${styles.bg}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={styles.icon}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {alert.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {getTypeLabel(alert.type)}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${styles.confidence} whitespace-nowrap`}>
                  {alert.confidenceLevel}% conf.
                </div>
              </div>

              {/* Message */}
              <div className="text-xs text-foreground mb-2 leading-relaxed">
                {alert.message}
              </div>

              {/* Entity Info */}
              {(alert.lotCode || alert.supplierId || alert.itemId) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {alert.lotCode && (
                    <span className="px-1.5 py-0.5 text-xs bg-white/60 rounded">
                      Lote: {alert.lotCode}
                    </span>
                  )}
                  {alert.itemId && (
                    <span className="px-1.5 py-0.5 text-xs bg-white/60 rounded">
                      Item: {alert.itemId}
                    </span>
                  )}
                  {alert.supplierId && (
                    <span className="px-1.5 py-0.5 text-xs bg-white/60 rounded">
                      Proveedor: {alert.supplierId}
                    </span>
                  )}
                </div>
              )}

              {/* Time Estimate */}
              {alert.estimatedTimeToIssue && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Tiempo estimado: {alert.estimatedTimeToIssue}</span>
                </div>
              )}

              {/* Triggering Factors */}
              {alert.triggeringFactors && alert.triggeringFactors.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-foreground mb-1">
                    Factores:
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    {alert.triggeringFactors.slice(0, 2).map((factor, idx: number) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preventive Actions */}
              {alert.preventiveActions && alert.preventiveActions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-foreground mb-1">
                    Acciones Preventivas:
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    {alert.preventiveActions.slice(0, 2).map((action, idx: number) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {alerts.length > 5 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            +{alerts.length - 5} alertas adicionales
          </div>
        </div>
      )}
    </div>
  );
}
