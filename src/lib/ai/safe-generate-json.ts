/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/lib/ai/safe-generate-json.ts
// ============================================================================
// SAFE GENERATE JSON - Utilidad robusta para llamadas a Gemini
// ============================================================================
// Características:
// - Validación estricta con Zod
// - Retry automático con repair
// - Timeout configurable
// - Extracción de JSON desde respuestas con ruido
// - Temperatura fija y límites de tokens
// ============================================================================

import { z } from 'zod';

export type GenLevel = 'simple' | 'medium' | 'detailed';

/**
 * Genera JSON de forma segura con validación Zod y retry automático
 */
export async function safeGenerateJSON<T>(
  genFn: (prompt: string, opts?: Record<string, any>, level?: GenLevel) => Promise<string | T>,
  prompt: string,
  schema: z.ZodSchema<T>,
  options: {
    retries?: number;
    level?: GenLevel;
    timeoutMs?: number;
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<T> {
  const {
    retries = 2,
    level = 'medium',
    timeoutMs = 15000,
    temperature = 0.2,
    maxOutputTokens = 1024,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let lastError: any;
  let currentPrompt = prompt;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Llamar a Gemini con configuración optimizada
      const raw = await genFn(
        currentPrompt,
        {
          signal: controller.signal,
          temperature,
          maxOutputTokens,
        },
        level
      );

      // Convertir a string si es necesario
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);

      // Extraer JSON del texto (por si viene con markdown u otro ruido)
      const jsonText = extractFirstJsonObject(text);

      // Parsear y validar
      const parsed = JSON.parse(jsonText);
      const validated = schema.parse(parsed);

      clearTimeout(timeout);
      return validated;

    } catch (error: any) {
      lastError = error;
      console.warn(`[safeGenerateJSON] Attempt ${attempt + 1}/${retries + 1} failed:`, error.message);

      // En el siguiente intento, forzar al modelo a devolver SOLO JSON
      if (attempt < retries) {
        currentPrompt = enforceJsonOnlyPrompt(currentPrompt);
      }
    }
  }

  clearTimeout(timeout);

  // Si todos los intentos fallaron, devolver objeto vacío validado por el schema
  console.error('[safeGenerateJSON] All attempts failed, returning default:', lastError);
  try {
    return schema.parse({});
  } catch {
    throw lastError;
  }
}

/**
 * Extrae el primer objeto JSON válido de un string
 */
function extractFirstJsonObject(text: string): string {
  // Eliminar bloques de markdown si existen
  const withoutMarkdown = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Buscar el primer { y el último }
  const start = withoutMarkdown.indexOf('{');
  const end = withoutMarkdown.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No se encontró un objeto JSON válido en la respuesta');
  }

  return withoutMarkdown.slice(start, end + 1);
}

/**
 * Refuerza el prompt para que el modelo devuelva SOLO JSON
 */
function enforceJsonOnlyPrompt(originalPrompt: string): string {
  return `${originalPrompt}

⚠️ CRÍTICO - INSTRUCCIONES ESTRICTAS:
- Responde EXCLUSIVAMENTE con JSON válido
- NO incluyas markdown, comentarios, ni texto adicional
- NO uses bloques de código (\`\`\`json)
- Si tienes dudas, devuelve un objeto vacío {}
- Formato exacto del JSON requerido arriba
`;
}

/**
 * Normaliza fecha a ISO string corto (YYYY-MM-DD)
 */
export function toIsoShort(date?: string | Date): string {
  if (!date) return 'N/A';
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return 'N/A';
  }
}

/**
 * Redacta información PII básica (emails y teléfonos)
 */
export function redactPII(text?: string): string {
  if (!text) return '';

  return text
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[email]')
    .replace(/\+?\d[\d\s-]{6,}\b/g, '[tel]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[card]');
}
