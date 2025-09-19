'use server';
/**
 * @fileoverview Santa Brisa main conversational agent
 *
 * - runSantaBrain(history, input, context) - Main entry point.
 * - SantaBrainInput - The input type for the santaBrainFlow.
 * - SantaBrainOutput - The return type for the santaBrainFlow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Message } from 'genkit';

import type {
  Account,
  Product,
  SantaData,
  OrderSellOut,
  Interaction,
  InventoryItem,
  EventMarketing,
  User,
} from '@/domain/ssot';


// Helper para crear un Zod schema a partir de una lista de strings
const createEnumSchema = (values: string[]) => z.enum(values as [string, ...string[]]);

// Schemas para las herramientas
const CreateOrderSchema = z.object({
  accountName: z.string().describe('The name of the account for the order.'),
  items: z
    .array(z.object({ sku: z.string(), quantity: z.number() }))
    .describe('An array of items to include in the order.'),
});

const CreateInteractionSchema = z.object({
  accountName: z.string().describe('The name of the account for the interaction.'),
  note: z.string().describe('A summary of the interaction.'),
  nextAction: z
    .string()
    .optional()
    .describe('A brief note about the next follow-up action, if any.'),
});

const CreateAccountSchema = z.object({
  name: z.string().describe('The name of the new account.'),
  city: z.string().optional().describe('The city where the account is located.'),
  type: createEnumSchema(['HORECA', 'RETAIL', 'DISTRIBUIDOR', 'IMPORTADOR', 'OTRO']).optional(),
});

// Prompt principal
const santaBrainPrompt = ai.definePrompt({
  name: 'santaBrainPrompt',
  system: `You are Santa Brain, an AI assistant for the Santa Brisa operational CRM.
You are helpful, proactive, and an expert in sales and marketing operations.
Your goal is to understand the user's request and use the available tools to translate it into structured data.
If the user's intent is clear, call the appropriate tool.
If the user is asking a question, answer it based on your knowledge.
If the request is ambiguous, ask for clarification.
Always respond in Spanish.`,
  tools: [
    ai.defineTool(
      {
        name: 'createOrder',
        description: 'Creates a new sales order for an account.',
        inputSchema: CreateOrderSchema,
      },
      async (input) => input
    ),
    ai.defineTool(
      {
        name: 'createInteraction',
        description:
          'Logs a new interaction (like a visit or call) with an account.',
        inputSchema: CreateInteractionSchema,
      },
      async (input) => input
    ),
    ai.defineTool(
      {
        name: 'createAccount',
        description: 'Creates a new account.',
        inputSchema: CreateAccountSchema,
      },
      async (input) => input
    ),
  ],
});


const santaBrainFlow = ai.defineFlow(
  {
    name: 'santaBrainFlow',
    inputSchema: z.object({
        history: z.array(Message.schema()),
        input: z.string(),
    }),
    outputSchema: z.object({
        finalAnswer: z.string(),
        newEntities: z.any(),
    }),
  },
  async ({ history, input }) => {
    const llmResponse = await ai.generate({
      prompt: input,
      history,
      model: 'googleai/gemini-2.5-flash-preview',
      tools: santaBrainPrompt.config.tools,
    });

    const toolCalls = llmResponse.toolCalls();
    const newEntities: Partial<SantaData> = {};
    let finalAnswer = llmResponse.text();

    if (toolCalls.length > 0) {
        finalAnswer += '\n';
        for (const toolCall of toolCalls) {
            finalAnswer += `Hecho. He creado una entidad de tipo ${toolCall.name} en el sistema.`;
        }
    }

    return { finalAnswer, newEntities };
  }
);


export async function runSantaBrain(
  history: Message[],
  input: string,
): Promise<{ finalAnswer: string; newEntities: Partial<SantaData> }> {
  
  return await santaBrainFlow({ history, input });
}
