# Firebase Admin SDK — Configuración estable (Santa Brisa CRM)

## 1) Problema inicial (contexto)

* Escrituras a Firestore fallaban con `invalid_grant (invalid_rapt)` en backend.
* Las **lecturas** iban bien (cliente con Firebase Auth de usuario).
* **Causa raíz:** el backend usaba **ADC de usuario humano** (p. ej. `mj@santabrisa.co`). Los tokens caducaban / pedían reautenticación ⇒ las **server actions** quedaban sin credenciales válidas.

---

## 2) Objetivo

* Que el backend **no** dependa de sesión humana de `gcloud`.
* Producción **estable**: tokens renovados automáticamente por Google.
* Desarrollo local **claro y reproducible** (impersonation; sin JSON keys).

---

## 3) Roles y cuentas de servicio (SAs)

Cuentas relevantes del proyecto:

* `firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com` (SA interna del SDK).
* `firebase-app-hosting-compute@santa-brisa-erp.iam.gserviceaccount.com` (runtime de Hosting / App Hosting).

Roles mínimos recomendados:

* `roles/datastore.user` (lectura/escritura Firestore).
* Opcional para utilidades: `roles/logging.logWriter`, `roles/iam.serviceAccountTokenCreator` (solo para usuarios que **impersonan**).

> **Principio de mínimo privilegio**: evita usar `Editor`/`Owner` si no es imprescindible.

---

## 4) Inicialización del Admin SDK (común a PROD y DEV)

Archivo: `src/lib/firebase/admin.ts`

```ts
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(), // ✅ usa ADC (en PROD = SA del runtime; en DEV = gcloud/impersonation)
});

export const db = getFirestore(app);
// Evita errores por campos undefined en escrituras parciales
db.settings({ ignoreUndefinedProperties: true });
```

> **No** uses claves JSON en repo. **No** metas secretos en `NEXT_PUBLIC_*`.

---

## 5) Producción (App Hosting / Hosting)

**No hay que hacer nada especial** en variables de entorno para Firebase Admin:

* El runtime ejecuta con su **Service Account** (`firebase-app-hosting-compute@…`).
* `applicationDefault()` detecta esa SA y Google **renueva tokens** automáticamente.
* Asegúrate de que esa SA tenga `roles/datastore.user`.

**Variables que sí usas para integraciones** (ej. Holded/Sendcloud): defínelas como **secretos de servidor**, nunca `NEXT_PUBLIC_*`.

---

## 6) Desarrollo local (Workstations) — **Impersonation**

Como no generamos JSON keys, en local usamos **impersonation**:

### 6.1 Dar permisos al usuario que desarrolla

Concede a tu usuario (p. ej. `mj@santabrisa.co`) el rol:

* `roles/iam.serviceAccountTokenCreator` **sobre** la SA objetivo (`firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com`).

### 6.2 Autenticación gcloud local (una vez)

```bash
gcloud auth login
gcloud auth application-default login   # para ADC local
```

### 6.3 Activar impersonation al arrancar dev

Usa la var `GOOGLE_IMPERSONATE_SERVICE_ACCOUNT`:

```bash
# Opción temporal en shell
export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com
npm run dev
```

o añade script npm (recomendado):

```json
// package.json
{
  "scripts": {
    "dev:sa": "cross-env GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com next dev"
  }
}
```

> Con esto, `applicationDefault()` **firma como la SA**, no como tu usuario humano.

---

## 7) Variables de entorno (resumen)

No necesitas `FIREBASE_PRIVATE_KEY` ni `FIREBASE_CLIENT_EMAIL` si usas **ADC + impersonation**.

Solo asegúrate de **no** mezclar secretos de cliente con servidor:

```dotenv
# Cliente (públicas; ej. SDK web de Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ...

# Servidor (privadas; usadas en server actions / routes)
HOLDED_API_KEY=...
SENDCLOUD_PUBLIC_KEY=...
SENDCLOUD_SECRET_KEY=...
# (sin NEXT_PUBLIC_)
```

---

## 8) Verificación rápida

### 8.1 ¿Qué identidad está usando Admin SDK?

```bash
gcloud auth list
gcloud auth application-default print-identity-token \
  --impersonate-service-account=firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com >/dev/null && echo "Impersonation OK"
```

### 8.2 Sanity write a Firestore (script)

```ts
// scripts/sanity-write.ts
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';

const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
const db = getFirestore(app);

async function main() {
  const id = 'sanity-' + Date.now();
  await db.collection('jobs').doc(id).set({ hello: 'world', at: new Date().toISOString() }, { merge: true });
  const snap = await db.collection('jobs').doc(id).get();
  console.log({ exists: snap.exists, data: snap.data() });
}
main().catch(e => { console.error(e); process.exit(1); });
```

```bash
npx tsx scripts/sanity-write.ts
# Esperado: { exists: true, data: { hello: 'world', ... } }
```

---

## 9) Troubleshooting

* **`invalid_grant (invalid_rapt)`**
  → Estás firmando como **usuario humano** y el token requiere reauth/2FA.
  **Solución:** usa impersonation (`GOOGLE_IMPERSONATE_SERVICE_ACCOUNT`) o ejecuta en PROD (runtime SA).

* **`permission denied` al escribir**
  → A la SA le falta `roles/datastore.user` (o reglas de seguridad bloquean si escribes desde cliente por accidente).
  **Solución:** añade rol; garantiza que las **escrituras** se hacen **desde server actions**.

* **En Vercel/Hosting sale “Edge Function”**
  → `firebase-admin` no funciona en Edge.
  **Solución:** en server actions/routes:

  ```ts
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';
  ```

* **“No guarda” pero no hay error**
  → Faltó `await` a la promesa de escritura, o caché SSR.
  **Solución:** `await upsertMany(...)` y `revalidatePath(...)` tras escribir.

---

## 10) Reglas de oro

1. **PROD:** siempre la **SA del runtime** (tokens automáticos).
2. **DEV:** **impersonation**, sin claves JSON.
3. **Nada de secretos** en `NEXT_PUBLIC_*`.
4. **Server actions** para todas las escrituras; `runtime='nodejs'`.
5. Documenta y versiona este archivo (`docs/firebase-admin-setup.md`).