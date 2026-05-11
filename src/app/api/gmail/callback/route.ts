// src/app/api/gmail/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb as db } from '@/server/firebase';

/**
 * GMAIL OAUTH2 - Callback de autorización
 * 
 * GET /api/gmail/callback?code=xxx&state=userId
 * 
 * Google redirige aquí después de que el usuario autorice el acceso
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // El userId viene en el state
    const error = searchParams.get('error');
    
    // Usuario denegó el acceso
    if (error) {
      return NextResponse.json(
        { error: 'Authorization denied', details: error },
        { status: 400 }
      );
    }
    
    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }
    
    console.log('[Gmail Callback] Received authorization code for user:', userId);
    
    // Configurar OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${request.nextUrl.origin}/api/gmail/callback`
    );
    
    // Intercambiar código por tokens
    console.log('[Gmail Callback] Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return NextResponse.json(
        { 
          error: 'No refresh token received',
          message: 'Try revoking app access in Google Account and authorize again'
        },
        { status: 500 }
      );
    }
    
    console.log('[Gmail Callback] Tokens received successfully');
    
    // Configurar credenciales para obtener email
    oauth2Client.setCredentials(tokens);
    
    // Obtener email del usuario
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    
    console.log('[Gmail Callback] User email:', email);
    
    // Guardar configuración en Firestore
    const config = {
      userId,
      email: email || '',
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      redirectUri: process.env.GMAIL_REDIRECT_URI || `${request.nextUrl.origin}/api/gmail/callback`,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await db.collection('gmail_configs').doc(userId).set(config);
    
    console.log('[Gmail Callback] Configuration saved to Firestore');
    
    // Retornar HTML con mensaje de éxito
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Gmail Connected</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      color: #333;
      margin: 0 0 1rem 0;
    }
    p {
      color: #666;
      margin: 0.5rem 0;
      line-height: 1.6;
    }
    .email {
      background: #f3f4f6;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-family: monospace;
      margin: 1rem 0;
    }
    .btn {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 2rem;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #5a67d8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>Gmail Conectado</h1>
    <p>Tu cuenta de Gmail ha sido conectada exitosamente a Santa Brisa ERP.</p>
    <div class="email">${email}</div>
    <p><strong>User ID:</strong> ${userId}</p>
    <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #999;">
      Ya puedes cerrar esta ventana y volver a la aplicación.
    </p>
    <a href="/" class="btn">Volver al ERP</a>
  </div>
  <script>
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      window.close();
    }, 5000);
  </script>
</body>
</html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
    
  } catch (error: any) {
    console.error('[Gmail Callback] Error:', error);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Error - Gmail Connection</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      color: #333;
      margin: 0 0 1rem 0;
    }
    .error-message {
      background: #fee;
      border: 1px solid #fcc;
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem 0;
      color: #c33;
      font-family: monospace;
      font-size: 0.9rem;
      word-break: break-word;
    }
    .btn {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 2rem;
      background: #f5576c;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">❌</div>
    <h1>Error al Conectar Gmail</h1>
    <p>Ocurrió un error al intentar conectar tu cuenta de Gmail.</p>
    <div class="error-message">${error.message}</div>
    <a href="/api/gmail/auth?userId=test_user" class="btn">Intentar de Nuevo</a>
  </div>
</body>
</html>
    `;
    
    return new NextResponse(html, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
