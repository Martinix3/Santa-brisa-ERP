// Santa Brain — Modo Navegador (DEV)
// - Tool-calling con @google/genai (Gemini 2.5 Flash)
// - Firebase cliente para memoria y SSOT (accounts, orders, interactions, events)
// - Crea cuenta si no existe (ensure_account), interacciones, pedidos y eventos
// ⚠️ Para desarrollo. En producción mueve este bucle al servidor.

import { GoogleGenAI, FunctionCallingConfigMode, SchemaType } from '@google/genai';
import { addDoc, collection, doc, getDoc, getDocs, limit as fbLimit, orderBy, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// ==============================
// 0) Config y helpers
// ==============================
const MODEL = 'gemini-2.5-flash';
const genai = new GoogleGenAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!);

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
// 1) Schemas (validados en runtime por el modelo)
// ==============================
const OrderItemSchema = {
  type: SchemaType.OBJECT,
  properties: {
    sku: { type: SchemaType.STRING },
    qty: { type: SchemaType.NUMBER },
    unitPrice: { type: SchemaType.NUMBER },
    discountPct: { type: SchemaType.NUMBER },
  },
  required: ['sku', 'qty'],
};

// ==============================
// 2) TOOLS — Memoria (corto/largo plazo)
// ==============================
const fn_memory_upsert = {
  name: 'memory_upsert',
  description: 'Guarda un mensaje o resumen del hilo (memoria conversacional).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      userId: { type: SchemaType.STRING },
      threadId: { type: SchemaType.STRING },
      turn: { type: SchemaType.NUMBER },
      role: { type: SchemaType.STRING, enum: ['user', 'assistant'] },
      text: { type: SchemaType.STRING },
      kind: { type: SchemaType.STRING, enum: ['message', 'summary'] },
    },
    required: ['userId', 'threadId', 'turn', 'role', 'text'],
  },
};
async function exec_memory_upsert(args: any) {
  const { userId, threadId, ...rest } = args;
  await addDoc(collection(db, 'brain_memory', userId, 'threads', threadId, 'turns'), {
    ...rest,
    createdAt: nowIso(),
  });
  return { ok: true };
}

const fn_memory_get_context = {
  name: 'memory_get_context',
  description: 'Recupera últimas N entradas del hilo y (si existe) el perfil del usuario.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      userId: { type: SchemaType.STRING },
      threadId: { type: SchemaType.STRING },
      limit: { type: SchemaType.NUMBER },
    },
    required: ['userId', 'threadId'],
  },
};
async function exec_memory_get_context(args: any) {
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
}

const fn_memory_update_profile = {
  name: 'memory_update_profile',
  description: 'Actualiza el perfil/resumen de largo plazo del usuario.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      userId: { type: SchemaType.STRING },
      profile: { type: SchemaType.STRING },
    },
    required: ['userId', 'profile'],
  },
};
async function exec_memory_update_profile(args: any) {
  const { userId, profile } = args;
  await setDoc(
    doc(db, 'brain_memory', userId),
    { profile, updatedAt: nowIso() },
    { merge: true } as any
  );
  return { ok: true };
}

// ==============================
// 3) TOOLS — Lectura SSOT
// ==============================
const fn_query_accounts = {
  name: 'query_accounts',
  description: 'Busca cuentas por nombre/ciudad/contacto (búsqueda simple DEV).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { text: { type: SchemaType.STRING }, limit: { type: SchemaType.NUMBER } },
  },
};
async function exec_query_accounts({ text = '', limit = 20 }: any) {
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
}

const fn_get_account_deep = {
  name: 'get_account_deep',
  description: 'Devuelve cuenta + últimos pedidos/interacciones/eventos.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { accountId: { type: SchemaType.STRING } },
    required: ['accountId'],
  },
};
async function exec_get_account_deep({ accountId }: any) {
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
}

// ==============================
// 4) TOOLS — Escritura SSOT
// ==============================
// 4.1 Crear cuenta
const fn_create_account = {
  name: 'create_account',
  description: 'Crea una cuenta con campos mínimos (SSOT: accounts).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      city: { type: SchemaType.STRING },
      accountType: {
        type: SchemaType.STRING,
        enum: ['CLIENTE_FINAL', 'DISTRIBUIDOR', 'IMPORTADOR', 'HORECA', 'RETAIL', 'OTRO'],
      },
      accountStage: {
        type: SchemaType.STRING,
        enum: ['SEGUIMIENTO', 'FALLIDA', 'ACTIVA', 'POTENCIAL'],
      },
      mainContactName: { type: SchemaType.STRING },
      mainContactEmail: { type: SchemaType.STRING },
      salesRepId: { type: SchemaType.STRING },
    },
    required: ['name', 'accountType', 'accountStage'],
  },
};
async function exec_create_account(args: any) {
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
}

// 4.2 Asegurar cuenta (buscar por nombre/email y crear si no existe)
const fn_ensure_account = {
  name: 'ensure_account',
  description: 'Devuelve accountId. Busca por nombre/email y crea si no existe.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      city: { type: SchemaType.STRING },
      mainContactEmail: { type: SchemaType.STRING },
      defaultAccountType: {
        type: SchemaType.STRING,
        enum: ['CLIENTE_FINAL', 'HORECA', 'RETAIL', 'OTRO', 'DISTRIBUIDOR', 'IMPORTADOR'],
      },
      defaultStage: {
        type: SchemaType.STRING,
        enum: ['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'],
      },
      salesRepId: { type: SchemaType.STRING },
    },
    required: ['name'],
  },
};
async function exec_ensure_account(args: any) {
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
  const created = await exec_create_account({
    name: args.name,
    city: args.city ?? '',
    mainContactEmail: args.mainContactEmail ?? null,
    accountType: args.defaultAccountType ?? 'HORECA',
    accountStage: args.defaultStage ?? 'POTENCIAL',
    salesRepId: args.salesRepId ?? null,
  });
  return { id: created.id, existed: false };
}

// 4.3 Crear pedido
const fn_create_order = {
  name: 'create_order',
  description: 'Crea un pedido en `orders`.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      accountId: { type: SchemaType.STRING },
      distributorId: { type: SchemaType.STRING },
      date: { type: SchemaType.STRING },
      currency: { type: SchemaType.STRING, enum: ['EUR', 'USD'] },
      items: { type: SchemaType.ARRAY, items: OrderItemSchema },
      notes: { type: SchemaType.STRING },
    },
    required: ['accountId', 'items'],
  },
};
async function exec_create_order(args: any) {
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
}

// 4.4 Crear interacción
const fn_create_interaction = {
  name: 'create_interaction',
  description: 'Registra una interacción (VISITA, LLAMADA, EMAIL, WHATSAPP, OTRO).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      accountId: { type: SchemaType.STRING },
      kind: { type: SchemaType.STRING },
      when: { type: SchemaType.STRING },
      status: { type: SchemaType.STRING },
      result: { type: SchemaType.STRING },
      summary: { type: SchemaType.STRING },
      nextAt: { type: SchemaType.STRING },
      createdById: { type: SchemaType.STRING },
    },
    required: ['accountId', 'kind'],
  },
};
async function exec_create_interaction(args: any) {
  const createdAt = nowIso();
  const docData = {
    accountId: args.accountId,
    kind: args.kind, // usa tus enums en UI si quieres tipeo estricto
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
}

// 4.5 Crear evento
const fn_create_event = {
  name: 'create_event',
  description: 'Crea un evento (DEMO, FERIA, FORMACION, OTRO).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      accountId: { type: SchemaType.STRING },
      kind: { type: SchemaType.STRING },
      title: { type: SchemaType.STRING },
      startAt: { type: SchemaType.STRING },
      endAt: { type: SchemaType.STRING },
      location: { type: SchemaType.STRING },
      notes: { type: SchemaType.STRING },
      createdById: { type: SchemaType.STRING },
    },
    required: ['kind', 'title', 'startAt'],
  },
};
async function exec_create_event(args: any) {
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
}

// ==============================
// 5) Registro de tools y ejecutores
// ==============================
const functionDeclarations = [
  // Memoria
  fn_memory_get_context,
  fn_memory_upsert,
  fn_memory_update_profile,
  // Lectura
  fn_query_accounts,
  fn_get_account_deep,
  // Cuentas
  fn_create_account,
  fn_ensure_account,
  // Escritura
  fn_create_order,
  fn_create_interaction,
  fn_create_event,
];

const executors: Record<string, (args: any) => Promise<any>> = {
  memory_get_context: exec_memory_get_context,
  memory_upsert: exec_memory_upsert,
  memory_update_profile: exec_memory_update_profile,
  query_accounts: exec_query_accounts,
  get_account_deep: exec_get_account_deep,
  create_account: exec_create_account,
  ensure_account: exec_ensure_account,
  create_order: exec_create_order,
  create_interaction: exec_create_interaction,
  create_event: exec_create_event,
};

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

  // 1) Primer turno (el modelo decide si llama a tools)
  const cfg = {
    tools: [{ functionDeclarations }],
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
  };

  const chat = await genai.getGenerativeModel({ model: MODEL }).startChat(cfg);

  const result = await chat.sendMessage(message);

  const calls = result.response.functionCalls();
  const toolParts: any[] = [];
  if (calls) {
    for (const call of calls) {
      const exec = executors[call.name];
      if (!exec) throw new Error(`Tool desconocida: ${call.name}`);
      const out = await exec(call.args);
      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { name: call.name, content: out },
        },
      });
    }
  }


  // 3) Segunda vuelta con respuestas de tools (permitiendo posteriores llamadas si el modelo quiere)
  const secondResult = toolParts.length > 0 ? await chat.sendMessage(JSON.stringify(toolParts)) : result;

  // 4) Guardar memoria (tolerante a fallos)
  try {
    await exec_memory_upsert({ userId, threadId, turn, role: 'user', text: message });
    const short = (secondResult.response.text() || '').slice(0, 1000);
    await exec_memory_upsert({ userId, threadId, turn: turn + 1, role: 'assistant', text: short, kind: 'summary' });
  } catch (e) {
    console.warn('[SantaBrain] memory save failed', e);
  }

  // 5) Tono final pulido
  const friendly = (secondResult.response.text() || '').replaceAll('**', '').trim();
  return { text: friendly, calls, toolResponses: toolParts };
}
