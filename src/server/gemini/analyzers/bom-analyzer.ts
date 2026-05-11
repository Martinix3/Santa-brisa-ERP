/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * BOM Analyzer - Análisis de optimización de recetas usando Gemini AI
 * 
 * Analiza:
 * - Optimización de recetas (BOMs)
 * - Costos de producción
 * - Eficiencia de ingredientes
 * - BOMs obsoletos o redundantes
 * 
 * Genera:
 * - Recomendaciones de optimización
 * - Alternativas de ingredientes
 * - Análisis de costos
 * - Sugerencias de mejora
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from './base-analyzer';
import type { ModelComplexity } from '../model-router';
import type { BillOfMaterial, Item, ProductionOrder } from '@/domain/ssot';

export interface BomMetrics {
  totalBoms: number;
  activeBoms: number;
  productionBoms: number;
  packagingBoms: number;
  avgCostPerBom: number;
  avgComplexity: number;
  unusedBoms: number;
  highCostBoms: number;
}

export interface BomOptimization {
  bomId: string;
  bomName: string;
  stage?: 'PRODUCCION' | 'ENVASADO';
  issue: 'HIGH_COST' | 'UNUSED' | 'INEFFICIENT' | 'OUTDATED' | 'REDUNDANT';
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentCost?: number;
  potentialSavings?: number;
  description: string;
  suggestion: string;
}

export interface IngredientAlternative {
  currentItemId: string;
  currentItemName: string;
  alternativeItemId?: string;
  alternativeItemName?: string;
  costSaving: number;
  qualityImpact: 'none' | 'minimal' | 'moderate';
  availability: 'high' | 'medium' | 'low';
  reason: string;
}

export interface BomRecommendation {
  action:
  | 'REDUCE_COST'
  | 'SIMPLIFY_RECIPE'
  | 'UPDATE_INGREDIENTS'
  | 'CONSOLIDATE_BOMS'
  | 'ARCHIVE_UNUSED'
  | 'IMPROVE_EFFICIENCY'
  | 'STANDARDIZE_RECIPE';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'cost' | 'efficiency' | 'quality' | 'maintenance';
  bomId?: string;
  reason: string;
  estimatedImpact: string;
  timeframe: string;
}

export interface BomAnalysis extends AnalysisResult {
  type: 'bom';
  metrics: BomMetrics;
  optimizations: BomOptimization[];
  ingredientAlternatives: IngredientAlternative[];
  topCostlyBoms: Array<{
    bomId: string;
    bomName: string;
    stage?: string;
    totalCost: number;
    itemsCount: number;
    usageCount: number;
  }>;
  insights: string[];
  recommendations: BomRecommendation[];
}

export class BomAnalyzer extends BaseAnalyzer {
  name = 'BOMAnalyzer';
  complexity: ModelComplexity = 'medium';

  /**
   * Analiza BOMs y genera recomendaciones de optimización
   */
  async analyze(): Promise<BomAnalysis> {
    console.log('[BomAnalyzer] Starting BOM analysis...');

    // 1. Obtener datos
    const boms = await this.getBoms();
    const items = await this.getItems();
    const productionOrders = await this.getProductionOrders();

    // 2. Calcular métricas
    const metrics = this.calculateMetrics(boms, items, productionOrders);
    const optimizations = this.detectOptimizations(boms, items, productionOrders);
    const topCostlyBoms = this.getTopCostlyBoms(boms, items, productionOrders);
    const ingredientAlternatives = this.findIngredientAlternatives(boms, items);

    // 3. Preparar contexto para Gemini
    const context = {
      metrics,
      optimizations: optimizations.slice(0, 5),
      topCostlyBoms: topCostlyBoms.slice(0, 5),
      ingredientAlternatives: ingredientAlternatives.slice(0, 5)
    };

    // 4. Llamar a Gemini para recomendaciones
    let geminiResponse: any;
    try {
      geminiResponse = await this.callGeminiJSON(
        this.buildBomPrompt(),
        context
      );
    } catch (error) {
      console.error('[BomAnalyzer] Gemini error:', error);
      geminiResponse = this.generateBasicRecommendations(context);
    }

    // 5. Construir análisis
    const analysis: BomAnalysis = {
      id: `bom-analysis-${Date.now()}`,
      type: 'bom',
      entityId: 'all',
      entityName: 'All BOMs',
      metrics,
      optimizations,
      ingredientAlternatives,
      topCostlyBoms,
      insights: geminiResponse.insights || [],
      recommendations: geminiResponse.recommendations || [],
      createdAt: new Date().toISOString(),
      metadata: {
        bomsAnalyzed: boms.length,
        itemsAnalyzed: items.length
      }
    };

    // 6. Guardar análisis
    await this.saveAnalysis('bom', 'all', analysis);

    console.log(`[BomAnalyzer] Analysis complete: ${optimizations.length} optimizations found`);

    return analysis;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  async getRecommendations(analysis: BomAnalysis): Promise<Recommendation[]> {
    return analysis.recommendations.map(rec => ({
      id: `bom-rec-${Date.now()}-${Math.random()}`,
      type: 'BOM',
      priority: rec.priority,
      title: `${rec.action}: ${rec.category}`,
      description: rec.reason,
      actionUrl: '/production/bom',
      metadata: {
        category: rec.category,
        bomId: rec.bomId,
        estimatedImpact: rec.estimatedImpact,
        timeframe: rec.timeframe
      }
    }));
  }

  /**
   * Prompt para Gemini
   */
  private buildBomPrompt(): string {
    return `
Eres un experto en optimización de recetas y gestión de costos de producción para una planta de bebidas.

Analiza los BOMs (Bill of Materials / Recetas) proporcionados y genera recomendaciones accionables.

Considera:
1. Costos de producción - identificar BOMs costosos y oportunidades de ahorro
2. Eficiencia - detectar recetas complejas que podrían simplificarse
3. Utilización - identificar BOMs obsoletos o poco usados
4. Ingredientes alternativos - sugerir substitutos más económicos sin afectar calidad
5. Estandarización - consolidar BOMs redundantes o similares

Responde con JSON estructurado:
{
  "recommendations": [
    {
      "action": "REDUCE_COST" | "SIMPLIFY_RECIPE" | "UPDATE_INGREDIENTS" | "CONSOLIDATE_BOMS" | "ARCHIVE_UNUSED" | "IMPROVE_EFFICIENCY" | "STANDARDIZE_RECIPE",
      "priority": "low" | "medium" | "high" | "urgent",
      "category": "cost" | "efficiency" | "quality" | "maintenance",
      "bomId": "ID del BOM (opcional)",
      "reason": "Explicación clara y específica",
      "estimatedImpact": "Impacto esperado (ej: -15% costo, +20% eficiencia)",
      "timeframe": "Plazo estimado (ej: 2-4 semanas)"
    }
  ],
  "insights": [
    "Insight 1: Análisis general de costos",
    "Insight 2: Oportunidades de optimización identificadas"
  ]
}
    `.trim();
  }

  /**
   * Genera recomendaciones básicas sin IA (fallback)
   */
  private generateBasicRecommendations(context: any): any {
    const recommendations: BomRecommendation[] = [];
    const insights: string[] = [];

    const { metrics, optimizations, topCostlyBoms } = context;

    // Recomendaciones basadas en métricas
    if (metrics.unusedBoms > 0) {
      recommendations.push({
        action: 'ARCHIVE_UNUSED',
        priority: 'medium',
        category: 'maintenance',
        reason: `${metrics.unusedBoms} BOMs no se han usado recientemente - considerar archivar`,
        estimatedImpact: 'Mejor organización y claridad',
        timeframe: '1 semana'
      });
    }

    if (metrics.highCostBoms > 0) {
      recommendations.push({
        action: 'REDUCE_COST',
        priority: 'high',
        category: 'cost',
        reason: `${metrics.highCostBoms} BOMs tienen costos elevados - revisar ingredientes`,
        estimatedImpact: '-10-15% en costos',
        timeframe: '2-4 semanas'
      });
    }

    if (metrics.avgComplexity > 10) {
      recommendations.push({
        action: 'SIMPLIFY_RECIPE',
        priority: 'medium',
        category: 'efficiency',
        reason: 'Complejidad promedio alta - simplificar recetas cuando sea posible',
        estimatedImpact: '+15% eficiencia producción',
        timeframe: '1-2 meses'
      });
    }

    // Insights generales
    insights.push(`Total de ${metrics.totalBoms} BOMs en el sistema (${metrics.activeBoms} activos)`);
    insights.push(`Costo promedio por BOM: €${metrics.avgCostPerBom.toFixed(2)}`);

    if (topCostlyBoms.length > 0) {
      insights.push(`BOMs más costosos: ${topCostlyBoms[0].bomName} (€${topCostlyBoms[0].totalCost.toFixed(2)})`);
    }

    return { recommendations, insights };
  }

  /**
   * Helpers específicos de BOMs
   */

  private async getBoms(): Promise<BillOfMaterial[]> {
    return this.queryCollection('bill_of_materials', []);
  }

  private async getItems(): Promise<Item[]> {
    return this.queryCollection('items', []);
  }

  private async getProductionOrders(): Promise<ProductionOrder[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.queryCollection('production_orders', [
      { field: 'createdAt', op: '>=', value: thirtyDaysAgo.toISOString() }
    ]);
  }

  private calculateMetrics(
    boms: BillOfMaterial[],
    items: Item[],
    productionOrders: ProductionOrder[]
  ): BomMetrics {
    const itemsMap = new Map(items.map((i) => [i.id, i]));

    // Sin 'isActive' en schema, asumimos todos activos
    const activeBoms = boms.length;
    // Sin 'stage' en Bom schema, usamos conteo genérico
    const productionBoms = Math.floor(boms.length * 0.6); // estimado
    const packagingBoms = boms.length - productionBoms;

    // Calcular costos
    let totalCost = 0;
    let costCount = 0;
    let highCostCount = 0;

    for (const bom of boms) {
      if (!bom.items || bom.items.length === 0) continue;

      let bomCost = 0;
      for (const input of bom.items) {
        const item = itemsMap.get(input.itemId);
        // stdCost no existe en BillOfMaterial.items schema
        const cost = item?.stdCost || 0;
        if (cost > 0) {
          bomCost += cost * input.qty;
        }
      }

      if (bomCost > 0) {
        totalCost += bomCost;
        costCount++;

        if (bomCost > 50) { // threshold arbitrario
          highCostCount++;
        }
      }
    }

    const avgCost = costCount > 0 ? totalCost / costCount : 0;

    // Calcular complejidad (items promedio)
    const totalLines = boms.reduce((sum, b) => sum + (b.items?.length || 0), 0);
    const avgComplexity = boms.length > 0 ? totalLines / boms.length : 0;

    // BOMs no usados (sin órdenes de producción recientes)
    const usedBomIds = new Set(productionOrders.map(po => po.bomId).filter(Boolean));
    const unusedBoms = boms.filter(b => !usedBomIds.has(b.id)).length;

    return {
      totalBoms: boms.length,
      activeBoms,
      productionBoms,
      packagingBoms,
      avgCostPerBom: avgCost,
      avgComplexity,
      unusedBoms,
      highCostBoms: highCostCount
    };
  }

  private detectOptimizations(
    boms: BillOfMaterial[],
    items: Item[],
    productionOrders: ProductionOrder[]
  ): BomOptimization[] {
    const optimizations: BomOptimization[] = [];
    const itemsMap = new Map(items.map((i) => [i.id, i]));
    const usedBomIds = new Set(productionOrders.map(po => po.bomId).filter(Boolean));

    for (const bom of boms) {
      // Detectar BOMs no usados
      if (!usedBomIds.has(bom.id)) {
        optimizations.push({
          bomId: bom.id,
          bomName: bom.outputItemId,
          issue: 'UNUSED',
          severity: 'medium',
          description: 'BOM no utilizado en los últimos 30 días',
          suggestion: 'Considerar archivar si ya no es necesario'
        });
      }

      // Detectar BOMs costosos
      if (bom.items && bom.items.length > 0) {
        let bomCost = 0;
        for (const input of bom.items) {
          const item = itemsMap.get(input.itemId);
          const cost = item?.stdCost || 0;
          if (cost > 0) {
            bomCost += cost * input.qty;
          }
        }

        if (bomCost > 100) {
          optimizations.push({
            bomId: bom.id,
            bomName: bom.outputItemId,
            issue: 'HIGH_COST',
            severity: 'high',
            currentCost: bomCost,
            potentialSavings: bomCost * 0.15,
            description: `Costo elevado: €${bomCost.toFixed(2)}`,
            suggestion: 'Revisar ingredientes para identificar alternativas más económicas'
          });
        }
      }

      // Detectar BOMs complejos
      if (bom.items && bom.items.length > 15) {
        optimizations.push({
          bomId: bom.id,
          bomName: bom.outputItemId,
          issue: 'INEFFICIENT',
          severity: 'low',
          description: `Receta compleja con ${bom.items.length} ingredientes`,
          suggestion: 'Evaluar si se puede simplificar la receta'
        });
      }
    }

    return optimizations.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private getTopCostlyBoms(
    boms: BillOfMaterial[],
    items: Item[],
    productionOrders: ProductionOrder[]
  ): BomAnalysis['topCostlyBoms'] {
    const itemsMap = new Map(items.map((i) => [i.id, i]));
    const bomUsage = new Map<string, number>();

    for (const po of productionOrders) {
      if (po.bomId) {
        bomUsage.set(po.bomId, (bomUsage.get(po.bomId) || 0) + 1);
      }
    }

    const costlyBoms = boms
      .map(bom => {
        let totalCost = 0;
        if (bom.items && bom.items.length > 0) {
          for (const input of bom.items) {
            const item = itemsMap.get(input.itemId);
            const cost = item?.stdCost || 0;
            if (cost > 0) {
              totalCost += cost * input.qty;
            }
          }
        }

        return {
          bomId: bom.id,
          bomName: bom.outputItemId || bom.id,
          stage: 'PRODUCCION', // sin stage en schema, valor por defecto
          totalCost,
          itemsCount: bom.items?.length || 0,
          usageCount: bomUsage.get(bom.id) || 0
        };
      })
      .filter(b => b.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost);

    return costlyBoms.slice(0, 10);
  }

  private findIngredientAlternatives(
    boms: BillOfMaterial[],
    items: Item[]
  ): IngredientAlternative[] {
    const alternatives: IngredientAlternative[] = [];

    // Analizar costos desde items reales
    const itemsMap = new Map(items.map((i) => [i.id, i]));
    const itemCosts = new Map<string, number>();

    for (const bom of boms) {
      if (!bom.items) continue;
      for (const input of bom.items) {
        const item = itemsMap.get(input.itemId);
        if (item?.stdCost && item.stdCost > 0) {
          const existing = itemCosts.get(input.itemId) || 0;
          itemCosts.set(input.itemId, Math.max(existing, item.stdCost));
        }
      }
    }

    // Buscar alternativas basadas en costos
    const expensiveSkus = Array.from(itemCosts.entries())
      .filter(([_, cost]) => cost > 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [sku, cost] of expensiveSkus) {
      const item = items.find((i) => i.id === sku);
      if (!item) continue;

      // Buscar items similares más baratos
      const similar = Array.from(itemCosts.entries())
        .filter(([otherSku, otherCost]) => {
          const otherItem = items.find((i) => i.id === otherSku);
          return (
            otherSku !== sku &&
            otherItem?.category === item.category &&
            otherCost > 0 &&
            otherCost < cost * 0.8
          );
        })
        .sort((a, b) => a[1] - b[1]);

      if (similar.length > 0) {
        const [cheapestSku, cheapestCost] = similar[0];
        const cheapestItem = items.find((i) => i.id === cheapestSku);
        const saving = cost - cheapestCost;

        alternatives.push({
          currentItemId: sku,
          currentItemName: item.name || sku,
          alternativeItemId: cheapestSku,
          alternativeItemName: cheapestItem?.name || cheapestSku,
          costSaving: saving,
          qualityImpact: 'minimal',
          availability: 'high',
          reason: `Ahorro potencial de €${saving.toFixed(2)} por unidad`
        });
      }
    }

    return alternatives;
  }
}
