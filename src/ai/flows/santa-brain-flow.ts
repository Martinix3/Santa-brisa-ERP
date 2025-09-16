'use server';
/**
 * @fileOverview Santa Brain Core Assistant (V2).
 *
 * This file defines the central AI assistant for Santa Brisa. It includes:
 * - A set of tools for interacting with business data (Accounts, Orders, Interactions).
 * - A main runner function `runSantaBrain` that orchestrates the AI's responses and actions.
 * - Schemas for tool inputs and outputs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Interaction, OrderSellOut, EventMarketing, Product, Account, SantaData } from '@/domain/ssot';
import { generateNextOrder } from '@/lib/codes';
import { Message } from 'genkit';
import { gemini } from '@genkit-ai/googleai';

// =================================
//      TOOL SCHEMAS
// =================================

// Note: Schemas are defined inline with the tool definitions below.
const AddInteractionSchema = z.object({
  accountName: z.string().describe('The exact name of the customer account.'),
  kind: z.enum(['VISITA', 'LLAMADA', 'EMAIL', 'WHATSAPP', 'OTRO']).describe('The type of interaction.'),
  note: z.string().describe('A summary of what was discussed or what happened during the interaction.'),
});

const CreateOrderSchema = z.object({
  accountName: z.string().describe('The exact name of the customer account.'),
  items: z.array(z.object({
    sku: z.string().describe('The SKU of the product.'),
    quantity: z.number().describe('The quantity of units or cases.'),
    unit: z.enum(['ud', 'caja']).describe("The unit of measure ('ud' or 'caja')."),
  })).describe('A list of products and quantities for the order.'),
  notes: z.string().optional().describe('Additional notes for the order.'),
});

const ScheduleEventSchema = z.object({
  title: z.string().describe('The title of the event.'),
  kind: z.enum(['DEMO', 'FERIA', 'FORMACION', 'POPUP', 'OTRO']).describe('The type of event.'),
  startAt: z.string().describe('The start date and time in ISO 8601 format.'),
  location: z.string().optional().describe('The city or venue of the event.'),
});

const UpsertAccountSchema = z.object({
    id: z.string().optional().describe("The account's unique ID. If provided, the existing account will be updated. If not, a new one will be created."),
    name: z.string().describe("The account's name."),
    city: z.string().optional().describe("The city where the account is located."),
    type: z.enum(['HORECA', 'RETAIL', 'DISTRIBUIDOR', 'OTRO']).optional().describe("The account type."),
    stage: z.enum(['ACTIVA', 'SEGUIMIENTO', 'POTENCIAL', 'FALLIDA']).optional().describe("The current sales stage."),
    mainContactName: z.string().optional().describe("Name of the main contact person."),
    phone: z.string().optional().describe("The account's phone number."),
    notes: z.string().optional().describe("Qualitative notes or observations about the account."),
});


// =================================
//      TOOL DEFINITIONS
// =================================

const createInteractionTool = ai.defineTool(
    {
        name: 'createInteraction',
        description: 'Records an interaction with a customer (visit, call, email, etc.). Use this to log any contact with a client.',
        inputSchema: AddInteractionSchema,
        outputSchema: z.object({ success: z.boolean(), interactionId: z.string() }),
    },
    async (input) => {
        console.log(`Tool "createInteraction" called with:`, input);
        const interactionId = `int_brain_${Date.now()}`;
        return { success: true, interactionId };
    }
);

const createOrderTool = ai.defineTool(
    {
        name: 'createOrder',
        description: 'Creates a new sales order for a customer. Use this when a user confirms they want to place an order.',
        inputSchema: CreateOrderSchema,
        outputSchema: z.object({ success: z.boolean(), orderId: z.string() }),
    },
    async (input) => {
        console.log(`Tool "createOrder" called with:`, input);
        const orderId = `ord_brain_${Date.now()}`;
        return { success: true, orderId };
    }
);

const scheduleEventTool = ai.defineTool(
    {
        name: 'scheduleUserEvent',
        description: 'Schedules a new marketing event (demo, fair, etc.). Use this to put a new event on the calendar.',
        inputSchema: ScheduleEventSchema,
        outputSchema: z.object({ success: z.boolean(), eventId: z.string() }),
    },
    async (input) => {
        console.log(`Tool "scheduleEvent" called with:`, input);
        const eventId = `evt_brain_${Date.now()}`;
        return { success: true, eventId };
    }
);

const upsertAccountTool = ai.defineTool(
    {
        name: 'upsertAccount',
        description: 'Creates a new customer account or updates an existing one. Use this to add new clients or modify their details.',
        inputSchema: UpsertAccountSchema,
        outputSchema: z.object({ success: z.boolean(), accountId: z.string() }),
    },
    async (input) => {
        console.log(`Tool "upsertAccount" called with:`, input);
        const accountId = input.id || `acc_brain_${Date.now()}`;
        return { success: true, accountId };
    }
);


// =================================
//      ASSISTANT PROMPT
// =================================

const santaBrainSystemPrompt = `Eres Santa Brain, el asistente de IA experto para el equipo de Santa Brisa.
Tu objetivo es ayudarles a registrar información y realizar acciones de forma rápida y eficiente.
Eres amable, proactivo y siempre buscas aclarar la información si es necesario.
Cuando uses una herramienta, responde siempre con un mensaje de confirmación claro y conciso para el usuario.
No inventes información, si no sabes algo o no puedes hacer algo, dilo claramente.

El contexto de la aplicación incluye una lista de cuentas (clientes) y productos.
- Cuando el usuario mencione un cliente, busca la coincidencia exacta en la lista de cuentas proporcionada. Si no la encuentras o hay ambigüedad, pregunta al usuario para aclarar.
- La fecha y hora actual es: ${new Date().toLocaleString('es-ES')}.

Capacidades:
- Puedes registrar interacciones (visitas, llamadas...).
- Puedes crear pedidos.
- Puedes programar eventos de marketing.
- Puedes crear y actualizar cuentas de clientes.`;


// =================================
//      MAIN RUNNER FUNCTION
// =================================

type ChatContext = { accounts: Account[], products: Product[] };

export async function runSantaBrain(history: Message[], input: string, context: ChatContext): Promise<{ finalAnswer: string, newEntities: Partial<SantaData> }> {
    
    const tools = [createInteractionTool, createOrderTool, scheduleEventTool, upsertAccountTool];
    
    const llmResponse = await ai.generate({
        model: gemini('gemini-2.5-flash'),
        prompt: input,
        system: santaBrainSystemPrompt,
        messages: history,
        tools: tools,
        context: [
          { role: 'context', content: [{ text: `Contexto de negocio: ${JSON.stringify(context)}` } ] },
        ],
    });

    const toolRequests = llmResponse.toolRequests();
    const newEntities: Partial<SantaData> = { interactions: [], ordersSellOut: [], mktEvents: [], accounts: [] };

    if (toolRequests.length > 0) {
        const toolResponses = [];
        
        for (const call of toolRequests) {
            let result: any;
            const toolToRun = tools.find(t => t.name === call.toolRequest.name);
            
            if (toolToRun) {
                result = await toolToRun(call.toolRequest.input as any);
            } else {
                result = { success: false, error: `Tool ${call.toolRequest.name} not found.` };
            }

            toolResponses.push({ toolResponse: { name: call.toolRequest.name, output: result } });
            
            const typedInput = call.toolRequest.input as any;

            if (call.toolRequest.name === 'createInteraction' && result.success) {
                const account = context.accounts.find(a => a.name === typedInput.accountName);
                if (account) {
                    const newInteraction: Interaction = {
                        id: result.interactionId,
                        accountId: account.id,
                        userId: 'u_brain', // Hardcoded for now
                        kind: typedInput.kind,
                        note: typedInput.note,
                        createdAt: new Date().toISOString(),
                        dept: 'VENTAS'
                    };
                    newEntities.interactions?.push(newInteraction);
                }
            } else if (call.toolRequest.name === 'createOrder' && result.success) {
                const account = context.accounts.find(a => a.name === typedInput.accountName);
                if (account) {
                     const newOrder: OrderSellOut = {
                        id: result.orderId,
                        accountId: account.id,
                        userId: 'u_brain',
                        status: 'open',
                        currency: 'EUR',
                        createdAt: new Date().toISOString(),
                        lines: typedInput.items.map((item: any) => ({ ...item, priceUnit: 0, unit: item.unit || 'ud' })),
                        notes: typedInput.notes,
                     };
                     newEntities.ordersSellOut?.push(newOrder);
                }
            } else if (call.toolRequest.name === 'scheduleUserEvent' && result.success) {
                const newEvent: EventMarketing = {
                    id: result.eventId,
                    title: typedInput.title,
                    kind: typedInput.kind,
                    status: 'planned',
                    startAt: typedInput.startAt,
                    city: typedInput.location,
                };
                newEntities.mktEvents?.push(newEvent);
            } else if (call.toolRequest.name === 'upsertAccount' && result.success) {
                const newAccount: Account = {
                    ...typedInput,
                    id: result.accountId,
                    createdAt: new Date().toISOString(),
                    // Fill in defaults for required fields if they are missing
                    stage: typedInput.stage || 'POTENCIAL',
                    type: typedInput.type || 'HORECA',
                    mode: typedInput.mode || { mode: 'PROPIA_SB', ownerUserId: 'u_brain', biller: 'SB' },
                };
                newEntities.accounts?.push(newAccount);
            }
        }
        
        const finalResponse = await ai.generate({
            model: gemini('gemini-2.5-flash'),
            system: santaBrainSystemPrompt,
            messages: [
                ...history,
                llmResponse.output()!,
                { role: 'user', content: toolResponses },
            ],
            context: [
               { role: 'context', content: [{ text: `Contexto de negocio: ${JSON.stringify(context)}` }] },
            ],
          });
        return { finalAnswer: finalResponse.text, newEntities };
    }

    return { finalAnswer: llmResponse.text, newEntities };
}
