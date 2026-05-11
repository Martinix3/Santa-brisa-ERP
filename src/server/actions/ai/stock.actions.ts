'use server';

import { StockAnalyzer, type StockAnalysis } from '../../gemini/analyzers/stock-analyzer';
import { adminDb as db } from '@/server/firebase';
import { format } from 'date-fns';

import { unstable_cache } from 'next/cache';

/**
 * Analiza el stock de un item específico
 */
export const analyzeStock = unstable_cache(
    async (itemId: string): Promise<{
        success: boolean;
        analysis?: StockAnalysis;
        error?: string;
    }> => {
        try {
            console.log(`[analyzeStock] Starting analysis for item: ${itemId}`);

            const stockAnalyzer = new StockAnalyzer();
            const analysis = await stockAnalyzer.analyze(itemId);

            // Crear alertas si el riesgo es crítico o alto
            if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
                await createStockAlert(analysis);
            }

            console.log(`[analyzeStock] Analysis complete: ${analysis.riskLevel} risk`);

            return { success: true, analysis };
        } catch (error) {
            console.error('[analyzeStock] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },
    ['stock-analysis'],
    { revalidate: 3600 } // 1 hour cache
);

/**
 * Analiza todos los items con stock crítico
 */
export const analyzeAllCriticalStock = unstable_cache(
    async (): Promise<{
        success: boolean;
        analyses: StockAnalysis[];
        criticalItems: number;
        error?: string;
    }> => {
        try {
            console.log('[analyzeAllCriticalStock] Starting bulk analysis');

            // Obtener todos los items con minStockLevel configurado
            const itemsSnap = await db.collection('items')
                .where('minStockLevel', '>', 0)
                .get();

            console.log(`[analyzeAllCriticalStock] Found ${itemsSnap.size} items with min stock configured`);

            const analyses: StockAnalysis[] = [];
            let criticalItems = 0;
            const stockAnalyzer = new StockAnalyzer();

            for (const itemDoc of itemsSnap.docs) {
                const item = itemDoc.data();

                // Obtener stock actual
                const onHandSnap = await db.collection('onHand')
                    .where('itemId', '==', itemDoc.id)
                    .get();

                const totalStock = onHandSnap.docs.reduce((sum, doc) => sum + (doc.data().qty || 0), 0);

                // Solo analizar si está por debajo del doble del stock mínimo
                if (totalStock < (item.minStockLevel || 0) * 2) {
                    try {
                        const analysis = await stockAnalyzer.analyze(itemDoc.id);
                        analyses.push(analysis);

                        if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
                            criticalItems++;
                        }
                    } catch (error) {
                        console.error(`[analyzeAllCriticalStock] Error analyzing item ${itemDoc.id}:`, error);
                    }
                }
            }

            console.log(`[analyzeAllCriticalStock] Complete: ${analyses.length} analyzed, ${criticalItems} critical`);

            return { success: true, analyses, criticalItems };
        } catch (error) {
            console.error('[analyzeAllCriticalStock] Error:', error);
            return {
                success: false,
                analyses: [],
                criticalItems: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },
    ['all-critical-stock-analysis'],
    { revalidate: 3600 } // 1 hour cache
);

/**
 * Obtiene el historial de análisis de un item
 */
export async function getStockAnalysisHistory(
    itemId: string,
    limit: number = 10
): Promise<{
    success: boolean;
    analyses: StockAnalysis[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .where('type', '==', 'stock')
            .where('entityId', '==', itemId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const analyses = analysesSnap.docs.map(doc => doc.data().analysis as StockAnalysis);

        return { success: true, analyses };
    } catch (error) {
        console.error('[getStockAnalysisHistory] Error:', error);
        return {
            success: false,
            analyses: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Helper: Crea una alerta de stock crítico
 */
async function createStockAlert(analysis: StockAnalysis): Promise<void> {
    try {
        await db.collection('alerts').add({
            department: 'OPS',
            kind: 'STOCK_PREDICTION',
            severity: analysis.riskLevel === 'critical' ? 90 : 70,
            title: `Stock crítico detectado: ${analysis.itemName}`,
            message: `Solo quedan ${Math.floor(analysis.daysUntilStockout)} días de stock. ${analysis.predictedStockoutDate
                ? `Rotura prevista: ${format(new Date(analysis.predictedStockoutDate), 'dd/MM/yyyy')}`
                : ''
                }`,
            entities: {
                itemId: analysis.itemId
            },
            metadata: {
                analysisId: analysis.id,
                currentStock: analysis.freeStock,
                avgConsumption: analysis.avgConsumption,
                recommendations: analysis.recommendations,
                insights: analysis.insights
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log(`[createStockAlert] Alert created for item ${analysis.itemId}`);
    } catch (error) {
        console.error('[createStockAlert] Error creating alert:', error);
    }
}
