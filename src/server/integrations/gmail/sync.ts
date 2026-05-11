/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/server/integrations/gmail/sync.ts
import 'server-only';

import { adminDb as db } from '@/server/firebase';
import { GmailIntegration } from './client';
import { parseGmailMessage } from './parser';
import type { 
  GmailSyncState, 
  ParsedEmail,
  EmailAnalysis 
} from './types';
import type { Interaction } from '@/domain/ssot';
import { processEmailWithIntelligence } from '@/server/gemini/intelligence-hub';

/**
 * GMAIL SYNC SERVICE
 * 
 * Servicio de sincronización bidireccional con Gmail
 * - Sincroniza emails nuevos como interacciones
 * - Usa historyId para sincronización incremental
 * - Identifica cuentas automáticamente
 * - Analiza emails con IA (opcional)
 */

export class GmailSyncService {
  constructor(
    private gmail: GmailIntegration,
    private userId: string
  ) {}
  
  // =================================================================
  // SYNC NEW EMAILS
  // =================================================================
  
  /**
   * Sincronizar emails nuevos desde último sync
   */
  async syncNewEmails(): Promise<{
    synced: number;
    errors: number;
  }> {
    try {
      console.log(`[Gmail Sync] Starting sync for user ${this.userId}`);
      
      // Obtener estado de último sync
      const syncState = await this.getSyncState();
      
      if (!syncState || !syncState.historyId) {
        // Primera vez - sync inicial
        console.log('[Gmail Sync] First sync - fetching recent emails');
        return await this.initialSync();
      }
      
      // Sync incremental desde último historyId
      console.log(`[Gmail Sync] Incremental sync from historyId: ${syncState.historyId}`);
      return await this.incrementalSync(syncState.historyId);
      
    } catch (error: any) {
      console.error('[Gmail Sync] Error:', error);
      
      // Guardar error en sync state
      await this.updateSyncState({
        lastError: error.message,
        lastSyncAt: new Date().toISOString(),
      });
      
      throw error;
    }
  }
  
  // =================================================================
  // INITIAL SYNC
  // =================================================================
  
  /**
   * Sincronización inicial - últimos 30 días
   */
  private async initialSync(): Promise<{
    synced: number;
    errors: number;
  }> {
    let synced = 0;
    let errors = 0;
    
    // Fecha hace 30 días
    const date30dAgo = new Date();
    date30dAgo.setDate(date30dAgo.getDate() - 30);
    
    // Listar emails de últimos 30 días
    const { messages } = await this.gmail.listMessages({
      after: date30dAgo.toISOString(),
      maxResults: 100,
    });
    
    console.log(`[Gmail Sync] Found ${messages.length} emails in last 30 days`);
    
    // Procesar cada email
    for (const email of messages) {
      try {
        await this.processEmail(email);
        synced++;
      } catch (error: any) {
        console.error(`[Gmail Sync] Error processing email ${email.messageId}:`, error);
        errors++;
      }
    }
    
    // Obtener historyId actual para próximo sync
    const historyId = await this.gmail.getHistoryId();
    
    // Guardar sync state
    await this.updateSyncState({
      historyId,
      lastSyncAt: new Date().toISOString(),
      totalSynced: synced,
      lastError: undefined,
    });
    
    console.log(`[Gmail Sync] Initial sync complete: ${synced} synced, ${errors} errors`);
    
    return { synced, errors };
  }
  
  // =================================================================
  // INCREMENTAL SYNC
  // =================================================================
  
  /**
   * Sincronización incremental desde historyId
   */
  private async incrementalSync(startHistoryId: string): Promise<{
    synced: number;
    errors: number;
  }> {
    let synced = 0;
    let errors = 0;
    
    try {
      // Obtener cambios desde último sync
      const history = await this.gmail.listHistory(startHistoryId);
      
      if (!history.history || history.history.length === 0) {
        console.log('[Gmail Sync] No new changes');
        
        // Actualizar lastSyncAt aunque no haya cambios
        await this.updateSyncState({
          lastSyncAt: new Date().toISOString(),
        });
        
        return { synced: 0, errors: 0 };
      }
      
      console.log(`[Gmail Sync] Processing ${history.history.length} history records`);
      
      // Procesar cada cambio
      for (const record of history.history) {
        // Emails nuevos
        if (record.messagesAdded) {
          for (const msgRef of record.messagesAdded) {
            try {
              const email = await this.gmail.getMessage(msgRef.message.id);
              await this.processEmail(email);
              synced++;
            } catch (error: any) {
              console.error(`[Gmail Sync] Error processing new message:`, error);
              errors++;
            }
          }
        }
        
        // Emails eliminados (opcional: marcar interacción como eliminada)
        if (record.messagesDeleted) {
          // TODO: Implementar si es necesario
        }
      }
      
      // Actualizar sync state con nuevo historyId
      await this.updateSyncState({
        historyId: history.historyId,
        lastSyncAt: new Date().toISOString(),
        totalSynced: synced,
        lastError: undefined,
      });
      
      console.log(`[Gmail Sync] Incremental sync complete: ${synced} synced, ${errors} errors`);
      
      return { synced, errors };
      
    } catch (error: any) {
      console.error('[Gmail Sync] Error in incremental sync:', error);
      
      // Si el historyId es muy antiguo, hacer initial sync
      if (error.message.includes('404') || error.message.includes('historyId')) {
        console.log('[Gmail Sync] HistoryId expired, falling back to initial sync');
        return await this.initialSync();
      }
      
      throw error;
    }
  }
  
  // =================================================================
  // PROCESS EMAIL
  // =================================================================
  
  /**
   * Procesar un email usando Intelligence Hub
   * ✅ AHORA USA EL ORQUESTADOR CENTRAL
   */
  private async processEmail(email: ParsedEmail): Promise<void> {
    // Verificar si ya existe (evitar duplicados)
    const existingId = `gmail_${email.messageId}`;
    const existing = await db.collection('interactions').doc(existingId).get();
    
    if (existing.exists) {
      console.log(`[Gmail Sync] Email ${email.messageId} already synced, skipping`);
      return;
    }
    
    // ✅ PROCESAR CON INTELLIGENCE HUB
    try {
      const result = await processEmailWithIntelligence(email, {
        userId: this.userId,
        accountHistory: [], // TODO: Obtener histórico real del account si existe
        preferences: {
          autoCreateTasks: true,
          autoCreateAlerts: true,
          minPriorityForTask: 'MEDIUM',
          minPriorityForAlert: 'HIGH',
        },
      });
      
      if (result.success) {
        console.log(`[Gmail Sync] ✅ Email processed successfully:`, {
          messageId: email.messageId,
          actionsTaken: result.actionsTaken.length,
          actions: result.actionsTaken.map(a => a.type),
        });
      } else {
        console.error(`[Gmail Sync] ❌ Error processing email:`, result.errors);
      }
      
    } catch (error) {
      console.error(`[Gmail Sync] ❌ Critical error processing email ${email.messageId}:`, error);
      throw error;
    }
  }
  
  // =================================================================
  // SYNC STATE MANAGEMENT
  // =================================================================
  
  /**
   * Obtener estado de sincronización
   */
  private async getSyncState(): Promise<GmailSyncState | null> {
    try {
      const doc = await db
        .collection('gmail_sync_state')
        .doc(this.userId)
        .get();
      
      if (!doc.exists) {
        return null;
      }
      
      return doc.data() as GmailSyncState;
      
    } catch (error) {
      console.error('[Gmail Sync] Error getting sync state:', error);
      return null;
    }
  }
  
  /**
   * Actualizar estado de sincronización
   */
  private async updateSyncState(update: Partial<GmailSyncState>): Promise<void> {
    try {
      const docRef = db.collection('gmail_sync_state').doc(this.userId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        await docRef.update({
          ...update,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await docRef.set({
          userId: this.userId,
          historyId: update.historyId || '',
          lastSyncAt: update.lastSyncAt || new Date().toISOString(),
          totalSynced: update.totalSynced || 0,
          lastError: update.lastError,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      console.error('[Gmail Sync] Error updating sync state:', error);
    }
  }
}
