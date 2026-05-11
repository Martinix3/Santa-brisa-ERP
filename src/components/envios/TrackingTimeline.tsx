/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/envios/TrackingTimeline.tsx
"use client";

import React from 'react';
import { Check, Package, Truck, MapPin, AlertCircle, XCircle } from 'lucide-react';

interface TrackingEvent {
  status: string;
  message: string;
  location?: string;
  timestamp: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  shipment: any;
}

export function TrackingTimeline({ events, shipment }: TrackingTimelineProps) {
  // Si no hay eventos de tracking, crear timeline básico desde el shipment
  const timelineEvents = events.length > 0 
    ? events 
    : generateBasicTimeline(shipment);

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-zinc-200" />

      {/* Events */}
      <div className="space-y-6">
        {timelineEvents.map((event: any, index: number) => {
          const isFirst = index === 0;
          const icon = getEventIcon(event.status);
          const colors = getEventColors(event.status);

          return (
            <div key={index} className="relative flex gap-4">
              {/* Icon */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${colors.bg}`}
              >
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className={`font-semibold ${colors.text} ${isFirst ? 'text-base' : 'text-sm'}`}>
                  {event.message || getStatusMessage(event.status)}
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-1 text-xs text-zinc-600 mt-1">
                    <MapPin size={12} />
                    {event.location}
                  </div>
                )}
                
                <div className="text-xs text-zinc-500 mt-1">
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {timelineEvents.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          <Package className="h-12 w-12 mx-auto mb-2 text-zinc-300" />
          <p>No hay eventos de seguimiento disponibles</p>
        </div>
      )}
    </div>
  );
}

function generateBasicTimeline(shipment: any): TrackingEvent[] {
  const events: TrackingEvent[] = [];

  if (shipment.createdAt) {
    events.push({
      status: 'created',
      message: 'Envío creado',
      timestamp: shipment.createdAt,
    });
  }

  if (shipment.validatedAt) {
    events.push({
      status: 'validated',
      message: 'Envío validado',
      timestamp: shipment.validatedAt,
    });
  }

  if (shipment.shippedAt) {
    events.push({
      status: 'shipped',
      message: 'Envío en tránsito',
      timestamp: shipment.shippedAt,
    });
  }

  if (shipment.deliveredAt) {
    events.push({
      status: 'delivered',
      message: 'Envío entregado',
      timestamp: shipment.deliveredAt,
    });
  }

  // Ordenar por timestamp desc (más reciente primero)
  return events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function getEventIcon(status: string) {
  const iconClass = "h-4 w-4";
  
  switch (status.toLowerCase()) {
    case 'delivered':
      return <Check className={iconClass} />;
    case 'shipped':
    case 'in_transit':
      return <Truck className={iconClass} />;
    case 'exception':
    case 'failed':
      return <AlertCircle className={iconClass} />;
    case 'cancelled':
      return <XCircle className={iconClass} />;
    default:
      return <Package className={iconClass} />;
  }
}

function getEventColors(status: string) {
  switch (status.toLowerCase()) {
    case 'delivered':
      return {
        bg: 'bg-green-100',
        text: 'text-green-900',
      };
    case 'shipped':
    case 'in_transit':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-900',
      };
    case 'exception':
    case 'failed':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-900',
      };
    case 'cancelled':
      return {
        bg: 'bg-red-100',
        text: 'text-red-900',
      };
    default:
      return {
        bg: 'bg-zinc-100',
        text: 'text-zinc-900',
      };
  }
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    created: 'Envío creado',
    validated: 'Envío validado',
    picked: 'Productos recogidos',
    packed: 'Paquete preparado',
    shipped: 'Envío en tránsito',
    in_transit: 'En tránsito',
    out_for_delivery: 'En reparto',
    delivered: 'Entregado',
    exception: 'Incidencia detectada',
    failed: 'Fallo en la entrega',
    cancelled: 'Envío cancelado',
  };
  return messages[status.toLowerCase()] || status;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
  }

  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }

  if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
