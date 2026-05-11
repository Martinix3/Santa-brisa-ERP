// scripts/test-gmail-send.ts
/**
 * TEST: Enviar email real con Gmail
 * 
 * Uso:
 * tsx scripts/test-gmail-send.ts
 */

import { createGmailClient } from '../src/server/integrations/gmail/client';

async function main() {
  try {
    console.log('🔧 Gmail Send Email Test\n');
    console.log('================================\n');
    
    // IMPORTANTE: Cambia estos valores
    const USER_ID = 'martin'; // Tu userId en el sistema
    const TO_EMAIL = 'tu-email@gmail.com'; // Email destino (puede ser el tuyo mismo)
    
    console.log(`📧 Enviando email de prueba...`);
    console.log(`Usuario: ${USER_ID}`);
    console.log(`Destinatario: ${TO_EMAIL}\n`);
    
    // Crear cliente Gmail
    const gmail = await createGmailClient(USER_ID);
    
    // Enviar email
    const result = await gmail.sendEmail({
      to: [TO_EMAIL],
      subject: '🎉 Test desde Santa Brisa ERP',
      body: `Este es un email de prueba enviado desde el ERP.

Timestamp: ${new Date().toISOString()}

Si recibes este email, la integración de Gmail funciona correctamente! ✅`,
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">🎉 ¡Gmail Funciona!</h1>
          <p>Este es un email de <strong>prueba real</strong> enviado desde Santa Brisa ERP.</p>
          <div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
            <strong>Message ID:</strong> ${Date.now()}<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('es-ES')}
          </div>
          <p style="color: #666; font-size: 0.9rem;">
            Si recibes este email, la integración funciona correctamente ✅
          </p>
        </div>
      `,
    });
    
    console.log('✅ Email enviado exitosamente!\n');
    console.log(`📨 Message ID: ${result.id}`);
    console.log(`🔗 Thread ID: ${result.threadId}`);
    console.log(`📍 Labels: ${result.labelIds?.join(', ') || 'N/A'}\n`);
    
    console.log('================================');
    console.log('✅ TEST COMPLETADO');
    console.log(`Revisa tu bandeja de entrada: ${TO_EMAIL}`);
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nDetalles:', error);
    console.error('\n================================');
    console.error('❌ TEST FALLIDO');
    console.error('\nPosibles causas:');
    console.error('1. No has conectado tu cuenta Gmail');
    console.error('   → Solución: Abre http://localhost:3000/api/gmail/auth?userId=martin');
    console.error('2. Las credenciales en .env.local son incorrectas');
    console.error('3. El userId no existe en gmail_configs');
    process.exit(1);
  }
}

main();
