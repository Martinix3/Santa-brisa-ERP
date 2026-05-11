/**
 * Recommendation Engine Server Actions
 * 
 * Provee acciones del servidor para el motor de recomendaciones:
 * - Generación de recomendaciones cross-funcionales
 * - Gestión del estado de recomendaciones
 * - Historial y seguimiento
 */

'use server';

import { RecommendationEngine, type RecommendationSet, type Recommendation } from '../gemini/recommendation-engine';
import { adminDb as db } from '@/server/firebase';

/**
 * Genera un nuevo conjunto de recomendaciones basado en todos los análisis recientes
 */
export async function generateRecommendations(): Promise<{
  success: boolean;
  recommendationSet?: RecommendationSet;
  error?: string;
}> {
  try {
    console.log('[generateRecommendations] Starting generation');

    const engine = new RecommendationEngine();
    const recommendationSet = await engine.generateRecommendations();

    console.log(`[generateRecommendations] Complete: ${recommendationSet.totalRecommendations} recommendations generated`);

    return { success: true, recommendationSet };
  } catch (error) {
    console.error('[generateRecommendations] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene el conjunto de recomendaciones más reciente
 */
export async function getLatestRecommendations(): Promise<{
  success: boolean;
  recommendationSet?: RecommendationSet;
  error?: string;
}> {
  try {
    const snapshot = await db.collection('recommendation_sets')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        success: false,
        error: 'No recommendations found. Generate recommendations first.'
      };
    }

    const recommendationSet = snapshot.docs[0].data() as RecommendationSet;

    return { success: true, recommendationSet };
  } catch (error) {
    console.error('[getLatestRecommendations] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene el historial de conjuntos de recomendaciones
 */
export async function getRecommendationHistory(limit: number = 10): Promise<{
  success: boolean;
  sets: RecommendationSet[];
  error?: string;
}> {
  try {
    const snapshot = await db.collection('recommendation_sets')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const sets = snapshot.docs.map(doc => doc.data() as RecommendationSet);

    return { success: true, sets };
  } catch (error) {
    console.error('[getRecommendationHistory] Error:', error);
    return {
      success: false,
      sets: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Actualiza el estado de una recomendación específica
 */
export async function updateRecommendationStatus(
  setId: string,
  recommendationId: string,
  status: 'pending' | 'in-progress' | 'completed' | 'dismissed',
  notes?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const setRef = db.collection('recommendation_sets').doc(setId);
    const setDoc = await setRef.get();

    if (!setDoc.exists) {
      return {
        success: false,
        error: 'Recommendation set not found'
      };
    }

    const set = setDoc.data() as RecommendationSet;
    const recommendation = set.recommendations.find(r => r.id === recommendationId);

    if (!recommendation) {
      return {
        success: false,
        error: 'Recommendation not found'
      };
    }

    // Actualizar el estado
    recommendation.status = status;
    recommendation.updatedAt = new Date();

    // Guardar en Firestore
    await setRef.update({
      recommendations: set.recommendations,
    });

    // Crear entrada en historial de acciones
    await db.collection('recommendation_actions').add({
      setId,
      recommendationId,
      action: status,
      notes,
      timestamp: new Date(),
    });

    console.log(`[updateRecommendationStatus] Updated ${recommendationId} to ${status}`);

    return { success: true };
  } catch (error) {
    console.error('[updateRecommendationStatus] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene recomendaciones filtradas por prioridad
 */
export async function getRecommendationsByPriority(
  priority: 'critical' | 'high' | 'medium' | 'low'
): Promise<{
  success: boolean;
  recommendations: Recommendation[];
  error?: string;
}> {
  try {
    const latestSet = await getLatestRecommendations();

    if (!latestSet.success || !latestSet.recommendationSet) {
      return {
        success: false,
        recommendations: [],
        error: 'No recommendations available'
      };
    }

    const filtered = latestSet.recommendationSet.recommendations.filter(
      r => r.priority === priority && r.status === 'pending'
    );

    return { success: true, recommendations: filtered };
  } catch (error) {
    console.error('[getRecommendationsByPriority] Error:', error);
    return {
      success: false,
      recommendations: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene recomendaciones filtradas por categoría
 */
export async function getRecommendationsByCategory(
  category: 'stock' | 'sales' | 'marketing' | 'production' | 'code' | 'uiux' | 'cross-functional'
): Promise<{
  success: boolean;
  recommendations: Recommendation[];
  error?: string;
}> {
  try {
    const latestSet = await getLatestRecommendations();

    if (!latestSet.success || !latestSet.recommendationSet) {
      return {
        success: false,
        recommendations: [],
        error: 'No recommendations available'
      };
    }

    const filtered = latestSet.recommendationSet.recommendations.filter(
      r => r.category === category && r.status === 'pending'
    );

    return { success: true, recommendations: filtered };
  } catch (error) {
    console.error('[getRecommendationsByCategory] Error:', error);
    return {
      success: false,
      recommendations: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene las recomendaciones pendientes de mayor prioridad
 */
export async function getTopRecommendations(limit: number = 5): Promise<{
  success: boolean;
  recommendations: Recommendation[];
  error?: string;
}> {
  try {
    const latestSet = await getLatestRecommendations();

    if (!latestSet.success || !latestSet.recommendationSet) {
      return {
        success: false,
        recommendations: [],
        error: 'No recommendations available'
      };
    }

    const pending = latestSet.recommendationSet.recommendations
      .filter(r => r.status === 'pending')
      .slice(0, limit);

    return { success: true, recommendations: pending };
  } catch (error) {
    console.error('[getTopRecommendations] Error:', error);
    return {
      success: false,
      recommendations: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calcula estadísticas del conjunto de recomendaciones actual
 */
export async function getRecommendationStats(): Promise<{
  success: boolean;
  stats?: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    avgFinancialImpact: number;
    totalEstimatedImpact: number;
  };
  error?: string;
}> {
  try {
    const latestSet = await getLatestRecommendations();

    if (!latestSet.success || !latestSet.recommendationSet) {
      return {
        success: false,
        error: 'No recommendations available'
      };
    }

    const recs = latestSet.recommendationSet.recommendations;

    const byStatus: Record<string, number> = {
      pending: 0,
      'in-progress': 0,
      completed: 0,
      dismissed: 0,
    };

    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byCategory: Record<string, number> = {
      stock: 0,
      sales: 0,
      marketing: 0,
      production: 0,
      code: 0,
      uiux: 0,
      'cross-functional': 0,
    };

    let totalImpact = 0;
    let impactCount = 0;

    for (const rec of recs) {
      byStatus[rec.status]++;
      byPriority[rec.priority]++;
      byCategory[rec.category]++;

      if (rec.impact.financial) {
        totalImpact += rec.impact.financial;
        impactCount++;
      }
    }

    return {
      success: true,
      stats: {
        total: recs.length,
        byStatus,
        byPriority,
        byCategory,
        avgFinancialImpact: impactCount > 0 ? totalImpact / impactCount : 0,
        totalEstimatedImpact: totalImpact,
      }
    };
  } catch (error) {
    console.error('[getRecommendationStats] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Añade una acción de seguimiento a una recomendación
 */
export async function addRecommendationAction(
  setId: string,
  recommendationId: string,
  action: {
    type: 'comment' | 'progress_update' | 'status_change' | 'attachment';
    content: string;
    userId?: string;
    metadata?: any;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await db.collection('recommendation_actions').add({
      setId,
      recommendationId,
      ...action,
      timestamp: new Date(),
    });

    console.log(`[addRecommendationAction] Action added for ${recommendationId}`);

    return { success: true };
  } catch (error) {
    console.error('[addRecommendationAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene el historial de acciones de una recomendación
 */
export async function getRecommendationActions(
  recommendationId: string
): Promise<{
  success: boolean;
  actions: any[];
  error?: string;
}> {
  try {
    const snapshot = await db.collection('recommendation_actions')
      .where('recommendationId', '==', recommendationId)
      .orderBy('timestamp', 'desc')
      .get();

    const actions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, actions };
  } catch (error) {
    console.error('[getRecommendationActions] Error:', error);
    return {
      success: false,
      actions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
