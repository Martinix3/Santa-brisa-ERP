/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Gemini Telemetry - Sistema de métricas y observabilidad para Gemini AI
 * 
 * Trackea:
 * - Tiempos de respuesta
 * - Tokens consumidos
 * - Costos estimados
 * - Tasas de éxito/error
 * - Cache hit rate
 */

export interface GeminiMetrics {
  requestId: string;
  userId: string;
  operation: string;
  model: string;
  complexity: string;
  
  // Tiempos
  startTime: number;
  endTime?: number;
  duration?: number;
  
  // Tokens
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  
  // Estado
  status: 'success' | 'error' | 'fallback';
  error?: string;
  cacheHit?: boolean;
  circuitBreakerState?: string;
}

interface TelemetryStats {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  fallbackRate: number;
  cacheHitRate: number;
  
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  
  totalTokens: number;
  avgTokensPerRequest: number;
  estimatedCost: number;
  
  byOperation: Record<string, OperationStats>;
  byUser: Record<string, UserStats>;
}

interface OperationStats {
  count: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  avgTokens: number;
  totalCost: number;
}

interface UserStats {
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
}

class GeminiTelemetry {
  private metrics: GeminiMetrics[] = [];
  private maxMetrics = 10000; // Mantener últimas 10k métricas
  
  /**
   * Inicia el tracking de una request
   */
  startRequest(params: {
    userId: string;
    operation: string;
    model: string;
    complexity: string;
  }): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.metrics.push({
      requestId,
      ...params,
      startTime: Date.now(),
      status: 'success'
    });
    
    // Mantener solo últimas N métricas
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    return requestId;
  }
  
  /**
   * Finaliza el tracking de una request
   */
  endRequest(
    requestId: string,
    result: {
      status: 'success' | 'error' | 'fallback';
      error?: string;
      tokens?: { prompt: number; completion: number };
      cacheHit?: boolean;
      circuitBreakerState?: string;
    }
  ): void {
    const metric = this.metrics.find(m => m.requestId === requestId);
    if (!metric) return;
    
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.status = result.status;
    metric.error = result.error;
    metric.cacheHit = result.cacheHit;
    metric.circuitBreakerState = result.circuitBreakerState;
    
    if (result.tokens) {
      metric.promptTokens = result.tokens.prompt;
      metric.completionTokens = result.tokens.completion;
      metric.totalTokens = result.tokens.prompt + result.tokens.completion;
      
      // Gemini 2.0 Flash pricing (ejemplo - actualizar según pricing real)
      // Input: $0.075 per 1M tokens
      // Output: $0.30 per 1M tokens
      const inputCost = (result.tokens.prompt / 1_000_000) * 0.075;
      const outputCost = (result.tokens.completion / 1_000_000) * 0.30;
      metric.estimatedCost = inputCost + outputCost;
    }
  }
  
  /**
   * Obtiene estadísticas agregadas
   */
  getStats(timeWindowMs: number = 3600000): TelemetryStats {
    const cutoff = Date.now() - timeWindowMs;
    const recent = this.metrics.filter(m => m.startTime > cutoff);
    
    if (recent.length === 0) {
      return this.getEmptyStats();
    }
    
    const successCount = recent.filter(m => m.status === 'success').length;
    const errorCount = recent.filter(m => m.status === 'error').length;
    const fallbackCount = recent.filter(m => m.status === 'fallback').length;
    const cacheHits = recent.filter(m => m.cacheHit).length;
    
    const durations = recent
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);
    
    const totalTokens = recent.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
    const totalCost = recent.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
    
    return {
      totalRequests: recent.length,
      successRate: (successCount / recent.length) * 100,
      errorRate: (errorCount / recent.length) * 100,
      fallbackRate: (fallbackCount / recent.length) * 100,
      cacheHitRate: (cacheHits / recent.length) * 100,
      
      avgDuration: this.calculateAverage(durations),
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      
      totalTokens,
      avgTokensPerRequest: recent.length > 0 ? totalTokens / recent.length : 0,
      estimatedCost: totalCost,
      
      byOperation: this.groupByOperation(recent),
      byUser: this.groupByUser(recent)
    };
  }
  
  /**
   * Obtiene métricas de un usuario específico
   */
  getUserStats(userId: string, timeWindowMs: number = 3600000): UserStats | null {
    const cutoff = Date.now() - timeWindowMs;
    const userMetrics = this.metrics.filter(
      m => m.userId === userId && m.startTime > cutoff
    );
    
    if (userMetrics.length === 0) return null;
    
    const totalTokens = userMetrics.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
    const totalCost = userMetrics.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
    const durations = userMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);
    
    return {
      requestCount: userMetrics.length,
      totalTokens,
      totalCost,
      avgDuration: this.calculateAverage(durations)
    };
  }
  
  /**
   * Limpia métricas antiguas
   */
  cleanup(maxAgeMs: number = 86400000): number {
    const cutoff = Date.now() - maxAgeMs;
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.startTime > cutoff);
    return initialLength - this.metrics.length;
  }
  
  /**
   * Helpers privados
   */
  
  private getEmptyStats(): TelemetryStats {
    return {
      totalRequests: 0,
      successRate: 0,
      errorRate: 0,
      fallbackRate: 0,
      cacheHitRate: 0,
      avgDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      totalTokens: 0,
      avgTokensPerRequest: 0,
      estimatedCost: 0,
      byOperation: {},
      byUser: {}
    };
  }
  
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  private groupByOperation(metrics: GeminiMetrics[]): Record<string, OperationStats> {
    const groups: Record<string, OperationStats> = {};
    
    metrics.forEach(m => {
      if (!groups[m.operation]) {
        groups[m.operation] = {
          count: 0,
          successCount: 0,
          errorCount: 0,
          avgDuration: 0,
          avgTokens: 0,
          totalCost: 0
        };
      }
      
      const g = groups[m.operation];
      g.count++;
      if (m.status === 'success') g.successCount++;
      if (m.status === 'error') g.errorCount++;
      if (m.totalTokens) g.avgTokens += m.totalTokens;
      if (m.estimatedCost) g.totalCost += m.estimatedCost;
    });
    
    // Calcular promedios
    Object.keys(groups).forEach(op => {
      const g = groups[op];
      const opMetrics = metrics.filter(m => m.operation === op);
      const durations = opMetrics
        .filter(m => m.duration !== undefined)
        .map(m => m.duration!);
      
      g.avgDuration = this.calculateAverage(durations);
      g.avgTokens = g.count > 0 ? g.avgTokens / g.count : 0;
    });
    
    return groups;
  }
  
  private groupByUser(metrics: GeminiMetrics[]): Record<string, UserStats> {
    const groups: Record<string, UserStats> = {};
    
    metrics.forEach(m => {
      if (!groups[m.userId]) {
        groups[m.userId] = {
          requestCount: 0,
          totalTokens: 0,
          totalCost: 0,
          avgDuration: 0
        };
      }
      
      const g = groups[m.userId];
      g.requestCount++;
      if (m.totalTokens) g.totalTokens += m.totalTokens;
      if (m.estimatedCost) g.totalCost += m.estimatedCost;
    });
    
    // Calcular promedios de duración
    Object.keys(groups).forEach(userId => {
      const userMetrics = metrics.filter(m => m.userId === userId);
      const durations = userMetrics
        .filter(m => m.duration !== undefined)
        .map(m => m.duration!);
      groups[userId].avgDuration = this.calculateAverage(durations);
    });
    
    return groups;
  }
}

// Instancia global
export const geminiTelemetry = new GeminiTelemetry();

// Limpiar métricas antiguas cada 24 horas
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const removed = geminiTelemetry.cleanup(86400000); // 24 horas
    if (removed > 0) {
      console.log(`[GeminiTelemetry] Cleaned up ${removed} old metrics`);
    }
  }, 86400000); // Cada 24 horas
}
