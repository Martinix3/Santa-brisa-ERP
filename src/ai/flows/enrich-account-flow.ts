'use server';
/**
 * @fileOverview Un flow de Genkit que busca información pública sobre una cuenta
 * y la enriquece con detalles de negocio como subtipo, etiquetas, horarios, etc.
 *
 * - enrichAccount - La función principal que se puede llamar desde la UI.
 */

import { ai } from '@/ai/genkit';
import { 
  EnrichAccountInputSchema, 
  EnrichAccountOutputSchema,
  type EnrichAccountInput,
  type EnrichAccountOutput
} from '@/domain/schemas/enrich-account';


// Define el prompt que se enviará al modelo de IA.
const enrichAccountPrompt = ai.definePrompt({
  name: 'enrichAccountPrompt',
  input: { schema: EnrichAccountInputSchema },
  output: { schema: EnrichAccountOutputSchema },
  prompt: `
    Eres un analista de negocio experto para una marca de bebidas premium.
    Tu tarea es investigar un establecimiento (un bar, restaurante, hotel, etc.)
    y devolver información estructurada sobre él.

    Utiliza el nombre y la dirección proporcionados para encontrar información pública relevante.
    Si no encuentras información, intenta inferirla de la mejor manera posible.

    Establecimiento a investigar:
    - Nombre: {{{accountName}}}
    - Dirección: {{{address}}}
    - Ciudad: {{{city}}}

    Devuelve la información en el formato JSON especificado. Sé conciso y directo.
  `,
});


// Define el flujo de Genkit que orquesta el proceso.
const enrichAccountFlow = ai.defineFlow(
  {
    name: 'enrichAccountFlow',
    inputSchema: EnrichAccountInputSchema,
    outputSchema: EnrichAccountOutputSchema,
  },
  async (input) => {
    // Llama al prompt con los datos de entrada.
    const { output } = await enrichAccountPrompt(input);
    
    // El 'output' ya viene parseado y validado según el EnrichAccountOutputSchema.
    if (!output) {
      throw new Error('La IA no pudo generar una respuesta válida.');
    }
    
    return output;
  }
);


/**
 * Función exportada que el UI puede llamar para enriquecer una cuenta.
 * @param input Los detalles básicos de la cuenta.
 * @returns Una promesa que se resuelve con los datos enriquecidos.
 */
export async function enrichAccount(input: EnrichAccountInput): Promise<EnrichAccountOutput> {
  return enrichAccountFlow(input);
}
