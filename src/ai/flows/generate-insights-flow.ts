'use server';
/**
 * @fileoverview Flow to generate insights from a JSON object.
 *
 * - generateInsights(input) - Main entry point.
 * - GenerateInsightsInput - The input type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GenerateInsightsInputSchema = z.object({
  jsonData: z.string().describe('A stringified JSON object containing the data to analyze.'),
  context: z.string().optional().describe('Contextual information about the data or the user question to guide the analysis.'),
});
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

export async function generateInsights(input: GenerateInsightsInput): Promise<string> {
  const llmResponse = await ai.generate({
    prompt: `
      Analyze the following JSON data and provide concise, actionable insights based on the provided context.
      Context: ${input.context || 'General business operations.'}
      Data:
      ${input.jsonData}

      Your response should be in Spanish, formatted as a brief, easy-to-read report using markdown.
      Focus on identifying patterns, risks, or opportunities. Be direct and avoid conversational fluff.
    `,
    model: 'googleai/gemini-2.5-flash-preview',
  });

  return llmResponse.text();
}
