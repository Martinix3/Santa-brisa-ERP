# PIPELINE - Setup Firestore

## Índices Compuestos Requeridos

### Para colección `tasks`

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "assigneeId", "order": "ASCENDING" },
        { "fieldPath": "dueAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "objective", "order": "ASCENDING" },
        { "fieldPath": "assigneeId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "zone", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orderId", "order": "ASCENDING" },
        { "fieldPath": "kind", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Para colección `accounts` (nuevo campo)

Añadir campo `isObjective` (boolean) a la colección accounts.

```json
{
  "indexes": [
    {
      "collectionGroup": "accounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isObjective", "order": "ASCENDING" },
        { "fieldPath": "ownerId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## Security Rules

### Para colección `tasks`

```javascript
match /tasks/{taskId} {
  // Usuarios autenticados pueden leer sus propias tasks
  allow read: if request.auth != null && 
    (resource.data.assigneeId == request.auth.uid ||
     request.auth.token.role == 'admin' ||
     request.auth.token.role == 'manager');
  
  // Usuarios pueden crear tasks
  allow create: if request.auth != null &&
    request.resource.data.assigneeId == request.auth.uid;
  
  // Usuarios pueden actualizar sus propias tasks
  allow update: if request.auth != null &&
    resource.data.assigneeId == request.auth.uid;
  
  // Solo admins pueden eliminar
  allow delete: if request.auth != null &&
    request.auth.token.role == 'admin';
}
```

### Para campo `accounts.isObjective`

```javascript
match /accounts/{accountId} {
  // Permitir actualizar isObjective si eres el owner o manager
  allow update: if request.auth != null &&
    (resource.data.ownerId == request.auth.uid ||
     request.auth.token.role == 'manager' ||
     request.auth.token.role == 'admin');
}
```

---

## Migración de Datos

### 1. Añadir campo `isObjective` a cuentas existentes

```typescript
// scripts/migrate-add-isobjective.ts
import { adminDb } from '@/server/firebase';

async function migrateAccountsIsObjective() {
  const accounts = await adminDb.collection('accounts').get();
  
  const batch = adminDb.batch();
  let count = 0;
  
  for (const doc of accounts.docs) {
    const data = doc.data();
    
    // Si no tiene el campo, añadir como false
    if (data.isObjective === undefined) {
      batch.update(doc.ref, { isObjective: false });
      count++;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ Migrated ${count} accounts`);
  } else {
    console.log('✅ No accounts to migrate');
  }
}

migrateAccountsIsObjective();
```

### 2. Crear índices desde Firebase Console

1. Ir a Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Para cada índice en la lista de arriba:
   - Collection ID: `tasks` (o `accounts`)
   - Campos según spec
   - Query scope: Collection
   - Click "Create"

Alternativamente, usar Firebase CLI:

```bash
# Deploy índices desde firestore.indexes.json
firebase deploy --only firestore:indexes
```

### 3. Actualizar firestore.indexes.json

Añadir los índices de arriba al archivo `firestore.indexes.json` en la raíz del proyecto.

---

## Comandos Útiles

### Deploy rules e índices

```bash
firebase deploy --only firestore
```

### Verificar índices creados

```bash
firebase firestore:indexes
```

### Test local (emulator)

```bash
firebase emulators:start
```

---

## Checklist de Setup

- [ ] Crear índices compuestos en Firestore Console
- [ ] Actualizar firestore.rules con rules de tasks
- [ ] Migrar cuentas existentes (añadir isObjective)
- [ ] Deploy rules e índices
- [ ] Verificar queries funcionan correctamente
- [ ] Test performance con 70+ cuentas por stage

---

## Notas

- Los índices se crean automáticamente cuando Firestore detecta queries que los necesitan
- Sin embargo, es mejor crearlos manualmente antes de deploy para evitar errores en producción
- Los índices compuestos pueden tardar varios minutos en construirse en producción
- Monitorear el uso de índices en Firebase Console → Firestore → Usage
