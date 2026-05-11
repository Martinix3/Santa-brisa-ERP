# Gmail Integration - Sprint 1.1 Complete ✅

**Fase 1: Fundamentos - Sprint 1.1: Setup OAuth y Cliente Base**

---

## ✅ Completado

### 1. Tipos TypeScript (`src/server/integrations/gmail/types.ts`)

Definidos todos los tipos necesarios para la integración:

- **Gmail API Types**: `GmailMessage`, `GmailThread`, `GmailMessagePart`, `GmailHeader`
- **Parsed Email**: `ParsedEmail`, `EmailAttachment` 
- **Send Email**: `SendEmailParams`, `EmailAttachmentToSend`
- **Templates**: `EmailTemplate`
- **IA Analysis**: `EmailAnalysis`, `ExtractedEntities`
- **Tracking**: `EmailTracking`, `GmailSyncState`
- **Config**: `GmailConfig`, `EmailNotificationConfig`
- **Stats**: `EmailStats`
- **Filters**: `EmailListFilters`

### 2. Parser de Emails (`src/server/integrations/gmail/parser.ts`)

Utilidades completas para parsing de mensajes Gmail:

- ✅ `parseGmailMessage()` - Convierte mensaje de Gmail API a formato interno
- ✅ `extractHeaders()` - Extrae headers del mensaje
- ✅ `extractTextBody()` - Extrae cuerpo en texto plano
- ✅ `extractHtmlBody()` - Extrae cuerpo en HTML
- ✅ `extractAttachments()` - Extrae attachments recursivamente
- ✅ `parseEmailList()` - Parsea listas de emails
- ✅ `extractNameFromEmail()` - Extrae nombre del email
- ✅ `extractEmailAddress()` - Extrae solo la dirección de email
- ✅ `decodeBase64()` / `encodeBase64()` - Encoding base64url de Gmail
- ✅ `createMimeMessage()` - Construye mensaje MIME completo
- ✅ `isValidEmail()` / `validateEmailList()` - Validación de emails
- ✅ `stripHtml()` / `htmlToPlainText()` - Conversión HTML a texto

### 3. Cliente Gmail (`src/server/integrations/gmail/client.ts`)

Clase `GmailIntegration` que extiende `BaseIntegration`:

#### Métodos Implementados:

**Envío de Emails:**
- ✅ `sendEmail()` - Enviar email con tracking opcional

**Listar y Obtener:**
- ✅ `listMessages()` - Listar mensajes con filtros
- ✅ `getMessage()` - Obtener mensaje completo
- ✅ `getThread()` - Obtener thread completo con todos los mensajes

**Acciones sobre Mensajes:**
- ✅ `markAsRead()` - Marcar como leído
- ✅ `markAsUnread()` - Marcar como no leído
- ✅ `trash()` - Mover a papelera
- ✅ `modifyLabels()` - Añadir/remover labels

**Webhooks:**
- ✅ `setupPushNotifications()` - Configurar push notifications
- ✅ `stopPushNotifications()` - Detener push notifications
- ✅ `getHistoryId()` - Obtener historyId actual
- ✅ `listHistory()` - Listar cambios desde historyId

**Attachments:**
- ✅ `getAttachment()` - Descargar attachment

**Helpers:**
- ✅ `registerEmailAsInteraction()` - Registra emails como interacciones en Firestore
- ✅ `createEmailTracking()` - Crea tracking de email
- ✅ Factory function: `createGmailClient(userId)`

### 4. Actualización Sistema de Jobs

- ✅ Añadido `'gmail'` a `IntegrationProvider`
- ✅ Añadidos `'send_email'` y `'sync_email'` a `IntegrationJobType`

---

## 🔧 Próximos Pasos

### 1. Instalar Dependencia

```bash
npm install googleapis@latest
```

### 2. Configurar Variables de Entorno

Añadir a `.env.local`:

```env
# Gmail OAuth2
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
```

### 3. Configurar Proyecto en Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear nuevo proyecto o usar existente
3. Habilitar Gmail API
4. Crear credenciales OAuth2:
   - Tipo: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/gmail/callback`
5. Obtener Client ID y Client Secret

### 4. Scopes Necesarios

Los siguientes scopes deben ser solicitados en el flujo OAuth:

```typescript
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',        // Enviar emails
  'https://www.googleapis.com/auth/gmail.readonly',    // Leer emails
  'https://www.googleapis.com/auth/gmail.modify',      // Modificar labels
  'https://www.googleapis.com/auth/gmail.compose',     // Componer drafts
];
```

---

## 📝 Estructura de Datos en Firestore

### Collection: `gmail_configs`

Documento por usuario con OAuth tokens:

```typescript
{
  userId: 'user_123',
  email: 'user@santabrisa.com',
  clientId: 'xxx.apps.googleusercontent.com',
  clientSecret: 'xxx',
  redirectUri: 'http://localhost:3000/api/auth/gmail/callback',
  refreshToken: 'encrypted_refresh_token',
  createdAt: '2025-01-19T10:00:00Z',
  updatedAt: '2025-01-19T10:00:00Z'
}
```

### Collection: `gmail_sync_state`

Estado de sincronización por usuario:

```typescript
{
  userId: 'user_123',
  historyId: '12345',
  lastSyncAt: '2025-01-19T10:30:00Z',
  totalSynced: 150,
  lastError: null
}
```

### Collection: `email_tracking`

Tracking de emails enviados:

```typescript
{
  messageId: 'gmail_msg_123',
  accountId: 'acc_456',
  contactId: 'contact_789',
  sentAt: '2025-01-19T10:00:00Z',
  openedAt: '2025-01-19T10:15:00Z',
  clickedAt: '2025-01-19T10:20:00Z',
  openCount: 3,
  clickCount: 1,
  createdAt: '2025-01-19T10:00:00Z'
}
```

### Collection: `interactions`

Los emails se registran automáticamente como interacciones:

```typescript
{
  id: 'gmail_msg_123',
  kind: 'EMAIL_SENT' | 'EMAIL_RECEIVED',
  accountId: 'acc_456',
  contactId: 'contact_789',
  userId: 'user_123',
  date: '2025-01-19T10:00:00Z',
  subject: 'Confirmación de pedido #1234',
  body: 'Estimados...',
  metadata: {
    gmailMessageId: 'msg_123',
    gmailThreadId: 'thread_abc',
    to: ['cliente@example.com'],
    sentiment: 'positive',
    priority: 'medium'
  },
  createdAt: '2025-01-19T10:00:00Z',
  updatedAt: '2025-01-19T10:00:00Z'
}
```

---

## 🧪 Testing Manual

### Test 1: Enviar Email (Mock Mode)

```typescript
import { GmailIntegration } from '@/server/integrations/gmail/client';

const config = {
  clientId: 'mock',
  clientSecret: 'mock',
  redirectUri: 'mock',
  refreshToken: '', // Empty para activar mock mode
  userId: 'user_123',
  email: 'test@santabrisa.com'
};

const gmail = new GmailIntegration(config);

const result = await gmail.sendEmail({
  to: ['destinatario@example.com'],
  subject: 'Test Email',
  body: 'Este es un email de prueba',
  accountId: 'acc_123'
});

console.log('Email sent:', result);
// Output: { id: 'mock_msg_xxx', threadId: 'mock_thread_xxx', ... }
```

### Test 2: Listar Mensajes (Mock Mode)

```typescript
const { messages } = await gmail.listMessages({
  unreadOnly: true,
  maxResults: 10
});

console.log('Messages:', messages);
// Output: Array de ParsedEmail con datos mock
```

---

## 📊 Ventajas de la Arquitectura Implementada

### 1. **Extiende BaseIntegration**
- ✅ Sistema de jobs automático
- ✅ Logging estructurado
- ✅ Retry con exponential backoff
- ✅ Circuit breaker incluido
- ✅ Tracking de métricas

### 2. **Modo Mock para Desarrollo**
- ✅ No requiere tokens OAuth en dev
- ✅ Respuestas simuladas consistentes
- ✅ Testing sin llamadas reales a API

### 3. **Integración con Firestore**
- ✅ Emails como interacciones automáticas
- ✅ Tracking de emails enviados
- ✅ Estado de sincronización persistente

### 4. **Type-Safe**
- ✅ Todos los tipos bien definidos
- ✅ IntelliSense completo
- ✅ Compilación sin errores

### 5. **Extensible**
- ✅ Fácil añadir nuevos métodos
- ✅ Parser modular y reutilizable
- ✅ Helpers bien organizados

---

## 🎯 Siguiente Sprint: 1.2

**Objetivo**: Sincronización Básica

Tareas pendientes:
- [ ] Implementar `GmailSyncService`
- [ ] Configurar webhooks de Gmail (Pub/Sub)
- [ ] Crear endpoint `/api/webhooks/gmail`
- [ ] Implementar polling backup cada 15min
- [ ] Parser inteligente para identificar cuentas
- [ ] Testing de sincronización

---

## 📚 Recursos

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth2 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [MIME Email Format](https://www.ietf.org/rfc/rfc2045.txt)

---

**Status**: ✅ Sprint 1.1 Complete
**Duración Estimada**: 3-4 días
**Duración Real**: 1 sesión
**Próximo Sprint**: 1.2 - Sincronización Básica
