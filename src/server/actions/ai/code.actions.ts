'use server';

import { CodeAnalyzer, type CodeAnalysis } from '../../gemini/analyzers/code-analyzer';
import { adminDb as db } from '@/server/firebase';

/**
 * Analiza la calidad y arquitectura del código
 */
export async function analyzeCode(targetPath: string): Promise<{
    success: boolean;
    analysis?: CodeAnalysis;
    error?: string;
}> {
    try {
        console.log(`[analyzeCode] Starting analysis for: ${targetPath}`);

        const codeAnalyzer = new CodeAnalyzer();
        const analysis = await codeAnalyzer.analyze(targetPath);

        // Crear alertas si el quality score es bajo o hay issues críticos
        if (analysis.qualityScore < 70 || analysis.issues.some((i) => i.severity === 'critical')) {
            await createCodeAlert(analysis);
        }

        console.log(`[analyzeCode] Analysis complete: ${analysis.qualityScore}/100 quality score, ${analysis.issues.length} issues`);

        return { success: true, analysis };
    } catch (error) {
        console.error('[analyzeCode] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Obtiene el historial de análisis de código
 */
export async function getCodeAnalysisHistory(
    target: string,
    limit: number = 10
): Promise<{
    success: boolean;
    analyses: CodeAnalysis[];
    error?: string;
}> {
    try {
        const analysesSnap = await db.collection('ai_analyses')
            .where('type', '==', 'code')
            .where('entityId', '==', target)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const analyses = analysesSnap.docs.map(doc => doc.data().analysis as CodeAnalysis);

        return { success: true, analyses };
    } catch (error) {
        console.error('[getCodeAnalysisHistory] Error:', error);
        return {
            success: false,
            analyses: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Helper: Crea una alerta de calidad de código
 */
async function createCodeAlert(analysis: CodeAnalysis): Promise<void> {
    try {
        const criticalIssues = analysis.issues.filter((i) => i.severity === 'critical').length;
        const highIssues = analysis.issues.filter((i) => i.severity === 'high').length;

        const severity = criticalIssues > 0 ? 90 : (analysis.qualityScore < 50 ? 80 : 70);
        const title = criticalIssues > 0
            ? `Issues críticos en código: ${analysis.target}`
            : `Baja calidad de código: ${analysis.target}`;

        const issuesSummary: string[] = [];
        if (criticalIssues > 0) issuesSummary.push(`${criticalIssues} crítico(s)`);
        if (highIssues > 0) issuesSummary.push(`${highIssues} alto(s)`);

        await db.collection('alerts').add({
            department: 'DEV',
            kind: 'CODE_QUALITY',
            severity,
            title,
            message: `Quality Score: ${analysis.qualityScore}/100. Issues: ${issuesSummary.join(', ')}. ${analysis.refactoringOpportunities.length} oportunidades de refactorización.`,
            entities: {
                target: analysis.target
            },
            metadata: {
                analysisId: analysis.id,
                qualityScore: analysis.qualityScore,
                metrics: analysis.metrics,
                issues: analysis.issues.slice(0, 5), // Top 5 issues
                refactoringOpportunities: analysis.refactoringOpportunities.slice(0, 3), // Top 3
                architectureCompliance: analysis.architectureCompliance,
                recommendations: analysis.recommendations
            },
            createdAt: new Date().toISOString(),
            resolved: false
        });

        console.log(`[createCodeAlert] Alert created for ${analysis.target}`);
    } catch (error) {
        console.error('[createCodeAlert] Error creating alert:', error);
    }
}
