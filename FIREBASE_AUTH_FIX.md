# 🔥 Solución Completa: Firebase Auth "API key not valid"

## ✅ RESUMEN EJECUTIVO

El error `auth/api-key-not-valid` ocurre porque:
1. Las variables `NEXT_PUBLIC_*` no están cargando correctamente
2. La API Key tiene restricciones en Google Cloud
3. O Email/Password auth no está habilitado en Firebase Console

---

## 🔍 DIAGNÓSTICO

Tu `.env.local` actual tiene:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbPqt51bs1HSvs0LROCWt7WSQBrMNqKN0
```

He añadido **logs de debug** en `src/config/firebaseWebApp.ts` que mostrarán en la Console del navegador:
```
🔥 Firebase initialized with: {
  projectId: 'santa-brisa-erp',
  authDomain: 'santa-brisa-erp.firebaseapp.com',
  apiKeyPrefix: 'AIzaSyAb...'
}
```

---

## 📋 SOLUCIÓN PASO A PASO

### 1. Verifica las Variables de Entorno

Abre tu **`.env.local`** y confirma que TODAS estas variables existen:

```bash
# Firebase Web SDK (Client-side - Required for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbPqt51bs1HSvs0LROCWt7WSQBrMNqKN0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=santa-brisa-erp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=santa-brisa-erp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=santa-brisa-erp.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=526543168723
NEXT_PUBLIC_FIREBASE_APP_ID=1:526543168723:web:af0088ec4aa1cfd1c9e026
```

⚠️ **CRÍTICO:** Deben tener el prefijo `NEXT_PUBLIC_` o Next.js no las expone al navegador.

---

### 2. Reinicia el Servidor

Después de modificar `.env.local`:

```bash
# Detener el servidor (Ctrl+C)
# Reiniciar
npm run dev
```

---

### 3. Verifica Email/Password está Habilitado

Ve a Firebase Console:
```
https://console.firebase.google.com/project/santa-brisa-erp/authentication/providers
```

**Busca "Email/Password"** → Debe estar **Enabled** ✅

Si no lo está:
1. Clic en "Email/Password"
2. Toggle **Enable**
3. Save

---

### 4. Verifica Restricciones de la API Key

Ve a Google Cloud Console:
```
https://console.cloud.google.com/apis/credentials?project=santa-brisa-erp
```

**Busca la API key** `AIzaSyAbPqt51bs1HSvs0LROCWt7WSQBrMNqKN0`

**Configuración correcta:**

#### Application restrictions:
- **Opción 1 (Desarrollo):** "None" (sin restricciones)
- **Opción 2 (Producción):** "HTTP referrers" con:
  - `http://localhost:*`
  - `http://localhost:3004/*`
  - `https://*.santabrisa.co/*`

#### API restrictions:
- **Opción 1 (Recomendado desarrollo):** "Don't restrict key"
- **Opción 2 (Producción):** Permitir solo:
  - Identity Toolkit API
  - Firebase Authentication API

---

### 5. Verifica Authorized Domains

En Firebase Console → Authentication → Settings → **Authorized domains**:

Añade:
- `localhost`
- Tu dominio de producción

---

## 🐛 DEBUG EN BROWSER

Abre la Console del navegador (F12) y busca:

### ✅ Si ves esto → Todo OK:
```
🔥 Firebase initialized with: {
  projectId: 'santa-brisa-erp',
  authDomain: 'santa-brisa-erp.firebaseapp.com',
  apiKeyPrefix: 'AIzaSyAb...'
}
```

### ❌ Si ves esto → Problema:
```
🔥 Firebase Config Error: apiKey, projectId, authDomain
```
→ Las variables `NEXT_PUBLIC_*` NO están cargando. Reinicia el servidor.

### ❌ Si no ves ningún log → Problema grave:
→ El código no se está ejecutando. Verifica que `firebaseWebApp.ts` se guardó correctamente.

---

## 🎯 CHECKLIST RÁPIDO

- [ ] `.env.local` tiene TODAS las variables con `NEXT_PUBLIC_` ✅
- [ ] Servidor reiniciado después de cambiar `.env.local` ✅
- [ ] Email/Password habilitado en Firebase Console ✅
- [ ] API Key sin restricciones (o con localhost permitido) ✅
- [ ] `localhost` en Authorized domains ✅
- [ ] Console del browser muestra log `🔥 Firebase initialized` ✅

---

## 👥 USUARIOS EXISTENTES (7)

| Nombre | Email | Rol |
|--------|-------|-----|
| Alfonso | aj@santabrisa.com | comercial |
| Nico | no@santabrisa.com | COMERCIAL |
| Patxi | pp@santabrisa.com | ADMIN |
| **Martin** | **mj@santabrisa.co** | **owner** |
| Miguel | mo@santabrisa.com | admin |
| Ansso | ah@santabrisa.com | admin |
| Maria | mf@santabrisa.com | ops |

---

## 🆘 SI SIGUE FALLANDO

**Copia y pega aquí lo que sale en la Console del navegador:**

1. Abre DevTools (F12)
2. Pestaña "Console"
3. Recarga la página
4. Busca el log `🔥 Firebase initialized`
5. Envíame ese log completo

**También copia el error completo del login:**
- El mensaje que sale en rojo después de intentar hacer login

---

## ✅ CAMBIOS REALIZADOS

He mejorado `src/config/firebaseWebApp.ts` para:
- ✅ Detectar variables faltantes
- ✅ Mostrar debug en Console
- ✅ Dar mensajes de error claros
- ✅ Validar que todas las variables existen

**Recarga la app y verás los logs de debug automáticamente.**
