# Propuesta de Integración Gmail para Santa Brisa ERP

## Resumen Ejecutivo

Propuesta para integrar Gmail en el ERP de Santa Brisa, aprovechando la arquitectura de integraciones existente y potenciando la gestión de comunicaciones con clientes mediante sincronización bidireccional, automatización y análisis con IA.

---

## 1. Análisis del Proyecto

### 1.1 Arquitectura Actual de Integraciones

El proyecto ya cuenta con un sistema robusto de integraciones:

```
src/server/integrations/
├── base-integration.ts          # Clase base abstracta
├── integration-jobs.ts          # Sistema de tracking de jobs
├── integration-logger.ts        # Logging centralizado
├── holded/                      # Integración contabilidad
├── sendcloud/                   # Integración logística
└── shopify/                     # Integración e-commerce
```

**Características del sistema:**
- ✅ Clase base abstracta `BaseIntegration`
- ✅ Sistema de reintentos con exponential backoff
- ✅ Tracking de jobs en Firestore
- ✅ Logging estructurado de eventos y errores
- ✅ Modo mock para desarrollo
- ✅ Circuit breaker pattern implementado

### 1.2 Módulos que se Beneficiarían de Gmail

#### **Sales Pipeline** (`src/features/sales/pipeline/`)
- Registro automático de emails como interacciones
- Seguimiento de comunicaciones con cuentas
- Alertas de "sin contacto" más precisas
- Templates para prospección

#### **Tasks** (`src/features/tasks/`)
- Crear tareas desde emails
- Responder emails desde tareas
- Recordatorios por email

#### **Accounts & Contacts** (`src/features/accounts/`)
- Historial completo de comunicaciones
- Análisis de engagement por contacto
- Quick email desde ficha de cuenta

#### **Orders** (`src/features/orders/`)
- Confirmaciones de pedido por email
- Notificaciones de envío
- Facturas por email

#### **Quality** (`src/app/(app)/quality/`)
- Notificaciones de liberaciones de lotes
- Alertas de calidad por email
- Certificados por email

---

## 2. Propuesta de Funcionalidades

### 2.1 **Core: Sincronización Bidireccional**

#### **Inbound (Gmail → ERP)**
```typescript
// Sincronizar emails recibidos como interacciones
{
  id: 'interaction_123',
  kind: 'EMAIL_RECEIVED',
  accountId: 'acc_456',
  contactId: 'contact_789',
  date: '2025-01-19T10:30:00Z',
  subject: 'Consulta sobre pedido #1234',
  body: 'Estimados...',
  gmailMessageId: '<message@gmail.com>',
  gmailThreadId: 'thread_abc',
  sentimentScore: 0.8, // IA analysis
  priority: 'high',
  tags: ['pedido', 'urgente'],
  attachments: [
    { name: 'cotización.pdf', url: 'gs://...' }
  ]
}
```

**Características:**
- Webhook de Gmail API para sincronización en tiempo real
- Parsing inteligente para identificar cuentas/contactos
- Extracción de entidades (pedidos, productos, fechas)
- Análisis de sentimiento con Gemini
- Clasificación automática (prospección, soporte, reclamo)
- Detección de urgencia

#### **Outbound (ERP → Gmail)**
```typescript
// Enviar emails desde el ERP
await gmailClient.sendEmail({
  to: ['cliente@example.com'],
  cc: ['comercial@santabrisa.com'],
  subject: 'Confirmación de pedido #1234',
  body: renderTemplate('order-confirmation', { order }),
  accountId: 'acc_456',
  trackOpens: true,
  trackClicks: true,
  scheduledAt: '2025-01-20T09:00:00Z', // Opcional
})
```

**Características:**
- Envío directo desde módulos del ERP
- Sistema de templates con variables
- Tracking de apertura y clicks
- Programación de envíos
- Adjuntar PDFs generados (facturas, albaranes)
- Registro automático como interacción

### 2.2 **Templates de Email**

Sistema de templates reutilizables con variables:

```typescript
// Templates organizados por categoría
const emailTemplates = {
  sales: {
    prospection: {
      subject: 'Hola {contactName}, te presentamos Santa Brisa',
      body: `...`,
      variables: ['contactName', 'accountName', 'salesRepName']
    },
    followUp: {
      subject: 'Seguimiento: {subject}',
      body: `...`,
    },
    quote: {
      subject: 'Cotización #{quoteNumber}',
      body: `...`,
      attachments: ['quote.pdf']
    }
  },
  orders: {
    confirmation: { /* ... */ },
    shipmentNotification: { /* ... */ },
    deliveryConfirmation: { /* ... */ }
  },
  quality: {
    lotRelease: { /* ... */ },
    qualityAlert: { /* ... */ },
    certificate: { /* ... */ }
  }
}
```

### 2.3 **Inbox Inteligente en el ERP**

Vista centralizada de emails en el ERP:

```
/app/(app)/communications/inbox
├── page.tsx                    # Vista principal del inbox
├── components/
│   ├── EmailList.tsx          # Lista de emails
│   ├── EmailDetail.tsx        # Detalle de email
│   ├── ComposeDrawer.tsx      # Composer de email
│   └── EmailFilters.tsx       # Filtros inteligentes
```

**Características:**
- Ver emails recibidos y enviados
- Responder directamente desde el ERP
- Crear tareas desde emails (drag & drop)
- Vincular emails a cuentas/pedidos
- Búsqueda full-text
- Filtros: sin responder, importantes, por cuenta

### 2.4 **IA con Gemini**

Aprovechar la integración existente de Gemini:

#### **Respuestas Sugeridas**
```typescript
// Sugerir respuestas basadas en contexto
const suggestions = await geminiClient.suggestEmailResponse({
  email: incomingEmail,
  accountContext: accountData,
  orderContext: recentOrders,
  interactionHistory: pastInteractions
})
```

#### **Clasificación Automática**
```typescript
// Clasificar y priorizar emails
const classification = await geminiClient.classifyEmail({
  subject: email.subject,
  body: email.body,
  sender: email.from
})
// => { category: 'support', priority: 'high', sentiment: 'negative' }
```

#### **Extracción de Información**
```typescript
// Extraer pedidos, productos, fechas mencionados
const entities = await geminiClient.extractEmailEntities(email)
// => { orders: ['#1234'], products: ['SKU-001'], dates: [...] }
```

#### **Resumen de Threads**
```typescript
// Resumir hilos largos
const summary = await geminiClient.summarizeEmailThread(thread)
// => "Cliente pregunta sobre plazo de entrega del pedido #1234..."
```

### 2.5 **Notificaciones Automáticas**

Sistema de notificaciones configurables:

```typescript
// Configuración por usuario
const emailNotifications = {
  newOrder: { enabled: true, template: 'order-confirmation' },
  shipmentReady: { enabled: true, template: 'shipment-notification' },
  qualityAlert: { enabled: true, template: 'quality-alert' },
  taskAssigned: { enabled: true, template: 'task-assignment' },
  accountActivity: { enabled: false }
}
```

### 2.6 **Analytics de Email**

Dashboard de métricas:

```typescript
{
  sent: 1250,
  opened: 875,      // 70% open rate
  clicked: 320,     // 25.6% click rate
  replied: 180,     // 14.4% reply rate
  bounced: 15,      // 1.2% bounce rate
  
  byTemplate: {
    'order-confirmation': { sent: 450, opened: 425, clicked: 180 },
    'prospection': { sent: 300, opened: 150, clicked: 45 }
  },
  
  bySalesRep: {
    'user_123': { sent: 400, avgResponseTime: '2.5h' },
    'user_456': { sent: 350, avgResponseTime: '4.1h' }
  }
}
```

---

## 3. Arquitectura Técnica

### 3.1 Estructura de Archivos Propuesta

```
src/server/integrations/gmail/
├── client.ts                   # GmailIntegration class
├── auth.ts                     # OAuth2 flow
├── webhooks.ts                 # Gmail push notifications
├── templates.ts                # Email templates engine
├── parser.ts                   # Email parsing utilities
├── tracker.ts                  # Open/click tracking
├── sync.ts                     # Sync service
└── types.ts                    # TypeScript types

src/features/communications/
├── components/
│   ├── EmailList.tsx
│   ├── EmailDetail.tsx
│   ├── ComposeDrawer.tsx
│   ├── TemplateSelector.tsx
│   └── EmailFilters.tsx
├── hooks/
│   ├── useEmails.ts
│   ├── useEmailThread.ts
│   └── useComposer.ts
└── utils/
    ├── email-formatting.ts
    └── email-validation.ts

src/server/actions/
└── email.actions.ts            # Server actions

src/app/(app)/communications/
├── inbox/
│   └── page.tsx
├── sent/
│   └── page.tsx
├── templates/
│   └── page.tsx
└── analytics/
    └── page.tsx

src/lib/gmail/
├── gmail-helpers.ts
└── gmail-types.ts
```

### 3.2 Clase `GmailIntegration`

```typescript
// src/server/integrations/gmail/client.ts
import { BaseIntegration, type IntegrationConfig } from '../base-integration';
import { google } from 'googleapis';
import type { GmailMessage, GmailThread, SendEmailParams } from './types';

export class GmailIntegration extends BaseIntegration {
  private gmail: any;
  
  constructor(config: IntegrationConfig & { refreshToken: string }) {
    super(config);
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });
    
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }
  
  protected getProviderName() {
    return 'gmail' as const;
  }
  
  /**
   * Enviar email
   */
  async sendEmail(params: SendEmailParams): Promise<GmailMessage> {
    const { to, cc, bcc, subject, body, attachments, accountId } = params;
    
    const message = this.createMimeMessage({
      to, cc, bcc, subject, body, attachments
    });
    
    const response = await this.call<GmailMessage>(
      '/users/me/messages/send',
      'POST',
      { raw: Buffer.from(message).toString('base64url') }
    );
    
    if (response.success && response.data) {
      // Registrar como interacción
      await this.registerEmailAsInteraction({
        gmailMessageId: response.data.id,
        accountId,
        kind: 'EMAIL_SENT',
        subject,
        body
      });
    }
    
    return response.data!;
  }
  
  /**
   * Listar mensajes
   */
  async listMessages(params: {
    query?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
    const response = await this.call<any>(
      '/users/me/messages',
      'GET',
      params
    );
    
    return response.data || { messages: [] };
  }
  
  /**
   * Obtener mensaje completo
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    const response = await this.call<GmailMessage>(
      `/users/me/messages/${messageId}`,
      'GET',
      { format: 'full' }
    );
    
    return response.data!;
  }
  
  /**
   * Obtener thread completo
   */
  async getThread(threadId: string): Promise<GmailThread> {
    const response = await this.call<GmailThread>(
      `/users/me/threads/${threadId}`,
      'GET',
      { format: 'full' }
    );
    
    return response.data!;
  }
  
  /**
   * Marcar como leído
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.call(
      `/users/me/messages/${messageId}/modify`,
      'POST',
      { removeLabelIds: ['UNREAD'] }
    );
  }
  
  /**
   * Configurar webhook (push notifications)
   */
  async setupPushNotifications(topicName: string): Promise<void> {
    await this.call(
      '/users/me/watch',
      'POST',
      {
        topicName,
        labelIds: ['INBOX', 'SENT']
      }
    );
  }
  
  // ... métodos auxiliares privados
  
  private createMimeMessage(params: any): string {
    // Implementación de MIME message builder
    // ...
  }
  
  private async registerEmailAsInteraction(params: any): Promise<void> {
    // Crear documento en collection 'interactions'
    // ...
  }
  
  protected async mockCall(endpoint: string, method: string, data?: any) {
    // Mock responses para desarrollo
    return { success: true, data: { id: 'mock_message_123' } };
  }
}
```

### 3.3 Servicio de Sincronización

```typescript
// src/server/integrations/gmail/sync.ts
import { GmailIntegration } from './client';
import { adminDb as db } from '@/server/firebase';
import type { Interaction } from '@/domain/ssot';

export class GmailSyncService {
  constructor(private gmail: GmailIntegration) {}
  
  /**
   * Sincronizar emails nuevos
   */
  async syncNewEmails(userId: string): Promise<number> {
    // Obtener último historyId sincronizado
    const lastSyncDoc = await db
      .collection('gmail_sync_state')
      .doc(userId)
      .get();
    
    const lastHistoryId = lastSyncDoc.data()?.historyId || '1';
    
    // Obtener cambios desde último sync
    const history = await this.gmail.call<any>(
      `/users/me/history`,
      'GET',
      { startHistoryId: lastHistoryId }
    );
    
    if (!history.data?.history) {
      return 0;
    }
    
    // Procesar mensajes nuevos
    let synced = 0;
    for (const record of history.data.history) {
      if (record.messagesAdded) {
        for (const msgRef of record.messagesAdded) {
          await this.processNewEmail(msgRef.message.id, userId);
          synced++;
        }
      }
    }
    
    // Actualizar historyId
    await db
      .collection('gmail_sync_state')
      .doc(userId)
      .set({ 
        historyId: history.data.historyId,
        lastSyncAt: new Date().toISOString()
      });
    
    return synced;
  }
  
  /**
   * Procesar un email nuevo
   */
  private async processNewEmail(messageId: string, userId: string): Promise<void> {
    const message = await this.gmail.getMessage(messageId);
    
    // Parsear email
    const parsed = this.parseGmailMessage(message);
    
    // Identificar cuenta/contacto
    const account = await this.identifyAccount(parsed.from);
    
    // Analizar con IA
    const analysis = await this.analyzeWithAI(parsed);
    
    // Crear interacción
    const interaction: Interaction = {
      id: `gmail_${messageId}`,
      kind: 'EMAIL_RECEIVED',
      accountId: account?.id,
      contactId: account?.primaryContactId,
      userId,
      date: parsed.date,
      subject: parsed.subject,
      body: parsed.body,
      metadata: {
        gmailMessageId: messageId,
        gmailThreadId: message.threadId,
        sentiment: analysis.sentiment,
        priority: analysis.priority,
        category: analysis.category,
        entities: analysis.entities
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('interactions').doc(interaction.id).set(interaction);
    
    // Si requiere acción, crear tarea
    if (analysis.requiresAction) {
      await this.createTaskFromEmail(interaction, analysis);
    }
  }
  
  private parseGmailMessage(message: any) {
    // Implementar parsing de headers y body
    // ...
  }
  
  private async identifyAccount(fromEmail: string) {
    // Buscar cuenta por email
    // ...
  }
  
  private async analyzeWithAI(parsed: any) {
    // Usar Gemini para análisis
    // ...
  }
  
  private async createTaskFromEmail(interaction: Interaction, analysis: any) {
    // Crear tarea si es necesario
    // ...
  }
}
```

### 3.4 Sistema de Templates

```typescript
// src/server/integrations/gmail/templates.ts
import Handlebars from 'handlebars';

export interface EmailTemplate {
  id: string;
  category: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  attachments?: string[];
}

export class EmailTemplateEngine {
  private templates: Map<string, EmailTemplate> = new Map();
  
  constructor() {
    this.loadTemplates();
  }
  
  render(templateId: string, variables: Record<string, any>): {
    subject: string;
    bodyHtml: string;
    bodyText: string;
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const subjectTemplate = Handlebars.compile(template.subject);
    const htmlTemplate = Handlebars.compile(template.bodyHtml);
    const textTemplate = Handlebars.compile(template.bodyText);
    
    return {
      subject: subjectTemplate(variables),
      bodyHtml: htmlTemplate(variables),
      bodyText: textTemplate(variables)
    };
  }
  
  private loadTemplates() {
    // Cargar templates desde Firestore o archivo
    // ...
  }
}
```

### 3.5 Webhooks de Gmail

```typescript
// src/app/api/webhooks/gmail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GmailSyncService } from '@/server/integrations/gmail/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar webhook de Gmail
    const { message } = body;
    const data = JSON.parse(
      Buffer.from(message.data, 'base64').toString('utf-8')
    );
    
    const { emailAddress, historyId } = data;
    
    // Buscar usuario por email
    const user = await findUserByEmail(emailAddress);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Sincronizar cambios
    const syncService = new GmailSyncService(user.gmailClient);
    await syncService.syncNewEmails(user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Gmail Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 4. Plan de Implementación

### Fase 1: Fundamentos (2-3 semanas)

#### Sprint 1.1: Setup OAuth y Cliente Base
- [ ] Configurar proyecto en Google Cloud Console
- [ ] Implementar OAuth2 flow
- [ ] Crear `GmailIntegration` extendiendo `BaseIntegration`
- [ ] Configurar scopes necesarios
- [ ] Implementar refresh token management
- [ ] Testing básico de envío de emails

#### Sprint 1.2: Sincronización Básica
- [ ] Implementar `GmailSyncService`
- [ ] Configurar webhooks de Gmail
- [ ] Crear endpoint `/api/webhooks/gmail`
- [ ] Parsing de emails recibidos
- [ ] Almacenar en colección `interactions`
- [ ] Testing de sincronización

### Fase 2: Templates y Envío (2 semanas)

#### Sprint 2.1: Sistema de Templates
- [ ] Crear `EmailTemplateEngine`
- [ ] Diseñar templates iniciales:
  - Confirmación de pedido
  - Notificación de envío
  - Prospección comercial
  - Seguimiento
- [ ] UI para gestión de templates
- [ ] Preview de templates

#### Sprint 2.2: Envío desde el ERP
- [ ] Botones "Enviar Email" en módulos clave
- [ ] Composer drawer con templates
- [ ] Validación de emails
- [ ] Adjuntar PDFs (facturas, albaranes)
- [ ] Programación de envíos

### Fase 3: Inbox Inteligente (2-3 semanas)

#### Sprint 3.1: Vista de Inbox
- [ ] Página `/communications/inbox`
- [ ] Lista de emails con filtros
- [ ] Detalle de email con thread
- [ ] Marcar como leído/no leído
- [ ] Responder desde el ERP

#### Sprint 3.2: Vinculación Inteligente
- [ ] Auto-link emails a cuentas/pedidos
- [ ] Crear tareas desde emails (drag & drop)
- [ ] Búsqueda full-text
- [ ] Filtros avanzados

### Fase 4: IA y Analytics (2 semanas)

#### Sprint 4.1: Integración con Gemini
- [ ] Análisis de sentimiento
- [ ] Clasificación automática
- [ ] Extracción de entidades
- [ ] Respuestas sugeridas
- [ ] Resumen de threads

#### Sprint 4.2: Analytics
- [ ] Dashboard de métricas
- [ ] Tracking de apertura/clicks
- [ ] Reportes por template
- [ ] Reportes por usuario
- [ ] Insights con IA

### Fase 5: Automatizaciones (1-2 semanas)

#### Sprint 5.1: Notificaciones Automáticas
- [ ] Configuración de notificaciones por usuario
- [ ] Triggers automáticos:
  - Nuevo pedido → Confirmación
  - Pedido enviado → Tracking
  - Lote liberado → Notificación
  - Tarea asignada → Email

#### Sprint 5.2: Workflows
- [ ] Auto-respuestas para ausencias
- [ ] Reglas de clasificación
- [ ] Asignación automática de tareas
- [ ] Escalación de prioridad

---

## 5. Consideraciones Técnicas

### 5.1 Seguridad

```typescript
// Scopes necesarios de Gmail API
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',        // Enviar emails
  'https://www.googleapis.com/auth/gmail.readonly',    // Leer emails
  'https://www.googleapis.com/auth/gmail.modify',      // Modificar labels
  'https://www.googleapis.com/auth/gmail.compose',     // Componer drafts
];

// Almacenar tokens encriptados
const encryptedTokens = await encrypt(refreshToken, process.env.ENCRYPTION_KEY);
```

### 5.2 Rate Limits

Gmail API tiene límites:
- 250 mensajes/segundo
- 1B mensajes/día
- Cuota por usuario

Estrategia:
- Usar el rate limiter existente del proyecto
- Implementar queue para envíos masivos
- Monitorear cuotas en tiempo real

### 5.3 Costos

Gmail API es **gratuita** pero tiene límites. Para volumen alto:
- Considerar Google Workspace (límites más altos)
- Implementar caching agresivo
- Sincronización incremental eficiente

### 5.4 Privacidad

- Cumplir con GDPR
- Encriptar tokens y emails sensibles
- Permitir opt-out de tracking
- Retención de datos configurable

---

## 6. Métricas de Éxito

### KPIs a Medir

1. **Adopción**
   - % de usuarios usando Gmail desde el ERP
   - Emails enviados por usuario/día
   - Templates más usados

2. **Eficiencia**
   - Tiempo medio de respuesta a emails
   - % de emails con respuesta en <24h
   - Reducción de emails no respondidos

3. **Calidad**
   - Open rate de emails enviados
   - Click rate en emails con CTAs
   - % de emails que generan conversión

4. **Automatización**
   - % de emails clasificados automáticamente
   - % de tareas creadas automáticamente desde emails
   - Tiempo ahorrado por automatización

### Objetivos Q1 2025

- ✅ 80% de comerciales usando inbox del ERP
- ✅ 90% de emails confirmación pedido abiertos
- ✅ <2h tiempo medio de respuesta
- ✅ 40% de emails con IA classification accuracy >95%

---

## 7. Alternativas Consideradas

### SendGrid / Mailgun
- ❌ Solo para transaccional, no sync bidireccional
- ✅ Más simple para notificaciones
- **Decisión:** Usar para emails masivos/marketing

### Microsoft Graph API (Outlook)
- ✅ Similar a Gmail API
- ❌ Mayoría de clientes usa Gmail
- **Decisión:** Implementar después si hay demanda

### Nylas / Context.io
- ✅ Abstracción sobre múltiples providers
- ❌ Costo adicional
- **Decisión:** No necesario ahora, Gmail API suficiente

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Rate limits de Gmail API | Media | Alto | Implementar queue y rate limiter |
| Tokens expirados | Alta | Medio | Auto-refresh tokens, alertas |
| Emails mal clasificados | Media | Bajo | Revisión humana, mejorar prompts IA |
| Webhooks perdidos | Baja | Alto | Polling backup cada 15min |
| Privacidad/GDPR | Baja | Alto | Auditoría legal, encriptación |

---

## 9. Roadmap Futuro

### Q2 2025
- [ ] Integración con Microsoft Outlook
- [ ] Email campaigns con segmentación
- [ ] A/B testing de templates
- [ ] Análisis predictivo con IA (mejor momento para contactar)

### Q3 2025
- [ ] Chatbot con respuestas automáticas
- [ ] Integración con WhatsApp Business
- [ ] Multi-idioma con traducción automática
- [ ] Voice-to-email con transcripción

### Q4 2025
- [ ] CRM completo con email como centro
- [ ] Pipeline automation basada en emails
- [ ] Advanced analytics con ML
- [ ] Mobile app con push notifications

---

## 10. Conclusión

La integración de Gmail en Santa Brisa ERP potenciará significativamente la gestión de comunicaciones con clientes, aprovechando:

1. **Arquitectura Existente:** BaseIntegration, jobs, logging
2. **IA con Gemini:** Clasificación, análisis, respuestas sugeridas
3. **Módulos del ERP:** Sales, Orders, Quality se benefician inmediatamente

**ROI Esperado:**
- ⏱️ **30% reducción** en tiempo de gestión de emails
- 📈 **50% mejora** en tasa de respuesta a clientes
- 🤖 **70% de tareas** creadas automáticamente
- 💰 **20% aumento** en conversión de pipeline por mejor seguimiento

**Esfuerzo Total:** ~8-10 semanas para implementación completa
**Complejidad:** Media (aprovecha infraestructura existente)
**Prioridad:** Alta (impacto directo en ventas y servicio)

---

**Próximos Pasos:**
1. Validar propuesta con stakeholders
2. Configurar proyecto en Google Cloud Console
3. Definir templates iniciales con equipo comercial
4. Iniciar Fase 1: Sprint 1.1 (OAuth y cliente base)
