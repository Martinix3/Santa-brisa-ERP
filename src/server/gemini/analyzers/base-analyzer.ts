/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Base Analyzer - Clase abstracta para todos los analizadores de IA
 * 
 * Provee funcionalidad común:
 * - Cliente Gemini compartido
 * - Helpers para cálculos
 * - Estructura consistente
 */

import { getGeminiClient } from '../gemini-client';
import type { ModelComplexity } from '../model-router';
import { adminDb as db } from '@/server/firebase';

export interface AnalysisResult {
  id: string;
  type: string;
  entityId: string;
  entityName?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Recommendation {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseAnalyzer {
  protected geminiClient = getGeminiClient();
  protected complexity: ModelComplexity = 'medium';
  abstract name: string;

  /**
   * Método principal de análisis - debe ser implementado por cada analizador
   */
  abstract analyze(entityId: string, config?: any): Promise<AnalysisResult>;

  /**
   * Genera recomendaciones basadas en el análisis
   */
  abstract getRecommendations(analysis: AnalysisResult): Promise<Recommendation[]>;

  /**
   * Llama a Gemini para obtener insights
   */
  protected async callGemini(prompt: string, context: any, complexity?: ModelComplexity): Promise<string> {
    return this.geminiClient.generate(prompt, context, complexity || this.complexity);
  }

  /**
   * Llama a Gemini y parsea respuesta JSON
   */
  protected async callGeminiJSON<T = any>(
    prompt: string,
    context: any,
    complexity?: ModelComplexity
  ): Promise<T> {
    return this.geminiClient.generateJSON<T>(prompt, context, complexity || this.complexity);
  }

  /**
   * Devuelve la configuración del analizador
   */
  public async getConfig(): Promise<any> {
    // Por defecto, devuelve la complejidad. Las subclases pueden extender esto.
    return {
      complexity: this.complexity,
    };
  }

  /**
   * Actualiza la configuración del analizador
   */
  public async updateConfig(newConfig: any): Promise<void> {
    // Por defecto, solo actualiza la complejidad. Las subclases pueden extender esto.
    if (newConfig.complexity) {
      this.complexity = newConfig.complexity;
    }
  }

  /**
   * Helpers comunes para queries
   */

  protected async getDocument(collection: string, id: string): Promise<any | null> {
    try {
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`[BaseAnalyzer] Error getting document ${collection}/${id}:`, error);
      return null;
    }
  }

  protected async queryCollection(
    collection: string,
    filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: any }>
  ): Promise<any[]> {
    try {
      let query: FirebaseFirestore.Query = db.collection(collection);

      for (const filter of filters) {
        query = query.where(filter.field, filter.op, filter.value);
      }

      const snap = await query.get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`[BaseAnalyzer] Error querying collection ${collection}:`, error);
      return [];
    }
  }

  /**
   * Helpers matemáticos
   */

  protected calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v: any) => sum + v, 0) / values.length;
  }

  protected calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  protected calculateGrowth(values: number[]): number {
    if (values.length < 2) return 0;
    const recent = values[values.length - 1];
    const old = values[0];
    if (old === 0) return recent > 0 ? 100 : 0;
    return ((recent - old) / old) * 100;
  }

  protected calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (values.length < 2) return 'stable';

    const recent = this.calculateAverage(values.slice(-3));
    const older = this.calculateAverage(values.slice(0, -3));

    if (recent > older * 1.1) return 'increasing';
    if (recent < older * 0.9) return 'decreasing';
    return 'stable';
  }

  /**
   * Helpers de tiempo
   */

  protected getDaysAgo(date: string): number {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  protected getDateRange(daysBack: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - daysBack);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  /**
   * Guarda el análisis en Firestore
   */
  protected async saveAnalysis(
    type: string,
    entityId: string,
    analysis: any
  ): Promise<string> {
    const doc = await db.collection('ai_analyses').add({
      type,
      entityId,
      analysis,
      createdAt: new Date().toISOString(),
      complexity: this.complexity
    });

    return doc.id;
  }
}
