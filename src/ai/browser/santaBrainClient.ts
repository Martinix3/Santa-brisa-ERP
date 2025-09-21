// Santa Brain — Modo Navegador (DEV)
// - Tool-calling con @google/genai (Gemini 2.5 Flash)
// - Firebase cliente para memoria y SSOT (accounts, orders, interactions, events)
// - Crea cuenta si no existe (ensure_account), interacciones, pedidos y eventos
// ⚠️ Para desarrollo. En producción mueve este bucle al servidor.

import { addDoc, collection, doc, getDoc, getDocs, limit as fbLimit, orderBy, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { ai } from '@/ai';
import { z } from 'zod';
import type { Message } from 'genkit';


// ==============================
// 0) Config y helpers
// ==============================
const MODEL = 'googleai/gemini-2.5-flash';

const nowIso = () => new Date().toISOString();
const norm = (s: string) =>
  (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '');

const calcAmount = (
  items: Array<{ sku: string; qty: number; unitPrice?: number; discountPct?: number }>
) =>
  items.reduce(
    (a, it) => a + it.qty * (it.unitPrice ?? 0) * (1 - (it.discountPct ?? 0) / 100),
    0
  );


// ==============================
// 2) TOOLS — Memoria (corto/largo plazo)
// ==============================
const fn_memory_upsert = ai.defineTool({
  name: 'memory_upsert',
  description: 'Guarda un mensaje o resumen del hilo (memoria conversacional).',
  inputSchema: z.object({
      userId: z.string(),
      threadId: z.string(),
      turn: z.number(),
      role: z.enum(['user', 'assistant']),
      text: z.string(),
      kind: z.enum(['message', 'summary']).optional(),
  }),
}, async (args) => {
  const { userId, threadId, ...rest } = args;
  await addDoc(collection(db, 'brain_memory', userId, 'threads', threadId, 'turns'), {
    ...rest,
    createdAt: nowIso(),
  });
  return { ok: true };
});

const fn_memory_get_context = ai.defineTool({
  name: 'memory_get_context',
  description: 'Recupera últimas N entradas del hilo y (si existe) el perfil del usuario.',
  inputSchema: z.object({
      userId: z.string(),
      threadId: z.string(),
      limit: z.number().optional(),
  }),
}, async (args) => {
  const { userId, threadId, limit = 12 } = args;
  const qTurns = query(
    collection(db, 'brain_memory', userId, 'threads', threadId, 'turns'),
    orderBy('createdAt', 'desc'),
    fbLimit(limit)
  );
  const snap = await getDocs(qTurns);
  const messages = snap.docs
    .map((d) => d.data() as any)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((d) => ({ role: d.role, text: d.text }));
  const prof = await getDoc(doc(db, 'brain_memory', userId));
  return { messages, profile: prof.exists() ? (prof.data() as any).profile : undefined };
});


const fn_memory_update_profile = ai.defineTool({
  name: 'memory_update_profile',
  description: 'Actualiza el perfil/resumen de largo plazo del usuario.',
  inputSchema: z.object({
    userId: z.string(),
    profile: z.string(),
  }),
}, async (args) => {
  const { userId, profile } = args;
  await setDoc(
    doc(db, 'brain_memory', userId),
    { profile, updatedAt: nowIso() },
    { merge: true } as any
  );
  return { ok: true };
});


// ==============================
// 3) TOOLS — Lectura SSOT
// ==============================
const fn_query_accounts = ai.defineTool({
  name: 'query_accounts',
  description: 'Busca cuentas por nombre/ciudad/contacto (búsqueda simple DEV).',
  inputSchema: z.object({ text: z.string().optional(), limit: z.number().optional() }),
}, async ({ text = '', limit = 20 }) => {
  const snap = await getDocs(query(collection(db, 'accounts'), fbLimit(400)));
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const t = text.toLowerCase();
  const results = t
    ? all.filter((a) =>
        [a.name, a.city, a.mainContactName, a.mainContactEmail]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(t)
      )
    : all;
  return { results: results.slice(0, limit) };
});

const fn_get_account_deep = ai.defineTool({
  name: 'get_account_deep',
  description: 'Devuelve cuenta + últimos pedidos/interacciones/eventos.',
  inputSchema: z.object({ accountId: z.string() }),
}, async ({ accountId }) => {
  const acc = await getDoc(doc(db, 'accounts', accountId));
  const ordersQ = query(
    collection(db, 'orders'),
    where('accountId', '==', accountId),
    orderBy('date', 'desc'),
    fbLimit(20)
  );
  const intsQ = query(
    collection(db, 'interactions'),
    where('accountId', '==', accountId),
    orderBy('when', 'desc'),
    fbLimit(50)
  );
  const evtsQ = query(
    collection(db, 'events'),
    where('accountId', '==', accountId),
    orderBy('startAt', 'desc'),
    fbLimit(30)
  );
  const [o, i, e] = await Promise.all([getDocs(ordersQ), getDocs(intsQ), getDocs(evtsQ)]);
  return {
    account: acc.exists() ? { id: acc.id, ...(acc.data() as any) } : null,
    orders: o.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    interactions: i.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    events: e.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
  };
});


// ==============================
// 4) TOOLS — Escritura SSOT
// ==============================
const fn_create_account = ai.defineTool({
  name: 'create_account',
  description: 'Crea una cuenta con campos mínimos (SSOT: accounts).',
  inputSchema: z.object({
      name: z.string(),
      city: z.string().optional(),
      accountType: z.enum(['CLIENTE_FINAL', 'DISTRIBUIDOR', 'IMPORTADOR', 'HORECA', 'RETAIL', 'OTRO']),
      accountStage: z.enum(['SEGUIMIENTO', 'FALLIDA', 'ACTIVA', 'POTENCIAL']),
      mainContactName: z.string().optional(),
      mainContactEmail: z.string().optional(),
      salesRepId: z.string().optional(),
  }),
}, async (args) => {
  const createdAt = nowIso();
  const docData = {
    name: args.name,
    nameNorm: norm(args.name),
    city: args.city ?? '',
    accountType: args.accountType,
    accountStage: args.accountStage,
    mainContactName: args.mainContactName ?? null,
    mainContactEmail: args.mainContactEmail ?? null,
    salesRepId: args.salesRepId ?? null,
    createdAt,
    updatedAt: createdAt,
  };
  const ref = await addDoc(collection(db, 'accounts'), docData);
  return { id: ref.id, ...docData };
});

const fn_ensure_account = ai.defineTool({
  name: 'ensure_account',
  description: 'Devuelve accountId. Busca por nombre/email y crea si no existe.',
  inputSchema: z.object({
      name: z.string(),
      city: z.string().optional(),
      mainContactEmail: z.string().optional(),
      defaultAccountType: z.enum(['CLIENTE_FINAL', 'HORECA', 'RETAIL', 'OTRO', 'DISTRIBUIDOR', 'IMPORTADOR']).optional(),
      defaultStage: z.enum(['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA']).optional(),
      salesRepId: z.string().optional(),
  }),
}, async (args) => {
  const needle = norm(args.name);
  const email = (args.mainContactEmail || '').toLowerCase();
  const snap = await getDocs(query(collection(db, 'accounts'), fbLimit(200)));
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const hit = all.find(
    (a) =>
      (email && a.mainContactEmail && a.mainContactEmail.toLowerCase() === email) ||
      (a.nameNorm && a.nameNorm === needle)
  );
  if (hit) return { id: hit.id, existed: true };
  const created = await fn_create_account(args as any);
  return { id: created.id, existed: false };
});


const fn_create_order = ai.defineTool({
  name: 'create_order',
  description: 'Crea un pedido en `orders`.',
  inputSchema: z.object({
      accountId: z.string(),
      distributorId: z.string().optional(),
      date: z.string().optional(),
      currency: z.enum(['EUR', 'USD']).optional(),
      items: z.array(z.object({ sku: z.string(), qty: z.number(), unitPrice: z.number().optional(), discountPct: z.number().optional()})),
      notes: z.string().optional(),
  }),
}, async (args) => {
  const createdAt = nowIso();
  const order = {
    accountId: args.accountId,
    distributorId: args.distributorId ?? null,
    date: args.date ?? createdAt,
    currency: args.currency ?? 'EUR',
    items: args.items,
    amount: calcAmount(args.items || []),
    notes: args.notes ?? null,
    status: 'ABIERTO',
    createdAt,
    updatedAt: createdAt,
  };
  const ref = await addDoc(collection(db, 'orders'), order);
  return { id: ref.id, amount: order.amount, currency: order.currency, createdAt };
});


const fn_create_interaction = ai.defineTool({
  name: 'create_interaction',
  description: 'Registra una interacción (VISITA, LLAMADA, EMAIL, WHATSAPP, OTRO).',
  inputSchema: z.object({
      accountId: z.string(),
      kind: z.string(),
      when: z.string().optional(),
      status: z.string().optional(),
      result: z.string().optional(),
      summary: z.string().optional(),
      nextAt: z.string().optional(),
      createdById: z.string().optional(),
  }),
}, async (args) => {
  const createdAt = nowIso();
  const docData = {
    accountId: args.accountId,
    kind: args.kind,
    when: args.when ?? createdAt,
    status: args.status ?? 'COMPLETADA',
    result: args.result ?? null,
    summary: args.summary ?? null,
    nextAt: args.nextAt ?? null,
    createdById: args.createdById ?? null,
    createdAt,
    updatedAt: createdAt,
  };
  const ref = await addDoc(collection(db, 'interactions'), docData);
  return { id: ref.id, status: docData.status, when: docData.when, createdAt };
});


const fn_create_event = ai.defineTool({
  name: 'create_event',
  description: 'Crea un evento (DEMO, FERIA, FORMACION, OTRO).',
  inputSchema: z.object({
      accountId: z.string().optional(),
      kind: z.string(),
      title: z.string(),
      startAt: z.string(),
      endAt: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
      createdById: z.string().optional(),
  }),
}, async (args) => {
  const createdAt = nowIso();
  const docData = {
    accountId: args.accountId ?? null,
    kind: args.kind,
    title: args.title,
    startAt: args.startAt,
    endAt: args.endAt ?? null,
    location: args.location ?? null,
    notes: args.notes ?? null,
    createdById: args.createdById ?? null,
    createdAt,
    updatedAt: createdAt,
  };
  const ref = await addDoc(collection(db, 'events'), docData);
  return { id: ref.id, title: docData.title, startAt: docData.startAt, createdAt };
});

// ==============================
// 5) Registro de tools y ejecutores
// ==============================
const functionDeclarations = [
  fn_memory_get_context,
  fn_memory_upsert,
  fn_memory_update_profile,
  fn_query_accounts,
  fn_get_account_deep,
  fn_create_account,
  fn_ensure_account,
  fn_create_order,
  fn_create_interaction,
  fn_create_event,
];

// ==============================
// 6) Orquestador — runSantaBrainInBrowser
// ==============================
export async function runSantaBrainInBrowser({
  userId,
  threadId,
  message,
  turn = Date.now(),
}: {
  userId: string;
  threadId: string;
  message: string;
  turn?: number;
}) {
  const system = `
Eres **Santa Brain** (modo navegador, DEV).
Estilo: cercano, claro y con un toque de gracia humana (emojis puntuales, sin excesos).
Siempre confirma con ✓ lo que hiciste, y usa bullets breves.
Si falta un dato clave (accountId/nombre, fecha, SKU o qty), pide justo lo necesario y sugiere un valor razonable.
Regla: si mencionan un local por nombre y no existe, usa "ensure_account" y luego crea interacción/pedido/evento.
Responde en el idioma del usuario.`;

  const history: Message[] = []; // En un futuro, podrías obtener esto de la memoria
  
  const llmResponse = await ai.generate({
    model: MODEL,
    tools: functionDeclarations,
    history,
    prompt: `userId=${userId} threadId=${threadId}\n${message}`,
    system: system,
  });

  const toolParts: any[] = [];
  const toolRequests = llmResponse.toolRequests;

  if (toolRequests) {
    for (const call of toolRequests) {
      const tool = functionDeclarations.find(t => t.name === call.name);
      if (!tool) throw new Error(`Tool desconocida: ${call.name}`);
      const out = await tool.fn(call.input as any);
      toolParts.push({
        toolResponse: {
          name: call.name,
          output: out,
        },
      });
    }
  }

  const finalResponse = llmResponse;
  const friendly = (finalResponse.text || '').replaceAll('**', '').trim();
  
  try {
    await fn_memory_upsert({ userId, threadId, turn, role: 'user', text: message });
    await fn_memory_upsert({ userId, threadId, turn: turn + 1, role: 'assistant', text: friendly, kind: 'summary' });
  } catch (e) {
    console.warn('[SantaBrain] memory save failed', e);
  }

  return { text: friendly, calls: toolRequests, toolResponses: toolParts };
}
