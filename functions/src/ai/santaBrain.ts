import { ai } from './registry';
import { generate } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/googleai';
import { defineTool, generate } from '@genkit-ai/ai';
import {
  memory_get_context, memory_upsert, memory_update_profile,
  query_accounts, get_account_deep, list_collection,
  create_account, ensure_account, create_order, create_interaction, create_event,
  get_upcoming_agenda, get_accounts_overview
} from './tools.js';

const SYSTEM_PROMPT = `
Eres **Santa Brain**, asistente del CRM Santa Brisa.
Estilo: cercano, claro y con un toque de gracia humana (emojis discretos).
Funciones:
- Memoria conversacional y perfil (memory_*).
- Leer SSOT (accounts, orders, interactions, events, products, ...).
- Crear cuentas (si no existen), interacciones, pedidos y eventos.
- **Consultar agenda** (get_upcoming_agenda) y **hacer overview de cuentas** (get_accounts_overview).
Reglas:
- Si mencionan un local por nombre y no existe, usa "ensure_account".
- Valida datos mínimos antes de escribir y pide lo que falte.
- Responde en el idioma del usuario.
`;

export async function santaBrainRun({
  userId, threadId, message
}: { userId: string; threadId: string; message: string }) {
  const res = await generate(ai, {
    model: gemini15Flash,
    system: SYSTEM_PROMPT,
    prompt: [
      `# Contexto
userId: ${userId}
threadId: ${threadId}

# Sugerencias de uso
- Si el usuario pide "qué hay esta semana", llama a get_upcoming_agenda.
- Si pide "dime cuentas dormidas/pendientes", llama a get_accounts_overview (ajusta dormantDays).
- Para registrar acciones, usa ensure_account → create_interaction / create_order / create_event.
- Resume y guarda memoria con memory_upsert (summary).
`,
      `# Mensaje de usuario\n${message}`
    ].join('\n'),
    tools: [
      // Memoria
      memory_get_context, memory_upsert, memory_update_profile,
      // Lectura SSOT
      query_accounts, get_account_deep, list_collection,
      // Agenda / Cuentas
      get_upcoming_agenda, get_accounts_overview,
      // Escritura
      create_account, ensure_account,
      create_order, create_interaction, create_event
    ],
    output: {
      format: 'toolRequest',
    }
  });

  return { text: res.text, toolRequests: res.toolRequests };
}
