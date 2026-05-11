'use server';

import { adminDb as db } from '@/server/firebase';

/**
 * Obtiene insights recientes de todos los tipos
 */
export async function getRecentInsights(limit: number = 20): Promise<{
    success: boolean;
    insights: any[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const insights = analysesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, insights };
    } catch (error) {
        console.error('[getRecentInsights] Error:', error);
        return {
            success: false,
            insights: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Obtiene historial de análisis
 */
export async function getAnalysisHistory(days: number = 30): Promise<{
    success: boolean;
    data: any[];
    error?: string;
    ok?: boolean; // Legacy support
}> {
    try {
        const date = new Date();
        date.setDate(date.getDate() - days);

        const analysesSnap = await db.collection('ai_analyses')
            .where('createdAt', '>=', date.toISOString())
            .orderBy('createdAt', 'desc')
            .get();

        const data = analysesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, ok: true, data };
    } catch (error) {
        console.error('[getAnalysisHistory] Error:', error);
        return {
            success: false,
            ok: false,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Obtiene puntuaciones agregadas
 */
export async function getAggregatedScores(days: number = 7): Promise<{
    success: boolean;
    data: any;
    error?: string;
    ok?: boolean; // Legacy support
}> {
    try {
        // Placeholder implementation
        return {
            success: true,
            ok: true,
            data: {
                overall: 85,
                categories: {
                    stock: 80,
                    sales: 90,
                    production: 85
                }
            }
        };
    } catch (error) {
        console.error('[getAggregatedScores] Error:', error);
        return {
            success: false,
            ok: false,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
