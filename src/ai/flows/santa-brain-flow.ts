// src/ai/flows/santa-brain-flow.ts
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
import type { Message } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

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

type ToolReq = { name: string; input?: unknown };

function asToolReq(part: any): ToolReq | null {
  // Si viene como { toolRequest: {...} }
  if (part && typeof part === 'object' && 'toolRequest' in part) {
    const tr = (part as any).toolRequest;
    if (tr && typeof tr.name === 'string') return { name: tr.name, input: tr.input };
  }
  // Si ya viene plano { name, input }
  if (part && typeof part.name === 'string') {
    return { name: (part as any).name, input: (part as any).input };
  }
  return null;
}

function getToolCalls(llmResponse: any): any[] {
  return (
    llmResponse?.toolRequests ??
    llmResponse?.output?.toolRequests ??
    llmResponse?.candidates?.[0]?.content?.toolRequests ??
    llmResponse?.candidates?.[0]?.content?.parts ?? // a veces vienen como parts con toolRequest dentro
    []
  );
}

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
      }) as any,
      outputSchema: z.any() as any,
    },
    async (input) => ({
      id: `ord_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      currency: 'EUR',
      lines: input.items.map((item: any) => ({ ...item, uom: 'uds', priceUnit: 0 })),
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
      }) as any,
      outputSchema: z.any() as any,
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
      }) as any,
      outputSchema: z.any() as any,
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
    }) as any,
    outputSchema: z.object({
        finalAnswer: z.string(),
        newEntities: z.any(),
    }) as any,
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
            city: party?.addresses?.[0]?.city || '',
            ownerId: a.ownerId
        }
    });

    const llmResponse = await ai.generate({
      model: gemini15Flash,
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
    const finalAnswer = llmResponse.text;
    const toolCalls = getToolCalls(llmResponse);
    
    for (const part of toolCalls) {
        const tr = asToolReq(part);
        if (!tr) continue;
      
        const input = tr.input as any | undefined;
        const accountName = input?.accountName as string | undefined;

        const targetAccount = accounts.find(a => a.name.toLowerCase() === accountName?.toLowerCase());
        
        if (tr.name === 'createOrder' && targetAccount && input && typeof input === 'object') {
            const payload: Partial<OrderSellOut> = { 
                id: `ord_${Date.now()}`, 
                status: 'open',
                createdAt: new Date().toISOString(),
                currency: 'EUR',
                lines: (Array.isArray(input.items) ? input.items : []).map((item: any) => ({
                    ...item,
                    uom: 'uds',
                    priceUnit: Number(item?.priceUnit ?? 0),
                })),
                accountId: targetAccount.id,
                partyId: targetAccount.partyId,
                source: 'MANUAL',
                billingStatus: 'PENDING',
            };
            newEntities.ordersSellOut = [...(newEntities.ordersSellOut || []), payload as OrderSellOut];
        } else if (tr.name === 'createInteraction' && targetAccount && input && typeof input === 'object') {
            const payload = { 
                id: `int_${Date.now()}`,
                kind: 'OTRO',
                status: 'done',
                createdAt: new Date().toISOString(),
                accountId: targetAccount.id, 
                userId: 'u_admin', 
                ...input,
            };
            newEntities.interactions = [...(newEntities.interactions || []), payload as Interaction];
        } else if (tr.name === 'createAccount' && input && typeof input === 'object') {
            const inputData = input as any;
            const newParty: Party = {
                id: `party_${Date.now()}`,
                legalName: inputData.name,
                name: inputData.name,
                roles: ['CUSTOMER'],
                kind: 'ORG',
                addresses: inputData.city ? [{ type: 'main', city: inputData.city, street: '', country: 'España', postalCode: '' }] : [],
                contacts: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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

    