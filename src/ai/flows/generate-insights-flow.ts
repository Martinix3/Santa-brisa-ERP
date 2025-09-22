'use server';
/**
 * @fileoverview Flow to generate insights from a JSON object.
 *
 * - generateInsights(input) - Main entry point.
 */

import { ai } from '@/ai';
import type { GenerateInsightsInput } from '@/domain/schemas/generate-insights';
import { gemini15Flash } from '@genkit-ai/googleai';

export async function generateInsights(input: GenerateInsightsInput): Promise<string> {
  const { text } = await ai.generate({
    prompt: `
      Analyze the following JSON data and provide concise, actionable insights based on the provided context.
      Context: ${input.context || 'General business operations.'}
      Data:
      ${JSON.stringify(input.jsonData, null, 2)}

      Your response should be in Spanish, formatted as a brief, easy-to-read report using markdown.
      Focus on identifying patterns, risks, or opportunities. Be direct and avoid conversational fluff.
    `,
    model: gemini15Flash,
  });

  return text ?? 'No se pudo generar una respuesta de texto.';
}
