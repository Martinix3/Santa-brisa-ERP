
'use server';
/**
 * @fileoverview Santa Brisa main conversational agent
 *
 * - runSantaBrain(history, input, context) - Main entry point.
 * - SantaBrainInput - The input type for the santaBrainFlow.
 * - SantaBrainOutput - The return type for the santaBrainFlow.
 */

import { ai } from '@/ai';
import { z } from 'zod';
import type { Message, ToolRequest } from 'genkit';

import type {
  Account,
  Party,
  Product,
  SantaData,
  OrderSellOut,
  Interaction,
  InventoryItem,
  User,
} from '@/domain/ssot';


// Helper para crear un Zod schema a partir de una lista de strings
const createEnumSchema = (values: string[]) => z.enum(values as [string, ...string[]]);

const registeredTools = [
  ai.defineTool(
    {
      name: 'createOrder',
      description: 'Creates a new sales order for an account.',
      inputSchema: z.object({
        accountName: z.string().describe('The name of the account for the order.'),
        items: z
          .array(z.object({ sku: z.string(), quantity: z.number() }))
          .describe('An array of items to include in the order. If the user mentions "botellas" or "bottles" without specifying a product, assume the SKU is "SB-750".'),
      }),
      
    },
    async (input) => ({
      id: `ord_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      currency: 'EUR',
      lines: input.items.map(item => ({ ...item, uom: 'uds', priceUnit: 0 })),
      ...input,
    })
  ),
  ai.defineTool(
    {
      name: 'createInteraction',
      description:
        'Logs a new interaction (like a visit or call) with an account.',
      inputSchema: z.object({
        accountName: z.string().describe('The name of the account for the interaction.'),
        note: z.string().describe('A summary of the interaction.'),
        nextAction: z
          .string()
          .optional()
          .describe('A brief note about the next follow-up action, if any.'),
      }),
    },
    async (input) => ({
      id: `int_${Date.now()}`,
      kind: 'OTRO',
      status: 'done',
      createdAt: new Date().toISOString(),
      ...input,
    })
  ),
  ai.defineTool(
    {
      name: 'createAccount',
      description: 'Creates a new account.',
      inputSchema: z.object({
        name: z.string().describe('The name of the new account.'),
        city: z.string().optional().describe('The city where the account is located.'),
        type: createEnumSchema(['HORECA', 'RETAIL', 'OTRO']).optional(),
      }),
    },
    async (input) => ({
      id: `acc_${Date.now()}`,
      stage: 'POTENCIAL',
      ownerId: 'u_admin', // Default owner, should be context-aware
      createdAt: new Date().toISOString(),
      ...input,
    })
  ),
];

const systemPrompt = `You are Santa Brain, an AI assistant for the Santa Brisa operational CRM.
You are helpful, proactive, and an expert in sales and marketing operations. Your goal is to be a true partner to the sales team.
Always respond in Spanish.

Your main tasks are to understand user requests and use tools to translate them into structured data, or to answer questions based on provided context.

**Key Behavioral Guidelines:**

1.  **Be Proactive & Conversational:** Don't just execute. Confirm, clarify, and ask relevant follow-up questions. For example, after creating an order, ask about promotions or marketing materials.
2.  **Smart Defaults:**
    *   When a user asks for "botellas" or "bottles" without specifying a product, **always assume they mean "Santa Brisa 750ml" which has the SKU "SB-750"**.

3.  **Intelligent Account Matching for Orders:**
    *   The user will provide their name in the context (e.g., "I am Marta"). Use this to be more precise.
    *   When a user wants to create an order (e.g., "pedido de 6 botellas para terraza sol"), first search for accounts with similar names that belong to the current user.
    *   If you find a close match (e.g., "Bar Terraza Sol" for "terrasa sol"), **do not create the order immediately**. First, ask for confirmation: "¿Quieres que apunte 6 botellas de Santabrisa 750 a Bar Terraza Sol de Barcelona?".
    *   If the user confirms ("si", "exacto", "correcto"), then use the 'createOrder' tool.
    *   If no close match is found in the current user's accounts, check if a similar name exists under another user and suggest it as a possibility.
    *   If no matches are found anywhere, suggest creating a new account for the name provided.

4.  **Tool Usage:**
    *   If the user's intent is clear and confirmed, call the appropriate tool.
    *   If the request is ambiguous, ask for clarification before using any tool.
    *   When a tool call is successful, confirm the action to the user (e.g., "Hecho. He creado un pedido para...").`;


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
    const { users, accounts, parties, currentUser } = context as { users: User[], accounts: Account[], parties: Party[], currentUser: User };
    
    const augmentedInput = `I am ${currentUser.name}. The user's request is: "${input}"`;
    
    const partyMap = new Map(parties.map(p => ([p.id, p])));
    const accountsWithContext = accounts.map(a => {
        const party = partyMap.get(a.partyId);
        return {
            id: a.id,
            name: a.name,
            city: party?.addresses[0]?.city || '',
            ownerId: a.ownerId
        }
    });

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      tools: registeredTools,
      messages: [
        { role: 'system', content: [{ text: systemPrompt }] },
        ...history,
        { role: 'user', content: [{ text: augmentedInput }] },
      ],
      context: {
          currentUser: {id: currentUser.id, name: currentUser.name, role: currentUser.role},
          users: users.map(u => ({id: u.id, name: u.name, role: u.role})),
          accounts: accountsWithContext,
      },
    });

    const newEntities: Partial<SantaData> = {};
    const finalAnswer = llmResponse.text ?? '';
    const toolCalls = llmResponse.candidates[0]?.toolCalls;
    
    if (toolCalls) {
      for (const toolCall of toolCalls) {
        const toolRequest = toolCall.toolRequest;
        const accountName = (toolRequest.input as any)?.accountName;
        const targetAccount = accounts.find(a => a.name.toLowerCase() === accountName?.toLowerCase());
        
        if (toolRequest.name === 'createOrder' && targetAccount && typeof toolRequest.input === 'object' && toolRequest.input !== null) {
            const newOrder = { 
                id: `ord_${Date.now()}`, 
                status: 'open',
                createdAt: new Date().toISOString(),
                currency: 'EUR',
                lines: (toolRequest.input as any).items.map((item: any) => ({ ...item, uom: 'uds', priceUnit: 0 })),
                accountId: targetAccount.id,
                ...(toolRequest.input as object),
            };
            newEntities.ordersSellOut = [...(newEntities.ordersSellOut || []), newOrder as OrderSellOut];
        } else if (toolRequest.name === 'createInteraction' && targetAccount && typeof toolRequest.input === 'object' && toolRequest.input !== null) {
            const newInteraction = { 
                id: `int_${Date.now()}`,
                kind: 'OTRO',
                status: 'done',
                createdAt: new Date().toISOString(),
                accountId: targetAccount.id, 
                userId: 'u_admin', 
                ...(toolRequest.input as object),
            };
            newEntities.interactions = [...(newEntities.interactions || []), newInteraction as Interaction];
        } else if (toolRequest.name === 'createAccount' && typeof toolRequest.input === 'object' && toolRequest.input !== null) {
            const inputData = toolRequest.input as any;
            const newParty: Party = {
                id: `party_${Date.now()}`,
                name: inputData.name,
                kind: 'ORG',
                addresses: inputData.city ? [{ type: 'main', city: inputData.city, street: '', country: 'España', postalCode: '' }] : [],
                contacts: [],
                createdAt: new Date().toISOString(),
            };
            const newAccount: Account = {
                id: `acc_${Date.now()}`,
                partyId: newParty.id,
                stage: 'POTENCIAL',
                ownerId: currentUser.id,
                createdAt: new Date().toISOString(),
                name: inputData.name,
                type: inputData.type || 'HORECA',
            };
            
            newEntities.parties = [...(newEntities.parties || []), newParty];
            newEntities.accounts = [...(newEntities.accounts || []), newAccount];
        }
      }
    }


    return { finalAnswer, newEntities };
  }
);


export async function runSantaBrain(
  history: Message[],
  input: string,
  context: { users: User[], accounts: Account[], parties: Party[], currentUser: User }
): Promise<{ finalAnswer: string; newEntities: Partial<SantaData> }> {
  
  const result = await santaBrainFlow({ history, input, context });
  return {
      finalAnswer: result.finalAnswer,
      newEntities: result.newEntities || {},
  }
}
