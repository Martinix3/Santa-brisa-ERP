import { z } from 'zod';

export const GenerateInsightsInputSchema = z.object({
  jsonData: z.string().describe('A stringified JSON object containing the data to analyze.'),
  context: z.string().optional().describe('Contextual information about the data or the user question to guide the analysis.'),
});
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;
