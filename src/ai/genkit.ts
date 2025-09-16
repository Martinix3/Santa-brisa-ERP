// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI, gemini } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: gemini('gemini-2.5-flash'),
});
