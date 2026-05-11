/**
 * Endpoint de métricas de Gemini Intelligence
 * 
 * GET /api/admin/gemini-metrics
 * 
 * Retorna estadísticas de:
 * - Telemetría (requests, tiempos, tokens, costos)
 * - Cache (hit rate, size)
 * - Circuit Breaker (estado, fallos)
 * - Rate Limiting (info)
 */

import { NextRequest, NextResponse } from 'next/server';
import { geminiTelemetry } from '@/lib/telemetry/gemini-telemetry';
import { geminiCache } from '@/lib/cache/gemini-cache';
import { geminiCircuitBreaker } from '@/lib/resilience/circuit-breaker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetro de ventana de tiempo (default: 1 hora)
    const searchParams = request.nextUrl.searchParams;
    const timeWindowParam = searchParams.get('window');
    const timeWindowMs = timeWindowParam 
      ? parseInt(timeWindowParam) * 1000 
      : 3600000; // 1 hora default
    
    // Recolectar todas las métricas
    const telemetryStats = geminiTelemetry.getStats(timeWindowMs);
    const cacheStats = geminiCache.getStats();
    const circuitBreakerState = geminiCircuitBreaker.getState();
    
    // Calcular tiempo de ventana en formato legible
    const windowHours = timeWindowMs / 3600000;
    const windowLabel = windowHours < 1 
      ? `${Math.round(windowHours * 60)}m`
      : `${windowHours}h`;
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      timeWindow: {
        ms: timeWindowMs,
        label: windowLabel
      },
      
      // Resumen ejecutivo
      summary: {
        totalRequests: telemetryStats.totalRequests,
        successRate: Math.round(telemetryStats.successRate * 10) / 10,
        avgDuration: Math.round(telemetryStats.avgDuration),
        cacheHitRate: Math.round(telemetryStats.cacheHitRate * 10) / 10,
        estimatedCost: Math.round(telemetryStats.estimatedCost * 10000) / 10000,
        circuitBreakerState: circuitBreakerState.state
      },
      
      // Telemetría detallada
      telemetry: {
        requests: {
          total: telemetryStats.totalRequests,
          successful: Math.round((telemetryStats.successRate / 100) * telemetryStats.totalRequests),
          errors: Math.round((telemetryStats.errorRate / 100) * telemetryStats.totalRequests),
          fallbacks: Math.round((telemetryStats.fallbackRate / 100) * telemetryStats.totalRequests)
        },
        performance: {
          avgDuration: Math.round(telemetryStats.avgDuration),
          p50Duration: Math.round(telemetryStats.p50Duration),
          p95Duration: Math.round(telemetryStats.p95Duration),
          p99Duration: Math.round(telemetryStats.p99Duration)
        },
        tokens: {
          total: telemetryStats.totalTokens,
          avgPerRequest: Math.round(telemetryStats.avgTokensPerRequest)
        },
        cost: {
          total: Math.round(telemetryStats.estimatedCost * 10000) / 10000,
          avgPerRequest: Math.round((telemetryStats.estimatedCost / Math.max(1, telemetryStats.totalRequests)) * 10000) / 10000
        },
        byOperation: telemetryStats.byOperation,
        topUsers: getTopUsers(telemetryStats.byUser, 10)
      },
      
      // Cache
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        utilization: Math.round((cacheStats.size / cacheStats.maxSize) * 100),
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: Math.round(cacheStats.hitRate * 10) / 10
      },
      
      // Circuit Breaker
      circuitBreaker: {
        state: circuitBreakerState.state,
        failures: circuitBreakerState.failures,
        successes: circuitBreakerState.successes,
        healthy: circuitBreakerState.state === 'CLOSED',
        lastFailure: circuitBreakerState.lastFailureTime 
          ? new Date(circuitBreakerState.lastFailureTime).toISOString()
          : null,
        nextAttempt: circuitBreakerState.nextAttemptTime
          ? new Date(circuitBreakerState.nextAttemptTime).toISOString()
          : null
      }
    });
    
  } catch (error: any) {
    console.error('[GeminiMetrics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo métricas' },
      { status: 500 }
    );
  }
}

/**
 * Helper para obtener top N usuarios por uso
 */
function getTopUsers(userStats: Record<string, any>, limit: number = 10) {
  return Object.entries(userStats)
    .map(([userId, stats]) => ({
      userId,
      ...stats,
      avgCost: stats.requestCount > 0 
        ? Math.round((stats.totalCost / stats.requestCount) * 10000) / 10000
        : 0
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, limit);
}
