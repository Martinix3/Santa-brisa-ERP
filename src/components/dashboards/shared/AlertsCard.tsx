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
      case 'critical': return <XCircle className="text-destructive" size={18} />;
      case 'warning': return <AlertTriangle className="text-warning" size={18} />;
      case 'success': return <CheckCircle className="text-success" size={18} />;
      default: return <Info className="text-info" size={18} />;
    }
  };

  const getAlertBadgeClass = (type: string) => {
    switch (type) {
      case 'critical': return 'sb-badge bg-destructive/10 text-destructive border-destructive/20';
      case 'warning': return 'sb-badge bg-warning/10 text-warning border-warning/20';
      case 'success': return 'sb-badge bg-success/10 text-success border-success/20';
      default: return 'sb-badge bg-info/10 text-info border-info/20';
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
              className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-sm">{alert.title}</div>
                    <span className={getAlertBadgeClass(alert.type)}>
                      {alert.type}
                    </span>
                  </div>
                  {alert.description && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {alert.description}
                    </div>
                  )}
                  {alert.actionLabel && onActionClick && (
                    <button
                      onClick={() => onActionClick(alert)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {alert.actionLabel}
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
