/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Sales Analyzer - Forecasting de ventas usando Gemini AI
 * 
 * Analiza:
 * - Histórico de pedidos por cuenta
 * - Tendencias de revenue
 * - Engagement (visitas, llamadas)
 * - Estacionalidad
 * 
 * Genera:
 * - Forecast próximo mes
 * - Nivel de confianza
 * - Factores de influencia
 * - Recomendaciones de acción
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';
import { addMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export interface SalesForecast extends AnalysisResult {
  type: 'sales';
  accountId: string;
  accountName: string;
  currentMonthRevenue: number;
  forecastNextMonth: number;
  confidence: number; // 0-100
  trend: 'growing' | 'stable' | 'declining';
  factors: string[];
  monthlyHistory: MonthlyRevenue[];
  recommendations: SalesRecommendation[];
}

export interface MonthlyRevenue {
  month: string; // 'YYYY-MM'
  revenue: number;
  orderCount: number;
}

export interface SalesRecommendation {
  action: 'INCREASE_VISITS' | 'REVIEW_PRICING' | 'UPSELL' | 'RETENTION' | 'REACTIVATE';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  expectedImpact?: string;
}

interface Order {
  id: string;
  accountId: string;
  totalAmount: number;
  createdAt: string;
  status: string;
}

interface Interaction {
  id: string;
  accountId: string;
  kind: string;
  occurredAt: string;
}

export class SalesAnalyzer extends BaseAnalyzer {
  name = "sales";
  complexity: ModelComplexity = 'medium';
  private prompt: string = this.buildSalesPrompt();
  
  /**
   * Analiza ventas de una cuenta y predice próximo mes
   */
  async analyze(accountId: string, config?: any): Promise<SalesForecast> {
    console.log(`[SalesAnalyzer] Analyzing account: ${accountId}`);
    
    // 1. Obtener datos de la cuenta
    const account = await this.getDocument('accounts', accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    
    // 2. Obtener histórico de pedidos (12 meses)
    const orders = await this.getAccountOrders(accountId, 365);
    
    // 3. Obtener interacciones (90 días)
    const interactions = await this.getAccountInteractions(accountId, 90);
    
    // 4. Calcular métricas mensuales
    const monthlyHistory = this.calculateMonthlyRevenue(orders);
    const currentMonth = this.getCurrentMonthRevenue(orders);
    const avgMonthlyRevenue = this.calculateAverage(monthlyHistory.map(m => m.revenue));
    
    // 5. Calcular engagement
    const engagement = {
      visits: interactions.filter((i) => i.kind === 'visit').length,
      calls: interactions.filter((i) => i.kind === 'call').length,
      lastContact: interactions[0]?.occurredAt || null
    };
    
    // 6. Detectar tendencia
    const trend = this.calculateSalesTrend(monthlyHistory);
    
    // 7. Preparar contexto para Gemini
    const context = {
      account: {
        id: accountId,
        name: account.name || 'Unknown',
        segment: account.segment || 'N/A',
        relationship: account.relationship || 'N/A'
      },
      revenue: {
        monthly: monthlyHistory.map(m => ({
          month: m.month,
          revenue: m.revenue,
          orders: m.orderCount
        })),
        current: currentMonth,
        average: avgMonthlyRevenue,
        growth: this.calculateGrowth(monthlyHistory.map(m => m.revenue))
      },
      engagement: {
        visits: engagement.visits,
        calls: engagement.calls,
        lastContact: engagement.lastContact,
        daysSinceContact: engagement.lastContact 
          ? this.getDaysAgo(engagement.lastContact)
          : 999
      },
      seasonality: {
        currentMonth: format(new Date(), 'MMMM'),
        isSummerSeason: [5, 6, 7, 8].includes(new Date().getMonth())
      }
    };
    
    // 8. Llamar a Gemini para forecast
    let geminiResponse: any;
    try {
      geminiResponse = await this.callGeminiJSON(
        config?.prompt || this.prompt,
        context,
        config?.complexity || this.complexity
      );
    } catch (error) {
      console.error('[SalesAnalyzer] Gemini error:', error);
      // Fallback a predicción básica
      geminiResponse = this.generateBasicForecast(context);
    }
    
    // 9. Construir análisis
    const analysis: SalesForecast = {
      id: `sales-${accountId}-${Date.now()}`,
      type: 'sales',
      entityId: accountId,
      entityName: account.name,
      accountId,
      accountName: account.name || 'Unknown',
      currentMonthRevenue: currentMonth,
      forecastNextMonth: geminiResponse.forecast || this.simpleForecast(monthlyHistory),
      confidence: geminiResponse.confidence || 60,
      trend,
      factors: geminiResponse.factors || [],
      monthlyHistory,
      recommendations: geminiResponse.recommendations || [],
      createdAt: new Date().toISOString(),
      metadata: {
        revenue: context.revenue,
        engagement: context.engagement
      }
    };
    
    // 10. Guardar análisis
    await this.saveAnalysis('sales', accountId, analysis);
    
    console.log(`[SalesAnalyzer] Analysis complete: ${trend} trend, ${Math.round(analysis.confidence)}% confidence`);
    
    return analysis;
  }
  
  /**
   * Genera recomendaciones basadas en el análisis
   */
  async getRecommendations(analysis: SalesForecast): Promise<Recommendation[]> {
    return analysis.recommendations.map(rec => ({
      id: `sales-rec-${analysis.accountId}-${Date.now()}-${Math.random()}`,
      type: 'SALES',
      priority: rec.priority,
      title: `${rec.action}: ${analysis.accountName}`,
      description: rec.reason,
      actionUrl: `/ventas/cuentas/${analysis.accountId}`,
      metadata: {
        accountId: analysis.accountId,
        accountName: analysis.accountName,
        currentRevenue: analysis.currentMonthRevenue,
        forecastRevenue: analysis.forecastNextMonth,
        trend: analysis.trend,
        expectedImpact: rec.expectedImpact
      }
    }));
  }
  
  /**
   * Prompt para Gemini
   */
  private buildSalesPrompt(): string {
    return `
Eres un experto en análisis de ventas y forecasting para una empresa de distribución de bebidas.

Analiza el histórico de ventas y engagement de la cuenta, y genera un forecast del próximo mes.

Considera:
1. Tendencia histórica (últimos 12 meses)
2. Estacionalidad (verano = pico de ventas)
3. Nivel de engagement reciente (visitas, llamadas)
4. Días desde último contacto
5. Crecimiento mes a mes

Responde con JSON estructurado:
{
  "forecast": número (revenue estimado próximo mes en €),
  "confidence": número 0-100 (nivel de confianza),
  "factors": [
    "Factor 1: Análisis de tendencia",
    "Factor 2: Impacto estacionalidad"
  ],
  "recommendations": [
    {
      "action": "INCREASE_VISITS" | "REVIEW_PRICING" | "UPSELL" | "RETENTION" | "REACTIVATE",
      "priority": "low" | "medium" | "high" | "urgent",
      "reason": "Explicación clara",
      "expectedImpact": "+10% revenue" (opcional)
    }
  ]
}
    `.trim();
  }
  
  /**
   * Genera forecast básico sin IA (fallback)
   */
  private generateBasicForecast(context: any): any {
    const { revenue, engagement } = context;
    const recommendations: SalesRecommendation[] = [];
    const factors: string[] = [];
    
    // Forecast simple basado en promedio
    const avgRevenue = revenue.average;
    let forecast = avgRevenue;
    
    // Ajustar por tendencia
    if (revenue.growth > 10) {
      forecast = avgRevenue * 1.1;
      factors.push('Tendencia de crecimiento positiva (+' + revenue.growth.toFixed(1) + '%)');
    } else if (revenue.growth < -10) {
      forecast = avgRevenue * 0.9;
      factors.push('Tendencia de decrecimiento (-' + Math.abs(revenue.growth).toFixed(1) + '%)');
    }
    
    // Ajustar por engagement
    if (engagement.daysSinceContact > 30) {
      forecast *= 0.9;
      factors.push('Bajo engagement reciente (sin contacto en ' + engagement.daysSinceContact + ' días)');
      recommendations.push({
        action: 'INCREASE_VISITS',
        priority: 'high',
        reason: 'Sin contacto en más de 30 días - programar visita urgente',
        expectedImpact: '+15% revenue'
      });
    }
    
    // Recomendación general
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'RETENTION',
        priority: 'medium',
        reason: 'Mantener nivel de engagement actual',
        expectedImpact: 'Stable revenue'
      });
    }
    
    return {
      forecast: Math.round(forecast),
      confidence: 65,
      factors,
      recommendations
    };
  }
  
  /**
   * Forecast simple basado en promedio móvil
   */
  private simpleForecast(monthlyHistory: MonthlyRevenue[]): number {
    if (monthlyHistory.length === 0) return 0;
    
    // Promedio de últimos 3 meses
    const recent = monthlyHistory.slice(-3).map(m => m.revenue);
    return Math.round(this.calculateAverage(recent));
  }

  async getConfig(): Promise<any> {
    return {
      complexity: this.complexity,
      prompt: this.prompt,
    };
  }

  async updateConfig(newConfig: any): Promise<void> {
    if (newConfig.complexity) {
      this.complexity = newConfig.complexity;
    }
    if (newConfig.prompt) {
      this.prompt = newConfig.prompt;
    }
  }
  
  /**
   * Helpers específicos de sales
   */
  
  private async getAccountOrders(accountId: string, daysBack: number): Promise<Order[]> {
    const dateRange = this.getDateRange(daysBack);
    const orders = await this.queryCollection('ordersSellOut', [
      { field: 'accountId', op: '==', value: accountId },
      { field: 'createdAt', op: '>=', value: dateRange.start }
    ]);
    
    return orders.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  
  private async getAccountInteractions(accountId: string, daysBack: number): Promise<Interaction[]> {
    const dateRange = this.getDateRange(daysBack);
    const interactions = await this.queryCollection('interactions', [
      { field: 'accountId', op: '==', value: accountId },
      { field: 'occurredAt', op: '>=', value: dateRange.start }
    ]);
    
    return interactions.sort((a, b) => 
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }
  
  private calculateMonthlyRevenue(orders: Order[]): MonthlyRevenue[] {
    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    
    orders.forEach(order => {
      const month = order.createdAt.substring(0, 7); // 'YYYY-MM'
      const current = monthlyMap.get(month) || { revenue: 0, count: 0 };
      monthlyMap.set(month, {
        revenue: current.revenue + (order.totalAmount || 0),
        count: current.count + 1
      });
    });
    
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        orderCount: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
  
  private getCurrentMonthRevenue(orders: Order[]): number {
    const currentMonth = format(new Date(), 'yyyy-MM');
    return orders
      .filter(o => o.createdAt.startsWith(currentMonth))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }
  
  private calculateSalesTrend(monthlyHistory: MonthlyRevenue[]): 'growing' | 'stable' | 'declining' {
    if (monthlyHistory.length < 3) return 'stable';
    
    const revenues = monthlyHistory.map(m => m.revenue);
    const recent = this.calculateAverage(revenues.slice(-3));
    const older = this.calculateAverage(revenues.slice(0, -3));
    
    if (older === 0) return 'stable';
    
    const change = (recent - older) / older;
    
    if (change > 0.15) return 'growing';
    if (change < -0.15) return 'declining';
    return 'stable';
  }
}
