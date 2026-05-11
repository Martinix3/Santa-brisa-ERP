/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Production Analyzer - Análisis de eficiencia de producción usando Gemini AI
 * 
 * Analiza:
 * - OEE (Overall Equipment Effectiveness)
 * - Cuellos de botella
 * - Rendimiento por producto
 * - Tendencias de producción
 * 
 * Genera:
 * - Métricas de OEE
 * - Detección de cuellos de botella
 * - Recomendaciones de optimización
 * - Pronóstico de producción
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';
import type { ProductionOrder, QcTest } from '@/domain/ssot';

export interface ProductionMetrics {
  totalOrders: number;
  completedOrders: number;
  totalUnitsProduced: number;
  totalUnitsPlanned: number;
  averageYield: number; // %
  averageDurationHours: number;
  totalIncidents: number;
  defectRate: number; // %
}

export interface OEEMetrics {
  availability: number; // %
  performance: number; // %
  quality: number; // %
  oee: number; // %
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ProductionBottleneck {
  area: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  ordersAffected: number;
}

export interface ProductionRecommendation {
  action:
  | 'REDUCE_DOWNTIME'
  | 'IMPROVE_YIELD'
  | 'OPTIMIZE_SCHEDULE'
  | 'PREVENTIVE_MAINTENANCE'
  | 'INCREASE_CAPACITY'
  | 'REDUCE_DEFECTS'
  | 'STREAMLINE_PROCESS'
  | 'TRAINING_REQUIRED';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'efficiency' | 'quality' | 'maintenance' | 'capacity' | 'waste' | 'process';
  reason: string;
  estimatedImpact: string;
  timeframe: string;
}

export interface ProductionAnalysis extends AnalysisResult {
  type: 'production';
  facilityId?: string;
  dateRange: {
    start: string;
    end: string;
  };
  metrics: ProductionMetrics;
  oee: OEEMetrics;
  bottlenecks: ProductionBottleneck[];
  topProducts: Array<{
    productId: string;
    productName: string;
    ordersCompleted: number;
    avgYield: number;
    defectRate: number;
  }>;
  forecast: {
    nextMonthProduction: number;
    confidence: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  recommendations: ProductionRecommendation[];
  insights: string[];
}

export class ProductionAnalyzer extends BaseAnalyzer {
  complexity: ModelComplexity = 'medium';
  name = 'ProductionAnalyzer';

  /**
   * Analiza la eficiencia de producción
   */
  async analyze(facilityId: string): Promise<ProductionAnalysis> {
    console.log(`[ProductionAnalyzer] Analyzing facility: ${facilityId}`);

    const daysBack = 30;
    const dateRange = this.getDateRange(daysBack);

    // 1. Obtener datos de producción
    const orders = await this.getProductionOrders(facilityId, dateRange);
    const qcTests = await this.getQcTests(dateRange);

    // 2. Calcular métricas
    const metrics = this.calculateMetrics(orders, qcTests);
    const oee = this.calculateOEE(orders, qcTests, daysBack);
    const bottlenecks = this.detectBottlenecks(orders);
    const topProducts = this.getTopProducts(orders, qcTests);
    const forecast = this.generateForecast(orders);

    // 3. Preparar contexto para Gemini
    const context = {
      metrics,
      oee,
      bottlenecks,
      topProducts: topProducts.slice(0, 5),
      forecast
    };

    // 4. Llamar a Gemini para obtener recomendaciones
    let geminiResponse: any;
    try {
      geminiResponse = await this.callGeminiJSON(
        this.buildProductionPrompt(),
        context
      );
    } catch (error) {
      console.error('[ProductionAnalyzer] Gemini error:', error);
      geminiResponse = this.generateBasicRecommendations(context);
    }

    // 5. Construir análisis
    const analysis: ProductionAnalysis = {
      id: `production-${facilityId || 'all'}-${Date.now()}`,
      type: 'production',
      entityId: facilityId || 'all',
      entityName: facilityId ? `Facility ${facilityId}` : 'All Facilities',
      facilityId,
      dateRange,
      metrics,
      oee,
      bottlenecks,
      topProducts,
      forecast,
      recommendations: geminiResponse.recommendations || [],
      insights: geminiResponse.insights || [],
      createdAt: new Date().toISOString(),
      metadata: {
        ordersAnalyzed: orders.length,
        testsAnalyzed: qcTests.length
      }
    };

    // 6. Guardar análisis
    await this.saveAnalysis('production', facilityId || 'all', analysis);

    console.log(`[ProductionAnalyzer] Analysis complete: OEE ${oee.oee.toFixed(1)}% (${oee.rating})`);

    return analysis;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  async getRecommendations(analysis: ProductionAnalysis): Promise<Recommendation[]> {
    return analysis.recommendations.map(rec => ({
      id: `prod-rec-${analysis.entityId}-${Date.now()}-${Math.random()}`,
      type: 'PRODUCTION',
      priority: rec.priority,
      title: `${rec.action}: ${rec.category}`,
      description: rec.reason,
      actionUrl: '/production/dashboard',
      metadata: {
        facilityId: analysis.facilityId,
        category: rec.category,
        estimatedImpact: rec.estimatedImpact,
        timeframe: rec.timeframe,
        oeeRating: analysis.oee.rating
      }
    }));
  }

  /**
   * Prompt para Gemini
   */
  private buildProductionPrompt(): string {
    return `
Eres un experto en gestión de producción y mejora continua para una planta de bebidas.

Analiza los datos de producción y métricas OEE proporcionados y genera recomendaciones accionables.

Considera:
1. OEE (Overall Equipment Effectiveness) - componentes: disponibilidad, rendimiento, calidad
2. Cuellos de botella identificados en el proceso
3. Tendencias de producción (increasing/stable/decreasing)
4. Rendimiento y defectos por producto
5. Balance entre eficiencia, calidad y costos

Responde con JSON estructurado:
{
  "recommendations": [
    {
      "action": "REDUCE_DOWNTIME" | "IMPROVE_YIELD" | "OPTIMIZE_SCHEDULE" | "PREVENTIVE_MAINTENANCE" | "INCREASE_CAPACITY" | "REDUCE_DEFECTS" | "STREAMLINE_PROCESS" | "TRAINING_REQUIRED",
      "priority": "low" | "medium" | "high" | "urgent",
      "category": "efficiency" | "quality" | "maintenance" | "capacity" | "waste" | "process",
      "reason": "Explicación clara y concisa",
      "estimatedImpact": "Impacto esperado (ej: +5% OEE, -20% defectos)",
      "timeframe": "Plazo estimado (ej: 1-2 meses)"
    }
  ],
  "insights": [
    "Insight 1: Análisis de OEE y componentes",
    "Insight 2: Oportunidades de mejora identificadas"
  ]
}
    `.trim();
  }

  /**
   * Genera recomendaciones básicas sin IA (fallback)
   */
  private generateBasicRecommendations(context: any): any {
    const recommendations: ProductionRecommendation[] = [];
    const insights: string[] = [];

    const { oee, metrics, bottlenecks } = context;

    // Recomendaciones basadas en OEE
    if (oee.oee < 70) {
      if (oee.availability < 85) {
        recommendations.push({
          action: 'REDUCE_DOWNTIME',
          priority: 'high',
          category: 'efficiency',
          reason: `Disponibilidad baja (${oee.availability.toFixed(1)}%) - reducir tiempos muertos`,
          estimatedImpact: '+10-15% en disponibilidad',
          timeframe: '1-2 meses'
        });
      }
      if (oee.performance < 85) {
        recommendations.push({
          action: 'IMPROVE_YIELD',
          priority: 'high',
          category: 'efficiency',
          reason: `Rendimiento bajo (${oee.performance.toFixed(1)}%) - optimizar procesos`,
          estimatedImpact: '+5-10% en rendimiento',
          timeframe: '2-3 meses'
        });
      }
      if (oee.quality < 98) {
        recommendations.push({
          action: 'REDUCE_DEFECTS',
          priority: 'high',
          category: 'quality',
          reason: `Calidad baja (${oee.quality.toFixed(1)}%) - reducir defectos`,
          estimatedImpact: '+2-5% en calidad',
          timeframe: '1-2 meses'
        });
      }
    } else {
      recommendations.push({
        action: 'PREVENTIVE_MAINTENANCE',
        priority: 'medium',
        category: 'maintenance',
        reason: 'OEE en buen nivel - mantener con mantenimiento preventivo',
        estimatedImpact: 'Mantener OEE actual',
        timeframe: 'Continuo'
      });
    }

    // Insights sobre cuellos de botella
    if (bottlenecks.length > 0) {
      insights.push(`${bottlenecks.length} cuello(s) de botella detectado(s) - priorizar ${bottlenecks[0].area}`);
    }

    // Insights sobre rendimiento
    insights.push(`Rendimiento promedio: ${metrics.averageYield.toFixed(1)}% - objetivo 95%+`);

    return { recommendations, insights };
  }

  /**
   * Helpers específicos de producción
   */

  private async getProductionOrders(
    facilityId: string,
    dateRange: { start: string; end: string }
  ): Promise<ProductionOrder[]> {
    const filters: any[] = [
      { field: 'createdAt', op: '>=', value: dateRange.start },
      { field: 'createdAt', op: '<=', value: dateRange.end }
    ];

    if (facilityId && facilityId !== 'overall') {
      filters.push({ field: 'facilityId', op: '==', value: facilityId });
    }

    return this.queryCollection('production_orders', filters);
  }

  private async getQcTests(
    dateRange: { start: string; end: string }
  ): Promise<QcTest[]> {
    return this.queryCollection('qc_tests', [
      { field: 'testedAt', op: '>=', value: dateRange.start },
      { field: 'testedAt', op: '<=', value: dateRange.end }
    ]);
  }

  private calculateMetrics(
    orders: ProductionOrder[],
    qcTests: QcTest[]
  ): ProductionMetrics {
    const completedOrders = orders.filter(o => o.status === 'DONE').length;

    const totalUnitsProduced = orders
      .filter(o => o.execution?.goodUnits)
      .reduce((sum, o) => sum + (o.execution!.goodUnits || 0), 0);

    const totalUnitsPlanned = orders.reduce((sum, o) => sum + o.targetQuantity, 0);

    const avgYield = totalUnitsPlanned > 0
      ? (totalUnitsProduced / totalUnitsPlanned) * 100
      : 0;

    const durationSum = orders
      .filter(o => o.execution?.durationHours)
      .reduce((sum, o) => sum + (o.execution!.durationHours || 0), 0);

    const avgDuration = completedOrders > 0 ? durationSum / completedOrders : 0;

    const totalIncidents = orders.reduce((sum, o) => sum + (o.incidents?.length || 0), 0);

    const failedTests = qcTests.filter(t => t.result === 'FAIL').length;
    const defectRate = qcTests.length > 0 ? (failedTests / qcTests.length) * 100 : 0;

    return {
      totalOrders: orders.length,
      completedOrders,
      totalUnitsProduced,
      totalUnitsPlanned,
      averageYield: avgYield,
      averageDurationHours: avgDuration,
      totalIncidents,
      defectRate
    };
  }

  private calculateOEE(
    orders: ProductionOrder[],
    qcTests: QcTest[],
    daysBack: number
  ): OEEMetrics {
    const totalAvailableTime = daysBack * 24; // hours

    const totalRunTime = orders
      .filter(o => o.execution?.durationHours)
      .reduce((sum, o) => sum + (o.execution!.durationHours || 0), 0);

    const availability = totalAvailableTime > 0
      ? (totalRunTime / totalAvailableTime) * 100
      : 0;

    const totalUnitsProduced = orders
      .filter(o => o.execution?.goodUnits)
      .reduce((sum, o) => sum + (o.execution!.goodUnits || 0), 0);
    const totalUnitsPlanned = orders.reduce((sum, o) => sum + o.targetQuantity, 0);
    const performance = totalUnitsPlanned > 0
      ? (totalUnitsProduced / totalUnitsPlanned) * 100
      : 0;

    const passedTests = qcTests.filter(t => t.result === 'PASS').length;
    const quality = qcTests.length > 0
      ? (passedTests / qcTests.length) * 100
      : 100;

    const oee = (availability * performance * quality) / 10000;

    let rating: OEEMetrics['rating'];
    if (oee >= 85) rating = 'excellent';
    else if (oee >= 70) rating = 'good';
    else if (oee >= 50) rating = 'fair';
    else rating = 'poor';

    return {
      availability,
      performance,
      quality,
      oee,
      rating
    };
  }

  private detectBottlenecks(orders: ProductionOrder[]): ProductionBottleneck[] {
    const bottlenecks: ProductionBottleneck[] = [];

    for (const order of orders) {
      if (order.bottlenecks && order.bottlenecks.length > 0) {
        for (const b of order.bottlenecks) {
          const existing = bottlenecks.find(bn => bn.area === b.area);
          if (existing) {
            existing.ordersAffected++;
          } else {
            bottlenecks.push({
              area: b.area,
              severity: b.impact === 'HIGH' ? 'high' : b.impact === 'MEDIUM' ? 'medium' : 'low',
              description: b.description,
              impact: b.suggestedAction || b.description,
              ordersAffected: 1
            });
          }
        }
      }
    }

    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return bottlenecks
      .sort((a, b) => {
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.ordersAffected - a.ordersAffected;
      })
      .slice(0, 5);
  }

  private getTopProducts(
    orders: ProductionOrder[],
    qcTests: QcTest[]
  ): ProductionAnalysis['topProducts'] {
    const productMap = new Map<string, {
      name: string;
      completed: number;
      totalTarget: number;
      totalProduced: number;
      defects: number;
      tests: number;
    }>();

    for (const order of orders) {
      const existing = productMap.get(order.outputItemId) || {
        name: order.outputItemId,
        completed: 0,
        totalTarget: 0,
        totalProduced: 0,
        defects: 0,
        tests: 0
      };

      if (order.status === 'DONE') {
        existing.completed++;
      }
      existing.totalTarget += order.targetQuantity;
      existing.totalProduced += order.execution?.goodUnits || 0;
      productMap.set(order.outputItemId, existing);
    }

    const lotToProduct = new Map<string, string>();
    for (const order of orders) {
      if (order.finalOutputs) {
        for (const output of order.finalOutputs) {
          if (output.lotNumber) {
            lotToProduct.set(output.lotNumber, order.outputItemId);
          }
        }
      }
    }

    for (const test of qcTests) {
      const productId = lotToProduct.get(test.lotNumber);
      if (productId) {
        const existing = productMap.get(productId);
        if (existing) {
          existing.tests++;
          if (test.result === 'FAIL') {
            existing.defects++;
          }
        }
      }
    }

    return Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        ordersCompleted: data.completed,
        avgYield: data.totalTarget > 0 ? (data.totalProduced / data.totalTarget) * 100 : 0,
        defectRate: data.tests > 0 ? (data.defects / data.tests) * 100 : 0
      }))
      .sort((a, b) => b.ordersCompleted - a.ordersCompleted)
      .slice(0, 10);
  }

  private generateForecast(orders: ProductionOrder[]): ProductionAnalysis['forecast'] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentProduction = orders
      .filter(o => {
        const createdAt = new Date(o.createdAt);
        return createdAt >= thirtyDaysAgo;
      })
      .reduce((sum, o) => sum + (o.execution?.goodUnits || 0), 0);

    const previousProduction = orders
      .filter(o => {
        const createdAt = new Date(o.createdAt);
        return createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;
      })
      .reduce((sum, o) => sum + (o.execution?.goodUnits || 0), 0);

    const growth = previousProduction > 0
      ? ((recentProduction - previousProduction) / previousProduction) * 100
      : 0;

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (growth > 5) trend = 'increasing';
    else if (growth < -5) trend = 'decreasing';
    else trend = 'stable';

    const forecastMultiplier = 1 + (growth / 100);
    const nextMonthProduction = Math.round(recentProduction * forecastMultiplier);

    const confidence = Math.min(95, 50 + (orders.length / 10) * 5);

    return {
      nextMonthProduction,
      confidence,
      trend
    };
  }
}
