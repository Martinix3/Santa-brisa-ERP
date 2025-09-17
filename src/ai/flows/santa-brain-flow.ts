'use server';
/**
 * @fileOverview Santa Brain Core Assistant (V2).
 *
 * Define el asistente central de IA para Santa Brisa:
 * - Tools para interactuar con los datos de negocio (Accounts, Orders, Interactions, Events).
 * - Función principal `runSantaBrain` que orquesta respuestas y acciones.
 * - Schemas para entradas/salidas de tools.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type {
  Interaction,
  OrderSellOut,
  EventMarketing,
  Product,
  Account,
  SantaData,
  InventoryItem,
} from '@/domain/ssot';
import type { Message } from 'genkit';
import { gemini } from '@genkit-ai/googleai';
import {
  AddInteractionSchema,
  CreateOrderSchema,
  ScheduleEventSchema,
  UpsertAccountSchema,
} from '@/ai/flows/schemas';

// ===============================
// Helpers / Tipos
// ===============================
type ToolOutput =
  | { success: boolean; interactionId: string }
  | { success: boolean; orderId: string }
  | { success: boolean; eventId: string }
  | { success: boolean; accountId: string };

type ToolCall = { name: string; input?: unknown; ref?: string };

type ToolRequestPart = {
  toolRequest: { name: string; input?: unknown; ref?: string };
  [k: string]: unknown;
};

function isToolRequestPart(part: any): part is ToolRequestPart {
  return !!part && typeof part === 'object' && 'toolRequest' in part && !!part.toolRequest?.name;
}

// ===============================
// Tools
// ===============================
const createInteractionTool = ai.defineTool(
  {
    name: 'createInteraction',
    description:
      'Registra una interacción con un cliente (visita, llamada, email, etc.). Úsalo para anotar cualquier contacto.',
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
    description:
      'Crea un nuevo pedido de venta para un cliente. Úsalo cuando el usuario confirme que quiere pedir.',
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
    description:
      'Agenda un nuevo evento de marketing (demo, feria, etc.). Úsalo para ponerlo en calendario.',
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
    description:
      'Crea una cuenta de cliente o actualiza una existente. Úsalo para dar de alta o modificar datos.',
    inputSchema: UpsertAccountSchema,
    outputSchema: z.object({ success: z.boolean(), accountId: z.string() }),
  },
  async (input) => {
    console.log(`Tool "upsertAccount" called with:`, input);
    const accountId = (input as any).id || `acc_brain_${Date.now()}`;
    return { success: true, accountId };
  }
);

// ===============================
// System Prompt
// ===============================
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

// ===============================
// Runner
// ===============================
export type ChatContext = {
  accounts: Account[];
  products: Product[];
  orders: OrderSellOut[];
  interactions: Interaction[];
  inventory: InventoryItem[];
  mktEvents: EventMarketing[];
};

export async function runSantaBrain(
  history: Message[],
  input: string,
  context: ChatContext
): Promise<{ finalAnswer: string; newEntities: Partial<SantaData> }> {
  const tools = [createInteractionTool, createOrderTool, scheduleEventTool, upsertAccountTool];

  const llmResponse = await ai.generate({
    model: gemini('gemini-2.5-flash'),
    prompt: input,
    system: santaBrainSystemPrompt,
    messages: history,
    tools,
    context: [{ role: 'context', content: [{ text: `Contexto de negocio: ${JSON.stringify(context)}` }] }],
  });

  const newEntities: Partial<SantaData> = {
    interactions: [],
    ordersSellOut: [],
    mktEvents: [],
    accounts: [],
  };

  const toolResponses: Array<{ toolResponse: { name: string; output: any } }> = [];

  // ✅ Convierte desde parts → ToolCall[], con guarda de tipo
  const toolRequests: ToolCall[] = (llmResponse.toolRequests ?? [])
    .filter(isToolRequestPart)
    .map((p) => p.toolRequest);

  if (toolRequests.length > 0) {
    const accountsCreatedInThisTurn: Account[] = [];

    for (const toolRequest of toolRequests) {
      const tool = tools.find((t) => t.name === toolRequest.name);
      if (!tool) {
        toolResponses.push({
          toolResponse: { name: toolRequest.name, output: { success: false, error: 'Tool not found' } },
        });
        continue;
      }

      try {
        const output = (await tool(toolRequest.input as any)) as ToolOutput;
        toolResponses.push({ toolResponse: { name: toolRequest.name, output } });

        if (output.success) {
          switch (toolRequest.name) {
            case 'upsertAccount': {
              const typedInput = UpsertAccountSchema.parse(toolRequest.input);
              const { accountId } = output as Extract<ToolOutput, { accountId: string }>;
              const newAccount: Account = {
                ...typedInput,
                id: accountId,
                createdAt: new Date().toISOString(),
                stage: typedInput.stage || 'POTENCIAL',
                type: typedInput.type || 'HORECA',
                mode: { mode: 'PROPIA_SB', ownerUserId: 'u_brain', biller: 'SB' },
              };
              newEntities.accounts!.push(newAccount);
              accountsCreatedInThisTurn.push(newAccount);
              break;
            }
            case 'createInteraction': {
              const typedInput = AddInteractionSchema.parse(toolRequest.input);
              const { interactionId } = output as Extract<ToolOutput, { interactionId: string }>;
              const account =
                accountsCreatedInThisTurn.find((a) => a.name === typedInput.accountName) ??
                context.accounts.find((a) => a.name === typedInput.accountName);
              if (account) {
                newEntities.interactions!.push({
                  id: interactionId,
                  accountId: account.id,
                  userId: 'u_brain',
                  kind: typedInput.kind,
                  note: typedInput.note,
                  createdAt: new Date().toISOString(),
                  dept: 'VENTAS',
                });
              }
              break;
            }
            case 'createOrder': {
              const typedInput = CreateOrderSchema.parse(toolRequest.input);
              const { orderId } = output as Extract<ToolOutput, { orderId: string }>;
              const account =
                accountsCreatedInThisTurn.find((a) => a.name === typedInput.accountName) ??
                context.accounts.find((a) => a.name === typedInput.accountName);
              if (account) {
                newEntities.ordersSellOut!.push({
                  id: orderId,
                  accountId: account.id,
                  userId: 'u_brain',
                  status: 'open',
                  createdAt: new Date().toISOString(),
                  lines: typedInput.items.map((item) => ({
                    sku: item.sku || 'SB-750',
                    qty: item.quantity,
                    unit: item.unit || 'ud',
                    priceUnit: 0,
                  })),
                  biller: 'SB',
                } as OrderSellOut);
              }
              break;
            }
            case 'scheduleUserEvent': {
              const typedInput = ScheduleEventSchema.parse(toolRequest.input);
              const { eventId } = output as Extract<ToolOutput, { eventId: string }>;
              newEntities.mktEvents!.push({
                id: eventId,
                title: typedInput.title,
                kind: typedInput.kind,
                status: 'planned',
                startAt: typedInput.startAt,
                city: typedInput.location,
              });
              break;
            }
            default:
              break;
          }
        }
      } catch (e: any) {
        toolResponses.push({
          toolResponse: { name: toolRequest.name, output: { success: false, error: String(e?.message ?? e) } },
        });
      }
    }

    const finalResponse = await ai.generate({
      model: gemini('gemini-2.5-flash'),
      system: santaBrainSystemPrompt,
      messages: [...history, llmResponse.output(), { role: 'user', content: toolResponses }],
      context: [{ role: 'context', content: [{ text: `Contexto de negocio: ${JSON.stringify(context)}` }] }],
    });

    return { finalAnswer: finalResponse.text, newEntities };
  }

  return { finalAnswer: llmResponse.text, newEntities };
}
