/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Intelligence Hub Dashboard
 * 
 * Dashboard para monitorear el uso de todos los analyzers de Gemini AI
 * - Muestra los 12 analyzers (Email, Document, QuickLog, Sales, Stock, etc.)
 * - Estadísticas de uso y costos
 * - Actividad reciente
 * - Métricas por complejidad
 */

import { getIntelligenceHubStats } from '@/server/actions/intelligence-hub.actions';
import { IntelligenceHubContent } from './IntelligenceHubContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Intelligence Hub | Santa Brisa ERP',
  description: 'Dashboard de Gemini AI Analyzers',
};

export default async function IntelligenceHubPage() {
  // Obtener stats de los últimos 7 días
  const stats = await getIntelligenceHubStats(7);
  
  return <IntelligenceHubContent initialStats={stats} />;
}
