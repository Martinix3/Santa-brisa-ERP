'use server';
/**
 * @fileOverview Un flow de Genkit de utilidad para generar texto.
 *
 * - generateText - Una función genérica para obtener texto de un modelo de IA.
 */

import { ai } from '@/ai/genkit';
import { gemini } from '@genkit-ai/googleai';

export async function generateText(
  prompt: string,
  opts?: { model?: string }
): Promise<{ text: string; finishReason?: string; usage?: any }> {
  const response = await ai.generate({
    prompt: prompt,
    ...(opts?.model ? { model: gemini(opts.model) } : {}),
  });

  return {
    text: response.text ?? '',
    finishReason: response.finishReason,
    usage: response.usage,
  };
}
