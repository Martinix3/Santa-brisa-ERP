'use server';
/**
 * @fileoverview Flow to enrich an account with public data using AI.
 */
import { ai } from '@/ai';
import {
  EnrichAccountInput,
  EnrichAccountInputSchema,
  EnrichAccountOutput,
  EnrichAccountOutputSchema
} from '@/domain/schemas/enrich-account';

const enrichAccountPrompt = ai.definePrompt({
  name: 'enrichAccountPrompt',
  input: { schema: EnrichAccountInputSchema },
  output: { schema: EnrichAccountOutputSchema },
  prompt: `
    You are an expert business analyst. Your task is to research a business based on its name and location and return structured data about it.
    Analyze the following business and provide the requested information in the specified JSON format.
    If you cannot find certain information, make a reasonable guess or leave optional fields empty.

    Business Name: {{{accountName}}}
    {{#if address}}Address: {{{address}}}{{/if}}
    {{#if city}}City: {{{city}}}{{/if}}
  `,
});

export async function enrichAccount(input: EnrichAccountInput): Promise<EnrichAccountOutput> {
  const { output } = await enrichAccountPrompt(input);
  if (!output) {
    throw new Error('Failed to get a structured response from the model.');
  }
  return output;
}
