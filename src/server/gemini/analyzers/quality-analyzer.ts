/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/gemini/analyzers/quality-analyzer.ts
/**
 * Quality Analyzer - Gemini Intelligence para Quality Control
 * 
 * FASE 21 - Gemini Intelligence Integration
 * 
 * Funcionalidades:
 * - Análisis predictivo de rechazos
 * - Pattern recognition para defectos recurrentes
 * - Alertas tempranas de problemas de calidad
 * - Recomendaciones de acciones preventivas
 * - Análisis de tendencias por proveedor/categoría
 */

import { BaseAnalyzer, type AnalysisResult, type Recommendation } from "./base-analyzer";
import type { ModelComplexity } from '../model-router';
import type { Lot, QualityRelease, QcTest, QcPlan, Item } from "@/domain/ssot";
import type { QualityStats, QualityStatsBySupplier, QualityStatsByCategory } from "@/types/quality";

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface QualityAnalysisInput {
  lots: Lot[];
  qualityReleases: QualityRelease[];
  qcTests: QcTest[];
  qcPlans: QcPlan[];
  items: Item[];
  analysisType: "defect_patterns" | "predictive_alerts" | "supplier_quality" | "trend_analysis" | "full";
}

export interface DefectPattern {
  type: "recurring_defect" | "supplier_issue" | "category_problem" | "parameter_failure";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedItems: string[];
  affectedSuppliers?: string[];
  occurrences: number;
  firstDetected: string;
  lastDetected: string;
  trend: "increasing" | "stable" | "decreasing";
  rootCause?: string;
  recommendation: string;
  predictedImpact?: {
    nextWeekRejections: number;
    affectedLotsEstimate: number;
    costImpactEstimate?: number;
  };
}

export interface PredictiveAlert {
  id: string;
  type: "rejection_risk" | "supplier_degradation" | "expiry_warning" | "parameter_drift";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  lotId?: string;
  lotCode?: string;
  supplierId?: string;
  itemId?: string;
  category?: string;
  predictedAt: string;
  confidenceLevel: number; // 0-100
  triggeringFactors: string[];
  preventiveActions: string[];
  estimatedTimeToIssue?: string; // e.g., "3 days", "1 week"
}

export interface QualityInsight {
  type: "performance" | "risk" | "opportunity" | "compliance";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affectedEntities: {
    lots?: string[];
    suppliers?: string[];
    categories?: string[];
    items?: string[];
  };
  metrics: {
    currentValue: number;
    targetValue?: number;
    trend: "improving" | "stable" | "degrading";
    changePercent?: number;
  };
  actionable: boolean;
  recommendation?: string;
  priority: "P0" | "P1" | "P2" | "P3";
}

export interface QualityAnalysisResult {
  defectPatterns: DefectPattern[];
  predictiveAlerts: PredictiveAlert[];
  insights: QualityInsight[];
  summary: string;
  keyMetrics: {
    passRate: number;
    avgReviewTimeHours: number;
    criticalLotsCount: number;
    rejectionTrend: "increasing" | "stable" | "decreasing";
    supplierIssuesCount: number;
    parametersAtRisk: string[];
  };
  recommendations: Array<{
    priority: "urgent" | "high" | "medium" | "low";
    action: string;
    expectedImpact: string;
    effort: "low" | "medium" | "high";
  }>;
}

// ============================================================================
// QUALITY ANALYZER CLASS
// ============================================================================

export class QualityAnalyzer extends BaseAnalyzer {
  protected complexity: ModelComplexity = 'complex';
  name = 'QualityAnalyzer';

  // Implement required abstract methods
  async analyze(entityId: string, config?: any): Promise<AnalysisResult> {
    // Analyze a specific lot
    const lot = await this.getDocument('lots', entityId);
    if (!lot) {
      throw new Error(`Lot ${entityId} not found`);
    }

    // Get related releases and tests
    const releases = await this.queryCollection('qualityReleases', [
      { field: 'lotId', op: '==', value: entityId }
    ]);

    const tests = await this.queryCollection('qcTests', [
      { field: 'lotId', op: '==', value: entityId }
    ]);

    const context = {
      lot,
      releases,
      tests,
      analysisDate: new Date().toISOString()
    };

    const prompt = `Analiza este lote específico y proporciona insights de calidad:

LOTE: ${lot.lotNumber}
ITEM: ${lot.itemId}
ESTADO QC: ${lot.qcStatus}
RECEPCIONES: ${releases.length}
TESTS: ${tests.length}

CONTEXTO COMPLETO:
${JSON.stringify(context, null, 2)}

Proporciona un análisis estructurado del estado de calidad de este lote, identificando riesgos y recomendaciones.

Responde en formato JSON con:
{
  "summary": "Resumen ejecutivo",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"]
}`;

    const result = await this.callGeminiJSON<any>(prompt, context);

    const analysisId = await this.saveAnalysis('quality_lot', entityId, result);

    return {
      id: analysisId,
      type: 'quality',
      entityId,
      entityName: lot.lotNumber,
      createdAt: new Date().toISOString(),
      metadata: result
    };
  }

  async getRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    const metadata = analysis.metadata || {};
    const recommendations: Recommendation[] = [];

    if (metadata.recommendations && Array.isArray(metadata.recommendations)) {
      metadata.recommendations.forEach((rec: string, index: number) => {
        recommendations.push({
          id: `rec-${analysis.id}-${index}`,
          type: 'quality',
          priority: metadata.riskLevel === 'critical' ? 'urgent' :
            metadata.riskLevel === 'high' ? 'high' : 'medium',
          title: `Quality Action ${index + 1}`,
          description: rec,
          actionUrl: `/quality/lots/${analysis.entityId}`,
          metadata: { lotId: analysis.entityId }
        });
      });
    }

    return recommendations;
  }

  // ============================================================================
  // SPECIALIZED ANALYSIS METHODS
  // ============================================================================

  /**
   * Análisis completo de calidad con todos los módulos
   */
  async analyzeQualitySystem(input: QualityAnalysisInput): Promise<QualityAnalysisResult> {
    const [defectPatterns, predictiveAlerts, insights] = await Promise.all([
      this.analyzeDefectPatterns(input),
      this.generatePredictiveAlerts(input),
      this.generateQualityInsights(input)
    ]);

    const keyMetrics = this.calculateKeyMetrics(input);
    const recommendations = this.generateRecommendationsSync(defectPatterns, predictiveAlerts, insights);

    const context = this.buildFullContext(input);
    const summaryPrompt = `Genera un resumen ejecutivo de 2-3 líneas basado en este análisis de calidad:

MÉTRICAS CLAVE:
- Tasa de aprobación: ${keyMetrics.passRate.toFixed(1)}%
- Tiempo promedio de revisión: ${keyMetrics.avgReviewTimeHours.toFixed(1)}h
- Lotes críticos: ${keyMetrics.criticalLotsCount}
- Tendencia de rechazos: ${keyMetrics.rejectionTrend}

PATRONES DETECTADOS: ${defectPatterns.length}
ALERTAS PREDICTIVAS: ${predictiveAlerts.length}
INSIGHTS: ${insights.length}

Proporciona un resumen ejecutivo enfocado en acciones y riesgos principales.`;

    const summary = await this.callGemini(summaryPrompt, context);

    return {
      defectPatterns,
      predictiveAlerts,
      insights,
      summary,
      keyMetrics,
      recommendations
    };
  }

  /**
   * Detecta patrones recurrentes de defectos
   */
  async analyzeDefectPatterns(input: QualityAnalysisInput): Promise<DefectPattern[]> {
    const context = this.buildDefectContext(input);

    const prompt = `Analiza los siguientes datos de calidad e identifica patrones recurrentes de defectos:

${context}

ANÁLISIS REQUERIDO:
1. Defectos que se repiten en múltiples lotes (>3 ocurrencias)
2. Problemas específicos por proveedor
3. Fallas recurrentes en parámetros específicos
4. Problemas sistemáticos por categoría de producto
5. Tendencias temporales (aumentando, estable, disminuyendo)

Para cada patrón detectado, proporciona:
- Causa raíz probable
- Impacto predicho (rechazos en próxima semana/mes)
- Recomendación de acción preventiva

Responde en formato JSON con array de DefectPattern siguiendo exactamente esta estructura:
{
  "patterns": [
    {
      "type": "recurring_defect" | "supplier_issue" | "category_problem" | "parameter_failure",
      "severity": "critical" | "high" | "medium" | "low",
      "title": "Título descriptivo",
      "description": "Descripción detallada del patrón",
      "affectedItems": ["SKU1", "SKU2"],
      "affectedSuppliers": ["SUPP1"],
      "occurrences": 5,
      "firstDetected": "2025-01-01T00:00:00Z",
      "lastDetected": "2025-01-17T00:00:00Z",
      "trend": "increasing" | "stable" | "decreasing",
      "rootCause": "Causa raíz identificada",
      "recommendation": "Acción recomendada",
      "predictedImpact": {
        "nextWeekRejections": 3,
        "affectedLotsEstimate": 8,
        "costImpactEstimate": 5000
      }
    }
  ]
}`;

    try {
      const result = await this.callGeminiJSON<{ patterns: DefectPattern[] }>(prompt, context);
      return result.patterns || [];
    } catch (error) {
      console.error("[QualityAnalyzer] Defect patterns analysis failed:", error);
      return [];
    }
  }

  /**
   * Genera alertas predictivas basadas en tendencias
   */
  async generatePredictiveAlerts(input: QualityAnalysisInput): Promise<PredictiveAlert[]> {
    const context = this.buildPredictiveContext(input);

    const prompt = `Analiza las siguientes tendencias de calidad y genera alertas predictivas:

${context}

ALERTAS PREDICTIVAS A GENERAR:
1. Riesgo de rechazo: Lotes con probabilidad >60% de ser rechazados
2. Degradación de proveedor: Proveedores con tendencia negativa
3. Advertencias de expiración: Lotes en riesgo por tiempo en hold
4. Deriva de parámetros: Parámetros que se alejan de especificación

Para cada alerta:
- Nivel de confianza (0-100)
- Factores que la disparan
- Acciones preventivas recomendadas
- Tiempo estimado hasta que ocurra el problema

Responde en formato JSON con array de PredictiveAlert:
{
  "alerts": [
    {
      "id": "alert-unique-id",
      "type": "rejection_risk" | "supplier_degradation" | "expiry_warning" | "parameter_drift",
      "severity": "critical" | "warning" | "info",
      "title": "Título de la alerta",
      "message": "Mensaje descriptivo",
      "lotId": "lot-id",
      "lotCode": "LOT-123",
      "supplierId": "supplier-id",
      "itemId": "item-id",
      "category": "category",
      "predictedAt": "2025-01-17T00:00:00Z",
      "confidenceLevel": 85,
      "triggeringFactors": ["factor1", "factor2"],
      "preventiveActions": ["action1", "action2"],
      "estimatedTimeToIssue": "3 days"
    }
  ]
}`;

    try {
      const result = await this.callGeminiJSON<{ alerts: PredictiveAlert[] }>(prompt, context);
      return result.alerts || [];
    } catch (error) {
      console.error("[QualityAnalyzer] Predictive alerts generation failed:", error);
      return [];
    }
  }

  /**
   * Genera insights de calidad accionables
   */
  async generateQualityInsights(input: QualityAnalysisInput): Promise<QualityInsight[]> {
    const context = this.buildInsightsContext(input);

    const prompt = `Genera insights accionables de calidad basados en los siguientes datos:

${context}

INSIGHTS A GENERAR:
1. Performance: Mejoras o degradaciones en métricas clave
2. Riesgos: Riesgos identificados que requieren atención
3. Oportunidades: Áreas de mejora potencial
4. Compliance: Problemas de cumplimiento de estándares

Responde en formato JSON con array de QualityInsight:
{
  "insights": [
    {
      "type": "performance" | "risk" | "opportunity" | "compliance",
      "severity": "info" | "warning" | "critical",
      "title": "Título del insight",
      "description": "Descripción detallada",
      "affectedEntities": {
        "lots": ["lot1"],
        "suppliers": ["supp1"],
        "categories": ["cat1"],
        "items": ["item1"]
      },
      "metrics": {
        "currentValue": 85.5,
        "targetValue": 95.0,
        "trend": "improving" | "stable" | "degrading",
        "changePercent": -5.2
      },
      "actionable": true,
      "recommendation": "Recomendación específica",
      "priority": "P0" | "P1" | "P2" | "P3"
    }
  ]
}`;

    try {
      const result = await this.callGeminiJSON<{ insights: QualityInsight[] }>(prompt, context);
      return result.insights || [];
    } catch (error) {
      console.error("[QualityAnalyzer] Quality insights generation failed:", error);
      return [];
    }
  }

  /**
   * Análisis de calidad por proveedor
   */
  async analyzeSupplierQuality(
    input: QualityAnalysisInput,
    supplierId: string
  ): Promise<{
    stats: QualityStatsBySupplier;
    patterns: DefectPattern[];
    predictions: PredictiveAlert[];
    recommendations: string[];
  }> {
    const supplierLots = input.lots.filter((l: Lot) => l.supplierId === supplierId);
    const supplierReleases = input.qualityReleases.filter(r =>
      supplierLots.some(l => l.lotNumber === r.lotCode)
    );

    const stats = this.calculateSupplierStats(supplierLots, supplierReleases);

    const supplierInput: QualityAnalysisInput = {
      ...input,
      lots: supplierLots,
      qualityReleases: supplierReleases,
      analysisType: "supplier_quality"
    };

    const [patterns, predictions] = await Promise.all([
      this.analyzeDefectPatterns(supplierInput),
      this.generatePredictiveAlerts(supplierInput)
    ]);

    const context = this.buildSupplierContext(supplierInput, stats);
    const recommendationsPrompt = `Basado en el análisis de calidad de este proveedor, genera 3-5 recomendaciones específicas:

${context}

Enfócate en acciones concretas y medibles.`;

    const recommendationsText = await this.callGemini(recommendationsPrompt, context);
    const recommendations = recommendationsText.split('\n').filter(r => r.trim().length > 0);

    return { stats, patterns, predictions, recommendations };
  }

  // ============================================================================
  // HELPER METHODS - CONTEXT BUILDING
  // ============================================================================

  private buildDefectContext(input: QualityAnalysisInput): string {
    const { lots, qualityReleases, qcTests } = input;

    // Agrupar rechazos por motivo
    const rejectionReasons = new Map<string, number>();
    qualityReleases
      .filter(r => r.decision === 'REJECTED')
      .forEach(r => {
        const reason = r.reason || 'No especificado';
        rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
      });

    // Tests que fallan frecuentemente
    const failedTests = new Map<string, number>();
    qcTests
      .filter(t => t.result === 'FAIL')
      .forEach(t => {
        const param = t.parameterId;
        failedTests.set(param, (failedTests.get(param) || 0) + 1);
      });

    // Lotes rechazados por proveedor
    const rejectedBySupplier = new Map<string, number>();
    const rejectedLotIds = new Set(
      qualityReleases.filter(r => r.decision === 'REJECTED').map(r => r.lotCode)
    );
    lots.filter(l => rejectedLotIds.has(l.id)).forEach(l => {
      const supplierId = l.supplierId || 'Unknown';
      rejectedBySupplier.set(supplierId, (rejectedBySupplier.get(supplierId) || 0) + 1);
    });

    return JSON.stringify({
      totalLots: lots.length,
      totalReleases: qualityReleases.length,
      totalTests: qcTests.length,
      rejectionReasons: Array.from(rejectionReasons.entries()).map(([reason, count]) => ({
        reason,
        count
      })),
      failedParameters: Array.from(failedTests.entries()).map(([param, count]) => ({
        parameterId: param,
        failureCount: count
      })),
      rejectedBySupplier: Array.from(rejectedBySupplier.entries()).map(([supp, count]) => ({
        supplierId: supp,
        rejectedCount: count
      }))
    }, null, 2);
  }

  private buildPredictiveContext(input: QualityAnalysisInput): string {
    const { lots, qualityReleases } = input;

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Lotes en hold por días
    const lotsInHold = lots.filter(l =>
      l.qcStatus === 'PENDING' || l.qcStatus === 'IN_PROGRESS' || l.qcStatus === 'HOLD'
    ).map(l => {
      const createdAt = new Date(l.createdAt);
      const daysInHold = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        lotId: l.id,
        lotCode: l.lotNumber,
        itemId: l.itemId,
        supplierId: l.supplierId,
        daysInHold,
        qcStatus: l.qcStatus
      };
    });

    // Tendencia de rechazos últimos 30 días
    const recentReleases = qualityReleases.filter(r => {
      const decisionDate = new Date(r.decisionAt);
      return decisionDate >= last30Days;
    });

    const rejectionRate = recentReleases.length > 0
      ? (recentReleases.filter(r => r.decision === 'REJECTED').length / recentReleases.length) * 100
      : 0;

    return JSON.stringify({
      lotsInHold,
      criticalLots: lotsInHold.filter(l => l.daysInHold > 7).length,
      recentReleasesCount: recentReleases.length,
      rejectionRate: rejectionRate.toFixed(2) + '%',
      avgReviewTime: this.calculateAverageReviewTime(qualityReleases)
    }, null, 2);
  }

  private buildInsightsContext(input: QualityAnalysisInput): string {
    const metrics = this.calculateKeyMetrics(input);
    const supplierStats = this.calculateAllSupplierStats(input);
    const categoryStats = this.calculateCategoryStats(input);

    return JSON.stringify({
      keyMetrics: metrics,
      supplierPerformance: supplierStats.slice(0, 10),
      categoryPerformance: categoryStats.slice(0, 10)
    }, null, 2);
  }

  private buildSupplierContext(input: QualityAnalysisInput, stats: QualityStatsBySupplier): string {
    return JSON.stringify({
      supplier: stats,
      recentLots: input.lots.slice(0, 20).map(l => ({
        lotCode: l.lotNumber,
        itemId: l.itemId,
        qcStatus: l.qcStatus,
        createdAt: l.createdAt
      })),
      recentReleases: input.qualityReleases.slice(0, 10).map(r => ({
        decision: r.decision,
        reason: r.reason,
        observations: r.observations,
        decisionAt: r.decisionAt
      }))
    }, null, 2);
  }

  private buildFullContext(input: QualityAnalysisInput): string {
    return JSON.stringify({
      summary: {
        totalLots: input.lots.length,
        totalReleases: input.qualityReleases.length,
        totalTests: input.qcTests.length,
        activePlans: input.qcPlans.filter(p => p.active).length
      }
    }, null, 2);
  }

  // ============================================================================
  // HELPER METHODS - CALCULATIONS
  // ============================================================================

  private calculateKeyMetrics(input: QualityAnalysisInput): QualityAnalysisResult['keyMetrics'] {
    const { lots, qualityReleases, qcTests } = input;

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentReleases = qualityReleases.filter(r => new Date(r.decisionAt) >= last30Days);
    const previousReleases = qualityReleases.filter(r => {
      const date = new Date(r.decisionAt);
      return date >= previous30Days && date < last30Days;
    });

    const passRate = recentReleases.length > 0
      ? (recentReleases.filter(r => r.decision === 'APPROVED').length / recentReleases.length) * 100
      : 0;

    const avgReviewTime = this.calculateAverageReviewTime(recentReleases);

    const criticalLots = lots.filter(l => {
      if (l.qcStatus !== 'PENDING' && l.qcStatus !== 'IN_PROGRESS' && l.qcStatus !== 'HOLD') {
        return false;
      }
      const createdAt = new Date(l.createdAt);
      const daysInHold = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return daysInHold > 7;
    }).length;

    const recentRejectCount = recentReleases.filter(r => r.decision === 'REJECTED').length;
    const previousRejectCount = previousReleases.filter(r => r.decision === 'REJECTED').length;
    const rejectionTrend = recentRejectCount > previousRejectCount * 1.1 ? 'increasing' :
      recentRejectCount < previousRejectCount * 0.9 ? 'decreasing' : 'stable';

    const supplierIssues = this.countSupplierIssues(input);

    const parametersAtRisk = this.identifyParametersAtRisk(qcTests);

    return {
      passRate,
      avgReviewTimeHours: avgReviewTime,
      criticalLotsCount: criticalLots,
      rejectionTrend,
      supplierIssuesCount: supplierIssues,
      parametersAtRisk
    };
  }

  private calculateAverageReviewTime(releases: QualityRelease[]): number {
    const timesInHours = releases
      .filter(r => r.reviewDuration)
      .map(r => r.reviewDuration! / 60); // Convert minutes to hours

    return timesInHours.length > 0 ? this.calculateAverage(timesInHours) : 0;
  }

  private calculateSupplierStats(
    lots: Lot[],
    releases: QualityRelease[]
  ): QualityStatsBySupplier {
    const supplierId = lots[0]?.supplierId || 'Unknown';
    const approvedCount = releases.filter(r => r.decision === 'APPROVED').length;
    const rejectedCount = releases.filter(r => r.decision === 'REJECTED').length;
    const passRate = releases.length > 0 ? (approvedCount / releases.length) * 100 : 0;
    const avgReviewTime = this.calculateAverageReviewTime(releases);

    const rejectedReleases = releases.filter(r => r.decision === 'REJECTED');
    const lastRejection = rejectedReleases.length > 0
      ? new Date(rejectedReleases[rejectedReleases.length - 1].decisionAt)
      : undefined;

    // Count consecutive rejections from most recent
    let consecutiveRejections = 0;
    const sortedReleases = [...releases].sort((a, b) =>
      new Date(b.decisionAt).getTime() - new Date(a.decisionAt).getTime()
    );
    for (const release of sortedReleases) {
      if (release.decision === 'REJECTED') {
        consecutiveRejections++;
      } else {
        break;
      }
    }

    return {
      supplierId,
      supplierName: supplierId, // Would need to lookup actual name
      totalLots: lots.length,
      approvedLots: approvedCount,
      rejectedLots: rejectedCount,
      passRate,
      avgReviewTimeHours: avgReviewTime,
      lastRejectionDate: lastRejection,
      consecutiveRejections
    };
  }

  private calculateAllSupplierStats(input: QualityAnalysisInput): QualityStatsBySupplier[] {
    const { lots, qualityReleases } = input;

    const supplierMap = new Map<string, { lots: Lot[]; releases: QualityRelease[] }>();

    lots.forEach(lot => {
      const supplierId = lot.supplierId || 'Unknown';
      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, { lots: [], releases: [] });
      }
      supplierMap.get(supplierId)!.lots.push(lot);
    });

    qualityReleases.forEach(release => {
      const lot = lots.find(l => l.lotNumber === release.lotCode);
      if (lot) {
        const supplierId = lot.supplierId || 'Unknown';
        if (supplierMap.has(supplierId)) {
          supplierMap.get(supplierId)!.releases.push(release);
        }
      }
    });

    return Array.from(supplierMap.entries()).map(([supplierId, data]) =>
      this.calculateSupplierStats(data.lots, data.releases)
    );
  }

  private calculateCategoryStats(input: QualityAnalysisInput): QualityStatsByCategory[] {
    const { lots, qualityReleases, items } = input;

    const categoryMap = new Map<string, { lots: Lot[]; releases: QualityRelease[] }>();

    lots.forEach(lot => {
      const item = items.find((i) => i.id === lot.itemId);
      const category = item?.category || 'Unknown';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { lots: [], releases: [] });
      }
      categoryMap.get(category)!.lots.push(lot);
    });

    qualityReleases.forEach(release => {
      const lot = lots.find(l => l.lotNumber === release.lotCode);
      if (lot) {
        const item = items.find((i) => i.id === lot.itemId);
        const category = item?.category || 'Unknown';
        if (categoryMap.has(category)) {
          categoryMap.get(category)!.releases.push(release);
        }
      }
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => {
      const approvedCount = data.releases.filter(r => r.decision === 'APPROVED').length;
      const rejectedCount = data.releases.filter(r => r.decision === 'REJECTED').length;
      const passRate = data.releases.length > 0
        ? (approvedCount / data.releases.length) * 100
        : 0;
      const avgReviewTime = this.calculateAverageReviewTime(data.releases);

      return {
        category,
        totalLots: data.lots.length,
        approvedLots: approvedCount,
        rejectedLots: rejectedCount,
        passRate,
        avgReviewTimeHours: avgReviewTime
      };
    });
  }

  private countSupplierIssues(input: QualityAnalysisInput): number {
    const { lots, qualityReleases } = input;

    const supplierIssues = new Set<string>();
    const rejectedLotNumbers = new Set(
      qualityReleases.filter(r => r.decision === 'REJECTED').map(r => r.lotCode)
    );

    lots.filter(l => rejectedLotNumbers.has(l.lotNumber)).forEach(l => {
      if (l.supplierId) {
        supplierIssues.add(l.supplierId);
      }
    });

    return supplierIssues.size;
  }

  private identifyParametersAtRisk(qcTests: QcTest[]): string[] {
    const failureCount = new Map<string, number>();

    qcTests
      .filter(t => t.result === 'FAIL')
      .forEach(t => {
        const count = failureCount.get(t.parameterId) || 0;
        failureCount.set(t.parameterId, count + 1);
      });

    // Parameters with >3 failures are considered "at risk"
    return Array.from(failureCount.entries())
      .filter(([_, count]) => count > 3)
      .map(([param]) => param);
  }

  private generateRecommendationsSync(
    patterns: DefectPattern[],
    alerts: PredictiveAlert[],
    insights: QualityInsight[]
  ): Array<{
    priority: "urgent" | "high" | "medium" | "low";
    action: string;
    expectedImpact: string;
    effort: "low" | "medium" | "high";
  }> {
    const recommendations: Array<{
      priority: "urgent" | "high" | "medium" | "low";
      action: string;
      expectedImpact: string;
      effort: "low" | "medium" | "high";
    }> = [];

    // From critical patterns
    patterns
      .filter(p => p.severity === 'critical' || p.severity === 'high')
      .forEach(p => {
        recommendations.push({
          priority: p.severity === 'critical' ? 'urgent' : 'high',
          action: p.recommendation,
          expectedImpact: `Reducir rechazos en ${p.predictedImpact?.nextWeekRejections || 'varios'} lotes/semana`,
          effort: 'medium'
        });
      });

    // From critical alerts
    alerts
      .filter(a => a.severity === 'critical')
      .forEach(a => {
        a.preventiveActions.forEach(action => {
          recommendations.push({
            priority: 'urgent',
            action,
            expectedImpact: `Prevenir problema en ${a.estimatedTimeToIssue || 'corto plazo'}`,
            effort: 'low'
          });
        });
      });

    // From P0/P1 insights
    insights
      .filter((i) => (i.priority === 'P0' || i.priority === 'P1') && i.recommendation)
      .forEach((insight: QualityInsight) => {
        recommendations.push({
          priority: insight.priority === 'P0' ? 'urgent' : 'high',
          action: insight.recommendation!,
          expectedImpact: `Mejorar ${insight.type}: ${insight.metrics.currentValue.toFixed(1)}% → ${insight.metrics.targetValue?.toFixed(1)}%`,
          effort: 'medium'
        });
      });

    return recommendations.slice(0, 10); // Top 10 recommendations
  }
}
