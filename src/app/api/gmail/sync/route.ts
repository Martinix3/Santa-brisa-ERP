// src/app/api/gmail/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createGmailClient } from '@/server/integrations/gmail/client';
import { GmailSyncService } from '@/server/integrations/gmail/sync';

/**
 * GMAIL SYNC - Endpoint de sincronización manual
 * 
 * POST /api/gmail/sync
 * Body: { userId: string }
 * 
 * Sincroniza emails manualmente sin esperar webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Gmail Sync API] Starting sync for user ${userId}`);
    const startTime = Date.now();
    
    // Crear cliente y servicio
    const gmail = await createGmailClient(userId);
    const syncService = new GmailSyncService(gmail, userId);
    
    // Sincronizar
    const { synced, errors } = await syncService.syncNewEmails();
    
    const duration = Date.now() - startTime;
    
    console.log(`[Gmail Sync API] Sync complete in ${duration}ms: ${synced} synced, ${errors} errors`);
    
    return NextResponse.json({
      success: true,
      synced,
      errors,
      durationMs: duration,
      message: `${synced} emails synchronized successfully`
    });
    
  } catch (error: any) {
    console.error('[Gmail Sync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        synced: 0,
        errors: 1
      },
      { status: 500 }
    );
  }
}
