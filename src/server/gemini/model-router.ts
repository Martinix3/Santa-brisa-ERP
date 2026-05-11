/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Model Router - Cost-optimized model selection for Gemini AI
 * 
 * Filosofía: Usar el modelo más barato que resuelva la tarea
 */

export type ModelComplexity = 'simple' | 'medium' | 'complex';

export interface ModelConfig {
  model: string;
  costPer1M: number;
  maxTokens: number;
  description: string;
}

export const MODEL_CONFIG: Record<ModelComplexity, ModelConfig> = {
  simple: {
    model: 'gemini-2.0-flash-exp',  // Free tier durante preview
    costPer1M: 0.0,                  // Free durante preview (luego $0.075)
    maxTokens: 8192,
    description: 'Tareas básicas: clasificación, extracción, respuestas simples'
  },
  medium: {
    model: 'gemini-2.0-flash-exp',   // Mismo modelo, pero con más tokens
    costPer1M: 0.0,                   // Free durante preview (luego $0.30)
    maxTokens: 32768,
    description: 'Análisis, predicciones, recomendaciones'
  },
  complex: {
    model: 'gemini-1.5-pro-latest',   // Pro para razonamiento profundo
    costPer1M: 3.50,
    maxTokens: 2097152,
    description: 'Razonamiento profundo, optimización compleja'
  }
};

export interface AITask {
  type: 'classification' | 'prediction' | 'optimization' | 'analysis' | 'recommendation';
  dataPoints?: number;
  requiresReasoning?: boolean;
  description?: string;
}

/**
 * Selecciona el modelo óptimo basado en la tarea
 */
export function selectModel(task: AITask): ModelComplexity {
  // Clasificación simple → simple
  if (task.type === 'classification') {
    return 'simple';
  }
  
  // Optimización compleja → complex
  if (task.type === 'optimization' || task.requiresReasoning) {
    return 'complex';
  }
  
  // Predicción con pocos datos → medium
  if (task.type === 'prediction' && (task.dataPoints || 0) < 100) {
    return 'medium';
  }
  
  // Predicción con muchos datos → complex
  if (task.type === 'prediction' && (task.dataPoints || 0) >= 100) {
    return 'complex';
  }
  
  // Default: medium para análisis y recomendaciones
  return 'medium';
}

/**
 * Calcula el costo estimado de una llamada
 */
export function estimateCost(
  complexity: ModelComplexity,
  estimatedTokens: number
): number {
  const config = MODEL_CONFIG[complexity];
  return (estimatedTokens / 1_000_000) * config.costPer1M;
}

/**
 * Obtiene información del modelo seleccionado
 */
export function getModelInfo(complexity: ModelComplexity): ModelConfig {
  return MODEL_CONFIG[complexity];
}
