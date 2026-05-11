# ✅ Gmail Integración - Listo para Probar

## 🎉 Credenciales Configuradas

Tu archivo `.env.local` está listo con:

```env
GMAIL_CLIENT_ID=[REDACTED_GOOGLE_OAUTH_CLIENT_ID]
GMAIL_CLIENT_SECRET=[REDACTED_GOOGLE_OAUTH_CLIENT_SECRET] ✅
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

---

## ⚠️ PASO CRÍTICO: Verificar Redirect URI

**Antes de probar, DEBES hacer esto:**

1. Ve a [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

2. Click en tu OAuth Client ID (el que termina en ...vqe.apps.googleusercontent.com)

3. En **"Authorized redirect URIs"**, verifica que esté exactamente:
   ```
   http://localhost:3000/api/gmail/callback
   ```

4. Si NO está, añádelo:
   - Click "ADD URI"
   - Pega: `http://localhost:3000/api/gmail/callback`
   - Click "SAVE"
   - **Espera 5 minutos** para que se propague

---

## 🚀 Reiniciar Servidor

```bash
# Detener el servidor (Ctrl+C en la terminal)
# Iniciar de nuevo
npm run dev
```

---

## 🧪 PRUEBA 1: Conectar Tu Cuenta Gmail

Abre en tu navegador:

```
http://localhost:3000/api/gmail/auth?userId=martin
```

**Qué pasará:**
1. Te redirige a Google
2. Seleccionas tu cuenta de Gmail
3. Google te pide autorizar permisos:
   - ✅ Send emails on your behalf
   - ✅ Read all resources and their metadata
   - ✅ Manage drafts and send emails
4. Click "Allow"
5. Te redirige a `/api/gmail/callback`
6. Verás página de confirmación ✅ con tu email

**Si todo sale bien:**
- Los tokens OAuth se guardan en Firestore
- Collection: `gmail_configs`
- Doc ID: `martin`

---

## 🧪 PRUEBA 2: Ver Tokens en Firestore

1. Abre Firebase Console
2. Ve a Firestore Database
3. Busca collection `gmail_configs`
4. Debería haber un documento `martin` con:
   ```json
   {
     "userId": "martin",
     "email": "tu-email@gmail.com",
     "refreshToken": "1//xxxxx",
     "accessToken": "ya29.xxxxx",
     "createdAt": "2025-01-19T..."
   }
   ```

---

## 🧪 PRUEBA 3: Enviar Email Real

Crea este archivo de prueba:

```typescript
// scripts/test-gmail.ts
import { createGmailClient } from '@/server/integrations/gmail/client';

async function testGmail() {
  console.log('🔧 Creando cliente Gmail...');
  
  const gmail = await createGmailClient('martin');
  
  console.log('✉️ Enviando email de prueba...');
  
  const result = await gmail.sendEmail({
    to: ['tu-email@gmail.com'], // Cámbialo por tu email real
    subject: '🎉 ¡Gmail funciona desde Santa Brisa ERP!',
    body: 'Este es un email de prueba real enviado desde el ERP.',
    bodyHtml: `
      <h1>¡Funciona!</h1>
      <p>Este email fue enviado desde <strong>Santa Brisa ERP</strong> usando Gmail API.</p>
      <p>Message ID: ${Date.now()}</p>
    `
  });
  
  console.log('✅ Email enviado:', result.id);
  console.log('🔗 Thread ID:', result.threadId);
}

testGmail().catch(console.error);
```

Ejecutar:
```bash
tsx scripts/test-gmail.ts
```

---

## 🧪 PRUEBA 4: Sincronizar Emails

```typescript
// scripts/test-gmail-sync.ts
import { createGmailClient } from '@/server/integrations/gmail/client';
import { GmailSyncService } from '@/server/integrations/gmail/sync';

async function testSync() {
  console.log('🔄 Iniciando sincronización...');
  
  const gmail = await createGmailClient('martin');
  const syncService = new GmailSyncService(gmail, 'martin');
  
  const { synced, errors } = await syncService.syncNewEmails();
  
  console.log(`✅ Sincronizados: ${synced} emails`);
  console.log(`❌ Errores: ${errors}`);
}

testSync().catch(console.error);
```

Ejecutar:
```bash
tsx scripts/test-gmail-sync.ts
```

---

## 🧪 PRUEBA 5: Listar Emails

```typescript
// scripts/test-gmail-list.ts
import { createGmailClient } from '@/server/integrations/gmail/client';

async function testList() {
  const gmail = await createGmailClient('martin');
  
  console.log('📧 Listando emails no leídos...');
  
  const { messages, nextPageToken } = await gmail.listMessages({
    unreadOnly: true,
    maxResults: 10
  });
  
  console.log(`📊 Encontrados: ${messages.length} emails`);
  
  for (const email of messages) {
    console.log('---');
    console.log(`De: ${email.from}`);
    console.log(`Asunto: ${email.subject}`);
    console.log(`Fecha: ${email.date}`);
  }
}

testList().catch(console.error);
```

---

## ❌ Troubleshooting

### Error: "redirect_uri_mismatch"

**Causa:** El redirect URI no está configurado en Google Cloud Console

**Solución:**
1. Ve a Credentials en Google Cloud Console
2. Edit tu OAuth Client ID
3. Añade exactamente: `http://localhost:3000/api/gmail/callback`
4. Guarda y espera 5 minutos

### Error: "invalid_client"

**Causa:** Client ID o Client Secret incorrectos

**Solución:**
- Verifica que copiaste correctamente las credenciales en `.env.local`
- Asegúrate de no tener espacios extra
- Reinicia el servidor

### Error: "Gmail config not found"

**Causa:** No has conectado tu cuenta Gmail

**Solución:**
1. Abre: `http://localhost:3000/api/gmail/auth?userId=martin`
2. Autoriza el acceso
3. Espera a ver la página de confirmación

---

## 🎯 Checklist Final

- [x] Credenciales OAuth2 obtenidas
- [x] `.env.local` creado con credenciales
- [ ] Redirect URI verificado en Google Cloud Console
- [ ] Servidor reiniciado
- [ ] Cuenta Gmail conectada (`/api/gmail/auth`)
- [ ] Email de prueba enviado exitosamente
- [ ] Emails sincronizados correctamente

---

## 🚀 ¡Siguiente Paso!

**Reinicia tu servidor ahora:**

```bash
# Ctrl+C para detener
npm run dev
```

**Luego abre en tu navegador:**

```
http://localhost:3000/api/gmail/auth?userId=martin
```

Deberías ser redirigido a Google para autorizar. ¡Después ya podrás enviar emails reales! 🎉
