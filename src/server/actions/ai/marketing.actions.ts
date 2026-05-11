'use server';

import { MarketingAnalyzer, type MarketingAnalysis } from '../../gemini/analyzers/marketing-analyzer';
import { adminDb as db } from '@/server/firebase';

/**
 * Analiza el rendimiento de marketing
 */
import { unstable_cache } from 'next/cache';

/**
 * Analiza el rendimiento de marketing
 */
export const analyzeMarketing = unstable_cache(
    async (params: {
        campaignId?: string;
        channel?: 'ads' | 'events' | 'pos-mkt' | 'collabs' | 'overall';
        daysBack?: number;
    }): Promise<{
        success: boolean;
        analysis?: MarketingAnalysis;
        error?: string;
    }> => {
        try {
            console.log(`[analyzeMarketing] Starting analysis:`, params);

            const marketingAnalyzer = new MarketingAnalyzer();
            const analysis = await marketingAnalyzer.analyze(params.campaignId || 'overall');

            // Crear alertas si el ROI es bajo o hay problemas
            if (analysis.metrics.roi < 1.5 || analysis.performance === 'poor') {
                await createMarketingAlert(analysis);
            }

            console.log(`[analyzeMarketing] Analysis complete: ${analysis.performance} performance, ROI ${analysis.metrics.roi.toFixed(2)}`);

            return { success: true, analysis };
        } catch (error) {
            console.error('[analyzeMarketing] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },
    ['marketing-analysis'],
    { revalidate: 3600 } // 1 hour cache
);

/**
 * Obtiene el historial de análisis de marketing
 */
export async function getMarketingAnalysisHistory(
    entityId: string,
    limit: number = 10
): Promise<{
    success: boolean;
    analyses: MarketingAnalysis[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .where('type', '==', 'marketing')
            .where('entityId', '==', entityId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const analyses = analysesSnap.docs.map(doc => doc.data().analysis as MarketingAnalysis);

        return { success: true, analyses };
    } catch (error) {
        console.error('[getMarketingAnalysisHistory] Error:', error);
        return {
            success: false,
            analyses: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Helper: Crea una alerta de marketing
 */
async function createMarketingAlert(analysis: MarketingAnalysis): Promise<void> {
    try {
        const severity = analysis.performance === 'poor' ? 80 : 60;
        const title = analysis.performance === 'poor'
            ? `Bajo rendimiento en marketing: ${analysis.channel}`
            : `ROI bajo en marketing: ${analysis.channel}`;

        await db.collection('alerts').add({
            department: 'MARKETING',
            kind: 'MARKETING_PERFORMANCE',
            severity,
            title,
            message: `ROI: ${analysis.metrics.roi.toFixed(2)}x. Inversión: €${analysis.metrics.totalSpend}. Retorno: €${analysis.metrics.totalRevenue}`,
            entities: {
                campaignId: analysis.campaignId,
                channel: analysis.channel
            },
            metadata: {
                analysisId: analysis.id,
                performance: analysis.performance,
                metrics: analysis.metrics,
                recommendations: analysis.recommendations
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log(`[createMarketingAlert] Alert created for ${analysis.channel}`);
    } catch (error) {
        console.error('[createMarketingAlert] Error creating alert:', error);
    }
}
