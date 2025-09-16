
'use server';
/**
 * @fileOverview Santa Brain, el asistente de IA para Santa Brisa.
 *
 * - runSantaBrain - La función principal que se puede llamar desde el chat.
 * - Define herramientas (tools) para que la IA pueda realizar acciones como
 *   crear pedidos, interacciones o eventos.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Interaction, OrderSellOut, EventMarketing, Product, Account, SantaData } from '@/domain/ssot';
import { generateNextOrder } from '@/lib/codes';
import { Part, Message } from 'genkit';
import { gemini } from '@genkit-ai/googleai';

// =================================
//      ESQUEMAS DE HERRAMIENTAS
// =================================

const AddInteractionInput = z.object({
  accountName: z.string().describe('El nombre exacto de la cuenta del cliente.'),
  kind: z.enum(['VISITA', 'LLAMADA', 'EMAIL', 'WHATSAPP', 'OTRO']).describe('El tipo de interacción.'),
  note: z.string().describe('Un resumen de lo que se habló o sucedió en la interacción.'),
});

const AddInteractionOutput = z.object({
  interactionId: z.string(),
  success: z.boolean(),
});

const CreateOrderInput = z.object({
  accountName: z.string().describe('El nombre exacto de la cuenta del cliente.'),
  items: z.array(z.object({
    sku: z.string().describe('El SKU del producto.'),
    quantity: z.number().describe('La cantidad de unidades o cajas.'),
    unit: z.enum(['ud', 'caja']).describe("La unidad de medida ('ud' o 'caja')."),
  })).describe('Una lista de los productos y cantidades del pedido.'),
  notes: z.string().optional().describe('Notas adicionales para el pedido.'),
});

const CreateOrderOutput = z.object({
  orderId: z.string(),
  success: z.boolean(),
});

const CreateEventInput = z.object({
  title: z.string().describe('El título del evento.'),
  kind: z.enum(['DEMO', 'FERIA', 'FORMACION', 'POPUP', 'OTRO']).describe('El tipo de evento.'),
  startAt: z.string().describe('La fecha y hora de inicio en formato ISO 8601.'),
  location: z.string().optional().describe('La ciudad o lugar del evento.'),
});

const CreateEventOutput = z.object({
  eventId: z.string(),
  success: z.boolean(),
});


// =================================
//      HERRAMIENTAS (TOOLS)
// =================================

const createInteractionTool = ai.defineTool(
    {
        name: 'createInteraction',
        description: 'Registra una interacción con un cliente (visita, llamada, email, etc.).',
        inputSchema: AddInteractionInput,
        outputSchema: AddInteractionOutput,
    },
    async (input: any) => {
        console.log(`Tool "createInteraction" called with:`, input);
        const interactionId = `int_brain_${Date.now()}`;
        return { interactionId, success: true };
    }
);

const createOrderTool = ai.defineTool(
    {
        name: 'createOrder',
        description: 'Crea un nuevo pedido para un cliente.',
        inputSchema: CreateOrderInput,
        outputSchema: CreateOrderOutput,
    },
    async (input: any) => {
        console.log(`Tool "createOrder" called with:`, input);
        const orderId = `ord_brain_${Date.now()}`;
        return { orderId, success: true };
    }
);

const createEventTool = ai.defineTool(
    {
        name: 'createEvent',
        description: 'Programa un nuevo evento de marketing (demo, feria, etc.).',
        inputSchema: CreateEventInput,
        outputSchema: CreateEventOutput,
    },
    async (input: any) => {
        console.log(`Tool "createEvent" called with:`, input);
        const eventId = `evt_brain_${Date.now()}`;
        return { eventId, success: true };
    }
);


// =================================
//      PROMPT DEL ASISTENTE
// =================================

const santaBrainPrompt = ai.definePrompt({
    name: 'santaBrainPrompt',
    system: `Eres Santa Brain, el asistente de IA experto para el equipo de Santa Brisa.
Tu objetivo es ayudarles a registrar información y realizar acciones de forma rápida y eficiente.
Eres amable, proactivo y siempre buscas aclarar la información si es necesario.
Cuando uses una herramienta, responde siempre con un mensaje de confirmación claro y conciso para el usuario.
No inventes información, si no sabes algo o no puedes hacer algo, dilo claramente.

El contexto de la aplicación incluye una lista de cuentas (clientes) y productos.
- Cuando el usuario mencione un cliente, busca la coincidencia exacta en la lista de cuentas proporcionada. Si no la encuentras, pregunta al usuario para aclarar.
- La fecha y hora actual es: ${new Date().toLocaleString('es-ES')}.

Capacidades:
- Puedes registrar interacciones (visitas, llamadas...).
- Puedes crear pedidos.
- Puedes programar eventos de marketing.`,
    tools: [createInteractionTool, createOrderTool, createEventTool],
});


// =================================
//      FUNCIÓN PRINCIPAL (RUNNER)
// =================================

type ChatContext = { accounts: Account[], products: Product[] };

export async function runSantaBrain(history: Message[], input: string, context: ChatContext): Promise<{ finalAnswer: string, newEntities: Partial<SantaData> }> {
    
    const llmResponse = await ai.generate({
        model: gemini('gemini-2.5-flash'),
        prompt: input,
        // history: history, // 'history' is not a valid option in this version's GenerateOptions.
        tools: [createInteractionTool, createOrderTool, createEventTool],
        messages: history,
        context: [
          { role: 'context', content: [{ text: `Contexto de negocio: ${JSON.stringify(context)}` } ] },
        ],
    });

    const toolRequests = llmResponse.toolRequests;
    const newEntities: Partial<SantaData> = { interactions: [], ordersSellOut: [], mktEvents: [] };

    if (toolRequests.length > 0) {
        const toolResponses: Part[] = [];
        
        type ToolCall = { toolRequest: { name: string; input?: unknown; ref?: string; } };

        for (const call of toolRequests) {
            const toolCall = call as ToolCall;
            let result: any;
            
            // Simular la ejecución de la herramienta
            if (toolCall.toolRequest.name === 'createInteraction') {
                result = await createInteractionTool(toolCall.toolRequest.input as any);
            } else if (toolCall.toolRequest.name === 'createOrder') {
                result = await createOrderTool(toolCall.toolRequest.input as any);
            } else if (toolCall.toolRequest.name === 'createEvent') {
                result = await createEventTool(toolCall.toolRequest.input as any);
            }

            toolResponses.push({ toolResponse: { name: toolCall.toolRequest.name, output: result } });
            
            const typedInput = toolCall.toolRequest.input as any;

            if (toolCall.toolRequest.name === 'createInteraction') {
                const account = context.accounts.find(a => a.name === typedInput.accountName);
                if (account) {
                    const newInteraction: Interaction = {
                        id: (result as any).interactionId,
                        accountId: account.id,
                        userId: 'u_brain', // Hardcoded for now
                        kind: typedInput.kind,
                        note: typedInput.note,
                        createdAt: new Date().toISOString(),
                        dept: 'VENTAS'
                    };
                    newEntities.interactions?.push(newInteraction);
                }
            } else if (toolCall.toolRequest.name === 'createOrder') {
                const account = context.accounts.find(a => a.name === typedInput.accountName);
                if (account) {
                     const newOrder: OrderSellOut = {
                        id: (result as any).orderId,
                        accountId: account.id,
                        userId: 'u_brain',
                        status: 'open',
                        currency: 'EUR',
                        createdAt: new Date().toISOString(),
                        lines: typedInput.items.map((item: any) => ({ ...item, priceUnit: 0, unit: 'ud' })), // Price would be set later
                        notes: typedInput.notes,
                     };
                     newEntities.ordersSellOut?.push(newOrder);
                }
            } else if (toolCall.toolRequest.name === 'createEvent') {
                const newEvent: EventMarketing = {
                    id: (result as any).eventId,
                    title: typedInput.title,
                    kind: typedInput.kind,
                    status: 'planned',
                    startAt: typedInput.startAt,
                    city: typedInput.location,
                };
                newEntities.mktEvents?.push(newEvent);
            }
        }
        
        const finalResponse = await ai.generate({
            model: gemini('gemini-2.5-flash'),
            // history: [
            //   ...history,
            //   { role: 'user', content: [{ text: input }] },
            //   { role: 'model', content: llmResponse.output()?.content.parts || [] },
            //   { role: 'user', content: toolResponses },
            // ],
            messages: [
                ...history,
                { role: 'user', content: [{ text: input }] },
                llmResponse.output()!,
                { role: 'user', content: toolResponses, },
            ],
            context: [
               { role: 'context', content: { text: `Contexto de negocio: ${JSON.stringify(context)}` } },
            ],
          });
        return { finalAnswer: finalResponse.text, newEntities };
    }

    return { finalAnswer: llmResponse.text, newEntities };
}
