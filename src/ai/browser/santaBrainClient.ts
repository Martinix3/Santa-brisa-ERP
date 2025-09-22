// Santa Brain — Modo Navegador (DEV)
// - Tool-calling con @google/genai (Gemini 2.5 Flash)
// - Firebase cliente para memoria y SSOT (accounts, orders, interactions, events)
// - Crea cuenta si no existe (ensure_account), interacciones, pedidos y eventos
// ⚠️ Para desarrollo. En producción mueve este bucle al servidor.

import { GoogleGenerativeAI, FunctionCallingMode } from "@google/generative-ai";
import type { Part, EnhancedGenerateContentResponse } from "@google/generative-ai";
import { addDoc, collection, doc, getDoc, getDocs, limit as fbLimit, orderBy, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// ==============================
// 0) Config y helpers
// ==============================
const MODEL_NAME = 'gemini-1.5-flash-latest';
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
});


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
  type: "object",
  properties: {
    sku: { type: "string" },
    qty: { type: "number" },
    unitPrice: { type: "number" },
    discountPct: { type: "number" },
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
    type: "object",
    properties: {
      userId: { type: "string" },
      threadId: { type: "string" },
      turn: { type: "number" },
      role: { type: "string", enum: ['user', 'model'] },
      text: { type: "string" },
      kind: { type: "string", enum: ['message', 'summary'] },
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
    type: "object",
    properties: {
      userId: { type: "string" },
      threadId: { type: "string" },
      limit: { type: "number" },
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
    type: "object",
    properties: {
      userId: { type: "string" },
      profile: { type: "string" },
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
    type: "object",
    properties: { text: { type: "string" }, limit: { type: "number" } },
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
    type: "object",
    properties: { accountId: { type: "string" } },
    required: ['accountId'],
  },
};
async function exec_get_account_deep({ accountId }: any) {
    const accSnap = await getDoc(doc(db, 'accounts', accountId));
    const acc = accSnap.exists() ? { id: accSnap.id, ...accSnap.data() } : null;

    const ordersQ = query(
        collection(db, 'ordersSellOut'),
        where('accountId', '==', accountId),
        orderBy('createdAt', 'desc'),
        fbLimit(20)
    );
    const intsQ = query(
        collection(db, 'interactions'),
        where('accountId', '==', accountId),
        orderBy('createdAt', 'desc'),
        fbLimit(50)
    );
    const evtsQ = query(
        collection(db, 'marketingEvents'),
        where('accountId', '==', accountId),
        orderBy('startAt', 'desc'),
        fbLimit(30)
    );
    const [o, i, e] = await Promise.all([getDocs(ordersQ), getDocs(intsQ), getDocs(evtsQ)]);
    return {
        account: acc,
        orders: o.docs.map(d => ({ id: d.id, ...d.data() })),
        interactions: i.docs.map(d => ({ id: d.id, ...d.data() })),
        events: e.docs.map(d => ({ id: d.id, ...d.data() })),
    };
}

// ==============================
// 4) TOOLS — Escritura SSOT
// ==============================
const fn_create_account = {
  name: 'create_account',
  description: 'Crea una cuenta con campos mínimos (SSOT: accounts).',
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      city: { type: "string" },
      accountType: {
        type: "string",
        enum: ['CLIENTE_FINAL', 'DISTRIBUIDOR', 'IMPORTADOR', 'HORECA', 'RETAIL', 'OTRO'],
      },
      accountStage: {
        type: "string",
        enum: ['SEGUIMIENTO', 'FALLIDA', 'ACTIVA', 'POTENCIAL'],
      },
      mainContactName: { type: "string" },
      mainContactEmail: { type: "string" },
      salesRepId: { type: "string" },
    },
    required: ['name', 'accountType', 'accountStage'],
  },
};
async function exec_create_account(args: any) {
    const createdAt = nowIso();
    const newId = `acc_${Date.now()}`;
    const newPartyId = `party_${Date.now()}`;
    const docData = {
        id: newId,
        partyId: newPartyId,
        name: args.name,
        nameNorm: norm(args.name),
        city: args.city ?? '',
        type: args.accountType,
        stage: args.accountStage,
        ownerId: args.salesRepId ?? null,
        createdAt,
        updatedAt: createdAt,
    };
    await setDoc(doc(db, 'accounts', newId), docData);
    await setDoc(doc(db, 'parties', newPartyId), {
        id: newPartyId,
        name: args.name,
        kind: 'ORG',
        createdAt,
        contacts: args.mainContactEmail ? [{type: 'email', value: args.mainContactEmail, isPrimary: true, description: args.mainContactName}] : [],
        addresses: args.city ? [{type: 'main', street: '', city: args.city, country: 'España', isPrimary: true}] : [],
    });
    return { ...docData, id: newId };
}

const fn_ensure_account = {
  name: 'ensure_account',
  description: 'Devuelve accountId. Busca por nombre/email y crea si no existe.',
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      city: { type: "string" },
      mainContactEmail: { type: "string" },
      defaultAccountType: {
        type: "string",
        enum: ['CLIENTE_FINAL', 'HORECA', 'RETAIL', 'OTRO', 'DISTRIBUIDOR', 'IMPORTADOR'],
      },
      defaultStage: {
        type: "string",
        enum: ['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA'],
      },
      salesRepId: { type: "string" },
    },
    required: ['name'],
  },
};
async function exec_ensure_account(args: any) {
  const needle = norm(args.name);
  const email = (args.mainContactEmail || '').toLowerCase();
  const snap = await getDocs(query(collection(db, 'accounts'), fbLimit(500)));
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

const fn_create_order = {
  name: 'create_order',
  description: 'Crea un pedido en `ordersSellOut`.',
  parameters: {
    type: "object",
    properties: {
      accountId: { type: "string" },
      distributorId: { type: "string" },
      date: { type: "string" },
      currency: { type: "string", enum: ['EUR', 'USD'] },
      items: { type: "array", items: OrderItemSchema },
      notes: { type: "string" },
    },
    required: ['accountId', 'items'],
  },
};
async function exec_create_order(args: any) {
  const createdAt = nowIso();
  const newId = `ord_${Date.now()}`;
  const order = {
    id: newId,
    accountId: args.accountId,
    distributorId: args.distributorId ?? null,
    createdAt: args.date ?? createdAt,
    currency: args.currency ?? 'EUR',
    lines: args.items.map((i: any) => ({...i, uom: 'uds'})),
    totalAmount: calcAmount(args.items || []),
    notes: args.notes ?? null,
    status: 'open',
  };
  await setDoc(doc(db, 'ordersSellOut', newId), order);
  return { id: newId, amount: order.totalAmount, currency: order.currency, createdAt };
}

const fn_create_interaction = {
  name: 'create_interaction',
  description: 'Registra una interacción (VISITA, LLAMADA, EMAIL, WHATSAPP, OTRO).',
  parameters: {
    type: "object",
    properties: {
      accountId: { type: "string" },
      kind: { type: "string" },
      when: { type: "string" },
      status: { type: "string" },
      note: { type: "string" },
      nextAt: { type: "string" },
      createdById: { type: "string" },
    },
    required: ['accountId', 'kind'],
  },
};
async function exec_create_interaction(args: any) {
  const createdAt = nowIso();
  const newId = `int_${Date.now()}`;
  const docData = {
    id: newId,
    accountId: args.accountId,
    kind: args.kind,
    plannedFor: args.when ?? createdAt,
    createdAt,
    status: args.status ?? 'done',
    note: args.note ?? null,
    nextAction: args.nextAt ? { date: args.nextAt } : null,
    userId: args.createdById ?? null,
  };
  await setDoc(doc(db, 'interactions', newId), docData);
  return { id: newId, status: docData.status, when: docData.plannedFor, createdAt };
}

const fn_create_event = {
  name: 'create_event',
  description: 'Crea un evento (DEMO, FERIA, FORMACION, OTRO).',
  parameters: {
    type: "object",
    properties: {
      accountId: { type: "string" },
      kind: { type: "string" },
      title: { type: "string" },
      startAt: { type: "string" },
      endAt: { type: "string" },
      location: { type: "string" },
      notes: { type: "string" },
      createdById: { type: "string" },
    },
    required: ['kind', 'title', 'startAt'],
  },
};
async function exec_create_event(args: any) {
  const createdAt = nowIso();
  const newId = `me_${Date.now()}`;
  const docData = {
    id: newId,
    accountId: args.accountId ?? null,
    kind: args.kind,
    title: args.title,
    startAt: args.startAt,
    endAt: args.endAt ?? null,
    location: args.location ?? null,
    notes: args.notes ?? null,
    ownerUserId: args.createdById ?? null,
    createdAt,
    updatedAt: createdAt,
    status: 'planned'
  };
  await setDoc(doc(db, 'marketingEvents', newId), docData);
  return { id: newId, title: docData.title, startAt: docData.startAt, createdAt };
}

// ==============================
// 5) Registro de tools y ejecutores
// ==============================
const tools = [
  { functionDeclarations: [
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
  ]},
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
  const system_prompt = `
Eres **Santa Brain** (modo navegador, DEV).
Estilo: cercano, claro y con un toque de gracia humana (emojis puntuales, sin excesos).
Siempre confirma con ✓ lo que hiciste, y usa bullets breves.
Si falta un dato clave (accountId/nombre, fecha, SKU o qty), pide justo lo necesario y sugiere un valor razonable.
Regla: si mencionan un local por nombre y no existe, usa "ensure_account" y luego crea interacción/pedido/evento.
Responde en el idioma del usuario.`;

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: `Contexto: userId=${userId} threadId=${threadId}`}] },
      { role: "model", parts: [{ text: "Contexto recibido." }] },
    ],
  tools as any,
  });

  let response: EnhancedGenerateContentResponse;
  let result = await chat.sendMessage(message);
  response = result.response;

  const toolParts: Part[] = [];

  for (const call of response.functionCalls() || []) {
      const executor = executors[call.name];
      if (!executor) {
          throw new Error(`Tool desconocida: ${call.name}`);
      }
      const output = await executor(call.args);
      toolParts.push({
          functionResponse: {
              name: call.name,
              response: { name: call.name, content: output },
          },
      });
  }

  if (toolParts.length > 0) {
      result = await chat.sendMessage(toolParts);
      response = result.response;
  }
  
  const friendlyText = response.text().replaceAll('**', '').trim();

  try {
    await exec_memory_upsert({ userId, threadId, turn, role: 'user', text: message });
    await exec_memory_upsert({ userId, threadId, turn: turn + 1, role: 'model', text: friendlyText, kind: 'summary' });
  } catch (e) {
    console.warn('[SantaBrain] memory save failed', e);
  }

  return { text: friendlyText, calls: response.functionCalls(), toolResponses: toolParts };
}
