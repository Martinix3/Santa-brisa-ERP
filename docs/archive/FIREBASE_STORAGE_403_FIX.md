# Fix: Firebase Storage 403 Error - Permisos Denegados

## Problema Identificado

Hay **2 problemas** relacionados con autenticación:

### 1. Firebase CLI - Credenciales Caducadas
```
Authentication Error: Your credentials are no longer valid
```

### 2. Firebase Storage 403 - Usuario no autenticado
```
Error uploading file: FirebaseError: Firebase Storage: User does not have permission to access 'receipts/1760961030464/1760961030464_0.pdf'. (storage/unauthorized)
```

---

## Solución 1: Reautenticar Firebase CLI

### Paso 1: Logout de Firebase
```bash
firebase logout
```

### Paso 2: Login nuevamente
```bash
firebase login
```

Esto abrirá tu navegador para que autorices con tu cuenta de Google.

### Paso 3: Verificar autenticación
```bash
firebase projects:list
```

Deberías ver `santa-brisa-erp` en la lista.

### Paso 4: Desplegar reglas de Storage
```bash
firebase deploy --only storage
```

---

## Solución 2: Verificar Autenticación del Usuario en la App

El error 403 indica que **el usuario en el navegador no está autenticado** cuando intenta subir archivos.

### Opción A: Verificar sesión del usuario

1. Abre las **DevTools** del navegador (F12)
2. Ve a la pestaña **Application** > **Cookies**
3. Busca la cookie `session` o `__session`
4. Si no existe o está caducada, **cierra sesión y vuelve a iniciar sesión**

### Opción B: Verificar código de autenticación

El archivo que sube a Storage es:
```
src/app/(app)/warehouse/inventory/components/NewOnHandDialog.tsx
```

Verifica que el usuario esté autenticado antes de subir:

```typescript
// Debe haber algo como esto:
const { user } = useAuth(); // o similar

if (!user) {
  console.error('Usuario no autenticado');
  return;
}
```

---

## Solución 3: Reglas de Storage más permisivas (Temporal para Debug)

Si necesitas probar rápidamente, puedes hacer las reglas más permisivas temporalmente:

```javascript
// storage.rules (SOLO PARA DESARROLLO)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{allPaths=**} {
      allow read, write: if true; // ⚠️ MUY PERMISIVO - Solo para debug
    }
  }
}
```

**⚠️ IMPORTANTE:** Esto es INSEGURO. Solo úsalo temporalmente para verificar que el problema es de autenticación.

Después vuelve a las reglas originales que requieren autenticación:

```javascript
match /receipts/{receiptId}/{allPaths=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null 
               && request.resource.size < 10 * 1024 * 1024
               && (request.resource.contentType.matches('image/.*') 
                   || request.resource.contentType == 'application/pdf');
}
```

---

## Verificación Final

### 1. Verificar que las reglas están desplegadas:
```bash
firebase deploy --only storage
```

### 2. En la consola de Firebase:
- Ve a https://console.firebase.google.com
- Selecciona `santa-brisa-erp`
- Ve a **Storage** > **Rules**
- Verifica que las reglas estén actualizadas

### 3. En el navegador (mientras pruebas la subida):
```javascript
// En la consola del navegador:
firebase.auth().currentUser
```

Esto debería mostrar el usuario actual. Si es `null`, el problema es que el usuario no está autenticado.

---

## Resumen de Pasos

1. ✅ **Reautenticar Firebase CLI**: `firebase logout` → `firebase login`
2. ✅ **Desplegar reglas**: `firebase deploy --only storage`
3. ✅ **Verificar sesión del usuario**: Cerrar sesión y volver a iniciar
4. ✅ **Probar upload nuevamente**

---

## Notas Adicionales

### Errores de colecciones deprecadas
```
- parties: 1 docs (should migrate to contacts)
- accounts: 1 docs (should migrate to contacts)
```

Estos son **warnings** y no afectan la funcionalidad actual, pero eventualmente deberías migrar esos datos a la colección `contacts`.

### Script de migración (opcional)
Si quieres migrar las colecciones deprecadas, puedes crear un script que:
1. Lea todos los docs de `parties` y `accounts`
2. Los transforme al formato de `contacts`
3. Los copie a la nueva colección
4. Archive o elimine los docs antiguos

Pero esto es **opcional** y no urgente.
