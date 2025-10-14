"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ShoppingCart, 
  MessageSquare, 
  CheckSquare, 
  Calendar,
  Mail,
  FileText,
  Briefcase,
  ChevronDown,
  Loader2
} from "lucide-react";
import type { TimelineEvent } from "@/server/actions/accounts";

interface AccountTimelineProps {
  events: TimelineEvent[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function AccountTimeline({ events, onLoadMore, hasMore, loading }: AccountTimelineProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEvent['type']>>(
    new Set(['ORDER', 'INTERACTION', 'TASK'])
  );

  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ORDER': return <ShoppingCart size={16} className="text-blue-500" />;
      case 'INTERACTION': return <MessageSquare size={16} className="text-green-500" />;
      case 'TASK': return <CheckSquare size={16} className="text-orange-500" />;
      case 'VISIT': return <Calendar size={16} className="text-purple-500" />;
      case 'EMAIL': return <Mail size={16} className="text-pink-500" />;
      case 'NOTE': return <FileText size={16} className="text-gray-500" />;
      case 'PROJECT': return <Briefcase size={16} className="text-indigo-500" />;
      default: return <MessageSquare size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: TimelineEvent['type']) => {
    const labels: Record<TimelineEvent['type'], string> = {
      ORDER: 'Pedidos',
      INTERACTION: 'Interacciones',
      TASK: 'Tareas',
      VISIT: 'Visitas',
      EMAIL: 'Emails',
      NOTE: 'Notas',
      PROJECT: 'Proyectos'
    };
    return labels[type] || type;
  };

  const toggleType = (type: TimelineEvent['type']) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  // Filter events by selected types
  const filteredEvents = events.filter(event => selectedTypes.has(event.type));

  // Group events by type for counts
  const eventCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Available event types
  const availableTypes: TimelineEvent['type'][] = ['ORDER', 'INTERACTION', 'TASK', 'VISIT', 'EMAIL', 'NOTE'];

  if (events.length === 0) {
    return (
      <div className="sb-card-glass-light p-8 text-center">
        <MessageSquare size={48} className="mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="font-semibold text-lg mb-2">No hay actividad registrada</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Los pedidos, visitas y tareas aparecerán aquí
        </p>
        <div className="space-y-2 text-xs text-left max-w-md mx-auto">
          <div className="flex items-start gap-2">
            <span>💡</span>
            <p>Crea un pedido para ver actividad comercial</p>
          </div>
          <div className="flex items-start gap-2">
            <span>📅</span>
            <p>Registra visitas para hacer seguimiento</p>
          </div>
          <div className="flex items-start gap-2">
            <span>✅</span>
            <p>Asigna tareas para gestionar la cuenta</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {availableTypes.map(type => {
          const count = eventCounts[type] || 0;
          if (count === 0) return null;
          
          const isSelected = selectedTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all
                ${isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
              `}
            >
              {getIcon(type)}
              <span>{getTypeLabel(type)}</span>
              <span className="sb-kpi-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline Events */}
      {filteredEvents.length === 0 ? (
        <div className="sb-card-glass-light p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay eventos del tipo seleccionado
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="sb-card-glass-light p-4 hover-raise cursor-pointer transition-all"
              onClick={() => {
                // Navigate to detail based on type
                if (event.relatedId) {
                  if (event.type === 'ORDER') {
                    window.location.href = `/ventas/pedidos/${event.relatedId}`;
                  } else if (event.type === 'TASK') {
                    // Open task modal or drawer
                    console.log('Open task:', event.relatedId);
                  }
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">{getIcon(event.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.date), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {event.description}
                    </p>
                  )}

                  {/* Metadata tags */}
                  {event.metadata && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {event.metadata.status && (
                        <span className="sb-badge sb-badge--primary">
                          {event.metadata.status}
                        </span>
                      )}
                      {event.metadata.flow && (
                        <span className={`sb-badge ${
                          event.metadata.flow === 'DIRECT' 
                            ? 'sb-badge--primary' 
                            : 'sb-badge--warning'
                        }`}>
                          {event.metadata.flow === 'DIRECT' ? '🏪 Direct' : '📦 Placement'}
                        </span>
                      )}
                      {event.metadata.priority && (
                        <span className={`sb-badge ${
                          event.metadata.priority === 'HIGH' || event.metadata.priority === 'URGENT'
                            ? 'sb-badge--destructive'
                            : 'sb-badge--default'
                        }`}>
                          {event.metadata.priority}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Created by */}
                  {event.createdBy && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Por {event.createdBy}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="sb-btn sb-btn--ghost"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    <span>Cargar más</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
