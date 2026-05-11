'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target
} from 'lucide-react';
import type { RecommendationSet } from '@/server/gemini/recommendation-engine';
import type { StockAnalysis } from '@/server/gemini/analyzers/stock-analyzer';
import type { SalesForecast } from '@/server/gemini/analyzers/sales-analyzer';
import type { MarketingAnalysis } from '@/server/gemini/analyzers/marketing-analyzer';
import type { ProductionAnalysis } from '@/server/gemini/analyzers/production-analyzer';
import type { CodeAnalysis } from '@/server/gemini/analyzers/code-analyzer';
import type { UIUXAnalysis } from '@/server/gemini/analyzers/uiux-analyzer';

interface GeminiDashboardProps {
  initialRecommendations: RecommendationSet | null;
  initialAnalyses: {
    stock?: StockAnalysis;
    sales?: SalesForecast;
    marketing?: MarketingAnalysis;
    production?: ProductionAnalysis;
    code?: CodeAnalysis;
    uiux?: UIUXAnalysis;
  } | null;
  analysisHistory: Array<{
    id: string;
    type: string;
    entityId: string;
    score: number;
    createdAt: string;
    analysis: any;
  }>;
  aggregatedScores: {
    stock: { avg: number; count: number; trend: 'up' | 'down' | 'stable' };
    sales: { avg: number; count: number; trend: 'up' | 'down' | 'stable' };
    marketing: { avg: number; count: number; trend: 'up' | 'down' | 'stable' };
    production: { avg: number; count: number; trend: 'up' | 'down' | 'stable' };
    code: { avg: number; count: number; trend: 'up' | 'down' | 'stable' };
    uiux: { avg: number; count: number; trend: 'up' | 'down' | 'stable' };
  } | null;
}

type Tab = 'resumen' | 'recomendaciones' | 'analisis' | 'alertas';

export function GeminiDashboard({
  initialRecommendations,
  initialAnalyses,
  analysisHistory,
  aggregatedScores
}: GeminiDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('resumen');

  // Calcular métricas generales
  const totalRecommendations = initialRecommendations?.recommendations.length || 0;
  const criticalRecommendations = initialRecommendations?.recommendations.filter(
    r => r.priority === 'critical'
  ).length || 0;
  
  const averageScore = aggregatedScores 
    ? Math.round(
        (aggregatedScores.stock.avg +
         aggregatedScores.sales.avg +
         aggregatedScores.marketing.avg +
         aggregatedScores.production.avg +
         aggregatedScores.code.avg +
         aggregatedScores.uiux.avg) / 6
      )
    : 0;

  // Trend icon helper
  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="sb-card-glass-light p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Score Promedio</span>
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
              {averageScore}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>

        <div className="sb-card-glass-light p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Recomendaciones</span>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalRecommendations}</span>
            <span className="text-sm text-muted-foreground">activas</span>
          </div>
        </div>

        <div className="sb-card-glass-light p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Críticas</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600">{criticalRecommendations}</span>
            <span className="text-sm text-muted-foreground">urgentes</span>
          </div>
        </div>

        <div className="sb-card-glass-light p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Análisis</span>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{analysisHistory.length}</span>
            <span className="text-sm text-muted-foreground">últimos 30d</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sb-tabs">
        <button
          onClick={() => setActiveTab('resumen')}
          className="sb-tab"
          aria-selected={activeTab === 'resumen'}
        >
          📊 Resumen
        </button>
        <button
          onClick={() => setActiveTab('recomendaciones')}
          className="sb-tab"
          aria-selected={activeTab === 'recomendaciones'}
        >
          🎯 Recomendaciones
          {criticalRecommendations > 0 && (
            <span className="ml-2 sb-badge sb-badge--destructive">
              {criticalRecommendations}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('analisis')}
          className="sb-tab"
          aria-selected={activeTab === 'analisis'}
        >
          🔍 Análisis
        </button>
        <button
          onClick={() => setActiveTab('alertas')}
          className="sb-tab"
          aria-selected={activeTab === 'alertas'}
        >
          ⚠️ Alertas
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Executive Summary */}
          {initialRecommendations?.executiveSummary && (
            <div className="sb-card-glass-dark p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">🧠</div>
                <h3 className="text-lg font-semibold">Resumen Ejecutivo</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {initialRecommendations.executiveSummary}
              </p>
            </div>
          )}

          {/* Analyzer Scores */}
          {aggregatedScores && (
            <div className="sb-card-glass-light p-6">
              <h3 className="text-lg font-semibold mb-4">Puntuaciones por Área</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Stock */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">📦 Stock</span>
                    <TrendIcon trend={aggregatedScores.stock.trend} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(aggregatedScores.stock.avg)}`}>
                      {aggregatedScores.stock.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({aggregatedScores.stock.count} análisis)
                    </span>
                  </div>
                </div>

                {/* Sales */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">💰 Ventas</span>
                    <TrendIcon trend={aggregatedScores.sales.trend} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(aggregatedScores.sales.avg)}`}>
                      {aggregatedScores.sales.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({aggregatedScores.sales.count} análisis)
                    </span>
                  </div>
                </div>

                {/* Marketing */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">📢 Marketing</span>
                    <TrendIcon trend={aggregatedScores.marketing.trend} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(aggregatedScores.marketing.avg)}`}>
                      {aggregatedScores.marketing.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({aggregatedScores.marketing.count} análisis)
                    </span>
                  </div>
                </div>

                {/* Production */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">🏭 Producción</span>
                    <TrendIcon trend={aggregatedScores.production.trend} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(aggregatedScores.production.avg)}`}>
                      {aggregatedScores.production.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({aggregatedScores.production.count} análisis)
                    </span>
                  </div>
                </div>

                {/* Code */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">💻 Código</span>
                    <TrendIcon trend={aggregatedScores.code.trend} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(aggregatedScores.code.avg)}`}>
                      {aggregatedScores.code.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({aggregatedScores.code.count} análisis)
                    </span>
                  </div>
                </div>

                {/* UI/UX */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">🎨 UI/UX</span>
                    <TrendIcon trend={aggregatedScores.uiux.trend} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(aggregatedScores.uiux.avg)}`}>
                      {aggregatedScores.uiux.avg}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({aggregatedScores.uiux.count} análisis)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 5 Recommendations */}
          {initialRecommendations && initialRecommendations.recommendations.length > 0 && (
            <div className="sb-card-glass-light p-6">
              <h3 className="text-lg font-semibold mb-4">Top 5 Recomendaciones</h3>
              <div className="space-y-3">
                {initialRecommendations.recommendations
                  .slice(0, 5)
                  .map((rec, idx: number) => (
                    <div
                      key={rec.id}
                      className="p-4 bg-background/50 rounded-lg border hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`sb-badge ${
                              rec.priority === 'critical' ? 'sb-badge--destructive' :
                              rec.priority === 'high' ? 'sb-badge' :
                              'sb-badge--primary'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                            <span className="sb-badge sb-badge--outline">
                              {rec.category}
                            </span>
                          </div>
                          <h4 className="font-semibold mb-1">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {rec.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Correlation Insights */}
          {initialRecommendations?.correlationInsights && (
            <div className="sb-card-glass-dark p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">🔗</div>
                <h3 className="text-lg font-semibold">Insights de Correlaciones</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {initialRecommendations.correlationInsights}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recomendaciones' && (
        <div className="space-y-4">
          {initialRecommendations && initialRecommendations.recommendations.length > 0 ? (
            <div className="space-y-3">
              {initialRecommendations.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="sb-card-glass-light p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`sb-badge ${
                        rec.priority === 'critical' ? 'sb-badge--destructive' :
                        rec.priority === 'high' ? 'sb-badge' :
                        rec.priority === 'medium' ? 'sb-badge--primary' :
                        'sb-badge--outline'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="sb-badge sb-badge--outline">
                        {rec.category}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold mb-2">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {rec.description}
                  </p>

                  <div className="flex gap-2">
                    <button className="sb-btn sb-btn--sm sb-btn--primary">
                      ✓ Aprobar
                    </button>
                    <button className="sb-btn sb-btn--sm sb-btn--ghost">
                      ⏸️ Posponer
                    </button>
                    <button className="sb-btn sb-btn--sm sb-btn--ghost">
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sb-card-glass-light p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">No hay recomendaciones pendientes</h3>
              <p className="text-sm text-muted-foreground">
                El sistema está funcionando óptimamente
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analisis' && (
        <div className="sb-card-glass-light p-6">
          <h3 className="text-lg font-semibold mb-4">Análisis Recientes</h3>
          <div className="space-y-2">
            {analysisHistory.slice(0, 10).map((item: any) => (
              <div key={item.id} className="p-3 bg-background/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="sb-badge sb-badge--outline">{item.type}</span>
                    <span className="text-sm">{item.entityId}</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                    {item.score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'alertas' && (
        <div className="sb-card-glass-light p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Sistema de Alertas</h3>
          <p className="text-sm text-muted-foreground">
            Las alertas se gestionan desde el panel de administración
          </p>
        </div>
      )}
    </div>
  );
}
