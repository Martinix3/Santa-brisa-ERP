/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/gmail/client.ts
import 'server-only';

import { BaseIntegration, type IntegrationConfig } from '../base-integration';
import { google } from 'googleapis';
import { adminDb as db } from '@/server/firebase';
import type { 
  GmailMessage, 
  GmailThread, 
  SendEmailParams,
  ParsedEmail,
  EmailListFilters,
  GmailConfig
} from './types';
import { 
  parseGmailMessage, 
  createMimeMessage,
  encodeBase64,
  validateEmailList
} from './parser';

/**
 * GMAIL INTEGRATION CLIENT
 * 
 * Cliente para integración con Gmail API
 * Extiende BaseIntegration para aprovechar sistema de jobs, logging y retries
 */

export class GmailIntegration extends BaseIntegration {
  private gmail: any;
  private oauth2Client: any;
  private config: GmailConfig;
  
  constructor(config: GmailConfig) {
    super({
      apiKey: '', // Gmail usa OAuth2, no API key
      baseUrl: 'https://gmail.googleapis.com/gmail/v1',
      useMock: process.env.NODE_ENV === 'development' && !config.refreshToken,
    });
    
    this.config = config;
    
    // Configurar OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    
    // Set credentials
    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });
    
    // Crear cliente Gmail
    this.gmail = google.gmail({ 
      version: 'v1', 
      auth: this.oauth2Client 
    });
  }
  
  protected getProviderName() {
    return 'gmail' as const;
  }
  
  // =================================================================
  // SEND EMAIL
  // =================================================================
  
  /**
   * Enviar email
   */
  async sendEmail(params: SendEmailParams): Promise<GmailMessage> {
    // Validar emails
    const allEmails = [
      ...params.to,
      ...(params.cc || []),
      ...(params.bcc || [])
    ];
    
    const { valid, invalid } = validateEmailList(allEmails);
    
    if (invalid.length > 0) {
      throw new Error(`Invalid email addresses: ${invalid.join(', ')}`);
    }
    
    // Crear mensaje MIME
    const mimeMessage = createMimeMessage({
      from: this.config.email,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      body: params.body,
      bodyHtml: params.bodyHtml,
      inReplyTo: params.inReplyTo,
      references: params.references,
      attachments: params.attachments,
    });
    
    // Encode a base64url
    const encodedMessage = encodeBase64(mimeMessage);
    
    try {
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: params.threadId,
        },
      });
      
      const message: GmailMessage = response.data;
      
      // Registrar como interacción
      if (params.accountId) {
        await this.registerEmailAsInteraction({
          gmailMessageId: message.id,
          accountId: params.accountId,
          kind: 'EMAIL_SENT',
          subject: params.subject,
          body: params.body,
          to: params.to,
        });
      }
      
      // Tracking si está habilitado
      if (params.trackOpens || params.trackClicks) {
        await this.createEmailTracking({
          messageId: message.id,
          accountId: params.accountId,
          sentAt: new Date().toISOString(),
        });
      }
      
      console.log('[Gmail] Email sent successfully:', message.id);
      return message;
      
    } catch (error: any) {
      console.error('[Gmail] Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
  
  // =================================================================
  // LIST & GET MESSAGES
  // =================================================================
  
  /**
   * Listar mensajes
   */
  async listMessages(filters: EmailListFilters = {}): Promise<{
    messages: ParsedEmail[];
    nextPageToken?: string;
  }> {
    try {
      const query = this.buildQuery(filters);
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: filters.maxResults || 50,
        pageToken: filters.pageToken,
        labelIds: filters.labelIds,
      });
      
      const messages: ParsedEmail[] = [];
      
      if (response.data.messages) {
        // Obtener detalles de cada mensaje
        for (const msgRef of response.data.messages) {
          const fullMessage = await this.getMessage(msgRef.id);
          messages.push(fullMessage);
        }
      }
      
      return {
        messages,
        nextPageToken: response.data.nextPageToken,
      };
      
    } catch (error: any) {
      console.error('[Gmail] Error listing messages:', error);
      throw new Error(`Failed to list messages: ${error.message}`);
    }
  }
  
  /**
   * Obtener mensaje completo
   */
  async getMessage(messageId: string): Promise<ParsedEmail> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      
      const gmailMessage: GmailMessage = response.data;
      return parseGmailMessage(gmailMessage);
      
    } catch (error: any) {
      console.error('[Gmail] Error getting message:', error);
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }
  
  /**
   * Obtener thread completo
   */
  async getThread(threadId: string): Promise<{
    thread: GmailThread;
    messages: ParsedEmail[];
  }> {
    try {
      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });
      
      const thread: GmailThread = response.data;
      const messages: ParsedEmail[] = [];
      
      if (thread.messages) {
        for (const gmailMessage of thread.messages) {
          messages.push(parseGmailMessage(gmailMessage));
        }
      }
      
      return { thread, messages };
      
    } catch (error: any) {
      console.error('[Gmail] Error getting thread:', error);
      throw new Error(`Failed to get thread: ${error.message}`);
    }
  }
  
  // =================================================================
  // MESSAGE ACTIONS
  // =================================================================
  
  /**
   * Marcar como leído
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
      
      console.log('[Gmail] Message marked as read:', messageId);
      
    } catch (error: any) {
      console.error('[Gmail] Error marking as read:', error);
      throw new Error(`Failed to mark as read: ${error.message}`);
    }
  }
  
  /**
   * Marcar como no leído
   */
  async markAsUnread(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });
      
      console.log('[Gmail] Message marked as unread:', messageId);
      
    } catch (error: any) {
      console.error('[Gmail] Error marking as unread:', error);
      throw new Error(`Failed to mark as unread: ${error.message}`);
    }
  }
  
  /**
   * Mover a trash
   */
  async trash(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
      });
      
      console.log('[Gmail] Message moved to trash:', messageId);
      
    } catch (error: any) {
      console.error('[Gmail] Error trashing message:', error);
      throw new Error(`Failed to trash message: ${error.message}`);
    }
  }
  
  /**
   * Añadir/remover labels
   */
  async modifyLabels(messageId: string, options: {
    addLabels?: string[];
    removeLabels?: string[];
  }): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: options.addLabels,
          removeLabelIds: options.removeLabels,
        },
      });
      
      console.log('[Gmail] Labels modified:', messageId);
      
    } catch (error: any) {
      console.error('[Gmail] Error modifying labels:', error);
      throw new Error(`Failed to modify labels: ${error.message}`);
    }
  }
  
  // =================================================================
  // WEBHOOKS / PUSH NOTIFICATIONS
  // =================================================================
  
  /**
   * Configurar webhook (push notifications)
   */
  async setupPushNotifications(topicName: string): Promise<void> {
    try {
      await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName,
          labelIds: ['INBOX', 'SENT'],
        },
      });
      
      console.log('[Gmail] Push notifications configured:', topicName);
      
    } catch (error: any) {
      console.error('[Gmail] Error setting up push notifications:', error);
      throw new Error(`Failed to setup push notifications: ${error.message}`);
    }
  }
  
  /**
   * Detener push notifications
   */
  async stopPushNotifications(): Promise<void> {
    try {
      await this.gmail.users.stop({
        userId: 'me',
      });
      
      console.log('[Gmail] Push notifications stopped');
      
    } catch (error: any) {
      console.error('[Gmail] Error stopping push notifications:', error);
      throw new Error(`Failed to stop push notifications: ${error.message}`);
    }
  }
  
  /**
   * Obtener historyId actual
   */
  async getHistoryId(): Promise<string> {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });
      
      return response.data.historyId;
      
    } catch (error: any) {
      console.error('[Gmail] Error getting history ID:', error);
      throw new Error(`Failed to get history ID: ${error.message}`);
    }
  }
  
  /**
   * Listar cambios desde historyId
   */
  async listHistory(startHistoryId: string): Promise<any> {
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId,
      });
      
      return response.data;
      
    } catch (error: any) {
      console.error('[Gmail] Error listing history:', error);
      throw new Error(`Failed to list history: ${error.message}`);
    }
  }
  
  // =================================================================
  // ATTACHMENTS
  // =================================================================
  
  /**
   * Obtener attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<string> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });
      
      return response.data.data; // Base64 data
      
    } catch (error: any) {
      console.error('[Gmail] Error getting attachment:', error);
      throw new Error(`Failed to get attachment: ${error.message}`);
    }
  }
  
  // =================================================================
  // PRIVATE HELPERS
  // =================================================================
  
  private buildQuery(filters: EmailListFilters): string {
    const parts: string[] = [];
    
    if (filters.unreadOnly) {
      parts.push('is:unread');
    }
    
    if (filters.query) {
      parts.push(filters.query);
    }
    
    if (filters.after) {
      parts.push(`after:${this.formatDateForQuery(filters.after)}`);
    }
    
    if (filters.before) {
      parts.push(`before:${this.formatDateForQuery(filters.before)}`);
    }
    
    return parts.join(' ');
  }
  
  private formatDateForQuery(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
  
  private async registerEmailAsInteraction(params: {
    gmailMessageId: string;
    accountId: string;
    kind: string;
    subject: string;
    body: string;
    to?: string[];
  }): Promise<void> {
    try {
      const interaction = {
        id: `gmail_${params.gmailMessageId}`,
        kind: params.kind,
        accountId: params.accountId,
        userId: this.config.userId,
        date: new Date().toISOString(),
        subject: params.subject,
        body: params.body,
        metadata: {
          gmailMessageId: params.gmailMessageId,
          to: params.to,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await db.collection('interactions').doc(interaction.id).set(interaction);
      
      console.log('[Gmail] Interaction registered:', interaction.id);
      
    } catch (error) {
      console.error('[Gmail] Error registering interaction:', error);
      // No lanzar error, solo log
    }
  }
  
  private async createEmailTracking(params: {
    messageId: string;
    accountId?: string;
    sentAt: string;
  }): Promise<void> {
    try {
      const tracking = {
        messageId: params.messageId,
        accountId: params.accountId,
        sentAt: params.sentAt,
        openCount: 0,
        clickCount: 0,
        createdAt: new Date().toISOString(),
      };
      
      await db.collection('email_tracking').doc(params.messageId).set(tracking);
      
      console.log('[Gmail] Email tracking created:', params.messageId);
      
    } catch (error) {
      console.error('[Gmail] Error creating tracking:', error);
      // No lanzar error, solo log
    }
  }
  
  // =================================================================
  // MOCK IMPLEMENTATION
  // =================================================================
  
  protected async mockCall(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<{ success: boolean; data: any }> {
    console.log(`[Gmail Mock] ${method} ${endpoint}`, data);
    
    // Simular respuestas según endpoint
    if (endpoint.includes('/messages/send')) {
      return {
        success: true,
        data: {
          id: `mock_msg_${Date.now()}`,
          threadId: `mock_thread_${Date.now()}`,
          labelIds: ['SENT'],
        },
      };
    }
    
    if (endpoint.includes('/messages/list')) {
      return {
        success: true,
        data: {
          messages: [
            {
              id: 'mock_msg_1',
              threadId: 'mock_thread_1',
            },
          ],
          resultSizeEstimate: 1,
        },
      };
    }
    
    if (endpoint.includes('/messages/') && method === 'GET') {
      return {
        success: true,
        data: {
          id: 'mock_msg_1',
          threadId: 'mock_thread_1',
          labelIds: ['INBOX', 'UNREAD'],
          snippet: 'Mock email snippet...',
          payload: {
            headers: [
              { name: 'From', value: 'sender@example.com' },
              { name: 'To', value: 'recipient@example.com' },
              { name: 'Subject', value: 'Mock Email' },
              { name: 'Date', value: new Date().toISOString() },
            ],
            body: {
              data: Buffer.from('Mock email body').toString('base64'),
            },
          },
        },
      };
    }
    
    return {
      success: true,
      data: { mock: true },
    };
  }
}

// =================================================================
// FACTORY FUNCTION
// =================================================================

/**
 * Crear cliente Gmail para un usuario
 */
export async function createGmailClient(userId: string): Promise<GmailIntegration> {
  // Obtener configuración de Firestore
  const configDoc = await db.collection('gmail_configs').doc(userId).get();
  
  if (!configDoc.exists) {
    throw new Error(`Gmail config not found for user ${userId}`);
  }
  
  const config = configDoc.data() as GmailConfig;
  
  return new GmailIntegration(config);
}
