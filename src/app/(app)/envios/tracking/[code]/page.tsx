/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/envios/tracking/[code]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { Package, MapPin, Calendar } from 'lucide-react';
import { adminDb as db } from '@/server/firebase';
import { TrackingTimeline } from '@/components/envios/TrackingTimeline';
import { ShipmentDetails } from '@/components/envios/ShipmentDetails';

export const dynamic = 'force-dynamic';

type TrackingEvent = {
  status: string;
  at: string;
  location?: string;
  code?: string;
  details?: string;
  message: string;
  timestamp: string;
};

async function getTrackingInfo(code: string) {
  try {
    // Buscar shipment por trackingCode
    const shipmentsSnap = await db
      .collection('shipments')
      .where('trackingCode', '==', code)
      .limit(1)
      .get();

    if (shipmentsSnap.empty) {
      return null;
    }

    const shipmentDoc = shipmentsSnap.docs[0];
    const shipment = { id: shipmentDoc.id, ...shipmentDoc.data() } as any;

    // Obtener historial de tracking si existe
    const trackingSnap = await db
      .collection('shipmentTracking')
      .where('shipmentId', '==', shipment.id)
      .orderBy('timestamp', 'desc')
      .get();

    const trackingEvents: TrackingEvent[] = trackingSnap.docs.map(d => {
      const x = d.data() as any;
      const ts = new Date(x.at ?? x.date ?? x.timestamp ?? Date.now()).toISOString();
      return {
        status: String(x.status ?? x.state ?? 'unknown'),
        at: ts,
        location: x.location ?? x.place ?? undefined,
        code: x.code ?? undefined,
        details: x.details ?? x.note ?? undefined,
        message: x.message ?? x.details ?? x.note ?? '',
        timestamp: ts,
      };
    });

    return {
      shipment,
      events: trackingEvents,
    };
  } catch (error) {
    console.error('Error fetching tracking info:', error);
    return null;
  }
}

export default async function TrackingPage({
  params,
}: {
  params: { code: string };
}) {
  const trackingInfo = await getTrackingInfo(params.code);

  if (!trackingInfo) {
    notFound();
  }

  const { shipment, events } = trackingInfo;

  return (
    <div className="sb-page min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="sb-page__title mb-2">
            Seguimiento de Envío
          </h1>
          <p className="sb-page__subtitle">
            Código de seguimiento: <span className="font-mono font-semibold">{params.code}</span>
          </p>
        </div>

        {/* Status Card */}
        <div className="sb-card-glass-light p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Estado actual</div>
              <div className="text-2xl font-bold text-primary capitalize">
                {getStatusLabel(shipment.status)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Última actualización</div>
              <div className="text-sm font-medium">
                {formatDate(shipment.updatedAt || shipment.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="sb-card-glass-light mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Historial de Seguimiento
            </h2>
            <TrackingTimeline events={events} shipment={shipment} />
          </div>
        </div>

        {/* Shipment Details */}
        <div className="sb-card-glass-light">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Detalles del Envío
            </h2>
            <ShipmentDetails shipment={shipment} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>¿Tienes alguna pregunta sobre tu envío?</p>
          <p className="mt-1">
            Contacta con nosotros en{' '}
            <a href="mailto:info@santabrisa.com" className="text-primary hover:underline">
              info@santabrisa.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    picking: 'Preparando',
    ready_to_ship: 'Listo para enviar',
    shipped: 'En tránsito',
    delivered: 'Entregado',
    exception: 'Incidencia',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
