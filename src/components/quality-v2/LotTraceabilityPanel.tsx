'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useEffect, useState } from 'react';
import { Clock, TruckIcon, Factory, Package, CheckCircle, XCircle, ArrowRight, PackagePlus, PackageMinus, ArrowLeftRight } from 'lucide-react';
import { getTraceEventsForLot, type EnrichedStockMove } from '@/server/actions/traceability.actions';

export function LotTraceabilityPanel({ lotCode }: { lotCode: string }) {
  const [events, setEvents] = useState<EnrichedStockMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      
      const result = await getTraceEventsForLot(lotCode);
      
      if (!alive) return;
      
      if (result.success && result.events) {
        setEvents(result.events);
      } else {
        setError(result.error || 'Error al cargar trazabilidad');
      }
      
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [lotCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Clock className="mr-2 h-4 w-4 animate-spin" />
        Cargando trazabilidad…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive/50 mb-3" />
        <p className="text-sm text-destructive mb-2">Error al cargar trazabilidad</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  const getIcon = (reason: string) => {
    const reasonLower = reason.toLowerCase();
    switch (reasonLower) {
      case 'receipt': return <PackagePlus className="h-4 w-4" />;
      case 'production_in': return <Factory className="h-4 w-4" />;
      case 'production_out': return <Factory className="h-4 w-4" />;
      case 'sale':
      case 'ship': return <PackageMinus className="h-4 w-4" />;
      case 'transfer': return <ArrowLeftRight className="h-4 w-4" />;
      case 'adjustment': return <Clock className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getColor = (reason: string) => {
    const reasonLower = reason.toLowerCase();
    switch (reasonLower) {
      case 'receipt': return 'border-info';
      case 'production_in': 
      case 'production_out': return 'border-warning';
      case 'sale':
      case 'ship': return 'border-destructive';
      case 'transfer': return 'border-accent';
      case 'adjustment': return 'border-secondary';
      default: return 'border-muted';
    }
  };

  const getBadgeColor = (reason: string) => {
    const reasonLower = reason.toLowerCase();
    switch (reasonLower) {
      case 'receipt': return 'sb-badge--info';
      case 'production_in': 
      case 'production_out': return 'sb-badge--warning';
      case 'sale':
      case 'ship': return 'sb-badge--destructive';
      case 'transfer': return 'sb-badge--secondary';
      case 'adjustment': return 'sb-badge--default';
      default: return 'sb-badge--default';
    }
  };

  const getEventLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'receipt': 'Recepción',
      'production_in': 'Consumo Producción',
      'production_out': 'Salida Producción',
      'sale': 'Venta',
      'ship': 'Envío',
      'transfer': 'Transferencia',
      'adjustment': 'Ajuste',
    };
    return labels[reason.toLowerCase()] || reason;
  };

  const getEventDescription = (event: EnrichedStockMove) => {
    const parts: string[] = [];
    
    if (event.itemName) {
      parts.push(event.itemName);
    }
    
    if (event.qty && event.uom) {
      parts.push(`${event.qty} ${event.uom}`);
    }
    
    if (event.fromLocationName && event.toLocationName) {
      parts.push(`de ${event.fromLocationName} a ${event.toLocationName}`);
    } else if (event.toLocationName) {
      parts.push(`a ${event.toLocationName}`);
    } else if (event.fromLocationName) {
      parts.push(`desde ${event.fromLocationName}`);
    }
    
    return parts.join(' · ');
  };

  return (
    <div className="space-y-4 p-4">
      <h4 className="font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Timeline de trazabilidad · {lotCode}
      </h4>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            No hay eventos de trazabilidad registrados
          </p>
          <p className="text-xs text-muted-foreground">
            Los eventos aparecerán conforme se registren movimientos del lote
          </p>
        </div>
      ) : (
        <div className="relative pl-8 space-y-6">
          {/* Línea vertical del timeline */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-info via-accent to-success"></div>
          
          {events.map((event) => {
            const reason = event.reason ?? 'other';
            // Format date properly - handle Firestore Timestamp objects
            const dateValue = event.occurredAt || event.createdAt;
            let dateString = 'Invalid Date';
            try {
              if (dateValue) {
                const dateObj = typeof dateValue === 'object' && 'toDate' in dateValue
                  ? (dateValue as any).toDate()
                  : new Date(dateValue);
                dateString = dateObj.toLocaleString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch (e) {
              console.error('Error formatting date:', e);
            }

            return (
              <div key={event.id} className="relative">
                <div className={`absolute -left-[1.875rem] top-1 w-6 h-6 rounded-full bg-background border-2 ${getColor(reason)} flex items-center justify-center`}>
                  {getIcon(reason)}
                </div>
                <div className={`sb-card-glass-light p-4 border-l-4 ${getColor(reason)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={getBadgeColor(reason)}>{getEventLabel(reason)}</span>
                    <span className="text-xs text-muted-foreground">
                      {dateString}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">{getEventDescription(event)}</p>
                  {event.userName && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Usuario:</strong> {event.userName}
                    </p>
                  )}
                  {(event as any).docRef && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Documento:</strong> {(event as any).docRef.type} · {(event as any).docRef.id.slice(0, 8)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1 text-success">✓ Trazabilidad activa</p>
          <p>Se han registrado {events.length} evento{events.length !== 1 ? 's' : ''} para este lote</p>
        </div>
      )}
    </div>
  );
}
