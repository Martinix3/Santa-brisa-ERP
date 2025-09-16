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
import type { Interaction, OrderSellOut, EventMarketing, Product, Account, SantaData, InventoryItem } from '@/domain/ssot';
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
    sku: z.string().optional().describe("The SKU of the product. If not specified, it will default to Santa Brisa's main product."),
    quantity: z.number().describe('The quantity of units or cases.'),
    unit: z.enum(['ud', 'caja']).describe("The unit of measure ('ud' for units/bottles or 'caja' for cases)."),
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

const santaBrainSystemPrompt = `Eres Santa Brain, el asistente de IA para el equipo de Santa Brisa. Tu tono es cercano, servicial y proactivo, como una secretaria eficiente y de buen humor.

Tu objetivo principal es ayudar a registrar información y realizar acciones rápidamente. Evita ser robótico.

Directrices de comunicación:
- En lugar de preguntar para confirmar cada detalle, resume la acción que vas a tomar y pide una simple confirmación. Por ejemplo: "Ok, apunto 5 cajas de Santa Brisa (SB-750) para Bar Roma. ¿Correcto?".
- Cuando creas una cuenta nueva, celébralo con entusiasmo. Ejemplo: "¡Bien! Parece que tenemos cliente nuevo. ¿Lo apunto a un distribuidor o es venta propia?".
- Sé proactivo. Después de un pedido, pregunta por PLV. Ejemplo: "¿Necesitan vasos o algo más?".
- Ofrece ayuda de forma casual. Ejemplo: "Ok, si necesitan cubiteras o quieres que busque algo sobre la cuenta, me dices.".
- No inventes información. Si no sabes algo, dilo claramente.

Contexto de negocio:
- El producto principal es "Santa Brisa" con SKU "SB-750". Si no se especifica otro producto, asume que se refieren a este.
- Tienes acceso a 'accounts' (clientes), 'products', 'orders', 'interactions', 'inventory' y 'mktEvents'. Al crear un pedido, busca en la lista de productos para usar el SKU correcto si el usuario menciona un nombre.
- Usa el inventario para comprobar si hay stock antes de confirmar un pedido.
- Si no encuentras una cuenta, crea una ficha mínima y pregunta si es "venta propia" o de "distribuidor" para asignarle el modo correcto.
- La fecha y hora actual es: ${new Date().toLocaleString('es-ES')}.

Capacidades:
- Registrar interacciones (visitas, llamadas...).
- Crear pedidos y sugerir PLV.
- Programar eventos de marketing.
- Crear y actualizar cuentas de clientes.
- Consultar inventario, historial de pedidos y agenda de eventos.`;


// =================================
//      MAIN RUNNER FUNCTION
// =================================

export type ChatContext = { 
    accounts: Account[], 
    products: Product[],
    orders: OrderSellOut[],
    interactions: Interaction[],
    inventory: InventoryItem[],
    mktEvents: EventMarketing[],
};

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

    const toolRequests = llmResponse.toolRequests;
    const newEntities: Partial<SantaData> = { interactions: [], ordersSellOut: [], mktEvents: [], accounts: [] };

    if (toolRequests.length > 0) {
        const toolResponses: any[] = [];
        const accountsCreatedInThisTurn: Account[] = [];

        // Execute all tool calls
        for (const toolRequest of toolRequests) {
            const tool = tools.find(t => t.name === toolRequest.name);
            if (!tool) {
                toolResponses.push({ toolResponse: { name: toolRequest.name, output: { success: false, error: 'Tool not found' } } });
                continue;
            }

            try {
                const output = await tool(toolRequest.input as any);
                toolResponses.push({ toolResponse: { name: toolRequest.name, output } });

                // If a tool call was successful, create the corresponding SSOT entity
                if (output.success) {
                    if (toolRequest.name === 'upsertAccount') {
                        const typedInput = toolRequest.input as z.infer<typeof UpsertAccountSchema>;
                        const newAccount: Account = {
                            ...typedInput,
                            id: output.accountId,
                            createdAt: new Date().toISOString(),
                            stage: typedInput.stage || 'POTENCIAL',
                            type: typedInput.type || 'HORECA',
                            mode: { mode: 'PROPIA_SB', ownerUserId: 'u_brain', biller: 'SB' },
                        };
                        newEntities.accounts?.push(newAccount);
                        accountsCreatedInThisTurn.push(newAccount);
                    } else {
                        // For other tools, find the account (newly created or existing)
                        const accountName = (toolRequest.input as any).accountName;
                        const account = accountsCreatedInThisTurn.find(a => a.name === accountName) || context.accounts.find(a => a.name === accountName);
                        
                        if (account) {
                            if (toolRequest.name === 'createInteraction') {
                                const typedInput = toolRequest.input as z.infer<typeof AddInteractionSchema>;
                                newEntities.interactions?.push({
                                    id: output.interactionId,
                                    accountId: account.id,
                                    userId: 'u_brain',
                                    kind: typedInput.kind,
                                    note: typedInput.note,
                                    createdAt: new Date().toISOString(),
                                    dept: 'VENTAS'
                                });
                            } else if (toolRequest.name === 'createOrder') {
                                const typedInput = toolRequest.input as z.infer<typeof CreateOrderSchema>;
                                newEntities.ordersSellOut?.push({
                                    id: output.orderId,
                                    accountId: account.id,
                                    userId: 'u_brain',
                                    status: 'open',
                                    createdAt: new Date().toISOString(),
                                    lines: typedInput.items.map(item => ({ 
                                        sku: item.sku || 'SB-750',
                                        qty: item.quantity,
                                        unit: item.unit || 'ud',
                                        priceUnit: 0,
                                    })),
                                    notes: typedInput.notes,
                                } as OrderSellOut);
                            }
                        }
                    }
                    if (toolRequest.name === 'scheduleUserEvent') {
                        const typedInput = toolRequest.input as z.infer<typeof ScheduleEventSchema>;
                        newEntities.mktEvents?.push({
                            id: output.eventId,
                            title: typedInput.title,
                            kind: typedInput.kind,
                            status: 'planned',
                            startAt: typedInput.startAt,
                            city: typedInput.location,
                        });
                    }
                }
            } catch (e: any) {
                toolResponses.push({ toolResponse: { name: toolRequest.name, output: { success: false, error: e.message } } });
            }
        }
        
        // Generate the final response based on tool execution
        const finalResponse = await ai.generate({
            model: gemini('gemini-2.5-flash'),
            system: santaBrainSystemPrompt,
            messages: [
                ...history,
                llmResponse.output(),
                { role: 'user', content: toolResponses },
            ],
            context: [
               { role: 'context', content: [{ text: `Contexto de negocio: ${JSON.stringify(context)}` }] },
            ],
          });
        return { finalAnswer: finalResponse.text, newEntities };
    }

    // If no tools were called, just return the text response
    return { finalAnswer: llmResponse.text, newEntities };
}
