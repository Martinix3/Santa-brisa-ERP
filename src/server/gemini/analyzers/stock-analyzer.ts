/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Stock Analyzer - Predicción de roturas de stock usando Gemini AI
 * 
 * Analiza:
 * - Consumo histórico
 * - Tendencias
 * - Estacionalidad
 * - Lead times
 * 
 * Genera:
 * - Predicción de días hasta stockout
 * - Recomendaciones de reabastecimiento
 * - Alertas proactivas
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';

export interface StockAnalysis extends AnalysisResult {
  type: 'stock';
  itemId: string;
  itemName: string;
  currentStock: number;
  reservedStock: number;
  freeStock: number;
  avgConsumption: number; // Unidades/día
  daysUntilStockout: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedStockoutDate?: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendations: StockRecommendation[];
  insights: string[];
}

export interface StockRecommendation {
  action: 'REORDER' | 'INCREASE_SAFETY_STOCK' | 'MONITOR' | 'REDUCE_ORDER';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  suggestedQty?: number;
  estimatedCost?: number;
}

interface StockMove {
  itemId: string;
  qty: number;
  occurredAt: string;
  reason: string;
}

interface OnHandRecord {
  itemId: string;
  qty: number;
  reserved?: number;
  lotCode?: string;
  locationId?: string;
}

export class StockAnalyzer extends BaseAnalyzer {
  name = 'StockAnalyzer';
  complexity: ModelComplexity = 'medium';

  /**
   * Analiza el stock de un item y predice roturas
   */
  async analyze(itemId: string): Promise<StockAnalysis> {
    console.log(`[StockAnalyzer] Analyzing item: ${itemId}`);

    // 1. Obtener datos del item
    const item = await this.getDocument('items', itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    // 2. Obtener stock actual
    const onHand = await this.getOnHandStock(itemId);
    const totalStock = onHand.reduce((sum, oh) => sum + oh.qty, 0);
    const reservedStock = onHand.reduce((sum, oh) => sum + (oh.reserved || 0), 0);
    const freeStock = totalStock - reservedStock;

    // 3. Obtener histórico de movimientos (90 días)
    const stockMoves = await this.getStockMovesHistory(itemId, 90);

    // 4. Calcular métricas
    const avgDailyConsumption = this.calculateDailyConsumption(stockMoves);
    const daysUntilStockout = avgDailyConsumption > 0
      ? freeStock / avgDailyConsumption
      : 999;
    const trend = this.calculateConsumptionTrend(stockMoves);
    const riskLevel = this.calculateRiskLevel(daysUntilStockout);

    // 5. Preparar contexto para Gemini
    const context = {
      item: {
        id: itemId,
        name: item.name || 'Unknown',
        category: item.category || 'N/A',
        minStockLevel: item.minStockLevel || 0,
        optimalStockLevel: item.optimalStockLevel || 0
      },
      stock: {
        total: totalStock,
        reserved: reservedStock,
        free: freeStock,
        minLevel: item.minStockLevel || 0,
        optimalLevel: item.optimalStockLevel || 0
      },
      consumption: {
        avgDaily: avgDailyConsumption,
        last7Days: this.calculateConsumption(stockMoves.slice(-7)),
        last30Days: this.calculateConsumption(stockMoves.slice(-30)),
        trend: trend
      },
      analysis: {
        daysUntilStockout,
        riskLevel
      }
    };

    // 6. Llamar a Gemini para obtener recomendaciones
    let geminiResponse: any;
    try {
      geminiResponse = await this.callGeminiJSON(
        this.buildStockPrompt(),
        context
      );
    } catch (error) {
      console.error('[StockAnalyzer] Gemini error:', error);
      // Fallback a recomendaciones básicas
      geminiResponse = this.generateBasicRecommendations(context);
    }

    // 7. Construir análisis
    const analysis: StockAnalysis = {
      id: `stock-${itemId}-${Date.now()}`,
      type: 'stock',
      entityId: itemId,
      entityName: item.name,
      itemId,
      itemName: item.name || 'Unknown',
      currentStock: totalStock,
      reservedStock,
      freeStock,
      avgConsumption: avgDailyConsumption,
      daysUntilStockout,
      riskLevel,
      predictedStockoutDate: daysUntilStockout < 999
        ? this.addDays(new Date(), Math.floor(daysUntilStockout))
        : undefined,
      trend,
      recommendations: geminiResponse.recommendations || [],
      insights: geminiResponse.insights || [],
      createdAt: new Date().toISOString(),
      metadata: {
        consumption: context.consumption,
        stockLevels: context.stock
      }
    };

    // 8. Guardar análisis
    await this.saveAnalysis('stock', itemId, analysis);

    console.log(`[StockAnalyzer] Analysis complete: ${riskLevel} risk, ${Math.floor(daysUntilStockout)} days until stockout`);

    return analysis;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  async getRecommendations(analysis: StockAnalysis): Promise<Recommendation[]> {
    return analysis.recommendations.map(rec => ({
      id: `stock-rec-${analysis.itemId}-${Date.now()}-${Math.random()}`,
      type: 'STOCK',
      priority: rec.priority,
      title: `${rec.action}: ${analysis.itemName}`,
      description: rec.reason,
      actionUrl: `/warehouse/items/${analysis.itemId}`,
      metadata: {
        itemId: analysis.itemId,
        itemName: analysis.itemName,
        suggestedQty: rec.suggestedQty,
        estimatedCost: rec.estimatedCost,
        riskLevel: analysis.riskLevel
      }
    }));
  }

  /**
   * Prompt para Gemini
   */
  private buildStockPrompt(): string {
    return `
Eres un experto en gestión de inventarios para una empresa de distribución de bebidas.

Analiza los datos de stock y consumo proporcionados y genera recomendaciones accionables.

Considera:
1. Nivel actual vs mínimo/óptimo configurado
2. Tendencia de consumo (increasing/stable/decreasing)
3. Estacionalidad potencial (verano = más consumo de bebidas)
4. Lead time típico de proveedores (5-7 días)
5. Costo de stockout (pérdida de ventas) vs costo de almacenamiento

Responde con JSON estructurado:
{
  "recommendations": [
    {
      "action": "REORDER" | "INCREASE_SAFETY_STOCK" | "MONITOR" | "REDUCE_ORDER",
      "priority": "low" | "medium" | "high" | "urgent",
      "reason": "Explicación clara y concisa",
      "suggestedQty": número (opcional),
      "estimatedCost": número (opcional)
    }
  ],
  "insights": [
    "Insight 1: Análisis de tendencia",
    "Insight 2: Recomendación específica"
  ]
}
    `.trim();
  }

  /**
   * Genera recomendaciones básicas sin IA (fallback)
   */
  private generateBasicRecommendations(context: any): any {
    const recommendations: StockRecommendation[] = [];
    const insights: string[] = [];

    const { stock, consumption, analysis } = context;

    // Recomendación basada en nivel de riesgo
    if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
      recommendations.push({
        action: 'REORDER',
        priority: analysis.riskLevel === 'critical' ? 'urgent' : 'high',
        reason: `Stock crítico: solo ${Math.floor(analysis.daysUntilStockout)} días de cobertura`,
        suggestedQty: stock.optimalLevel - stock.free,
        estimatedCost: 0
      });
      insights.push(`Nivel de stock por debajo del mínimo requerido (${stock.minLevel} unidades)`);
    } else {
      recommendations.push({
        action: 'MONITOR',
        priority: 'medium',
        reason: 'Stock en nivel aceptable, continuar monitoreo',
        suggestedQty: undefined,
        estimatedCost: 0
      });
    }

    // Insight sobre tendencia
    if (consumption.trend === 'increasing') {
      insights.push('El consumo está aumentando - considerar aumentar stock de seguridad');
    } else if (consumption.trend === 'decreasing') {
      insights.push('El consumo está disminuyendo - posible oportunidad de reducir stock');
    }

    return { recommendations, insights };
  }

  /**
   * Helpers específicos de stock
   */

  private async getOnHandStock(itemId: string): Promise<OnHandRecord[]> {
    return this.queryCollection('onHand', [
      { field: 'itemId', op: '==', value: itemId }
    ]);
  }

  private async getStockMovesHistory(itemId: string, daysBack: number): Promise<StockMove[]> {
    const dateRange = this.getDateRange(daysBack);
    const moves = await this.queryCollection('stockMoves', [
      { field: 'itemId', op: '==', value: itemId },
      { field: 'occurredAt', op: '>=', value: dateRange.start }
    ]);

    return moves.sort((a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
  }

  private calculateDailyConsumption(moves: StockMove[]): number {
    const outboundMoves = moves.filter(m => m.qty < 0);
    if (outboundMoves.length === 0) return 0;

    const totalConsumed = outboundMoves.reduce((sum, m) => sum + Math.abs(m.qty), 0);
    const days = moves.length > 0 ? 90 : 1; // Asumimos 90 días de histórico

    return totalConsumed / days;
  }

  private calculateConsumption(moves: StockMove[]): number {
    const outboundMoves = moves.filter(m => m.qty < 0);
    return outboundMoves.reduce((sum, m) => sum + Math.abs(m.qty), 0);
  }

  private calculateConsumptionTrend(moves: StockMove[]): 'increasing' | 'stable' | 'decreasing' {
    if (moves.length < 14) return 'stable';

    const recentConsumption = this.calculateConsumption(moves.slice(-7));
    const olderConsumption = this.calculateConsumption(moves.slice(-14, -7));

    if (olderConsumption === 0) return 'stable';

    const change = (recentConsumption - olderConsumption) / olderConsumption;

    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  private calculateRiskLevel(daysUntilStockout: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysUntilStockout <= 3) return 'critical';
    if (daysUntilStockout <= 7) return 'high';
    if (daysUntilStockout <= 14) return 'medium';
    return 'low';
  }

  private addDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  }
}
