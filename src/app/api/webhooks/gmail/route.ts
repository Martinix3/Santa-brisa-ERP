// src/app/api/webhooks/gmail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createGmailClient } from '@/server/integrations/gmail/client';
import { GmailSyncService } from '@/server/integrations/gmail/sync';
import { adminDb as db } from '@/server/firebase';

/**
 * GMAIL WEBHOOK - Push Notifications
 * 
 * POST /api/webhooks/gmail
 * 
 * Recibe notificaciones push de Gmail cuando hay cambios (emails nuevos, etc.)
 * Usa Google Cloud Pub/Sub
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Gmail Webhook] Received push notification');
    
    // Parsear body del webhook
    const body = await request.json();
    
    // Validar estructura del webhook
    if (!body.message || !body.message.data) {
      console.error('[Gmail Webhook] Invalid webhook payload');
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
    
    // Decodificar mensaje de Pub/Sub
    const data = JSON.parse(
      Buffer.from(body.message.data, 'base64').toString('utf-8')
    );
    
    console.log('[Gmail Webhook] Decoded data:', data);
    
    const { emailAddress, historyId } = data;
    
    if (!emailAddress) {
      console.error('[Gmail Webhook] Missing emailAddress in webhook data');
      return NextResponse.json(
        { error: 'Missing emailAddress' },
        { status: 400 }
      );
    }
    
    // Buscar usuario por email
    const user = await findUserByEmail(emailAddress);
    
    if (!user) {
      console.error(`[Gmail Webhook] User not found for email: ${emailAddress}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log(`[Gmail Webhook] Processing for user: ${user.id}`);
    
    // Sincronizar cambios en background (no bloqueante)
    syncInBackground(user.id, historyId).catch((error) => {
      console.error('[Gmail Webhook] Error in background sync:', error);
    });
    
    // Responder inmediatamente (200 OK) para que Google no reintente
    return NextResponse.json({ 
      success: true,
      message: 'Webhook received, syncing in background'
    });
    
  } catch (error: any) {
    console.error('[Gmail Webhook] Error processing webhook:', error);
    
    // Aún así retornar 200 para evitar reintentos de Google
    return NextResponse.json({
      success: false,
      error: error.message,
      note: 'Error logged but returning 200 to prevent retries'
    });
  }
}

// =================================================================
// HELPERS
// =================================================================

/**
 * Buscar usuario por email de Gmail
 */
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    // Buscar en gmail_configs por email
    const configsSnap = await db.collection('gmail_configs')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (!configsSnap.empty) {
      return { id: configsSnap.docs[0].id };
    }
    
    return null;
    
  } catch (error) {
    console.error('[Gmail Webhook] Error finding user:', error);
    return null;
  }
}

/**
 * Sincronizar en background (no bloqueante)
 */
async function syncInBackground(userId: string, historyId?: string): Promise<void> {
  try {
    console.log(`[Gmail Webhook] Starting background sync for user ${userId}`);
    
    // Crear cliente
    const gmail = await createGmailClient(userId);
    const syncService = new GmailSyncService(gmail, userId);
    
    // Sincronizar
    const { synced, errors } = await syncService.syncNewEmails();
    
    console.log(`[Gmail Webhook] Background sync complete: ${synced} synced, ${errors} errors`);
    
    // Log del webhook
    await db.collection('webhook_logs').add({
      webhook: 'gmail',
      userId,
      historyId,
      synced,
      errors,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Gmail Webhook] Background sync error:', error);
    
    // Log del error
    await db.collection('webhook_logs').add({
      webhook: 'gmail',
      userId,
      historyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
