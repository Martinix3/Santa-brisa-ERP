/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { Suspense } from 'react';
import { getLatestRecommendations } from '@/server/actions/recommendations';
import {
  getRecentInsights as getLatestAnalyses,
  getAnalysisHistory,
  getAggregatedScores
} from '@/server/actions/ai-insights';
import { GeminiDashboard } from '@/components/gemini/GeminiDashboard';

async function GeminiDashboardData() {
  const [
    recommendationsResult,
    analysesResult,
    historyResult,
    scoresResult
  ] = await Promise.all([
    getLatestRecommendations(),
    getLatestAnalyses(),
    getAnalysisHistory(30), // últimos 30 días
    getAggregatedScores(7) // últimos 7 días
  ]);

  const recommendations = recommendationsResult.success ? recommendationsResult.recommendationSet : null;
  const analysesArray = analysesResult.success ? analysesResult.insights : [];
  const analyses = analysesArray.reduce((acc: any, curr: any) => {
    if (curr.type) acc[curr.type] = curr;
    return acc;
  }, {});
  const history = historyResult.ok ? historyResult.data : [];
  const scores = scoresResult.ok ? scoresResult.data : null;

  return (
    <GeminiDashboard
      initialRecommendations={recommendations || null}
      initialAnalyses={analyses || null}
      analysisHistory={history || []}
      aggregatedScores={scores || null}
    />
  );
}

export default function GeminiPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="text-4xl">🧠</span>
          Gemini Intelligence Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistema de análisis y recomendaciones impulsado por IA
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Cargando inteligencia...</p>
            </div>
          </div>
        }
      >
        <GeminiDashboardData />
      </Suspense>
    </div>
  );
}
