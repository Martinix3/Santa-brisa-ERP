/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Gemini Client - Cliente centralizado para interactuar con Google Gemini AI
 * 
 * Features:
 * - Cost tracking automático
 * - Model routing basado en complejidad
 * - Rate limiting
 * - Error handling robusto
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODEL_CONFIG, type ModelComplexity } from './model-router';
import { adminDb as db } from '@/server/firebase';

export interface GenerateOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[GeminiClient] GEMINI_API_KEY not configured, using mock mode');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Genera contenido usando Gemini con el modelo apropiado
   */
  async generate(
    prompt: string,
    context: any,
    complexity: ModelComplexity = 'medium',
    options: GenerateOptions = {}
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Mock mode si no hay API key
      if (!this.apiKey) {
        return this.mockGenerate(prompt, context, complexity);
      }

      const config = MODEL_CONFIG[complexity];
      const model = this.genAI.getGenerativeModel({
        model: config.model,
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens || config.maxTokens,
          temperature: options.temperature ?? 0.7,
          topP: options.topP ?? 0.9,
          topK: options.topK ?? 40
        }
      });

      const fullPrompt = this.buildPrompt(prompt, context);
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      // Log usage for cost tracking
      const latencyMs = Date.now() - startTime;
      await this.logUsage(complexity, response.usageMetadata, latencyMs);

      return text;
    } catch (error) {
      console.error('[GeminiClient] Error:', error);

      // Fallback to mock if API fails
      if (error instanceof Error && error.message.includes('API key')) {
        console.warn('[GeminiClient] API error, falling back to mock');
        return this.mockGenerate(prompt, context, complexity);
      }

      throw error;
    }
  }

  /**
   * Genera contenido estructurado en JSON
   */
  async generateJSON<T = any>(
    prompt: string,
    context: any,
    complexity: ModelComplexity = 'medium'
  ): Promise<T> {
    const response = await this.generate(prompt, context, complexity);

    try {
      // Intentar parsear JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Si no tiene markdown, intentar parsear directo
      return JSON.parse(response);
    } catch (error) {
      console.error('[GeminiClient] JSON parse error:', error);
      console.error('[GeminiClient] Response:', response);
      throw new Error('Failed to parse JSON response from Gemini');
    }
  }

  /**
   * Construye el prompt completo con contexto
   */
  private buildPrompt(prompt: string, context: any): string {
    return `
${prompt}

Contexto:
${JSON.stringify(context, null, 2)}

IMPORTANTE: Responde SOLO con JSON estructurado válido. No incluyas markdown ni explicaciones adicionales.
    `.trim();
  }

  /**
   * Mock generation para desarrollo sin API key
   */
  private async mockGenerate(
    prompt: string,
    context: any,
    complexity: ModelComplexity
  ): Promise<string> {
    console.log('[GeminiClient MOCK] Generate:', {
      complexity,
      promptLength: prompt.length,
      contextKeys: Object.keys(context)
    });

    // Simular latencia
    await new Promise(resolve => setTimeout(resolve, 500));

    // Respuesta mock genérica
    const mockResponse = {
      recommendations: [
        {
          action: 'MONITOR',
          priority: 'medium',
          reason: 'Mock recommendation - Configure GEMINI_API_KEY for real insights',
          suggestedQty: 100,
          estimatedCost: 0
        }
      ],
      insights: [
        'Mock insight 1 - This is a placeholder response',
        'Mock insight 2 - Add GEMINI_API_KEY to .env.local for real AI analysis'
      ],
      confidence: 75,
      trend: 'stable'
    };

    return JSON.stringify(mockResponse, null, 2);
  }

  /**
   * Registra el uso de la API para tracking de costos
   */
  private async logUsage(
    complexity: ModelComplexity,
    metadata: any,
    latencyMs: number
  ): Promise<void> {
    try {
      const config = MODEL_CONFIG[complexity];
      const promptTokens = metadata?.promptTokenCount || 0;
      const completionTokens = metadata?.candidatesTokenCount || 0;
      const totalTokens = metadata?.totalTokenCount || promptTokens + completionTokens;

      const cost = this.calculateCost(complexity, totalTokens);

      await db.collection('gemini_usage').add({
        model: config.model,
        complexity,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: cost,
        latencyMs,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0], // Para agregación diaria
      });

      console.log(`[GeminiClient] Usage logged: ${totalTokens} tokens, $${cost.toFixed(4)}, ${latencyMs}ms`);
    } catch (error) {
      console.error('[GeminiClient] Failed to log usage:', error);
      // No throw - logging es best-effort
    }
  }

  /**
   * Calcula el costo de una llamada
   */
  private calculateCost(complexity: ModelComplexity, tokens: number): number {
    const costPer1M = MODEL_CONFIG[complexity].costPer1M;
    return (tokens / 1_000_000) * costPer1M;
  }

  /**
   * Obtiene estadísticas de uso
   */
  async getUsageStats(startDate: string, endDate: string): Promise<{
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    byComplexity: Record<ModelComplexity, { calls: number; cost: number }>;
    avgLatency: number;
  }> {
    const usageSnap = await db.collection('gemini_usage')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    let totalCalls = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    const byComplexity: Record<string, { calls: number; cost: number }> = {
      simple: { calls: 0, cost: 0 },
      medium: { calls: 0, cost: 0 },
      complex: { calls: 0, cost: 0 }
    };

    usageSnap.forEach(doc => {
      const data = doc.data();
      totalCalls++;
      totalTokens += data.totalTokens || 0;
      totalCost += data.estimatedCost || 0;
      totalLatency += data.latencyMs || 0;

      const complexity = data.complexity || 'medium';
      if (byComplexity[complexity]) {
        byComplexity[complexity].calls++;
        byComplexity[complexity].cost += data.estimatedCost || 0;
      }
    });

    return {
      totalCalls,
      totalTokens,
      totalCost,
      byComplexity: byComplexity as Record<ModelComplexity, { calls: number; cost: number }>,
      avgLatency: totalCalls > 0 ? totalLatency / totalCalls : 0
    };
  }
}

// Singleton instance
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = new GeminiClient();
  }
  return geminiClientInstance;
}
