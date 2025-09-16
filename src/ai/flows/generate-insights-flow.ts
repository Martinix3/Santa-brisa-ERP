'use server';
/**
 * @fileOverview Un flow de Genkit que analiza datos del CRM y genera insights de negocio.
 * 
 * - generateInsights - La función principal que genera el informe.
 * - GenerateInsightsInput - El tipo de entrada para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { gemini } from '@genkit-ai/googleai';

// Define el esquema de entrada usando Zod.
const GenerateInsightsInputSchema = z.object({
  jsonData: z.string().describe('Un objeto JSON como string con los datos a analizar. Debe incluir usuarios, cuentas, pedidos e interacciones.'),
});
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

// Función exportada que el UI puede llamar
export async function generateInsights(input: GenerateInsightsInput): Promise<string> {
  return generateInsightsFlow(input);
}

// Define el flow de Genkit
const generateInsightsFlow = ai.defineFlow(
  {
    name: 'generateInsightsFlow',
    inputSchema: GenerateInsightsInputSchema,
    outputSchema: z.string().describe('Un informe en formato markdown con los insights de negocio.'),
  },
  async (input) => {

    const llmResponse = await ai.generate({
      prompt: `
        Eres un analista de negocio experto para una marca de bebidas llamada Santa Brisa.
        Tu tarea es analizar los siguientes datos del CRM (en formato JSON) y generar un informe conciso en formato markdown.

        El informe debe incluir:
        1.  **Observación Clave**: El insight más importante o sorprendente que encuentres.
        2.  **Rendimiento de Comerciales**: ¿Quién está funcionando mejor? ¿Quién necesita ayuda? Compara ventas, actividad y creación de nuevas cuentas.
        3.  **Cuentas Destacadas**: Identifica las cuentas con más ventas y las cuentas que no han pedido en mucho tiempo pero tenían actividad previa (cuentas en riesgo).
        4.  **Correlaciones**: ¿Hay alguna relación interesante entre el número de visitas/interacciones y el volumen de ventas por cuenta o comercial?
        5.  **Recomendación Rápida**: Basado en tu análisis, sugiere una acción concreta que el equipo de ventas podría tomar.

        Sé breve, claro y directo. Usa bullet points para facilitar la lectura.

        Aquí están los datos:
        \`\`\`json
        ${input.jsonData}
        \`\`\`
      `,
      model: gemini('gemini-2.5-flash'),
      config: { temperature: 0.3 },
    });

    return llmResponse.text;
  }
);
