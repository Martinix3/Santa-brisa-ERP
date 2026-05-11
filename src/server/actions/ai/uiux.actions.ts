'use server';

import { UIUXAnalyzer, type UIUXAnalysis } from '../../gemini/analyzers/uiux-analyzer';
import { adminDb as db } from '@/server/firebase';

/**
 * Analiza la experiencia de usuario y accesibilidad
 */
export async function analyzeUIUX(targetPath: string): Promise<{
    success: boolean;
    analysis?: UIUXAnalysis;
    error?: string;
}> {
    try {
        console.log(`[analyzeUIUX] Starting analysis for: ${targetPath}`);

        const uiuxAnalyzer = new UIUXAnalyzer();
        const analysis = await uiuxAnalyzer.analyze(targetPath);

        // Crear alertas si el score es bajo
        if (analysis.uxScore < 70 || analysis.accessibilityScore < 80) {
            await createUIUXAlert(analysis);
        }

        console.log(`[analyzeUIUX] Analysis complete: ${analysis.uxScore}/100 score`);

        return { success: true, analysis };
    } catch (error) {
        console.error('[analyzeUIUX] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Obtiene el historial de análisis de UI/UX
 */
export async function getUIUXAnalysisHistory(
    target: string,
    limit: number = 10
): Promise<{
    success: boolean;
    analyses: UIUXAnalysis[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .where('type', '==', 'uiux')
            .where('entityId', '==', target)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const analyses = analysesSnap.docs.map(doc => doc.data().analysis as UIUXAnalysis);

        return { success: true, analyses };
    } catch (error) {
        console.error('[getUIUXAnalysisHistory] Error:', error);
        return {
            success: false,
            analyses: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Helper: Crea una alerta de UI/UX
 */
async function createUIUXAlert(analysis: UIUXAnalysis): Promise<void> {
    try {
        const severity = analysis.accessibilityScore < 60 ? 85 : 65;
        const title = analysis.accessibilityScore < 80
            ? `Problemas de accesibilidad en: ${analysis.target}`
            : `Mejoras de UX necesarias: ${analysis.target}`;

        const issuesSummary: string[] = [];
        if (analysis.accessibilityScore < 80) issuesSummary.push(`Accesibilidad: ${analysis.accessibilityScore}`);
        if (analysis.uxScore < 70) issuesSummary.push(`Usabilidad: ${analysis.uxScore}`);

        await db.collection('alerts').add({
            department: 'DESIGN',
            kind: 'UX_IMPROVEMENT',
            severity,
            title,
            message: `Overall Score: ${analysis.uxScore}/100. ${issuesSummary.join(', ')}. ${analysis.issues.length} problemas detectados.`,
            entities: {
                target: analysis.target
            },
            metadata: {
                analysisId: analysis.id,
                scores: { ux: analysis.uxScore, accessibility: analysis.accessibilityScore },
                issues: analysis.issues.slice(0, 5), // Top 5
                recommendations: analysis.recommendations
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log(`[createUIUXAlert] Alert created for ${analysis.target}`);
    } catch (error) {
        console.error('[createUIUXAlert] Error creating alert:', error);
    }
}
