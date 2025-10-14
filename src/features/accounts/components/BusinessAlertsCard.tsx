'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { BusinessAlert } from '@/app/(app)/accounts/[id]/actions';

type Props = {
  alerts: BusinessAlert[];
  onActionClick: (alert: BusinessAlert) => void;
};

export function BusinessAlertsCard({ alerts, onActionClick }: Props) {
  if (alerts.length === 0) {
    return null;
  }

  const getSeverityStyles = (severity: BusinessAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/30',
          text: 'text-destructive',
          icon: AlertCircle,
        };
      case 'warning':
        return {
          bg: 'bg-sb-yellow/10',
          border: 'border-sb-yellow/30',
          text: 'text-sb-yellow',
          icon: AlertTriangle,
        };
      case 'info':
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/30',
          text: 'text-primary',
          icon: Info,
        };
    }
  };

  return (
    <div className="sb-card-glass-light p-5 border-2 border-sb-yellow/20">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-sb-yellow" />
        <h3 className="text-base font-semibold">Alertas de Negocio</h3>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const styles = getSeverityStyles(alert.severity);
          const Icon = styles.icon;
          
          return (
            <div
              key={index}
              className={`
                rounded-xl border ${styles.border} ${styles.bg}
                p-4 backdrop-blur-sm
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon size={20} className={styles.text} />
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${styles.text}`}>
                      {alert.message}
                    </div>
                    {alert.days !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Último registro hace {alert.days} días
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => onActionClick(alert)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    border ${styles.border} ${styles.bg} ${styles.text}
                    hover:opacity-80 transition-all whitespace-nowrap
                  `}
                >
                  {alert.action}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
