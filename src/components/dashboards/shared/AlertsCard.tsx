"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description?: string;
  actionLabel?: string;
}

interface AlertsCardProps {
  alerts: Alert[];
  onActionClick?: (alert: Alert) => void;
  variant?: 'light' | 'subtle';
}

export function AlertsCard({ 
  alerts, 
  onActionClick,
  variant = 'light' 
}: AlertsCardProps) {
  const cardClass = variant === 'subtle' 
    ? 'sb-card-glass-subtle' 
    : 'sb-card-glass-light';

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'success': return <CheckCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getAlertClass = (type: string) => {
    switch (type) {
      case 'critical': return 'sb-alert sb-alert--critical';
      case 'warning': return 'sb-alert sb-alert--warning';
      case 'success': return 'sb-alert sb-alert--success';
      default: return 'sb-alert sb-alert--info';
    }
  };

  const getAlertLabel = (type: string) => {
    switch (type) {
      case 'critical': return 'Crítico';
      case 'warning': return 'Aviso';
      case 'success': return 'Éxito';
      default: return 'Info';
    }
  };

  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-warning" />
        <h3 className="text-sm font-semibold">Alertas</h3>
        {alerts.length > 0 && (
          <span className="sb-kpi-badge ml-auto px-2 py-0.5 text-xs">
            {alerts.length}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Sin alertas activas
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={getAlertClass(alert.type)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm">{alert.title}</div>
                    <span className="sb-kpi-badge px-2 py-0.5 text-xs font-semibold">
                      {getAlertLabel(alert.type)}
                    </span>
                  </div>
                  {alert.description && (
                    <div className="text-xs opacity-90 mb-2">
                      {alert.description}
                    </div>
                  )}
                  {alert.actionLabel && onActionClick && (
                    <button
                      onClick={() => onActionClick(alert)}
                      className="text-xs font-semibold hover:underline mt-1"
                    >
                      {alert.actionLabel} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
