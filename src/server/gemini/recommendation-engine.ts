/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Gemini Recommendation Engine
 * 
 * Cruza datos de múltiples analizadores para generar recomendaciones
 * priorizadas con impacto medible y planes de acción.
 */

import admin from 'firebase-admin';
import { GeminiClient } from './gemini-client';
import { adminDb as db } from '@/server/firebase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory = 'stock' | 'sales' | 'marketing' | 'production' | 'code' | 'uiux' | 'cross-functional';
export type EffortLevel = 'low' | 'medium' | 'high';
export type Timeframe = 'immediate' | 'short' | 'medium' | 'long';

export interface ImpactMetrics {
  financial?: number; // Impacto financiero estimado (€)
  operational?: string; // Descripción del impacto operacional
  risk?: string; // Nivel de riesgo: 'low' | 'medium' | 'high' | 'critical'
  quality?: number; // Mejora en calidad (0-100)
  efficiency?: number; // Mejora en eficiencia (%)
}

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  description: string;
  rationale: string; // Por qué es importante

  // Impacto
  impact: ImpactMetrics;

  // Esfuerzo y tiempo
  effort: EffortLevel;
  timeframe: Timeframe;
  estimatedDuration?: string; // e.g., "2 weeks", "1 month"

  // Dependencias y prerequisites
  dependencies?: string[]; // IDs de otras recomendaciones
  prerequisites?: string[]; // Requisitos previos

  // Fuentes de datos
  sources: {
    analyzerType: string;
    analysisId: string;
    score?: number;
    timestamp: Date;
  }[];

  // Plan de acción
  actionPlan?: {
    steps: string[];
    owner?: string;
    reviewCheckpoints?: string[];
  };

  // Métricas de seguimiento
  successMetrics?: string[];

  // Estado
  status: 'pending' | 'in-progress' | 'completed' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;

  // AI Enhancement
  geminiInsight?: string;
}

export interface RecommendationSet {
  id: string;
  timestamp: Date;
  totalRecommendations: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byCategory: Record<RecommendationCategory, number>;
  recommendations: Recommendation[];

  // Resumen ejecutivo generado por Gemini
  executiveSummary?: string;

  // Insights de correlación
  correlationInsights?: string[];
}

interface AnalysisSnapshot {
  id: string;
  type: string;
  timestamp: Date;
  score: number;
  metrics: any;
  insights: string[];
  recommendations: any[];
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

export class RecommendationEngine {
  private gemini: GeminiClient;

  constructor() {
    this.gemini = new GeminiClient();
  }

  /**
   * Genera un conjunto completo de recomendaciones basado en todos los análisis recientes
   */
  async generateRecommendations(): Promise<RecommendationSet> {
    try {
      // 1. Recolectar análisis recientes de todos los analizadores
      const analyses = await this.collectRecentAnalyses();

      // 2. Extraer recomendaciones individuales de cada análisis
      const individualRecs = this.extractIndividualRecommendations(analyses);

      // 3. Detectar patrones y correlaciones entre análisis
      const correlations = this.detectCorrelations(analyses);

      // 4. Generar recomendaciones cross-funcionales basadas en correlaciones
      const crossFunctionalRecs = this.generateCrossFunctionalRecommendations(
        analyses,
        correlations
      );

      // 5. Combinar y priorizar todas las recomendaciones
      const allRecommendations = [...individualRecs, ...crossFunctionalRecs];
      const prioritizedRecs = this.prioritizeRecommendations(allRecommendations, analyses);

      // 6. Detectar dependencias entre recomendaciones
      const recsWithDependencies = this.detectDependencies(prioritizedRecs);

      // 7. Generar resumen ejecutivo con Gemini
      const executiveSummary = await this.generateExecutiveSummary(
        recsWithDependencies,
        analyses
      );

      // 8. Generar insights de correlación
      const correlationInsights = await this.generateCorrelationInsights(
        correlations,
        analyses
      );

      // 9. Crear el conjunto de recomendaciones
      const recommendationSet: RecommendationSet = {
        id: this.generateId(),
        timestamp: new Date(),
        totalRecommendations: recsWithDependencies.length,
        byPriority: this.countByPriority(recsWithDependencies),
        byCategory: this.countByCategory(recsWithDependencies),
        recommendations: recsWithDependencies,
        executiveSummary,
        correlationInsights,
      };

      // 10. Guardar en Firestore
      await this.saveRecommendationSet(recommendationSet);

      return recommendationSet;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Recolecta los análisis más recientes de cada tipo
   */
  private async collectRecentAnalyses(): Promise<AnalysisSnapshot[]> {
    const analysisTypes = ['stock', 'sales', 'marketing', 'production', 'code', 'uiux'];
    const analyses: AnalysisSnapshot[] = [];

    for (const type of analysisTypes) {
      try {
        const snapshot = await db
          .collection('ai_analyses')
          .where('type', '==', type)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          analyses.push({
            id: doc.id,
            type: data.type,
            timestamp: data.timestamp.toDate(),
            score: data.score || 0,
            metrics: data.metrics || {},
            insights: data.insights || [],
            recommendations: data.recommendations || [],
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch ${type} analysis:`, error);
      }
    }

    return analyses;
  }

  /**
   * Extrae recomendaciones individuales de cada análisis
   */
  private extractIndividualRecommendations(
    analyses: AnalysisSnapshot[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const analysis of analyses) {
      if (!analysis.recommendations || analysis.recommendations.length === 0) {
        continue;
      }

      for (const rec of analysis.recommendations) {
        recommendations.push({
          id: this.generateId(),
          priority: rec.priority || 'medium',
          category: analysis.type as RecommendationCategory,
          title: rec.title || rec.action || 'Acción recomendada',
          description: rec.description || rec.details || '',
          rationale: rec.rationale || rec.reason || 'Mejora recomendada por el análisis',
          impact: rec.impact || this.estimateImpact(rec, analysis),
          effort: rec.effort || 'medium',
          timeframe: rec.timeframe || this.estimateTimeframe(rec.priority),
          estimatedDuration: rec.estimatedDuration,
          sources: [{
            analyzerType: analysis.type,
            analysisId: analysis.id,
            score: analysis.score,
            timestamp: analysis.timestamp,
          }],
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Detecta correlaciones entre diferentes tipos de análisis
   */
  private detectCorrelations(analyses: AnalysisSnapshot[]): Array<{
    types: string[];
    correlation: string;
    severity: 'high' | 'medium' | 'low';
  }> {
    const correlations: Array<{
      types: string[];
      correlation: string;
      severity: 'high' | 'medium' | 'low';
    }> = [];

    // Stock bajo + Ventas altas = Riesgo de stockout
    const stockAnalysis = analyses.find(a => a.type === 'stock');
    const salesAnalysis = analyses.find(a => a.type === 'sales');

    if (stockAnalysis && salesAnalysis) {
      if (stockAnalysis.score < 60 && salesAnalysis.score > 70) {
        correlations.push({
          types: ['stock', 'sales'],
          correlation: 'Ventas fuertes con stock bajo: alto riesgo de stockout',
          severity: 'high',
        });
      }
    }

    // Marketing ROI bajo + Ventas en declive = Problema de captación
    const marketingAnalysis = analyses.find(a => a.type === 'marketing');
    if (marketingAnalysis && salesAnalysis) {
      const marketingScore = marketingAnalysis.score;
      const salesGrowth = salesAnalysis.metrics?.growthRate || 0;

      if (marketingScore < 60 && salesGrowth < 0) {
        correlations.push({
          types: ['marketing', 'sales'],
          correlation: 'Marketing ineficiente correlacionado con caída de ventas',
          severity: 'high',
        });
      }
    }

    // Producción ineficiente + Stock alto = Sobrecostos
    const productionAnalysis = analyses.find(a => a.type === 'production');
    if (productionAnalysis && stockAnalysis) {
      const productionOEE = productionAnalysis.metrics?.oee || 0;
      const overstock = stockAnalysis.metrics?.overstock || 0;

      if (productionOEE < 0.75 && overstock > 10) {
        correlations.push({
          types: ['production', 'stock'],
          correlation: 'Producción ineficiente generando exceso de inventario',
          severity: 'medium',
        });
      }
    }

    // Código de baja calidad + UX deficiente = Deuda técnica acumulada
    const codeAnalysis = analyses.find(a => a.type === 'code');
    const uiuxAnalysis = analyses.find(a => a.type === 'uiux');

    if (codeAnalysis && uiuxAnalysis) {
      if (codeAnalysis.score < 70 && uiuxAnalysis.score < 65) {
        correlations.push({
          types: ['code', 'uiux'],
          correlation: 'Baja calidad de código impactando experiencia de usuario',
          severity: 'medium',
        });
      }
    }

    return correlations;
  }

  /**
   * Genera recomendaciones cross-funcionales basadas en correlaciones
   */
  private generateCrossFunctionalRecommendations(
    analyses: AnalysisSnapshot[],
    correlations: Array<{ types: string[]; correlation: string; severity: string }>
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const correlation of correlations) {
      const priority = correlation.severity === 'high' ? 'critical' :
        correlation.severity === 'medium' ? 'high' : 'medium';

      recommendations.push({
        id: this.generateId(),
        priority,
        category: 'cross-functional',
        title: `Acción coordinada: ${correlation.types.join(' + ')}`,
        description: correlation.correlation,
        rationale: 'Problema detectado que requiere coordinación entre departamentos',
        impact: this.estimateCrossFunctionalImpact(correlation, analyses),
        effort: 'high',
        timeframe: correlation.severity === 'high' ? 'immediate' : 'short',
        sources: correlation.types.map(type => {
          const analysis = analyses.find(a => a.type === type);
          return {
            analyzerType: type,
            analysisId: analysis?.id || '',
            score: analysis?.score,
            timestamp: analysis?.timestamp || new Date(),
          };
        }),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return recommendations;
  }

  /**
   * Prioriza recomendaciones basándose en impacto, urgencia y contexto
   */
  private prioritizeRecommendations(
    recommendations: Recommendation[],
    analyses: AnalysisSnapshot[]
  ): Recommendation[] {
    // Calcular puntuación de prioridad para cada recomendación
    const scored = recommendations.map(rec => {
      let score = 0;

      // Prioridad base
      const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
      score += priorityScores[rec.priority];

      // Impacto financiero
      if (rec.impact.financial) {
        score += Math.min(rec.impact.financial / 1000, 50); // Max 50 puntos
      }

      // Riesgo
      if (rec.impact.risk === 'critical') score += 40;
      else if (rec.impact.risk === 'high') score += 30;
      else if (rec.impact.risk === 'medium') score += 15;

      // Effort inverso (menos esfuerzo = más atractivo)
      const effortScores = { low: 20, medium: 10, high: 0 };
      score += effortScores[rec.effort];

      // Cross-functional tiene bonus
      if (rec.category === 'cross-functional') {
        score += 25;
      }

      // Scores bajos en análisis fuente aumentan urgencia
      const avgScore = rec.sources.reduce((sum, s) => sum + (s.score || 0), 0) / rec.sources.length;
      if (avgScore < 50) score += 30;
      else if (avgScore < 60) score += 20;
      else if (avgScore < 70) score += 10;

      return { ...rec, _score: score };
    });

    // Ordenar por puntuación descendente
    scored.sort((a, b) => b._score - a._score);

    // Remover la puntuación temporal y retornar
    return scored.map(({ _score, ...rec }) => rec);
  }

  /**
   * Detecta dependencias entre recomendaciones
   */
  private detectDependencies(recommendations: Recommendation[]): Recommendation[] {
    // Reglas de dependencias simples
    const dependencyRules: Array<{
      if: (rec: Recommendation) => boolean;
      then: (rec: Recommendation) => string[];
    }> = [
        // Stock requiere producción
        {
          if: (rec) => rec.category === 'stock' && rec.title.includes('reorden'),
          then: (rec) => {
            const prodRec = recommendations.find(r =>
              r.category === 'production' && r.priority !== 'low'
            );
            return prodRec ? [prodRec.id] : [];
          },
        },
        // Marketing requiere producto disponible
        {
          if: (rec) => rec.category === 'marketing',
          then: (rec) => {
            const stockRec = recommendations.find(r =>
              r.category === 'stock' && r.priority === 'critical'
            );
            return stockRec ? [stockRec.id] : [];
          },
        },
        // UX requiere código limpio
        {
          if: (rec) => rec.category === 'uiux',
          then: (rec) => {
            const codeRec = recommendations.find(r =>
              r.category === 'code' && r.priority === 'critical'
            );
            return codeRec ? [codeRec.id] : [];
          },
        },
      ];

    return recommendations.map(rec => {
      const dependencies: string[] = [];

      for (const rule of dependencyRules) {
        if (rule.if(rec)) {
          dependencies.push(...rule.then(rec));
        }
      }

      return {
        ...rec,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
      };
    });
  }

  /**
   * Genera resumen ejecutivo usando Gemini
   */
  private async generateExecutiveSummary(
    recommendations: Recommendation[],
    analyses: AnalysisSnapshot[]
  ): Promise<string> {
    try {
      const prompt = `
Eres un consultor de gestión empresarial. Genera un resumen ejecutivo conciso basado en:

ANÁLISIS RECIENTES:
${analyses.map(a => `- ${a.type}: Score ${a.score}/100`).join('\n')}

RECOMENDACIONES PRIORITARIAS:
${recommendations.slice(0, 5).map((r, i: number) =>
        `${i + 1}. [${r.priority.toUpperCase()}] ${r.title} (${r.category})`
      ).join('\n')}

Genera un resumen ejecutivo en español de 2-3 párrafos que:
1. Resuma el estado general del negocio
2. Destaque los 2-3 problemas más críticos
3. Sugiera un plan de acción priorizado

Sé directo, específico y orientado a la acción.
`;

      const summary = await this.gemini.generate(prompt, { analyses, recommendations: recommendations.slice(0, 5) }, 'complex');
      return summary || this.generateFallbackSummary(recommendations, analyses);
    } catch (error) {
      console.error('Error generating executive summary:', error);
      return this.generateFallbackSummary(recommendations, analyses);
    }
  }

  /**
   * Genera insights sobre correlaciones usando Gemini
   */
  private async generateCorrelationInsights(
    correlations: Array<{ types: string[]; correlation: string; severity: string }>,
    analyses: AnalysisSnapshot[]
  ): Promise<string[]> {
    if (correlations.length === 0) {
      return ['No se detectaron correlaciones significativas entre los análisis.'];
    }

    try {
      const prompt = `
Eres un analista de datos empresarial. Analiza estas correlaciones detectadas:

${correlations.map((c, i: number) =>
        `${i + 1}. [${c.severity.toUpperCase()}] ${c.correlation} (${c.types.join(' + ')})`
      ).join('\n')}

CONTEXTO:
${analyses.map(a => `- ${a.type}: Score ${a.score}/100`).join('\n')}

Genera 3-5 insights específicos y accionables en español sobre:
- Qué causan estas correlaciones
- Cómo impactan al negocio
- Qué acciones tomar primero

Formato: Lista numerada, cada insight en una oración concisa.
`;

      const insights = await this.gemini.generate(prompt, { correlations, analyses }, 'complex');
      return insights ? insights.split('\n').filter((l: string) => l.trim()) :
        this.generateFallbackInsights(correlations);
    } catch (error) {
      console.error('Error generating correlation insights:', error);
      return this.generateFallbackInsights(correlations);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private estimateImpact(rec: any, analysis: AnalysisSnapshot): ImpactMetrics {
    const impact: ImpactMetrics = {};

    // Estimar impacto financiero basado en el tipo
    if (analysis.type === 'stock' && rec.priority === 'critical') {
      impact.financial = 5000; // Ejemplo: pérdida por stockout
    } else if (analysis.type === 'sales' && rec.priority === 'high') {
      impact.financial = 10000; // Ejemplo: oportunidad de ventas
    } else if (analysis.type === 'marketing') {
      impact.financial = 3000; // Ejemplo: optimización de ROI
    }

    // Estimar riesgo
    if (rec.priority === 'critical') {
      impact.risk = 'critical';
    } else if (rec.priority === 'high') {
      impact.risk = 'high';
    } else {
      impact.risk = 'medium';
    }

    return impact;
  }

  private estimateCrossFunctionalImpact(
    correlation: { types: string[]; correlation: string; severity: string },
    analyses: AnalysisSnapshot[]
  ): ImpactMetrics {
    return {
      financial: correlation.severity === 'high' ? 15000 : 8000,
      operational: 'Requiere coordinación entre departamentos',
      risk: correlation.severity as any,
    };
  }

  private estimateTimeframe(priority: RecommendationPriority): Timeframe {
    switch (priority) {
      case 'critical': return 'immediate';
      case 'high': return 'short';
      case 'medium': return 'medium';
      case 'low': return 'long';
    }
  }

  private generateFallbackSummary(
    recommendations: Recommendation[],
    analyses: AnalysisSnapshot[]
  ): string {
    const avgScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    const highCount = recommendations.filter(r => r.priority === 'high').length;

    return `
Estado general: El sistema presenta un score promedio de ${avgScore.toFixed(0)}/100 a través de todos los módulos analizados.

Situación crítica: Se han identificado ${criticalCount} recomendaciones críticas y ${highCount} de alta prioridad que requieren atención inmediata.

Plan de acción: Se recomienda abordar primero las ${criticalCount + highCount} acciones de mayor prioridad, comenzando por las recomendaciones cross-funcionales que impactan múltiples departamentos.
`.trim();
  }

  private generateFallbackInsights(
    correlations: Array<{ types: string[]; correlation: string; severity: string }>
  ): string[] {
    return correlations.map((c, i: number) =>
      `${i + 1}. [${c.severity.toUpperCase()}] ${c.correlation}`
    );
  }

  private countByPriority(recommendations: Recommendation[]) {
    return {
      critical: recommendations.filter(r => r.priority === 'critical').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length,
    };
  }

  private countByCategory(recommendations: Recommendation[]): Record<RecommendationCategory, number> {
    const categories: RecommendationCategory[] = [
      'stock', 'sales', 'marketing', 'production', 'code', 'uiux', 'cross-functional'
    ];
    const counts: any = {};

    for (const cat of categories) {
      counts[cat] = recommendations.filter(r => r.category === cat).length;
    }

    return counts;
  }

  private async saveRecommendationSet(set: RecommendationSet): Promise<void> {
    try {
      await db.collection('recommendation_sets').doc(set.id).set({
        ...set,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error saving recommendation set:', error);
    }
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
