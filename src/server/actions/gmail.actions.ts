// src/server/actions/gmail.actions.ts
'use server';

import { createGmailClient } from '@/server/integrations/gmail/client';
import { GmailSyncService } from '@/server/integrations/gmail/sync';
import type { SendEmailParams } from '@/server/integrations/gmail/types';

/**
 * GMAIL SERVER ACTIONS
 * 
 * Actions para usar Gmail desde componentes React
 */

// =================================================================
// SEND EMAIL
// =================================================================

export async function sendEmail(params: SendEmailParams & { userId: string }) {
  try {
    const { userId, ...emailParams } = params;
    
    console.log(`[Gmail Action] Sending email for user ${userId}`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    
    // Enviar email
    const result = await gmail.sendEmail(emailParams);
    
    return {
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error sending email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =================================================================
// LIST EMAILS
// =================================================================

export async function listEmails(params: {
  userId: string;
  unreadOnly?: boolean;
  accountId?: string;
  maxResults?: number;
}) {
  try {
    const { userId, ...filters } = params;
    
    console.log(`[Gmail Action] Listing emails for user ${userId}`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    
    // Listar emails
    const { messages, nextPageToken } = await gmail.listMessages(filters);
    
    return {
      success: true,
      messages,
      nextPageToken,
    };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error listing emails:', error);
    return {
      success: false,
      error: error.message,
      messages: [],
    };
  }
}

// =================================================================
// GET EMAIL
// =================================================================

export async function getEmail(params: {
  userId: string;
  messageId: string;
}) {
  try {
    const { userId, messageId } = params;
    
    console.log(`[Gmail Action] Getting email ${messageId} for user ${userId}`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    
    // Obtener email
    const message = await gmail.getMessage(messageId);
    
    return {
      success: true,
      message,
    };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error getting email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =================================================================
// GET THREAD
// =================================================================

export async function getEmailThread(params: {
  userId: string;
  threadId: string;
}) {
  try {
    const { userId, threadId } = params;
    
    console.log(`[Gmail Action] Getting thread ${threadId} for user ${userId}`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    
    // Obtener thread
    const { thread, messages } = await gmail.getThread(threadId);
    
    return {
      success: true,
      thread,
      messages,
    };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error getting thread:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =================================================================
// MARK AS READ
// =================================================================

export async function markEmailAsRead(params: {
  userId: string;
  messageId: string;
}) {
  try {
    const { userId, messageId } = params;
    
    console.log(`[Gmail Action] Marking email ${messageId} as read`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    
    // Marcar como leído
    await gmail.markAsRead(messageId);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error marking as read:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =================================================================
// SYNC EMAILS
// =================================================================

export async function syncEmails(userId: string) {
  try {
    console.log(`[Gmail Action] Syncing emails for user ${userId}`);
    
    // Crear cliente y servicio de sync
    const gmail = await createGmailClient(userId);
    const syncService = new GmailSyncService(gmail, userId);
    
    // Sincronizar
    const { synced, errors } = await syncService.syncNewEmails();
    
    return {
      success: true,
      synced,
      errors,
    };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error syncing emails:', error);
    return {
      success: false,
      error: error.message,
      synced: 0,
      errors: 1,
    };
  }
}

// =================================================================
// SETUP PUSH NOTIFICATIONS
// =================================================================

export async function setupGmailPushNotifications(params: {
  userId: string;
  topicName: string;
}) {
  try {
    const { userId, topicName } = params;
    
    console.log(`[Gmail Action] Setting up push notifications for user ${userId}`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    
    // Configurar webhooks
    await gmail.setupPushNotifications(topicName);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('[Gmail Action] Error setting up push notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =================================================================
// CHECK GMAIL CONFIG
// =================================================================

export async function checkGmailConfig(userId: string) {
  try {
    const gmail = await createGmailClient(userId);
    
    return {
      success: true,
      configured: true,
    };
    
  } catch (error: any) {
    return {
      success: false,
      configured: false,
      error: error.message,
    };
  }
}
