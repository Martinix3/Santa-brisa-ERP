'use server';
/**
 * @fileOverview Un flow de Genkit que busca información pública sobre una cuenta
 * y la enriquece con detalles de negocio como subtipo, etiquetas, horarios, etc.
 *
 * - enrichAccount - La función principal que se puede llamar desde la UI.
 * - EnrichAccountInput - El tipo de entrada para la función.
 * - EnrichAccountOutput - El tipo de retorno de la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define el esquema de entrada para el flujo de enriquecimiento.
export const EnrichAccountInputSchema = z.object({
  accountName: z.string().describe('El nombre del negocio o cuenta a investigar.'),
  address: z.string().optional().describe('La dirección física de la cuenta, si se conoce.'),
  city: z.string().optional().describe('La ciudad de la cuenta.'),
});
export type EnrichAccountInput = z.infer<typeof EnrichAccountInputSchema>;

// Define el esquema de salida que esperamos del modelo de IA.
export const EnrichAccountOutputSchema = z.object({
  subType: z.string().describe('Una subcategoría específica del negocio. Ej: "Restaurante de tapas", "Bar de copas", "Hotel con terraza".'),
  tags: z.array(z.string()).describe('Una lista de 2 a 5 etiquetas descriptivas en español. Ej: ["música en vivo", "vistas al mar", "popular en verano"].'),
  notes: z.string().describe('Un breve resumen cualitativo del negocio, su ambiente y su clientela.'),
  openingHours: z.string().describe('El horario de apertura del negocio en un formato legible para humanos. Ej: "L-J: 18:00-02:00, V-S: 18:00-03:00, D: Cerrado".'),
  deliveryInstructions: z.string().optional().describe('Posibles instrucciones o dificultades para la entrega. Ej: "Entrada por calle peatonal, descargar antes de las 11:00h".'),
});
export type EnrichAccountOutput = z.infer<typeof EnrichAccountOutputSchema>;


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
