"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, DollarSign, Users, Target, X } from "lucide-react";
import type { ProjectAlert } from "@/server/actions/project-alerts";
import { checkAllProjectsAlerts, getAlertsSummary } from "@/server/actions/project-alerts";

export function ProjectAlerts() {
  const [alerts, setAlerts] = useState<ProjectAlert[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const [alertsData, summaryData] = await Promise.all([
        checkAllProjectsAlerts(),
        getAlertsSummary()
      ]);

      setAlerts(alertsData);
      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.projectId + a.type));

  const getIcon = (type: ProjectAlert['type']) => {
    switch (type) {
      case 'OVERDUE': return <Clock size={18} />;
      case 'BUDGET_OVERRUN': return <DollarSign size={18} />;
      case 'RESOURCE_OVERLOAD': return <Users size={18} />;
      case 'NO_PROGRESS': return <Target size={18} />;
      case 'MILESTONE_MISSED': return <AlertTriangle size={18} />;
    }
  };

  const getSeverityColor = (severity: ProjectAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'border-red-500 bg-red-50 text-red-900';
      case 'HIGH': return 'border-orange-500 bg-orange-50 text-orange-900';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      case 'LOW': return 'border-blue-500 bg-blue-50 text-blue-900';
    }
  };

  const dismissAlert = (projectId: string, type: string) => {
    setDismissed([...dismissed, projectId + type]);
  };

  if (loading) {
    return (
      <div className="sb-card-glass-light p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="sb-card-glass-light p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold mb-2">Sin alertas activas</h3>
        <p className="text-sm text-muted-foreground">
          Todos los proyectos están dentro de los parámetros normales
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {summary.total} alerta{summary.total !== 1 ? 's' : ''}:
        </span>
        {summary.critical > 0 && (
          <span className="sb-badge sb-badge--destructive">
            {summary.critical} Crítica{summary.critical !== 1 ? 's' : ''}
          </span>
        )}
        {summary.high > 0 && (
          <span className="sb-badge" style={{ backgroundColor: '#ff9800', color: 'white' }}>
            {summary.high} Alta{summary.high !== 1 ? 's' : ''}
          </span>
        )}
        {summary.medium > 0 && (
          <span className="sb-badge sb-badge--warning">
            {summary.medium} Media{summary.medium !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Alerts list */}
      <div className="space-y-2">
        {visibleAlerts.map((alert, idx: number) => (
          <div
            key={`${alert.projectId}-${alert.type}-${idx}`}
            className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)} relative group`}
          >
            <button
              onClick={() => dismissAlert(alert.projectId, alert.type)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">
                    {alert.projectTitle}
                  </h4>
                  <span className="text-xs opacity-70">
                    {alert.severity}
                  </span>
                </div>
                
                <p className="text-sm font-medium mb-1">
                  {alert.message}
                </p>
                
                <p className="text-xs opacity-70">
                  {alert.details}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <button
        onClick={loadAlerts}
        className="sb-btn sb-btn--ghost w-full"
      >
        Actualizar alertas
      </button>
    </div>
  );
}
