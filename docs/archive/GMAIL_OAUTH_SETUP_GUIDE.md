# Gmail OAuth2 - Guía de Configuración 🔐

**Guía paso a paso para conectar Gmail REAL (no mock) a Santa Brisa ERP**

---

## 📋 Prerequisitos

1. ✅ Gmail API habilitada en Google Cloud Console
2. ✅ Credenciales OAuth2 configuradas
3. ✅ Variables de entorno configuradas

---

## 🔧 Paso 1: Configurar Variables de Entorno

Añade estas variables a tu archivo `.env.local`:

```env
# Gmail OAuth2 Credentials
GMAIL_CLIENT_ID=xxxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=[REDACTED_GOOGLE_OAUTH_CLIENT_SECRET]
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Para producción, usa tu dominio real:
# GMAIL_REDIRECT_URI=https://tu-dominio.com/api/gmail/callback
```

### Dónde Obtener las Credenciales:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **"APIs & Services" > "Credentials"**
4. Busca tu OAuth 2.0 Client ID
5. Copia el **Client ID** y **Client Secret**

---

## 🌐 Paso 2: Configurar Redirect URI en Google Cloud

1. En Google Cloud Console, edita tu OAuth 2.0 Client ID
2. En **"Authorized redirect URIs"**, añade:
   ```
   http://localhost:3000/api/gmail/callback
   ```
3. Para producción, añade también:
   ```
   https://tu-dominio.com/api/gmail/callback
   ```
4. Guarda los cambios

---

## 🚀 Paso 3: Conectar una Cuenta de Gmail

### Método 1: Desde el Navegador

1. Abre tu navegador y ve a:
   ```
   http://localhost:3000/api/gmail/auth?userId=tu_user_id
   ```

2. Reemplaza `tu_user_id` con el ID del usuario en tu sistema (ej: `user_123`)

3. Serás redirigido a Google para autorizar el acceso

4. Acepta los permisos solicitados:
   - Enviar emails
   - Leer emails
   - Modificar emails (marcar como leído, etc.)
   - Componer borradores

5. Después de autorizar, serás redirigido a `/api/gmail/callback`

6. Verás una página de confirmación ✅ con tu email conectado

7. Los tokens OAuth se guardarán automáticamente en Firestore

### Método 2: Desde tu Aplicación (React)

Crea un botón en tu UI:

```tsx
// Componente de conexión Gmail
export function ConnectGmailButton({ userId }: { userId: string }) {
  const handleConnect = () => {
    window.open(
      `/api/gmail/auth?userId=${userId}`,
      'Gmail Auth',
      'width=600,height=800'
    );
  };
  
  return (
    <button onClick={handleConnect}>
      Conectar Gmail
    </button>
  );
}
```

---

## 📊 Paso 4: Verificar la Conexión

### Ver en Firestore

1. Abre Firebase Console
2. Ve a **Firestore Database**
3. Busca la colección `gmail_configs`
4. Debería haber un documento con tu `userId`

Ejemplo del documento:

```json
{
  "userId": "user_123",
  "email": "tu-email@gmail.com",
  "clientId": "xxxxx.apps.googleusercontent.com",
  "clientSecret": "[REDACTED_GOOGLE_OAUTH_CLIENT_SECRET]",
  "redirectUri": "http://localhost:3000/api/gmail/callback",
  "refreshToken": "1//xxxxx-encrypted-token",
  "accessToken": "ya29.xxxxx",
  "expiryDate": 1737283456789,
  "scope": "https://www.googleapis.com/auth/gmail.send ...",
  "createdAt": "2025-01-19T10:00:00Z",
  "updatedAt": "2025-01-19T10:00:00Z"
}
```

---

## ✉️ Paso 5: Enviar un Email Real

### Opción A: Desde Server Action

```typescript
// src/server/actions/email.actions.ts
'use server';

import { createGmailClient } from '@/server/integrations/gmail/client';

export async function sendRealEmail(userId: string) {
  try {
    // Crear cliente con tokens reales de Firestore
    const gmail = await createGmailClient(userId);
    
    // Enviar email REAL
    const result = await gmail.sendEmail({
      to: ['destinatario@example.com'],
      subject: '¡Email real desde Santa Brisa ERP!',
      body: 'Este es un email real enviado a través de Gmail API',
      bodyHtml: '<p>Este es un <strong>email real</strong> 🎉</p>'
    });
    
    console.log('Email enviado:', result.id);
    return { success: true, messageId: result.id };
    
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}
```

### Opción B: Crear un Endpoint de Test

```typescript
// src/app/api/gmail/send-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createGmailClient } from '@/server/integrations/gmail/client';

export async function POST(request: NextRequest) {
  const { userId, to, subject, body } = await request.json();
  
  const gmail = await createGmailClient(userId);
  
  const result = await gmail.sendEmail({
    to: [to],
    subject,
    body
  });
  
  return NextResponse.json({ 
    success: true, 
    messageId: result.id 
  });
}
```

Luego llámalo:

```bash
curl -X POST http://localhost:3000/api/gmail/send-test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "to": "destinatario@example.com",
    "subject": "Test Email",
    "body": "Hola desde Santa Brisa!"
  }'
```

---

## 🔍 Paso 6: Leer Emails Reales

```typescript
import { createGmailClient } from '@/server/integrations/gmail/client';

// Crear cliente
const gmail = await createGmailClient('user_123');

// Listar emails no leídos
const { messages, nextPageToken } = await gmail.listMessages({
  unreadOnly: true,
  maxResults: 20
});

console.log(`Tienes ${messages.length} emails no leídos`);

for (const email of messages) {
  console.log(`De: ${email.from}`);
  console.log(`Asunto: ${email.subject}`);
  console.log(`Fecha: ${email.date}`);
  console.log('---');
}

// Marcar como leído
if (messages.length > 0) {
  await gmail.markAsRead(messages[0].messageId);
}
```

---

## 🎯 Casos de Uso Reales

### 1. Confirmación de Pedido Automática

```typescript
export async function onOrderCreated(order: Order) {
  const gmail = await createGmailClient(order.userId);
  
  await gmail.sendEmail({
    to: [order.customerEmail],
    subject: `Pedido ${order.id} confirmado`,
    bodyHtml: `
      <h1>¡Pedido Confirmado!</h1>
      <p>Tu pedido <strong>#${order.id}</strong> ha sido procesado.</p>
      <p>Total: €${order.total}</p>
      <p>Fecha estimada de entrega: ${order.estimatedDelivery}</p>
    `,
    accountId: order.accountId
  });
}
```

### 2. Notificación de Envío

```typescript
export async function onShipmentReady(shipment: Shipment) {
  const gmail = await createGmailClient(shipment.userId);
  
  await gmail.sendEmail({
    to: [shipment.customerEmail],
    subject: `Tu pedido ha sido enviado 📦`,
    bodyHtml: `
      <h1>¡En camino!</h1>
      <p>Código de seguimiento: <strong>${shipment.trackingCode}</strong></p>
      <p>Transportista: ${shipment.carrier}</p>
    `
  });
}
```

### 3. Sync de Emails como Interacciones

```typescript
// Sincronizar emails recibidos
const { messages } = await gmail.listMessages({
  after: lastSyncDate,
  maxResults: 50
});

for (const email of messages) {
  // Se registra automáticamente en la colección 'interactions'
  console.log(`Nuevo email de ${email.from}: ${email.subject}`);
}
```

---

## ⚠️ Troubleshooting

### Error: "No refresh token received"

**Solución:**
1. Revoca el acceso de la app en tu cuenta Google:
   - Ve a https://myaccount.google.com/permissions
   - Busca tu app y revoca el acceso
2. Vuelve a autorizar desde `/api/gmail/auth?userId=xxx`

### Error: "Gmail OAuth not configured"

**Solución:**
Verifica que las variables de entorno estén configuradas:
```bash
echo $GMAIL_CLIENT_ID
echo $GMAIL_CLIENT_SECRET
```

### Error: "redirect_uri_mismatch"

**Solución:**
Verifica que el redirect URI en Google Cloud Console coincida exactamente con el que usas:
- `http://localhost:3000/api/gmail/callback` (desarrollo)
- `https://tu-dominio.com/api/gmail/callback` (producción)

---

## 🔒 Seguridad

### Tokens Encriptados

Los refresh tokens se guardan en Firestore. Para mayor seguridad:

1. **Encriptar tokens antes de guardar:**
```typescript
import crypto from 'crypto';

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY!),
    Buffer.from(process.env.ENCRYPTION_IV!)
  );
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
```

2. **Reglas de Firestore:**
```javascript
match /gmail_configs/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 📊 Monitoring

### Ver Métricas de Emails

```typescript
import { getJobStats } from '@/server/integrations/integration-jobs';

const stats = await getJobStats('gmail');

console.log('Gmail Stats:');
console.log(`Total emails enviados: ${stats.total}`);
console.log(`Éxitos: ${stats.success}`);
console.log(`Fallos: ${stats.failed}`);
console.log(`Tasa de éxito: ${stats.successRate}%`);
console.log(`Latencia promedio: ${stats.avgLatencyMs}ms`);
```

---

## ✅ Checklist Final

- [ ] Variables de entorno configuradas
- [ ] Redirect URI añadido en Google Cloud Console
- [ ] Usuario conectó su cuenta Gmail (`/api/gmail/auth`)
- [ ] Tokens guardados en Firestore (`gmail_configs` collection)
- [ ] Email de prueba enviado exitosamente
- [ ] Emails listados correctamente
- [ ] Integración funcionando en producción

---

## 🎉 ¡Listo!

Tu integración de Gmail está completamente configurada y lista para usar en PRODUCCIÓN.

**Endpoints disponibles:**
- `GET /api/gmail/auth?userId=xxx` - Conectar cuenta Gmail
- `GET /api/gmail/callback` - Callback OAuth (automático)
- `GET /api/gmail/test` - Test en modo mock (desarrollo)

**Cliente disponible:**
```typescript
import { createGmailClient } from '@/server/integrations/gmail/client';

const gmail = await createGmailClient('user_123');
await gmail.sendEmail({ ... });
await gmail.listMessages({ ... });
```

¿Preguntas? Revisa `GMAIL_INTEGRATION_PROPOSAL.md` para más detalles.
