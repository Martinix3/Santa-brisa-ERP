/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/gemini/context-logger.ts
import 'server-only';
import { adminDb as db } from '@/server/firebase';
import admin from 'firebase-admin';

export type GeminiEventType =
  | 'shipment_exception'
  | 'shipment_status_change'
  | 'shipment_tracking_assigned'
  | 'integration_failure'
  | 'invoice_overdue'
  | 'albaran_generated'
  | 'invoice_created'
  | 'stock_released'
  | 'low_stock_detected'
  | 'shipment_label_created';

export interface GeminiContextEvent {
  id: string;
  eventType: GeminiEventType;
  module: 'logistics' | 'sales' | 'finance' | 'inventory' | 'quality';
  data: Record<string, any>;
  timestamp: string;
  processed: boolean;
  processedAt?: string;
  insights?: string[];  // Gemini-generated insights
  recommendations?: string[];  // Gemini-generated recommendations
}

/**
 * Log de eventos para análisis posterior con Gemini (Fase 6)
 * 
 * Estos eventos alimentarán el sistema de IA para:
 * - Detectar patrones de problemas
 * - Predecir incidencias
 * - Recomendar acciones
 * - Optimizar procesos
 */
export async function logGeminiContext(
  eventType: GeminiEventType,
  data: Record<string, any>,
  module: GeminiContextEvent['module'] = 'logistics'
): Promise<void> {
  try {
    await db.collection('gemini_context').add({
      eventType,
      module,
      data,
      timestamp: new Date().toISOString(),
      processed: false
    });
  } catch (error) {
    // No lanzar error para no interrumpir el flujo principal
    console.error('[logGeminiContext] Error:', error);
  }
}

/**
 * Marca eventos como procesados después de análisis con Gemini
 */
export async function markEventsAsProcessed(
  eventIds: string[],
  insights?: string[],
  recommendations?: string[]
): Promise<void> {
  const batch = db.batch();
  const now = new Date().toISOString();

  for (const eventId of eventIds) {
    const ref = db.collection('gemini_context').doc(eventId);
    batch.update(ref, {
      processed: true,
      processedAt: now,
      ...(insights && { insights }),
      ...(recommendations && { recommendations })
    });
  }

  await batch.commit();
}

/**
 * Obtiene eventos no procesados para análisis con Gemini
 */
export async function getUnprocessedEvents(
  limit: number = 100,
  eventType?: GeminiEventType
): Promise<GeminiContextEvent[]> {
  let query: any = db.collection('gemini_context')
    .where('processed', '==', false)
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (eventType) {
    query = query.where('eventType', '==', eventType);
  }

  const snap = await query.get();
  return snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  } as GeminiContextEvent));
}

/**
 * Obtiene eventos recientes para contexto (últimas 24h)
 */
export async function getRecentEvents(
  hours: number = 24,
  eventType?: GeminiEventType
): Promise<GeminiContextEvent[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  let query: any = db.collection('gemini_context')
    .where('timestamp', '>=', since)
    .orderBy('timestamp', 'desc')
    .limit(500);

  if (eventType) {
    query = query.where('eventType', '==', eventType);
  }

  const snap = await query.get();
  return snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data()
  } as GeminiContextEvent));
}

/**
 * Analiza patrones en eventos (preparado para Gemini)
 */
export async function analyzeEventPatterns(
  eventType: GeminiEventType,
  days: number = 7
): Promise<{
  totalEvents: number;
  eventsPerDay: number;
  peakHour: number;
  commonEntities: Record<string, number>;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const snap = await db.collection('gemini_context')
    .where('eventType', '==', eventType)
    .where('timestamp', '>=', since)
    .get();

  const events = snap.docs.map(doc => doc.data());
  const totalEvents = events.length;
  const eventsPerDay = totalEvents / days;

  // Análisis de hora pico
  const hourCounts: Record<number, number> = {};
  events.forEach((event: any) => {
    const hour = new Date(event.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 0;

  // Análisis de entidades comunes
  const commonEntities: Record<string, number> = {};
  events.forEach((event: any) => {
    Object.entries(event.data || {}).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length < 50) {
        const entityKey = `${key}:${value}`;
        commonEntities[entityKey] = (commonEntities[entityKey] || 0) + 1;
      }
    });
  });

  return {
    totalEvents,
    eventsPerDay: Math.round(eventsPerDay * 100) / 100,
    peakHour: Number(peakHour),
    commonEntities
  };
}
