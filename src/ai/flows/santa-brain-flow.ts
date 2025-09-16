
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
import type { Interaction, OrderSellOut, EventMarketing, Product, Account, SantaData } from '@/domain/schema';
import { generateNextOrder } from '@/lib/codes';
import { Part, Message, ToolRequestPart } from 'genkit';
import { gemini } from '@genkit-ai/googleai';

// =================================
//      HERRAMIENTAS (TOOLS)
// =================================

const createInteractionTool = ai.defineTool(
    {
        name: 'createInteraction',
        description: 'Registra una interacción con un cliente (visita, llamada, email, etc.).',
        inputSchema: z.object({
            accountName: z.string().describe('El nombre exacto de la cuenta del cliente.'),
            kind: z.enum(['VISITA', 'LLAMADA', 'EMAIL', 'WHATSAPP', 'OTRO']).describe('El tipo de interacción.'),
            note: z.string().describe('Un resumen de lo que se habló o sucedió en la interacción.'),
        }),
        outputSchema: z.object({
            interactionId: z.string(),
            success: z.boolean(),
        }),
    },
    async (input) => {
        // En una app real, esto interactuaría con la base de datos.
        // Aquí, simplemente devolvemos un ID de ejemplo.
        console.log(`Tool "createInteraction" called with:`, input);
        const interactionId = `int_brain_${Date.now()}`;
        return { interactionId, success: true };
    }
);

const createOrderTool = ai.defineTool(
    {
        name: 'createOrder',
        description: 'Crea un nuevo pedido para un cliente.',
        inputSchema: z.object({
            accountName: z.string().describe('El nombre exacto de la cuenta del cliente.'),
            items: z.array(z.object({
                sku: z.string().describe('El SKU del producto.'),
                quantity: z.number().describe('La cantidad de unidades o cajas.'),
                unit: z.enum(['ud', 'caja']).describe("La unidad de medida ('ud' o 'caja')."),
            })).describe('Una lista de los productos y cantidades del pedido.'),
            notes: z.string().optional().describe('Notas adicionales para el pedido.'),
        }),
        outputSchema: z.object({
            orderId: z.string(),
            success: z.boolean(),
        }),
    },
    async (input) => {
        console.log(`Tool "createOrder" called with:`, input);
        const orderId = `ord_brain_${Date.now()}`;
        return { orderId, success: true };
    }
);

const createEventTool = ai.defineTool(
    {
        name: 'createEvent',
        description: 'Programa un nuevo evento de marketing (demo, feria, etc.).',
        inputSchema: z.object({
            title: z.string().describe('El título del evento.'),
            kind: z.enum(['DEMO', 'FERIA', 'FORMACION', 'POPUP', 'OTRO']).describe('El tipo de evento.'),
            startAt: z.string().describe('La fecha y hora de inicio en formato ISO 8601.'),
            location: z.string().optional().describe('La ciudad o lugar del evento.'),
        }),
        outputSchema: z.object({
            eventId: z.string(),
            success: z.boolean(),
        }),
    },
    async (input) => {
        console.log(`Tool "createEvent" called with:`, input);
        const eventId = `evt_brain_${Date.now()}`;
        return { eventId, success: true };
    }
);


// =================================
//      PROMPT DEL ASISTENTE
// =================================

const santaBrainFlow = ai.definePrompt({
    name: 'santaBrainFlow',
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
        history: history,
        prompt: input,
        context: [
          { role: 'context', content: { accounts: context.accounts, products: context.products } as any },
        ],
        tools: [createInteractionTool, createOrderTool, createEventTool]
      });

    const toolRequests = llmResponse.toolRequests;
    const newEntities: Partial<SantaData> = { interactions: [], ordersSellOut: [], mktEvents: [] };

    if (toolRequests.length > 0) {
        const toolResponses: Part[] = [];

        for (const call of toolRequests) {
            const result = await call.run();
            toolResponses.push({ toolResponse: { name: call.name, output: result } });
            
            // Basado en la herramienta llamada, crea la entidad correspondiente
            if (call.name === 'createInteraction') {
                const account = context.accounts.find(a => a.name === call.input.accountName);
                if (account) {
                    const newInteraction: Interaction = {
                        id: result.interactionId,
                        accountId: account.id,
                        userId: 'u_brain', // Hardcoded for now
                        kind: call.input.kind,
                        note: call.input.note,
                        createdAt: new Date().toISOString(),
                        dept: 'VENTAS'
                    };
                    newEntities.interactions?.push(newInteraction);
                }
            } else if (call.name === 'createOrder') {
                const account = context.accounts.find(a => a.name === call.input.accountName);
                if (account) {
                     const newOrder: OrderSellOut = {
                        id: result.orderId,
                        accountId: account.id,
                        userId: 'u_brain',
                        status: 'open',
                        currency: 'EUR',
                        createdAt: new Date().toISOString(),
                        lines: call.input.items.map((item: any) => ({ ...item, priceUnit: 0, unit: 'ud' })), // Price would be set later
                        notes: call.input.notes,
                     };
                     newEntities.ordersSellOut?.push(newOrder);
                }
            } else if (call.name === 'createEvent') {
                const newEvent: EventMarketing = {
                    id: result.eventId,
                    title: call.input.title,
                    kind: call.input.kind,
                    status: 'planned',
                    startAt: call.input.startAt,
                    city: call.input.location,
                    goal: { sampling: 0, leads: 0, salesBoxes: 0 },
                    spend: 0,
                    plv: []
                };
                newEntities.mktEvents?.push(newEvent);
            }
        }
        
        const finalResponse = await ai.generate({
            model: gemini('gemini-2.5-flash'),
            history: [
              ...history,
              { role: 'user', content: input },
              { role: 'model', content: toolRequests as any },
              { role: 'user', content: toolResponses },
            ],
            context: [
              { role: 'context', content: { accounts: context.accounts, products: context.products } as any },
            ],
          });
        return { finalAnswer: finalResponse.text, newEntities };
    }

    return { finalAnswer: llmResponse.text, newEntities };
}
