import { z } from 'genkit/zod';

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
