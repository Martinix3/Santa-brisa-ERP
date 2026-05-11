// scripts/test-gmail-sync.ts
/**
 * TEST: Sincronizar emails de Gmail
 * 
 * Uso:
 * tsx scripts/test-gmail-sync.ts
 */

import { createGmailClient } from '../src/server/integrations/gmail/client';
import { GmailSyncService } from '../src/server/integrations/gmail/sync';

async function main() {
  try {
    console.log('🔄 Gmail Sync Test\n');
    console.log('================================\n');
    
    // IMPORTANTE: Cambia este valor
    const USER_ID = 'martin'; // Tu userId en el sistema
    
    console.log(`📧 Sincronizando emails para usuario: ${USER_ID}\n`);
    
    // Crear cliente Gmail
    const gmail = await createGmailClient(USER_ID);
    const syncService = new GmailSyncService(gmail, USER_ID);
    
    const startTime = Date.now();
    
    // Sincronizar
    console.log('⏳ Sincronizando...');
    const { synced, errors } = await syncService.syncNewEmails();
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Sincronización completada!\n');
    console.log(`📊 Resultados:`);
    console.log(`   - Emails sincronizados: ${synced}`);
    console.log(`   - Errores: ${errors}`);
    console.log(`   - Duración: ${duration}ms\n`);
    
    console.log('================================');
    console.log('✅ TEST COMPLETADO');
    console.log('\n💡 Los emails sincronizados se guardaron en:');
    console.log('   - Firestore collection: interactions');
    console.log('   - Como kind: EMAIL_RECEIVED');
    console.log('   - Con metadata de Gmail (messageId, threadId, etc.)');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nDetalles:', error);
    console.error('\n================================');
    console.error('❌ TEST FALLIDO');
    console.error('\nPosibles causas:');
    console.error('1. No has conectado tu cuenta Gmail');
    console.error('   → Solución: Abre http://localhost:3000/api/gmail/auth?userId=martin');
    console.error('2. El userId no existe en gmail_configs');
    process.exit(1);
  }
}

main();
