
import { generate } from '@genkit-ai/ai';
import { gemini25Flash } from '@genkit-ai/googleai';

import {
  memory_get_context, memory_upsert, memory_update_profile,
  query_accounts, get_account_deep, list_collection,
  create_account, ensure_account, create_order, create_interaction, create_event
} from './tools.js';

const SYSTEM_PROMPT = `
Eres **Santa Brain**, asistente del CRM Santa Brisa.
Estilo: cercano, claro y con un toque de gracia humana (emojis discretos).
Funciones:
- Memoria conversacional y perfil (memory_*).
- Leer SSOT (accounts, orders, interactions, events, products, ...).
- Crear cuentas (si no existen), interacciones, pedidos y eventos.
Reglas:
- Si mencionan un local por nombre y no existe, usa "ensure_account".
- Valida datos mínimos antes de escribir y pide lo que falte.
- Responde en el idioma del usuario.
`;

export async function santaBrainRun({
  userId, threadId, message
}: { userId: string; threadId: string; message: string }) {
  const res = await generate({
    model: gemini25Flash,
    system: SYSTEM_PROMPT,
    prompt: [
      `# Contexto
userId: ${userId}
threadId: ${threadId}

# Instrucciones
1) Llama a memory_get_context para cargar el hilo/perfil.
2) Si se menciona un sitio sin accountId, usa ensure_account.
3) Crea interacción/pedido/evento según corresponda.
4) Resume el turno y guarda con memory_upsert (summary).
`,
      `# Mensaje de usuario\n${message}`
    ].join('\n'),
    tools: [
      memory_get_context, memory_upsert, memory_update_profile,
      query_accounts, get_account_deep, list_collection,
      create_account, ensure_account,
      create_order, create_interaction, create_event
    ],
    returnToolRequests: true
  });

  return { text: res.text(), toolRequests: res.toolRequests };
}
