// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Esta configuración simplificada confía en las credenciales por defecto del entorno (ADC),
// asegurando consistencia con el resto del backend.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});