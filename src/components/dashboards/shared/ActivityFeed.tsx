"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


interface Activity {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type?: 'order' | 'visit' | 'event' | 'note' | 'other';
  icon?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
  variant?: 'light' | 'subtle';
  onItemClick?: (activity: Activity) => void;
}

export function ActivityFeed({ 
  activities, 
  maxItems = 10, 
  variant = 'light',
  onItemClick 
}: ActivityFeedProps) {
  const items = activities.slice(0, maxItems);
  
  const cardClass = variant === 'subtle' 
    ? 'sb-card-glass-subtle' 
    : 'sb-card-glass-light';

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'order': return 'text-success';
      case 'visit': return 'text-primary';
      case 'event': return 'text-purple-500';
      case 'note': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={`${cardClass} p-5`}>
      <h3 className="text-sm font-semibold mb-4">Actividad Reciente</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Sin actividad reciente
          </div>
        ) : (
          items.map((activity) => (
            <div
              key={activity.id}
              onClick={() => onItemClick?.(activity)}
              className={`rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3 ${
                onItemClick ? 'cursor-pointer hover:bg-background/50 transition-all' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {activity.icon && (
                  <div className="text-xl">{activity.icon}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm truncate">{activity.title}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {activity.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {activity.description}
                    </div>
                  )}
                  {activity.type && (
                    <div className={`text-xs mt-1 ${getTypeColor(activity.type)}`}>
                      {activity.type}
                    </div>
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
