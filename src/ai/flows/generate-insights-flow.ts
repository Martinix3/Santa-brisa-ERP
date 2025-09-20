'use server';
/**
 * @fileoverview Flow to generate insights from a JSON object.
 *
 * - generateInsights(input) - Main entry point.
 */

import { ai } from '@/ai';
import { GenerateInsightsInput } from '@/domain/schemas/generate-insights';

export async function generateInsights(input: GenerateInsightsInput): Promise<string> {
  const {output} = await ai.generate({
    prompt: `
      Analyze the following JSON data and provide concise, actionable insights based on the provided context.
      Context: ${input.context || 'General business operations.'}
      Data:
      ${input.jsonData}

      Your response should be in Spanish, formatted as a brief, easy-to-read report using markdown.
      Focus on identifying patterns, risks, or opportunities. Be direct and avoid conversational fluff.
    `,
    model: 'googleai/gemini-2.5-flash',
  });

  return output as string;
}
