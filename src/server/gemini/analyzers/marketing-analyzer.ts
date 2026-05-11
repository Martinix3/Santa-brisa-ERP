/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Marketing Analyzer - Gemini Intelligence
 * 
 * Analiza campañas de marketing, calcula ROI,
 * y recomienda optimizaciones de inversión.
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';

export interface MarketingAnalysis extends AnalysisResult {
  type: 'marketing';
  campaignId?: string;
  campaignName?: string;
  channel: 'ads' | 'events' | 'pos-mkt' | 'collabs' | 'overall';
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalSpend: number;
    totalRevenue: number;
    roi: number; // Return on Investment %
    conversions: number;
    impressions: number;
    ctr: number; // Click-through rate %
    cpa: number; // Cost per acquisition
  };
  performance: 'excellent' | 'good' | 'average' | 'poor';
  insights: string[];
  recommendations: MarketingRecommendation[];
}

export interface MarketingRecommendation {
  action:
  | 'INCREASE_BUDGET'
  | 'DECREASE_BUDGET'
  | 'CHANGE_TARGETING'
  | 'OPTIMIZE_CREATIVE'
  | 'PAUSE_CAMPAIGN'
  | 'REPLICATE_SUCCESS'
  | 'TEST_NEW_CHANNEL';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channel: string;
  description: string;
  expectedImpact: string;
  estimatedCost?: number;
  estimatedRevenue?: number;
}

export class MarketingAnalyzer extends BaseAnalyzer {
  name = 'MarketingAnalyzer';
  protected complexity: ModelComplexity = 'medium';

  /**
   * Analiza una campaña específica (cumple contrato de BaseAnalyzer)
   */
  async analyze(entityId: string): Promise<MarketingAnalysis> {
    // entityId puede ser campaignId o "overall"
    return this.analyzeDetailed({
      campaignId: entityId !== 'overall' ? entityId : undefined,
      daysBack: 30
    });
  }

  /**
   * Análisis detallado con parámetros opcionales
   */
  async analyzeDetailed(params: {
    campaignId?: string;
    channel?: 'ads' | 'events' | 'pos-mkt' | 'collabs';
    daysBack?: number;
  }): Promise<MarketingAnalysis> {
    const daysBack = params.daysBack || 30;
    const { start, end } = this.getDateRange(daysBack);

    // 1. Get marketing data
    const [campaign, orders, interactions, expenses] = await Promise.all([
      params.campaignId ? this.getCampaign(params.campaignId) : null,
      this.getMarketingOrders(start, end, params.channel),
      this.getMarketingInteractions(start, end, params.channel),
      this.getMarketingExpenses(start, end, params.channel)
    ]);

    // 2. Calculate metrics
    const totalSpend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

    const conversions = orders.length;
    const impressions = interactions.filter((i) => i.kind === 'impression').length;
    const clicks = interactions.filter((i) => i.kind === 'click').length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpa = conversions > 0 ? totalSpend / conversions : 0;

    // 3. Get channel-specific data for context
    const channelData = await this.getChannelBreakdown(start, end);

    // 4. Ask Gemini for insights
    const geminiResponse = await this.callGeminiJSON<{
      performance: 'excellent' | 'good' | 'average' | 'poor';
      insights: string[];
      recommendations: MarketingRecommendation[];
    }>(
      this.buildMarketingPrompt(),
      {
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name,
          channel: campaign.channel,
          status: campaign.status
        } : null,
        metrics: {
          totalSpend,
          totalRevenue,
          roi,
          conversions,
          impressions,
          ctr,
          cpa
        },
        period: {
          start,
          end,
          days: daysBack
        },
        channelBreakdown: channelData,
        industry: 'beverage_distribution'
      }
    );

    // 5. Save analysis
    const analysisId = await this.saveAnalysis('marketing', params.campaignId || 'overall', {
      ...geminiResponse,
      metrics: {
        totalSpend,
        totalRevenue,
        roi,
        conversions,
        impressions,
        ctr,
        cpa
      }
    });

    return {
      id: analysisId,
      type: 'marketing',
      entityId: params.campaignId || 'overall',
      campaignId: params.campaignId,
      campaignName: campaign?.name,
      channel: params.channel || 'overall',
      period: { start, end },
      metrics: {
        totalSpend,
        totalRevenue,
        roi,
        conversions,
        impressions,
        ctr,
        cpa
      },
      performance: geminiResponse.performance,
      insights: geminiResponse.insights,
      recommendations: geminiResponse.recommendations,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Genera recomendaciones accionables
   */
  async getRecommendations(analysis: MarketingAnalysis): Promise<Recommendation[]> {
    return analysis.recommendations.map(rec => ({
      id: `marketing-${analysis.entityId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'MARKETING',
      priority: rec.priority,
      title: `${rec.action.replace(/_/g, ' ')}: ${rec.channel}`,
      description: rec.description,
      actionUrl: analysis.campaignId
        ? `/marketing/${analysis.channel}?campaign=${analysis.campaignId}`
        : `/marketing/${analysis.channel}`,
      metadata: {
        action: rec.action,
        channel: rec.channel,
        expectedImpact: rec.expectedImpact,
        estimatedCost: rec.estimatedCost,
        estimatedRevenue: rec.estimatedRevenue,
        currentROI: analysis.metrics.roi
      }
    }));
  }

  /**
   * Prompt optimizado para análisis de marketing
   */
  private buildMarketingPrompt(): string {
    return `
Eres un experto en marketing digital y análisis de ROI. Analiza los datos de la campaña/canal proporcionados.

Considera:
1. ROI actual vs benchmarks de la industria de bebidas
2. Eficiencia del gasto (CPA, CTR)
3. Potencial de escalado
4. Estacionalidad y tendencias del mercado
5. Mix de canales óptimo

Genera recomendaciones ACCIONABLES que maximicen ROI.

Responde SOLO en JSON:
{
  "performance": "excellent|good|average|poor",
  "insights": [
    "Insight 1 con datos específicos",
    "Insight 2 comparativo"
  ],
  "recommendations": [
    {
      "action": "INCREASE_BUDGET",
      "priority": "high",
      "channel": "Facebook Ads",
      "description": "Descripción clara de la acción",
      "expectedImpact": "ROI esperado: +30%, Revenue: +€5000/mes",
      "estimatedCost": 1500,
      "estimatedRevenue": 6500
    }
  ]
}
    `.trim();
  }

  /**
   * Helpers privados
   */

  private async getCampaign(campaignId: string): Promise<any | null> {
    return this.getDocument('campaigns', campaignId);
  }

  private async getMarketingOrders(
    start: string,
    end: string,
    channel?: string
  ): Promise<any[]> {
    const filters = [
      { field: 'createdAt', op: '>=', value: start },
      { field: 'createdAt', op: '<=', value: end }
    ];

    if (channel) {
      filters.push({ field: 'source', op: '==', value: channel });
    }

    return this.queryCollection('ordersSellOut', filters as any);
  }

  private async getMarketingInteractions(
    start: string,
    end: string,
    channel?: string
  ): Promise<any[]> {
    const filters = [
      { field: 'occurredAt', op: '>=', value: start },
      { field: 'occurredAt', op: '<=', value: end },
      { field: 'kind', op: 'in', value: ['impression', 'click', 'conversion'] }
    ];

    return this.queryCollection('interactions', filters as any);
  }

  private async getMarketingExpenses(
    start: string,
    end: string,
    channel?: string
  ): Promise<any[]> {
    const filters = [
      { field: 'date', op: '>=', value: start },
      { field: 'date', op: '<=', value: end },
      { field: 'category', op: '==', value: 'marketing' }
    ];

    if (channel) {
      filters.push({ field: 'subcategory', op: '==', value: channel });
    }

    return this.queryCollection('expenses', filters as any);
  }

  private async getChannelBreakdown(start: string, end: string): Promise<any> {
    const channels = ['ads', 'events', 'pos-mkt', 'collabs'];
    const breakdown: any = {};

    for (const channel of channels) {
      const [orders, expenses] = await Promise.all([
        this.getMarketingOrders(start, end, channel as any),
        this.getMarketingExpenses(start, end, channel)
      ]);

      const spend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

      breakdown[channel] = {
        spend,
        revenue,
        roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0,
        orders: orders.length
      };
    }

    return breakdown;
  }
}
