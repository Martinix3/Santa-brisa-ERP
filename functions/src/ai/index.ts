// src/ai/index.ts
import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

configureGenkit({
  plugins: [
    googleAI({
      // Pasa las versiones de API explícitamente si es necesario
      // apiVersion: 'v1' o 'v1beta'
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ai = genkit;
