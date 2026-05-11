// FILE: src/server/actions/quality-gemini.ts
// Quality Gemini Intelligence Server Actions
// FASE 21 - Gemini Intelligence Integration

"use server";

import { adminDb as db } from "@/server/firebase";
import { QualityAnalyzer } from "@/server/gemini/analyzers/quality-analyzer";
import type {
  Lot,
  QcTest,
  QualityRelease,
  QcPlan,
} from "@/domain/ssot";
import type {
  QualityAnalysisInput,
  QualityAnalysisResult,
  DefectPattern,
  PredictiveAlert,
  QualityInsight,
} from "@/server/gemini/analyzers/quality-analyzer";

// Initialize analyzer
const qualityAnalyzer = new QualityAnalyzer();

/**
 * Get predictive alerts for quality dashboard
 * 
 * Business Logic:
 * - Fetches last 90 days of quality data
 * - Analyzes patterns and trends
 * - Generates predictive alerts using Gemini
 * - Filters by severity if specified
 * 
 * @param options - Optional filtering and configuration
 * @returns Predictive alerts array
 */
export async function getQualityPredictiveAlerts(options?: {
  severityFilter?: Array<'critical' | 'warning' | 'info'>;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: PredictiveAlert[];
  error?: string;
}> {
  try {
    // Fetch quality data from last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffIso = cutoffDate.toISOString();

    // Fetch lots
    const lotsSnapshot = await db
      .collection('lots')
      .where('createdAt', '>=', cutoffIso)
      .get();
    const lots = lotsSnapshot.docs.map(doc => doc.data() as Lot);

    // Fetch QC tests
    const testsSnapshot = await db
      .collection('qcTests')
      .where('testedAt', '>=', cutoffIso)
      .get();
    const qcTests = testsSnapshot.docs.map(doc => doc.data() as QcTest);

    // Fetch quality releases
    const releasesSnapshot = await db
      .collection('qualityReleases')
      .where('decisionAt', '>=', cutoffIso)
      .get();
    const qualityReleases = releasesSnapshot.docs.map(doc => doc.data() as QualityRelease);

    // Fetch QC plans
    const plansSnapshot = await db.collection('qcPlansNew').get();
    const qcPlans = plansSnapshot.docs.map(doc => doc.data() as QcPlan);

    // Build analysis input
    const input: QualityAnalysisInput = {
      lots,
      qcTests,
      qualityReleases,
      qcPlans,
      items: [], // TODO: Fetch items if needed for category analysis
      analysisType: "predictive_alerts",
    };

    // Generate alerts using Gemini
    const alerts = await qualityAnalyzer.generatePredictiveAlerts(input);

    // Apply filters
    let filteredAlerts = alerts;

    if (options?.severityFilter && options.severityFilter.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert =>
        options.severityFilter!.includes(alert.severity)
      );
    }

    // Apply limit
    if (options?.limit) {
      filteredAlerts = filteredAlerts.slice(0, options.limit);
    }

    return {
      success: true,
      data: filteredAlerts,
    };
  } catch (error) {
    console.error('[getQualityPredictiveAlerts] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get defect patterns analysis
 * 
 * Business Logic:
 * - Analyzes quality data for recurring defect patterns
 * - Identifies supplier issues
 * - Detects category-specific problems
 * - Tracks parameter failures
 * 
 * @param options - Optional filtering
 * @returns Defect patterns array
 */
export async function getDefectPatterns(options?: {
  severityFilter?: Array<'critical' | 'high' | 'medium' | 'low'>;
  typeFilter?: Array<'recurring_defect' | 'supplier_issue' | 'category_problem' | 'parameter_failure'>;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: DefectPattern[];
  error?: string;
}> {
  try {
    // Fetch quality data from last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffIso = cutoffDate.toISOString();

    // Fetch lots
    const lotsSnapshot = await db
      .collection('lots')
      .where('createdAt', '>=', cutoffIso)
      .get();
    const lots = lotsSnapshot.docs.map(doc => doc.data() as Lot);

    // Fetch QC tests
    const testsSnapshot = await db
      .collection('qcTests')
      .where('testedAt', '>=', cutoffIso)
      .get();
    const qcTests = testsSnapshot.docs.map(doc => doc.data() as QcTest);

    // Fetch quality releases
    const releasesSnapshot = await db
      .collection('qualityReleases')
      .where('decisionAt', '>=', cutoffIso)
      .get();
    const qualityReleases = releasesSnapshot.docs.map(doc => doc.data() as QualityRelease);

    // Fetch QC plans
    const plansSnapshot = await db.collection('qcPlansNew').get();
    const qcPlans = plansSnapshot.docs.map(doc => doc.data() as QcPlan);

    // Build analysis input
    const input: QualityAnalysisInput = {
      lots,
      qcTests,
      qualityReleases,
      qcPlans,
      items: [], // TODO: Fetch items if needed for category analysis
      analysisType: "defect_patterns",
    };

    // Analyze defect patterns using Gemini
    const patterns = await qualityAnalyzer.analyzeDefectPatterns(input);

    // Apply filters
    let filteredPatterns = patterns;

    if (options?.severityFilter && options.severityFilter.length > 0) {
      filteredPatterns = filteredPatterns.filter(pattern =>
        options.severityFilter!.includes(pattern.severity)
      );
    }

    if (options?.typeFilter && options.typeFilter.length > 0) {
      filteredPatterns = filteredPatterns.filter(pattern =>
        options.typeFilter!.includes(pattern.type)
      );
    }

    // Apply limit
    if (options?.limit) {
      filteredPatterns = filteredPatterns.slice(0, options.limit);
    }

    return {
      success: true,
      data: filteredPatterns,
    };
  } catch (error) {
    console.error('[getDefectPatterns] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get quality insights and recommendations
 * 
 * Business Logic:
 * - Generates performance insights
 * - Identifies risk areas
 * - Suggests improvement opportunities
 * - Tracks compliance status
 * 
 * @param options - Optional filtering
 * @returns Quality insights array
 */
export async function getQualityInsights(options?: {
  categoryFilter?: Array<'performance' | 'risk' | 'opportunity' | 'compliance'>;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: QualityInsight[];
  error?: string;
}> {
  try {
    // Fetch quality data from last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffIso = cutoffDate.toISOString();

    // Fetch lots
    const lotsSnapshot = await db
      .collection('lots')
      .where('createdAt', '>=', cutoffIso)
      .get();
    const lots = lotsSnapshot.docs.map(doc => doc.data() as Lot);

    // Fetch QC tests
    const testsSnapshot = await db
      .collection('qcTests')
      .where('testedAt', '>=', cutoffIso)
      .get();
    const qcTests = testsSnapshot.docs.map(doc => doc.data() as QcTest);

    // Fetch quality releases
    const releasesSnapshot = await db
      .collection('qualityReleases')
      .where('decisionAt', '>=', cutoffIso)
      .get();
    const qualityReleases = releasesSnapshot.docs.map(doc => doc.data() as QualityRelease);

    // Fetch QC plans
    const plansSnapshot = await db.collection('qcPlansNew').get();
    const qcPlans = plansSnapshot.docs.map(doc => doc.data() as QcPlan);

    // Build analysis input
    const input: QualityAnalysisInput = {
      lots,
      qcTests,
      qualityReleases,
      qcPlans,
      items: [], // TODO: Fetch items if needed for category analysis
      analysisType: "trend_analysis",
    };

    // Generate insights using Gemini
    const insights = await qualityAnalyzer.generateQualityInsights(input);

    // Apply filters
    let filteredInsights = insights;

    if (options?.categoryFilter && options.categoryFilter.length > 0) {
      filteredInsights = filteredInsights.filter(insight =>
        options.categoryFilter!.includes(insight.type)
      );
    }

    // Apply limit
    if (options?.limit) {
      filteredInsights = filteredInsights.slice(0, options.limit);
    }

    return {
      success: true,
      data: filteredInsights,
    };
  } catch (error) {
    console.error('[getQualityInsights] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get complete quality system analysis
 * 
 * This is a comprehensive analysis that includes:
 * - Key quality metrics
 * - Defect patterns
 * - Predictive alerts
 * - Quality insights
 * - Supplier analysis
 * - Recommendations
 * 
 * @returns Complete quality analysis
 */
export async function getCompleteQualityAnalysis(): Promise<{
  success: boolean;
  data?: QualityAnalysisResult;
  error?: string;
}> {
  try {
    // Fetch quality data from last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffIso = cutoffDate.toISOString();

    // Fetch lots
    const lotsSnapshot = await db
      .collection('lots')
      .where('createdAt', '>=', cutoffIso)
      .get();
    const lots = lotsSnapshot.docs.map(doc => doc.data() as Lot);

    // Fetch QC tests
    const testsSnapshot = await db
      .collection('qcTests')
      .where('testedAt', '>=', cutoffIso)
      .get();
    const qcTests = testsSnapshot.docs.map(doc => doc.data() as QcTest);

    // Fetch quality releases
    const releasesSnapshot = await db
      .collection('qualityReleases')
      .where('decisionAt', '>=', cutoffIso)
      .get();
    const qualityReleases = releasesSnapshot.docs.map(doc => doc.data() as QualityRelease);

    // Fetch QC plans
    const plansSnapshot = await db.collection('qcPlansNew').get();
    const qcPlans = plansSnapshot.docs.map(doc => doc.data() as QcPlan);

    // Build analysis input
    const input: QualityAnalysisInput = {
      lots,
      qcTests,
      qualityReleases,
      qcPlans,
      items: [], // TODO: Fetch items if needed for category analysis
      analysisType: "full",
    };

    // Run complete analysis
    const analysis = await qualityAnalyzer.analyzeQualitySystem(input);

    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    console.error('[getCompleteQualityAnalysis] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze supplier quality performance
 * 
 * @param supplierId - Supplier ID to analyze
 * @returns Supplier quality analysis
 */
export async function analyzeSupplierQuality(supplierId: string): Promise<{
  success: boolean;
  data?: {
    stats: {
      supplierId: string;
      supplierName: string;
      totalLots: number;
      approvedLots: number;
      rejectedLots: number;
      passRate: number;
      avgReviewTimeHours: number;
      lastRejectionDate?: Date;
      consecutiveRejections: number;
    };
    patterns: DefectPattern[];
    predictions: PredictiveAlert[];
    recommendations: string[];
  };
  error?: string;
}> {
  try {
    // Fetch supplier's lots from last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffIso = cutoffDate.toISOString();

    const lotsSnapshot = await db
      .collection('lots')
      .where('supplierId', '==', supplierId)
      .where('createdAt', '>=', cutoffIso)
      .get();
    const lots = lotsSnapshot.docs.map(doc => doc.data() as Lot);

    // Fetch all QC tests and releases for context
    const testsSnapshot = await db
      .collection('qcTests')
      .where('testedAt', '>=', cutoffIso)
      .get();
    const qcTests = testsSnapshot.docs.map(doc => doc.data() as QcTest);

    const releasesSnapshot = await db
      .collection('qualityReleases')
      .where('decisionAt', '>=', cutoffIso)
      .get();
    const qualityReleases = releasesSnapshot.docs.map(doc => doc.data() as QualityRelease);

    const plansSnapshot = await db.collection('qcPlansNew').get();
    const qcPlans = plansSnapshot.docs.map(doc => doc.data() as QcPlan);

    // Build analysis input
    const input: QualityAnalysisInput = {
      lots,
      qcTests,
      qualityReleases,
      qcPlans,
      items: [], // TODO: Fetch items if needed
      analysisType: "supplier_quality",
    };

    // Analyze supplier using Gemini
    const analysis = await qualityAnalyzer.analyzeSupplierQuality(input, supplierId);

    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    console.error('[analyzeSupplierQuality] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
