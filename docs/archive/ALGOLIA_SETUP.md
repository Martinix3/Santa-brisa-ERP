# 🔍 Algolia Integration Setup Guide

Guía completa para configurar Algolia con sincronización automática de Firestore.

---

## 📋 **Prerequisitos**

1. Cuenta en Algolia (https://www.algolia.com)
2. Firebase project configurado
3. Node.js y npm instalados

---

## 🚀 **Paso 1: Obtener Credenciales de Algolia**

### 1.1 Crear cuenta en Algolia
- Ve a https://www.algolia.com
- Crea una cuenta o inicia sesión
- Crea una aplicación nueva

### 1.2 Obtener API Keys
Ve a **Settings → API Keys** y copia:

```
Application ID: YOUR_APP_ID
Admin API Key: YOUR_ADMIN_KEY (¡NO compartir!)
Search-Only API Key: YOUR_SEARCH_KEY (pública, para frontend)
```

---

## ⚙️ **Paso 2: Configurar Variables de Entorno**

### 2.1 En el proyecto (Next.js)
Crea/edita `.env.local`:

```bash
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_SEARCH_KEY
ALGOLIA_ADMIN_KEY=YOUR_ADMIN_KEY
```

### 2.2 En Firebase Functions
Configura las variables:

```bash
firebase functions:config:set \
  algolia.app_id="YOUR_APP_ID" \
  algolia.admin_key="YOUR_ADMIN_KEY"
```

O usa variables de entorno en `.env` dentro de `/functions`:

```bash
# functions/.env
ALGOLIA_APP_ID=YOUR_APP_ID
ALGOLIA_ADMIN_KEY=YOUR_ADMIN_KEY
```

---

## 📦 **Paso 3: Instalar Dependencias**

### 3.1 Proyecto principal
```bash
npm install algoliasearch
```

### 3.2 Functions
```bash
cd functions
npm install algoliasearch
```

---

## 🔧 **Paso 4: Indexar Datos Existentes**

Ejecuta el script de indexación inicial:

```bash
# Asegúrate de tener las variables configuradas
export ALGOLIA_APP_ID=your_app_id
export ALGOLIA_ADMIN_KEY=your_admin_key

# Ejecutar script
npx ts-node scripts/index-to-algolia.ts
```

**Resultado esperado:**
```
🚀 Starting Algolia indexing...
📦 App ID: YOUR_APP_ID

📋 Indexing contacts...
✅ Indexed 450 contacts (skipped 23 non-customers)

📋 Indexing tasks...
✅ Indexed 1234 tasks (skipped 89 old completed)

⚙️  Configuring Algolia indices...
✅ Contacts index configured
✅ Tasks index configured

✅ Indexing completed successfully!
```

---

## 🚀 **Paso 5: Deploy Cloud Functions**

### 5.1 Deploy funciones de sync
```bash
firebase deploy --only functions:syncContactToAlgolia,functions:syncTaskToAlgolia
```

### 5.2 Verificar deployment
```bash
firebase functions:log --only syncContactToAlgolia,syncTaskToAlgolia
```

---

## ✅ **Paso 6: Verificar Todo Funciona**

### 6.1 En Algolia Dashboard
1. Ve a https://www.algolia.com/dashboard
2. Selecciona tu aplicación
3. Ve a **Indices**
4. Deberías ver:
   - `contacts` - con N documentos
   - `tasks` - con N documentos

### 6.2 Test de búsqueda en Dashboard
**Índice contacts:**
```
Query: "4 gatos"
→ Debería encontrar: "El 4 Gatos Gastropub" ✅

Query: "B12345678"
→ Debería encontrar contacto por NIF ✅
```

**Índice tasks:**
```
Filtros: assignedToId:USER_ID AND status:IN_PROGRESS
→ Debería mostrar tareas pendientes del usuario ✅
```

### 6.3 Test de sync automático
1. Crea un contact nuevo en Firestore
2. Espera ~5 segundos
3. Verifica que aparece en Algolia Dashboard
4. ✅ Si aparece, el sync funciona!

---

## 📊 **Configuración de Índices (Opcional)**

Si necesitas ajustar la configuración:

### Contacts Index
```javascript
{
  searchableAttributes: [
    'displayName',
    'legalName',
    'tradeName',
    'nameNorm',
    'vat'
  ],
  customRanking: ['desc(updatedAt)'],
  typoTolerance: 'min',
  ignorePlurals: ['es']
}
```

### Tasks Index
```javascript
{
  searchableAttributes: [
    'title',
    'desc',
    'kind'
  ],
  customRanking: [
    'desc(_priorityRank)',
    'asc(_dueAtTimestamp)'
  ],
  attributesForFaceting: [
    'status',
    'priority',
    'department',
    'slaBucket'
  ]
}
```

---

## 🔍 **Uso en Código**

### Buscar contacts
```typescript
import { searchContacts } from '@/lib/algolia/search';

const results = await searchContacts('4 gatos', {
  userId: currentUser.id,
  hitsPerPage: 5
});

console.log(results);
// [{ id: '...', displayName: 'El 4 Gatos Gastropub', ... }]
```

### Buscar tasks
```typescript
import { queryTasksForUser } from '@/lib/algolia/search';

const tasks = await queryTasksForUser(userId, 'TODAY');
console.log(tasks);
// Tareas pendientes de hoy
```

### Fuzzy matching (QuickLog)
```typescript
import { findContactByName } from '@/lib/algolia/search';

const match = await findContactByName('4 gtos', userId);
if (match) {
  console.log(`Encontrado: ${match.displayName} (${match.score}%)`);
}
```

---

## 🐛 **Troubleshooting**

### Error: "Algolia credentials not configured"
**Solución:** Verifica que `.env.local` tiene las variables correctas y reinicia el dev server.

### Los datos no se sincronizan
**Solución:**
1. Verifica que las functions están deployed: `firebase functions:list`
2. Revisa los logs: `firebase functions:log`
3. Verifica permisos de Firestore

### Búsqueda no encuentra resultados
**Solución:**
1. Verifica que el índice tiene datos en Algolia Dashboard
2. Ejecuta el script de indexación: `npx ts-node scripts/index-to-algolia.ts`
3. Verifica que los filtros sean correctos

### Error de permisos en Functions
**Solución:**
```bash
# Dar permisos a service account
gcloud projects add-iam-policy-binding santa-brisa-erp \
  --member=serviceAccount:526543168723-compute@developer.gserviceaccount.com \
  --role=roles/storage.objectViewer
```

---

## 💰 **Costos Estimados**

```
Plan FREE de Algolia:
- 10K búsquedas/mes: GRATIS
- 10K registros: GRATIS

Plan GROWTH ($35/mes):
- 100
