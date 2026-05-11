/**
 * Intelligence Hub Server Actions
 * 
 * Actions para obtener estadísticas y métricas del uso de Gemini AI
 */

'use server';

import { adminDb as db } from '@/server/firebase';
import { getGeminiClient } from '@/server/gemini/gemini-client';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export interface AnalyzerStats {
  name: string;
  displayName: string;
  category: 'analysis' | 'automation' | 'intelligence';
  complexity: 'simple' | 'medium' | 'complex';
  totalCalls: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  last24h: {
    calls: number;
    cost: number;
  };
}

export interface IntelligenceHubStats {
  overview: {
    totalCalls: number;
    totalCost: number;
    avgLatency: number;
    totalTokens: number;
  };
  byAnalyzer: AnalyzerStats[];
  byComplexity: {
    simple: { calls: number; cost: number };
    medium: { calls: number; cost: number };
    complex: { calls: number; cost: number };
  };
  recentActivity: {
    timestamp: string;
    analyzer: string;
    operation: string;
    latencyMs: number;
    cost: number;
  }[];
  costTrend: {
    date: string;
    cost: number;
    calls: number;
  }[];
}

/**
 * Obtener estadísticas completas del Intelligence Hub
 */
export async function getIntelligenceHubStats(
  days: number = 7
): Promise<IntelligenceHubStats> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Obtener todos los registros de uso de Gemini
    const usageSnap = await db
      .collection('gemini_usage')
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .orderBy('date', 'desc')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();

    let totalCalls = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let totalTokens = 0;

    const byComplexity = {
      simple: { calls: 0, cost: 0 },
      medium: { calls: 0, cost: 0 },
      complex: { calls: 0, cost: 0 },
    };

    const analyzerMap = new Map<string, {
      calls: number;
      cost: number;
      latency: number;
      last24hCalls: number;
      last24hCost: number;
    }>();

    const costTrendMap = new Map<string, { cost: number; calls: number }>();
    const recentActivity: any[] = [];

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    usageSnap.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();

      totalCalls++;
      totalCost += data.estimatedCost || 0;
      totalLatency += data.latencyMs || 0;
      totalTokens += data.totalTokens || 0;

      // Por complejidad
      const complexity = data.complexity || 'medium';
      if (byComplexity[complexity as keyof typeof byComplexity]) {
        byComplexity[complexity as keyof typeof byComplexity].calls++;
        byComplexity[complexity as keyof typeof byComplexity].cost += data.estimatedCost || 0;
      }

      // Por analyzer (extraer del modelo o contexto)
      const analyzer = extractAnalyzerFromModel(data.model, data.context);

      if (!analyzerMap.has(analyzer)) {
        analyzerMap.set(analyzer, {
          calls: 0,
          cost: 0,
          latency: 0,
          last24hCalls: 0,
          last24hCost: 0,
        });
      }

      const stats = analyzerMap.get(analyzer)!;
      stats.calls++;
      stats.cost += data.estimatedCost || 0;
      stats.latency += data.latencyMs || 0;

      // Last 24h
      const timestamp = new Date(data.timestamp);
      if (timestamp > last24h) {
        stats.last24hCalls++;
        stats.last24hCost += data.estimatedCost || 0;
      }

      // Cost trend
      const date = data.date;
      if (!costTrendMap.has(date)) {
        costTrendMap.set(date, { cost: 0, calls: 0 });
      }
      const trend = costTrendMap.get(date)!;
      trend.cost += data.estimatedCost || 0;
      trend.calls++;

      // Recent activity (últimos 20)
      if (recentActivity.length < 20) {
        recentActivity.push({
          timestamp: data.timestamp,
          analyzer,
          operation: data.operation || 'Analysis',
          latencyMs: data.latencyMs || 0,
          cost: data.estimatedCost || 0,
        });
      }
    });

    // Construir stats por analyzer
    const byAnalyzer: AnalyzerStats[] = [];

    const analyzerDefinitions = getAnalyzerDefinitions();

    for (const [name, definition] of Object.entries(analyzerDefinitions)) {
      const stats = analyzerMap.get(name) || {
        calls: 0,
        cost: 0,
        latency: 0,
        last24hCalls: 0,
        last24hCost: 0,
      };

      byAnalyzer.push({
        name,
        displayName: definition.displayName,
        category: definition.category,
        complexity: definition.complexity,
        totalCalls: stats.calls,
        totalCost: stats.cost,
        avgLatency: stats.calls > 0 ? stats.latency / stats.calls : 0,
        successRate: 100, // TODO: Calcular tasa de éxito real
        last24h: {
          calls: stats.last24hCalls,
          cost: stats.last24hCost,
        },
      });
    }

    // Ordenar por uso
    byAnalyzer.sort((a, b) => b.totalCalls - a.totalCalls);

    // Construir cost trend
    const costTrend = Array.from(costTrendMap.entries())
      .map(([date, data]) => ({ date, cost: data.cost, calls: data.calls }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      overview: {
        totalCalls,
        totalCost,
        avgLatency: totalCalls > 0 ? totalLatency / totalCalls : 0,
        totalTokens,
      },
      byAnalyzer,
      byComplexity,
      recentActivity,
      costTrend,
    };
  } catch (error) {
    console.error('[Intelligence Hub] Error getting stats:', error);

    // Return empty stats on error
    return {
      overview: {
        totalCalls: 0,
        totalCost: 0,
        avgLatency: 0,
        totalTokens: 0,
      },
      byAnalyzer: Object.entries(getAnalyzerDefinitions()).map(([name, def]) => ({
        name,
        displayName: def.displayName,
        category: def.category,
        complexity: def.complexity,
        totalCalls: 0,
        totalCost: 0,
        avgLatency: 0,
        successRate: 100,
        last24h: { calls: 0, cost: 0 },
      })),
      byComplexity: {
        simple: { calls: 0, cost: 0 },
        medium: { calls: 0, cost: 0 },
        complex: { calls: 0, cost: 0 },
      },
      recentActivity: [],
      costTrend: [],
    };
  }
}

/**
 * Extraer el analyzer del modelo o contexto
 */
function extractAnalyzerFromModel(model: string, context?: any): string {
  // TODO: Mejorar detección basada en contexto real
  if (context?.analyzer) return context.analyzer;
  if (context?.type === 'email') return 'email-analyzer';
  if (context?.type === 'document') return 'document-analyzer';
  if (context?.type === 'quicklog') return 'quicklog-analyzer';

  // Default basado en complejidad
  if (model?.includes('flash')) return 'email-analyzer'; // Simple tasks
  if (model?.includes('pro')) return 'code-analyzer'; // Complex tasks

  return 'general';
}

/**
 * Definiciones de todos los analyzers
 */
function getAnalyzerDefinitions() {
  return {
    'email-analyzer': {
      displayName: 'Email Analyzer',
      category: 'intelligence' as const,
      complexity: 'simple' as const,
      description: 'Clasifica y analiza emails automáticamente',
    },
    'document-analyzer': {
      displayName: 'Document Analyzer',
      category: 'intelligence' as const,
      complexity: 'medium' as const,
      description: 'Extrae información de documentos adjuntos',
    },
    'quicklog-analyzer': {
      displayName: 'QuickLog Analyzer',
      category: 'intelligence' as const,
      complexity: 'simple' as const,
      description: 'Interpreta comandos de voz y texto',
    },
    'sales-analyzer': {
      displayName: 'Sales Analyzer',
      category: 'analysis' as const,
      complexity: 'medium' as const,
      description: 'Análisis predictivo de ventas',
    },
    'stock-analyzer': {
      displayName: 'Stock Analyzer',
      category: 'analysis' as const,
      complexity: 'medium' as const,
      description: 'Optimización de inventario',
    },
    'production-analyzer': {
      displayName: 'Production Analyzer',
      category: 'analysis' as const,
      complexity: 'medium' as const,
      description: 'Optimización de producción',
    },
    'bom-analyzer': {
      displayName: 'BOM Analyzer',
      category: 'analysis' as const,
      complexity: 'medium' as const,
      description: 'Análisis de listas de materiales',
    },
    'warehouse-analyzer': {
      displayName: 'Warehouse Analyzer',
      category: 'analysis' as const,
      complexity: 'medium' as const,
      description: 'Optimización de almacén',
    },
    'marketing-analyzer': {
      displayName: 'Marketing Analyzer',
      category: 'automation' as const,
      complexity: 'medium' as const,
      description: 'Generación de campañas y contenido',
    },
    'quality-analyzer': {
      displayName: 'Quality Analyzer',
      category: 'analysis' as const,
      complexity: 'complex' as const,
      description: 'Análisis de calidad y cumplimiento',
    },
    'code-analyzer': {
      displayName: 'Code Analyzer',
      category: 'analysis' as const,
      complexity: 'complex' as const,
      description: 'Análisis y refactoring de código',
    },
    'uiux-analyzer': {
      displayName: 'UI/UX Analyzer',
      category: 'analysis' as const,
      complexity: 'complex' as const,
      description: 'Análisis de interfaces y experiencia de usuario',
    },
  };
}

/**
 * Obtener estadísticas de costos por período
 */
export async function getCostBreakdown(days: number = 30) {
  const client = getGeminiClient();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  return await client.getUsageStats(startDateStr, endDateStr);
}
