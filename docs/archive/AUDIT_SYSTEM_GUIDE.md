# 🔍 Sistema de Auditoría y Trazabilidad - Guía Completa

## 📋 Resumen

Sistema end-to-end para **atribuir cada cambio a un usuario o sistema**, garantizando trazabilidad completa de todas las operaciones en Santa Brisa ERP.

---

## 🏗️ Arquitectura

### Componentes Creados

```
src/core/
├── ctx.ts                 # AsyncLocalStorage context
├── system-actors.ts       # IDs estandarizados (SYSTEM_*)
├── repos/_utils.ts        # Helpers audit automático
└── audit.ts               # AuditLog writer
```

### Flujo de Datos

```
Usuario/Sistema 
  ↓
withUser(ctx, fn)          # Establece contexto
  ↓
getUserId()                # Disponible en toda la cadena
  ↓
withCreateAudit(data)      # Rellena createdById/updatedById
  ↓
auditCreate(...)           # Registra en auditLogs
```

---

## 🚀 Uso Básico

### 1. API Routes (Next.js)

#### Webhook sin sesión (actores del sistema):

```ts
// src/app/api/integrations/holded/webhooks/estimate/route.ts
import { withUser } from '@/core/ctx';
import { SYSTEM } from '@/core/system-actors';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Establece actor del sistema
  const ctx = { 
    userId: SYSTEM.HOLDED,
    source: 'webhook' as const,
    meta: { webhookEvent: 'estimate.created' }
  };
  
  return withUser(ctx, async () => {
    const body = await req.json();
    
    // TODO: validación, idempotencia, persistencia
    // getUserId() retornará 'SYSTEM_HOLDED' automáticamente
    
    return NextResponse.json({ ok: true });
  });
}
```

#### API con sesión de usuario:

```ts
// src/app/api/orders/route.ts
import { withUser } from '@/core/ctx';
import { auth } from '@/server/auth'; // Tu auth provider
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const ctx = {
    userId: session.user.id,
    email: session.user.email,
    roles: session.user.roles,
    source: 'api' as const,
  };
  
  return withUser(ctx, async () => {
    // getUserId() retorna session.user.id
    const order = await createOrder(await req.json());
    return NextResponse.json(order);
  });
}
```

---

### 2. Server Actions

```ts
// src/server/actions/_helpers.ts
import { withUser } from '@/core/ctx';
import { cookies } from 'next/headers';
import { verifySession } from '@/server/auth';

export async function runAsCurrentUser<T>(fn: () => Promise<T>): Promise<T> {
  const sessionCookie = cookies().get('session')?.value;
  
  if (!sessionCookie) {
    throw new Error('No session');
  }
  
  const session = await verifySession(sessionCookie);
  const ctx = {
    userId: session.userId,
    email: session.email,
    roles: session.roles,
    source: 'api' as const,
  };
  
  return withUser(ctx, fn);
}
```

Uso en actions:

```ts
// src/server/actions/orders.actions.ts
import { runAsCurrentUser } from './_helpers';
import { OrdersRepo } from '@/core/repos/orders.repo';

export async function createOrderAction(input: any) {
  'use server';
  return runAsCurrentUser(async () => {
    return OrdersRepo.create(input);
  });
}
```

---

### 3. Repos con Audit Automático

```ts
// src/core/repos/accounts.repo.ts
import { getFirebaseSync } from '@/lib/firebaseClient';
import { collection, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { Account } from '@/domain/ssot';
import { withCreateAudit, withUpdateAudit, generateId } from './_utils';
import { auditCreate, auditUpdate } from '@/core/audit';

export const AccountsRepo = {
  /**
   * Crea una cuenta nueva
   * Rellena automáticamente createdAt/updatedAt/createdById/updatedById
   */
  async create(input: Omit<Account, 'id' | keyof AuditBase>): Promise<string> {
    const { firestoreDb } = getFirebaseSync();
    const id = generateId('acc');
    
    // withCreateAudit rellena audit fields usando getUserId()
    const account: Account = { 
      id, 
      ...withCreateAudit(input) 
    } as Account;
    
    const ref = doc(collection(firestoreDb, 'accounts'), id);
    await setDoc(ref, account);
    
    // Registra en auditLogs
    await auditCreate('accounts', id, account);
    
    return id;
  },

  /**
   * Actualiza una cuenta
   * Rellena automáticamente updatedAt/updatedById
   */
  async update(id: string, patch: Partial<Account>): Promise<void> {
    const { firestoreDb } = getFirebaseSync();
    
    // Obtener estado anterior para diff
    const ref = doc(collection(firestoreDb, 'accounts'), id);
    const snap = await getDoc(ref);
    const before = snap.data();
    
    // withUpdateAudit rellena updatedAt/updatedById
    const updates = withUpdateAudit(patch);
    await updateDoc(ref, updates);
    
    // Registra cambio
    await auditUpdate('accounts', id, before, { ...before, ...updates });
  },
};
```

---

### 4. Workers & Cron Jobs

```ts
// src/server/workers/sync-holded.ts
import { withUser } from '@/core/ctx';
import { SYSTEM } from '@/core/system-actors';

export async function syncHoldedContacts() {
  const ctx = {
    userId: SYSTEM.WORKER,
    source: 'cron' as const,
    meta: { job: 'syncHoldedContacts' },
  };
  
  return withUser(ctx, async () => {
    // Toda operación aquí tendrá userId = SYSTEM_WORKER
    // ...lógica sync
  });
}
```

---

## 📊 Consultas de Auditoría

### Query Firestore por actor:

```ts
import { collection, query, where, getDocs } from 'firebase/firestore';

// Cambios de un usuario específico
const q = query(
  collection(db, 'auditLogs'),
  where('actorId', '==', 'user_abc123')
);
const snap = await getDocs(q);
```

### Query por entidad:

```ts
// Historial de una cuenta
const q = query(
  collection(db, 'auditLogs'),
  where('entity', '==', 'accounts'),
  where('entityId', '==', 'acc_xyz')
);
```

---

## ✅ Checklist de Implementación

### Para nuevos features:

- [ ] API Route: Envolver handler en `withUser(ctx, fn)`
- [ ] Server Action: Usar `runAsCurrentUser(fn)`
- [ ] Repo methods: Usar `withCreateAudit()` / `withUpdateAudit()`
- [ ] Registrar audit log: `auditCreate()` / `auditUpdate()`
- [ ] Webhooks: Usar `SYSTEM.*` como actor
- [ ] Workers: Usar `SYSTEM.WORKER` o `SYSTEM.CRON`

---

## 🎯 Ejemplos Completos

### Ejemplo 1: Crear Order desde Server Action

```ts
// src/server/actions/orders.actions.ts
'use server';

import { runAsCurrentUser } from './_helpers';
import { getFirebaseSync } from '@/lib/firebaseClient';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Order } from '@/domain/ssot';
import { withCreateAudit, generateId } from '@/core/repos/_utils';
import { auditCreate } from '@/core/audit';

export async function createOrderAction(input: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'updatedById'>) {
  return runAsCurrentUser(async () => {
    const { firestoreDb } = getFirebaseSync();
    const id = generateId('ord');
    
    const order: Order = {
      id,
      ...withCreateAudit(input),
    } as Order;
    
    const ref = doc(collection(firestoreDb, 'orders'), id);
    await setDoc(ref, order);
    
    await auditCreate('orders', id, order);
    
    return { id };
  });
}
```

### Ejemplo 2: Webhook Holded con Audit

```ts
// src/app/api/integrations/holded/webhooks/estimate/route.ts
import { withUser } from '@/core/ctx';
import { SYSTEM } from '@/core/system-actors';
import { NextRequest, NextResponse } from 'next/server';
import { auditSync } from '@/core/audit';

export async function POST(req: NextRequest) {
  const ctx = {
    userId: SYSTEM.HOLDED,
    source: 'webhook' as const,
  };
  
  return withUser(ctx, async () => {
    const event = await req.json();
    
    // Procesar estimate...
    const orderId = await processEstimate(event);
    
    // Registrar que vino de Holded
    await auditSync('orders', orderId, 'Holded', {
      event: event.event,
      estimateId: event.data.id,
    });
    
    return NextResponse.json({ ok: true });
  });
}
```

---

## 🔒 Seguridad

### Validaciones recomendadas:

1. **Webhooks:** Verificar HMAC antes de `withUser()`
2. **API Routes:** Auth middleware antes de `withUser()`
3. **Actores del sistema:** Solo en código servidor, nunca expuestos al cliente
4. **Audit logs:** Read-only para usuarios no-admin

---

## 📈 Métricas & Observabilidad

### Logs estructurados:

```ts
import { getUserId } from '@/core/ctx';

console.log(JSON.stringify({
  msg: 'order_created',
  actor: getUserId(),
  orderId: 'ord_123',
  timestamp: new Date().toISOString(),
}));
```

### Queries útiles (BigQuery si exportas logs):

```sql
-- Top 10 usuarios más activos
SELECT actorId, COUNT(*) as changes
FROM auditLogs
WHERE createdAt > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY actorId
ORDER BY changes DESC
LIMIT 10

-- Cambios en últimas 24h por sistema
SELECT entity, action, COUNT(*) as cnt
FROM auditLogs  
WHERE actorId LIKE 'SYSTEM_%'
  AND createdAt > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY entity, action
```

---

## 🧪 Testing

```ts
import { withUser } from '@/core/ctx';
import { getUserId } from '@/core/ctx';

describe('Audit System', () => {
  it('should set userId in context', async () => {
    await withUser({ userId: 'test_user' }, async () => {
      expect(getUserId()).toBe('test_user');
    });
  });
  
  it('should default to SYSTEM_UNKNOWN outside context', () => {
    expect(getUserId()).toBe('SYSTEM_UNKNOWN');
  });
});
```

---

## 📚 Referencias

- **AsyncLocalStorage:** https://nodejs.org/api/async_context.html
- **Firestore v9 API:** https://firebase.google.com/docs/firestore/query-data/queries
- **Next.js Server Actions:** https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions

---

## 🎉 Resultado

Con este sistema:

✅ Cada cambio tiene `createdById/updatedById`  
✅ Cada cambio se registra en `auditLogs`  
✅ No necesitas pasar `userId` por parámetros  
✅ Webhooks/Workers usan actores del sistema  
✅ Auditoría completa y consultable
