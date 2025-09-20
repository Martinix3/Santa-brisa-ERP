
'use server';
/**
 * @fileoverview Santa Brisa main conversational agent
 *
 * - runSantaBrain(history, input, context) - Main entry point.
 * - SantaBrainInput - The input type for the santaBrainFlow.
 * - SantaBrainOutput - The return type for the santaBrainFlow.
 */

import { ai } from '@/ai';
import { z } from 'genkit';
import { Message } from 'genkit';

import type {
  Account,
  Product,
  SantaData,
  OrderSellOut,
  Interaction,
  InventoryItem,
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

const registeredTools = [
  ai.defineTool(
    {
      name: 'createOrder',
      description: 'Creates a new sales order for an account.',
      inputSchema: CreateOrderSchema,
    },
    async (input) => ({
      ...input,
      id: `ord_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      currency: 'EUR',
      lines: input.items.map(item => ({ ...item, uom: 'uds', priceUnit: 0 })),
    })
  ),
  ai.defineTool(
    {
      name: 'createInteraction',
      description:
        'Logs a new interaction (like a visit or call) with an account.',
      inputSchema: CreateInteractionSchema,
    },
    async (input) => ({
      ...input,
      id: `int_${Date.now()}`,
      kind: 'OTRO',
      status: 'done',
      createdAt: new Date().toISOString(),
    })
  ),
  ai.defineTool(
    {
      name: 'createAccount',
      description: 'Creates a new account.',
      inputSchema: CreateAccountSchema,
    },
    async (input) => ({
      ...input,
      id: `acc_${Date.now()}`,
      stage: 'POTENCIAL',
      ownerId: 'u_admin', // Default owner, should be context-aware
      billerId: 'SB',
      createdAt: new Date().toISOString(),
    })
  ),
];

const systemPrompt = `You are Santa Brain, an AI assistant for the Santa Brisa operational CRM.
You are helpful, proactive, and an expert in sales and marketing operations.
Your goal is to understand the user's request and use the available tools to translate it into structured data.
If the user's intent is clear, call the appropriate tool.
If the user is asking a question, answer it based on your knowledge and the provided context data.
If the request is ambiguous, ask for clarification.
Always respond in Spanish.`;


const santaBrainFlow = ai.defineFlow(
  {
    name: 'santaBrainFlow',
    inputSchema: z.object({
        history: z.array(z.any()), // Use z.any() for history messages
        input: z.string(),
        context: z.any().optional(),
    }),
    outputSchema: z.object({
        finalAnswer: z.string(),
        newEntities: z.any(),
    }),
  },
  async ({ history, input, context }) => {
    const { users, accounts } = context as { users: User[], accounts: Account[] };

    const llmResponse = await ai.generate({
      prompt: input,
      history,
      system: systemPrompt,
      model: 'googleai/gemini-2.5-flash',
      tools: registeredTools,
      context: {
          users: users.map(u => ({id: u.id, name: u.name, role: u.role})),
          accounts: accounts.map(a => ({id: a.id, name: a.name, city: a.city})),
      },
    });

    const toolCalls = llmResponse.toolRequests ?? [];
    let finalAnswer = llmResponse.text;
    const newEntities: Partial<SantaData> = {};

    if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
            const toolResponse = await toolCall.run();
            const accountName = (toolCall.input as any)?.accountName;
            const targetAccount = accounts.find(a => a.name.toLowerCase() === accountName?.toLowerCase());
            
            if (targetAccount) {
                 if (toolCall.name === 'createOrder') {
                    const newOrder = { ...toolResponse, accountId: targetAccount.id };
                    newEntities.ordersSellOut = [...(newEntities.ordersSellOut || []), newOrder as OrderSellOut];
                    finalAnswer += `\nHecho. He creado un pedido para ${targetAccount.name}.`;
                 }
                 if (toolCall.name === 'createInteraction') {
                    const newInteraction = { ...toolResponse, accountId: targetAccount.id, userId: 'u_admin' }; // Placeholder user
                    newEntities.interactions = [...(newEntities.interactions || []), newInteraction as Interaction];
                    finalAnswer += `\nHecho. He registrado una interacción con ${targetAccount.name}.`;
                 }
            } else if (toolCall.name === 'createAccount') {
                newEntities.accounts = [...(newEntities.accounts || []), toolResponse as Account];
                finalAnswer += `\nHecho. He creado la cuenta ${toolResponse.name}.`;
            }
        }
    }

    return { finalAnswer, newEntities };
  }
);


export async function runSantaBrain(
  history: Message[],
  input: string,
  context: { users: User[], accounts: Account[] }
): Promise<{ finalAnswer: string; newEntities: Partial<SantaData> }> {
  
  const result = await santaBrainFlow({ history, input, context });
  return {
      finalAnswer: result.finalAnswer,
      newEntities: result.newEntities || {},
  }
}
