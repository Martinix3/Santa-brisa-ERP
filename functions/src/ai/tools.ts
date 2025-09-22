
// functions/src/ai/tools.ts
import { z } from 'zod';
import { ai } from './index.js';
import { db } from '../firebaseAdmin.js';
import type { OrderSellOut, Account } from '../domain/ssot.js';

// ===== Helpers =====
const nowIso = () => new Date().toISOString();
const norm = (s: string) =>
  (s || '').trim().toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');
const calcAmount = (items: Array<{ qty: number, priceUnit: number, discount: number }>) =>
  items.reduce((a, it) => a + (it.qty ?? 0) * (it.priceUnit ?? 0) * (1 - (it.discount ?? 0) / 100), 0);

async function mustAccount(id: string): Promise<Account> {
  const snap = await db.collection('accounts').doc(id).get();
  if (!snap.exists) throw new Error(`Account ${id} no existe`);
  return { id: snap.id, ...(snap.data() as any) } as Account;
}

// =====================================================
// ===============     MEMORIA       ===================
// =====================================================

const memoryUpsertSchema = z.object({
  userId: z.string(),
  threadId: z.string(),
  turn: z.number(),
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1),
  kind: z.enum(['message', 'summary']).default('message'),
});

export const memory_upsert = ai.defineTool(
  {
    name: 'memory_upsert',
    description: 'Guarda un mensaje o resumen del hilo.',
    inputSchema: memoryUpsertSchema,
    outputSchema: z.object({ ok: z.boolean() }),
  },
  async (input: z.infer<typeof memoryUpsertSchema>) => {
    const { userId, threadId, ...rest } = input;
    await db
      .collection('brain_memory')
      .doc(userId)
      .collection('threads')
      .doc(threadId)
      .collection('turns')
      .add({ ...rest, createdAt: nowIso() });
    return { ok: true };
  }
);

const memoryGetContextSchema = z.object({
  userId: z.string(),
  threadId: z.string(),
  limit: z.number().min(1).max(50).default(12),
});

export const memory_get_context = ai.defineTool(
  {
    name: 'memory_get_context',
    description: 'Recupera últimas N entradas del hilo + perfil largo.',
    inputSchema: memoryGetContextSchema,
    outputSchema: z.object({
      messages: z.array(z.object({ role: z.string(), text: z.string() })),
      profile: z.string().optional(),
    }),
  },
  async (input: z.infer<typeof memoryGetContextSchema>) => {
    const { userId, threadId, limit } = input;

    const turnsSnap = await db
      .collection('brain_memory')
      .doc(userId)
      .collection('threads')
      .doc(threadId)
      .collection('turns')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const messages = turnsSnap.docs
      .map((d) => d.data() as any)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((d) => ({ role: d.role, text: d.text }));

    const profileDoc = await db.collection('brain_memory').doc(userId).get();
    return { messages, profile: profileDoc.exists ? (profileDoc.data() as any).profile : undefined };
  }
);

const memoryUpdateProfileSchema = z.object({
  userId: z.string(),
  profile: z.string().min(10),
});

export const memory_update_profile = ai.defineTool(
  {
    name: 'memory_update_profile',
    description: 'Actualiza el perfil de largo plazo del usuario.',
    inputSchema: memoryUpdateProfileSchema,
    outputSchema: z.object({ ok: z.boolean() }),
  },
  async (input: z.infer<typeof memoryUpdateProfileSchema>) => {
    const { userId, profile } = input;
    await db.collection('brain_memory').doc(userId).set({ profile, updatedAt: nowIso() }, { merge: true });
    return { ok: true };
  }
);

// =====================================================
// ===============      LECTURA SSOT   =================
// =====================================================

const queryAccountsSchema = z.object({
  text: z.string().optional(),
  limit: z.number().min(1).max(200).default(50),
});

export const query_accounts = ai.defineTool(
  {
    name: 'query_accounts',
    description: 'Busca cuentas por nombre/ciudad/contacto (dev simple).',
    inputSchema: queryAccountsSchema,
    outputSchema: z.object({ results: z.array(z.any()) }),
  },
  async (input: z.infer<typeof queryAccountsSchema>) => {
    const { text = '', limit } = input;
    const snap = await db.collection('accounts').limit(500).get();
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
);

const getAccountDeepSchema = z.object({ accountId: z.string() });

export const get_account_deep = ai.defineTool(
  {
    name: 'get_account_deep',
    description: 'Cuenta + últimos pedidos/interacciones/eventos.',
    inputSchema: getAccountDeepSchema,
    outputSchema: z.object({
      account: z.any().nullable(),
      orders: z.array(z.any()),
      interactions: z.array(z.any()),
      events: z.array(z.any()),
    }),
  },
  async (input: z.infer<typeof getAccountDeepSchema>) => {
    const { accountId } = input;
    const acc = await mustAccount(accountId).catch(() => null);
    const [orders, interactions, events] = await Promise.all([
      db.collection('orders').where('accountId', '==', accountId).orderBy('date', 'desc').limit(20).get(),
      db.collection('interactions').where('accountId', '==', accountId).orderBy('when', 'desc').limit(50).get(),
      db.collection('events').where('accountId', '==', accountId).orderBy('startAt', 'desc').limit(30).get(),
    ]);
    return {
      account: acc,
      orders: orders.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      interactions: interactions.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      events: events.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    };
  }
);

const listCollectionSchema = z.object({
  name: z.enum([
    'accounts',
    'orders',
    'interactions',
    'events',
    'plv_material',
    'activations',
    'products',
    'shipments',
  ]),
  orderBy: z.string().optional(),
  dir: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(500).default(100),
});

export const list_collection = ai.defineTool(
  {
    name: 'list_collection',
    description: 'Lee una colección SSOT permitida (cruda) con límite.',
    inputSchema: listCollectionSchema,
    outputSchema: z.object({ docs: z.array(z.any()) }),
  },
  async (input: z.infer<typeof listCollectionSchema>) => {
    const { name, orderBy, dir, limit } = input;
    let ref: FirebaseFirestore.Query = db.collection(name);
    if (orderBy) ref = ref.orderBy(orderBy, dir);
    const snap = await ref.limit(limit).get();
    return { docs: snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) };
  }
);

// =====================================================
// ===============      ESCRITURA SSOT  =================
// =====================================================

const OrderItemSchema = z.object({
  sku: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().optional(),
  discountPct: z.number().min(0).max(100).optional(),
});

const createAccountSchema = z.object({
  name: z.string(),
  city: z.string().optional(),
  accountType: z.enum(['CLIENTE_FINAL', 'DISTRIBUIDOR', 'IMPORTADOR', 'HORECA', 'RETAIL', 'OTRO']),
  accountStage: z.enum(['SEGUIMIENTO', 'FALLIDA', 'ACTIVA', 'POTENCIAL']),
  mainContactName: z.string().optional(),
  mainContactEmail: z.string().optional(),
  salesRepId: z.string().optional(),
});

async function createAccountDirect(args: z.infer<typeof createAccountSchema>) {
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
    const ref = await db.collection('accounts').add(docData);
    return { id: ref.id };
}

export const create_account = ai.defineTool(
  {
    name: 'create_account',
    description: 'Crea una cuenta SSOT con datos mínimos.',
    inputSchema: createAccountSchema,
    outputSchema: z.object({ id: z.string() }),
  },
  createAccountDirect
);

const ensureAccountSchema = z.object({
  name: z.string(),
  mainContactEmail: z.string().email().optional(),
  defaultAccountType: z
    .enum(['CLIENTE_FINAL', 'HORECA', 'RETAIL', 'OTRO', 'DISTRIBUIDOR', 'IMPORTADOR'])
    .default('HORECA'),
  defaultStage: z.enum(['POTENCIAL', 'SEGUIMIENTO', 'ACTIVA', 'FALLIDA']).default('POTENCIAL'),
});

export const ensure_account = ai.defineTool(
  {
    name: 'ensure_account',
    description: 'Devuelve accountId; busca por nombre/email y crea si no existe.',
    inputSchema: ensureAccountSchema,
    outputSchema: z.object({ id: z.string(), existed: z.boolean() }),
  },
  async (args: z.infer<typeof ensureAccountSchema>) => {
    const needle = norm(args.name);
    const email = (args.mainContactEmail || '').toLowerCase();
    const snap = await db.collection('accounts').limit(500).get();
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const hit = all.find(
      (a) =>
        (email && a.mainContactEmail && a.mainContactEmail.toLowerCase() === email) ||
        (a.nameNorm && a.nameNorm === needle)
    );
    if (hit) return { id: hit.id, existed: true };

    const created = await createAccountDirect(args as any);
    return { id: created.id, existed: false };
  }
);

const createOrderSchema = z.object({
  accountId: z.string(),
  distributorId: z.string().optional(),
  date: z.string().datetime().optional(),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  items: z.array(OrderItemSchema).min(1),
  notes: z.string().optional(),
  createdById: z.string().optional(),
});

export const create_order = ai.defineTool(
  {
    name: 'create_order',
    description: 'Crea un pedido en `orders`.',
    inputSchema: createOrderSchema,
    outputSchema: z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      createdAt: z.string(),
    }),
  },
  async (input: z.infer<typeof createOrderSchema>) => {
    await mustAccount(input.accountId);
    const createdAt = nowIso();
    const order = {
      accountId: input.accountId,
      distributorId: input.distributorId ?? null,
      date: input.date ?? createdAt,
      currency: input.currency,
      items: input.items,
      amount: calcAmount(
        input.items.map((it) => ({
          qty: it.qty,
          priceUnit: it.unitPrice ?? 0,
          discount: it.discountPct ?? 0,
        }))
      ),
      notes: input.notes ?? null,
      status: 'ABIERTO',
      createdAt,
      updatedAt: createdAt,
      createdById: input.createdById ?? null,
    };
    const ref = await db.collection('orders').add(order);
    return { id: ref.id, amount: order.amount, currency: order.currency, createdAt };
  }
);

const createInteractionSchema = z.object({
  accountId: z.string().optional(),
  kind: z.string(),
  when: z.string().datetime().optional(),
  status: z.string().default('COMPLETADA'),
  result: z.string().optional(),
  summary: z.string().optional(),
  nextAt: z.string().datetime().optional(),
  createdById: z.string().optional(),
  dept: z.string().optional(),
});

export const create_interaction = ai.defineTool(
  {
    name: 'create_interaction',
    description: 'Registra una interacción (VISITA, LLAMADA, EMAIL, WHATSAPP, OTRO).',
    inputSchema: createInteractionSchema,
    outputSchema: z.object({
      id: z.string(),
      status: z.string(),
      when: z.string(),
      createdAt: z.string(),
    }),
  },
  async (input: z.infer<typeof createInteractionSchema>) => {
    const createdAt = nowIso();
    const doc = { ...input, when: input.when ?? createdAt, createdAt, updatedAt: createdAt };
    const ref = await db.collection('interactions').add(doc);
    return { id: ref.id, status: doc.status, when: doc.when, createdAt };
  }
);

const createEventSchema = z.object({
  accountId: z.string().optional(),
  title: z.string().min(3),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  location: z.string().optional(),
  dept: z.string().optional(),
  createdById: z.string().optional(),
  notes: z.string().optional(),
});

export const create_event = ai.defineTool(
  {
    name: 'create_event',
    description: 'Crea un evento (DEMO, FERIA, FORMACION, OTRO).',
    inputSchema: createEventSchema,
    outputSchema: z.object({
      id: z.string(),
      title: z.string(),
      startAt: z.string(),
      createdAt: z.string(),
    }),
  },
  async (input: z.infer<typeof createEventSchema>) => {
    if (input.accountId) await mustAccount(input.accountId);
    const createdAt = nowIso();
    const doc = { ...input, createdAt, updatedAt: createdAt };
    const ref = await db.collection('events').add(doc);
    return { id: ref.id, title: input.title, startAt: input.startAt, createdAt };
  }
);

// =====================================================
// ===============   AGENDA / OVERVIEW  =================
// =====================================================

const getUpcomingAgendaSchema = z.object({
  horizonDays: z.number().min(1).max(60).default(14),
  limit: z.number().min(1).max(200).default(50),
  forUserId: z.string().optional(),
  forDept: z.enum(['VENTAS', 'MARKETING', 'LOGISTICA', 'ADMIN', 'OTRO']).optional(),
});

export const get_upcoming_agenda = ai.defineTool(
  {
    name: 'get_upcoming_agenda',
    description: 'Devuelve próximas tareas/eventos dentro de un horizonte (días).',
    inputSchema: getUpcomingAgendaSchema,
    outputSchema: z.object({
      items: z.array(
        z.object({
          type: z.enum(['EVENT', 'TASK']),
          id: z.string(),
          when: z.string(),
          title: z.string(),
          accountId: z.string().nullable(),
          location: z.string().nullable(),
          notes: z.string().nullable(),
        })
      ),
    }),
  },
  async (input: z.infer<typeof getUpcomingAgendaSchema>) => {
    const { horizonDays, limit, forUserId, forDept } = input;
    const now = new Date();
    const end = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    let evRef: FirebaseFirestore.Query = db
      .collection('events')
      .where('startAt', '>=', now.toISOString())
      .where('startAt', '<=', end.toISOString())
      .orderBy('startAt', 'asc')
      .limit(limit);
    if (forUserId) evRef = evRef.where('createdById', '==', forUserId as any);
    if (forDept) evRef = evRef.where('dept', '==', forDept as any);

    const evSnap = await evRef.get();
    const evItems = evSnap.docs.map((d) => {
      const x = d.data() as any;
      return {
        type: 'EVENT' as const,
        id: d.id,
        when: x.startAt,
        title: x.title || x.kind || 'Evento',
        accountId: x.accountId ?? null,
        location: x.location ?? null,
        notes: x.notes ?? null,
      };
    });

    let inRef: FirebaseFirestore.Query = db
      .collection('interactions')
      .where('nextAt', '>=', now.toISOString())
      .where('nextAt', '<=', end.toISOString())
      .orderBy('nextAt', 'asc')
      .limit(limit);
    if (forUserId) inRef = inRef.where('createdById', '==', forUserId as any);
    if (forDept) inRef = inRef.where('dept', '==', forDept as any);

    const inSnap = await inRef.get();
    const taskItems = inSnap.docs.map((d) => {
      const x = d.data() as any;
      return {
        type: 'TASK' as const,
        id: d.id,
        when: x.nextAt,
        title: x.summary || x.kind || 'Tarea',
        accountId: x.accountId ?? null,
        location: null,
        notes: x.notes ?? null,
      };
    });

    const items = [...evItems, ...taskItems]
      .sort((a, b) => String(a.when).localeCompare(String(b.when)))
      .slice(0, limit);

    return { items };
  }
);

const getAccountsOverviewSchema = z.object({
  limit: z.number().min(1).max(500).default(100),
  dormantDays: z.number().min(7).max(365).default(60),
  windowDays: z.number().min(7).max(365).default(180),
  stage: z.enum(['SEGUIMIENTO', 'FALLIDA', 'ACTIVA', 'POTENCIAL']).optional(),
});

export const get_accounts_overview = ai.defineTool(
  {
    name: 'get_accounts_overview',
    description:
      'Devuelve un overview de cuentas con última interacción/pedido y flag de dormidas.',
    inputSchema: getAccountsOverviewSchema,
    outputSchema: z.object({
      accounts: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          city: z.string().optional(),
          accountType: z.string().optional(),
          accountStage: z.string().optional(),
          lastInteractionAt: z.string().nullable(),
          lastOrderAt: z.string().nullable(),
          isDormant: z.boolean(),
        })
      ),
    }),
  },
  async (input: z.infer<typeof getAccountsOverviewSchema>) => {
    const { limit, dormantDays, windowDays, stage } = input;

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const dormantCut = new Date(now.getTime() - dormantDays * 24 * 60 * 60 * 1000).toISOString();

    let accRef: FirebaseFirestore.Query = db.collection('accounts').limit(1000);
    if (stage) accRef = accRef.where('accountStage', '==', stage as any);
    const accSnap = await accRef.get();
    const accounts = accSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const ordSnap = await db
      .collection('orders')
      .where('date', '>=', windowStart)
      .orderBy('date', 'desc')
      .limit(5000)
      .get();
    const lastOrderByAcc = new Map<string, string>();
    for (const doc of ordSnap.docs) {
      const o = doc.data() as any;
      const a = o.accountId as string;
      if (!lastOrderByAcc.has(a)) lastOrderByAcc.set(a, o.date);
    }

    const intSnap = await db
      .collection('interactions')
      .where('when', '>=', windowStart)
      .orderBy('when', 'desc')
      .limit(5000)
      .get();
    const lastIntByAcc = new Map<string, string>();
    for (const doc of intSnap.docs) {
      const i = doc.data() as any;
      const a = i.accountId as string;
      if (!lastIntByAcc.has(a)) lastIntByAcc.set(a, i.when);
    }

    const rows = accounts
      .map((a) => {
        const lastOrderAt = lastOrderByAcc.get(a.id) ?? null;
        const lastInteractionAt = lastIntByAcc.get(a.id) ?? null;
        const lastRef = lastOrderAt || lastInteractionAt || '';
        const isDormant = lastRef ? lastRef < dormantCut : true;
        return {
          id: a.id,
          name: a.name,
          city: a.city,
          accountType: a.accountType,
          accountStage: a.accountStage,
          lastInteractionAt,
          lastOrderAt,
          isDormant,
        };
      })
      .sort((x, y) => {
        if (x.isDormant !== y.isDormant) return x.isDormant ? -1 : 1;
        const a = x.lastOrderAt || x.lastInteractionAt || '';
        const b = y.lastOrderAt || y.lastInteractionAt || '';
        return a.localeCompare(b);
      })
      .slice(0, limit);

    return { accounts: rows };
  }
);

    