// src/app/api/gmail/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GmailIntegration } from '@/server/integrations/gmail/client';

/**
 * TEST ENDPOINT - Gmail Integration
 * 
 * GET /api/gmail/test
 * 
 * Prueba la integración de Gmail en modo mock
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Gmail Test] Iniciando test de integración Gmail...');
    
    // Crear cliente en modo mock (sin OAuth)
    const gmail = new GmailIntegration({
      clientId: 'mock',
      clientSecret: 'mock',
      redirectUri: 'mock',
      refreshToken: '', // Empty = modo mock
      userId: 'test_user',
      email: 'test@santabrisa.com'
    });
    
    // Test 1: Enviar email (mock)
    console.log('[Gmail Test] Test 1: Enviar email...');
    const sentEmail = await gmail.sendEmail({
      to: ['destinatario@example.com'],
      subject: 'Test Email desde Santa Brisa ERP',
      body: 'Este es un email de prueba en modo mock',
      bodyHtml: '<p>Este es un email de prueba en <strong>modo mock</strong></p>',
      accountId: 'test_account_123'
    });
    
    console.log('[Gmail Test] Email enviado (mock):', sentEmail.id);
    
    // Test 2: Listar mensajes (mock)
    console.log('[Gmail Test] Test 2: Listar mensajes...');
    const { messages, nextPageToken } = await gmail.listMessages({
      unreadOnly: true,
      maxResults: 10
    });
    
    console.log('[Gmail Test] Mensajes obtenidos (mock):', messages.length);
    
    // Test 3: Obtener mensaje (mock)
    if (messages.length > 0) {
      console.log('[Gmail Test] Test 3: Obtener detalle de mensaje...');
      const message = messages[0];
      console.log('[Gmail Test] Mensaje:', {
        id: message.messageId,
        from: message.from,
        subject: message.subject,
        date: message.date
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Gmail integration test completed successfully (MOCK MODE)',
      results: {
        sendEmail: {
          messageId: sentEmail.id,
          threadId: sentEmail.threadId,
          status: 'sent (mock)'
        },
        listMessages: {
          count: messages.length,
          nextPageToken,
          firstMessage: messages[0] ? {
            from: messages[0].from,
            subject: messages[0].subject
          } : null
        }
      },
      note: 'Este test usa modo MOCK. Para enviar emails reales, configura OAuth2 tokens en Firestore.'
    });
    
  } catch (error: any) {
    console.error('[Gmail Test] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
