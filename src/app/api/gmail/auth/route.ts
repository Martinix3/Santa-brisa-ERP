// src/app/api/gmail/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * GMAIL OAUTH2 - Iniciar flujo de autenticación
 * 
 * GET /api/gmail/auth?userId=xxx
 * 
 * Inicia el flujo OAuth2 para que el usuario autorice acceso a su Gmail
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      return NextResponse.json(
        { 
          error: 'Gmail OAuth not configured',
          message: 'Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in environment variables'
        },
        { status: 500 }
      );
    }
    
    // Configurar OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${request.nextUrl.origin}/api/gmail/callback`
    );
    
    // Scopes necesarios
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    
    // Generar URL de autorización
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Para obtener refresh token
      scope: scopes,
      state: userId, // Pasamos el userId en el state
      prompt: 'consent', // Forzar consentimiento para obtener refresh token
    });
    
    console.log('[Gmail Auth] Redirecting to Google OAuth for user:', userId);
    console.log('[Gmail Auth] Auth URL:', authUrl);
    
    // Redirigir a Google para autorización
    return NextResponse.redirect(authUrl);
    
  } catch (error: any) {
    console.error('[Gmail Auth] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
