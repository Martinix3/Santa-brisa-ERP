'use server';

import { ProductionAnalyzer, type ProductionAnalysis } from '../../gemini/analyzers/production-analyzer';
import { BomAnalyzer, type BomAnalysis } from '../../gemini/analyzers/bom-analyzer';
import { adminDb as db } from '@/server/firebase';

/**
 * Analiza la eficiencia de producción
 */
import { unstable_cache } from 'next/cache';

/**
 * Analiza la eficiencia de producción
 */
export const analyzeProduction = unstable_cache(
    async (facilityId?: string): Promise<{
        success: boolean;
        analysis?: ProductionAnalysis;
        error?: string;
    }> => {
        try {
            console.log(`[analyzeProduction] Starting analysis for facility: ${facilityId || 'all'}`);

            const productionAnalyzer = new ProductionAnalyzer();
            const analysis = await productionAnalyzer.analyze(facilityId || 'overall');

            // Crear alertas si el OEE es bajo
            if (analysis.oee.oee < 70 || analysis.oee.rating === 'poor') {
                await createProductionAlert(analysis);
            }

            console.log(`[analyzeProduction] Analysis complete: OEE ${analysis.oee.oee.toFixed(1)}% (${analysis.oee.rating})`);

            return {
                success: true,
                analysis
            };
        } catch (error: any) {
            console.error('[analyzeProduction] Error:', error);
            return {
                success: false,
                error: error.message || 'Error analyzing production'
            };
        }
    },
    ['production-analysis'],
    { revalidate: 3600 } // 1 hour cache
);

/**
 * Analiza BOMs con Gemini
 */
export const analyzeBOM = unstable_cache(
    async (): Promise<{
        success: boolean;
        analysis?: BomAnalysis;
        error?: string;
    }> => {
        try {
            console.log('[analyzeBOM] Starting BOM analysis');

            const bomAnalyzer = new BomAnalyzer();
            const analysis = await bomAnalyzer.analyze();

            // Crear alertas si hay BOMs con alto costo o sin uso
            if (analysis.metrics.highCostBoms > 0 || analysis.metrics.unusedBoms > 3) {
                await createBOMAlert(analysis);
            }

            console.log(`[analyzeBOM] Analysis complete: ${analysis.optimizations.length} optimizations found`);

            return { success: true, analysis };
        } catch (error) {
            console.error('[analyzeProduction] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },
    ['bom-analysis'],
    { revalidate: 3600 } // 1 hour cache
);

/**
 * Obtiene el historial de análisis de producción
 */
export async function getProductionAnalysisHistory(
    facilityId: string,
    limit: number = 10
): Promise<{
    success: boolean;
    analyses: ProductionAnalysis[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .where('type', '==', 'production')
            .where('entityId', '==', facilityId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const analyses = analysesSnap.docs.map(doc => doc.data().analysis as ProductionAnalysis);

        return { success: true, analyses };
    } catch (error) {
        console.error('[getProductionAnalysisHistory] Error:', error);
        return {
            success: false,
            analyses: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Helper: Crea una alerta de BOMs
 */
async function createBOMAlert(analysis: BomAnalysis): Promise<void> {
    try {
        const severity = analysis.metrics.highCostBoms > 5 ? 80 : 65;
        const title = `Oportunidades de optimización en BOMs`;

        const issues: string[] = [];
        if (analysis.metrics.highCostBoms > 0) {
            issues.push(`${analysis.metrics.highCostBoms} BOMs con alto costo`);
        }
        if (analysis.metrics.unusedBoms > 0) {
            issues.push(`${analysis.metrics.unusedBoms} BOMs sin uso reciente`);
        }

        await db.collection('alerts').add({
            department: 'PRODUCCION',
            kind: 'BOM_OPTIMIZATION',
            severity,
            title,
            message: `${issues.join(', ')}. Costo promedio: €${analysis.metrics.avgCostPerBom.toFixed(2)}. ${analysis.optimizations.length} oportunidad(es) de optimización.`,
            entities: {},
            metadata: {
                analysisId: analysis.id,
                metrics: analysis.metrics,
                optimizations: analysis.optimizations.slice(0, 5),
                topCostlyBoms: analysis.topCostlyBoms.slice(0, 3),
                recommendations: analysis.recommendations
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log('[createBOMAlert] Alert created for BOM optimizations');
    } catch (error) {
        console.error('[createBOMAlert] Error creating alert:', error);
    }
}

/**
 * Helper: Crea una alerta de producción
 */
async function createProductionAlert(analysis: ProductionAnalysis): Promise<void> {
    try {
        const severity = analysis.oee.rating === 'poor' ? 85 : 70;
        const title = `OEE bajo en producción: ${analysis.oee.oee.toFixed(1)}%`;

        const issues: string[] = [];
        if (analysis.oee.availability < 85) {
            issues.push(`Disponibilidad: ${analysis.oee.availability.toFixed(1)}%`);
        }
        if (analysis.oee.performance < 85) {
            issues.push(`Rendimiento: ${analysis.oee.performance.toFixed(1)}%`);
        }
        if (analysis.oee.quality < 98) {
            issues.push(`Calidad: ${analysis.oee.quality.toFixed(1)}%`);
        }

        await db.collection('alerts').add({
            department: 'OPS',
            kind: 'PRODUCTION_EFFICIENCY',
            severity,
            title,
            message: `Componentes OEE: ${issues.join(', ')}. ${analysis.bottlenecks.length} cuello(s) de botella detectado(s).`,
            entities: {
                facilityId: analysis.facilityId
            },
            metadata: {
                analysisId: analysis.id,
                oee: analysis.oee,
                metrics: analysis.metrics,
                bottlenecks: analysis.bottlenecks,
                recommendations: analysis.recommendations
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log(`[createProductionAlert] Alert created for facility ${analysis.facilityId || 'all'}`);
    } catch (error) {
        console.error('[createProductionAlert] Error creating alert:', error);
    }
}
