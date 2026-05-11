# 🔐 Cómo Obtener Credenciales de Gmail (5 minutos)

**Guía rápida para obtener tu Client ID y Client Secret de Google**

---

## 📋 Paso a Paso

### 1️⃣ Ir a Google Cloud Console

Abre en tu navegador:
```
https://console.cloud.google.com/
```

---

### 2️⃣ Crear o Seleccionar Proyecto

**Si ya tienes un proyecto:**
- Selecciónalo del menú desplegable superior

**Si necesitas crear uno nuevo:**
1. Click en el menú desplegable de proyectos (arriba)
2. Click en "New Project"
3. Nombre: `Santa Brisa ERP` (o el que quieras)
4. Click "Create"
5. Espera unos segundos a que se cree

---

### 3️⃣ Habilitar Gmail API

1. En el menú lateral, ve a **"APIs & Services" > "Library"**
2. Busca `Gmail API` en el buscador
3. Click en "Gmail API"
4. Click en el botón azul **"ENABLE"**
5. Espera a que se habilite (unos segundos)

---

### 4️⃣ Configurar OAuth Consent Screen

**IMPORTANTE: Haz esto ANTES de crear credenciales**

1. Ve a **"APIs & Services" > "OAuth consent screen"**
2. Selecciona **"External"** (para poder usar con cualquier cuenta Gmail)
3. Click "Create"

**Configura la pantalla de consentimiento:**
- **App name:** `Santa Brisa ERP`
- **User support email:** Tu email
- **Developer contact:** Tu email
- Click "Save and Continue"

**Scopes (Permisos):**
- Click "Add or Remove Scopes"
- Busca y selecciona:
  - `gmail.send`
  - `gmail.readonly`
  - `gmail.modify`
  - `gmail.compose`
- Click "Update"
- Click "Save and Continue"

**Test users (Opcional):**
- Añade tu email de prueba si quieres
- Click "Save and Continue"

---

### 5️⃣ Crear Credenciales OAuth2

1. Ve a **"APIs & Services" > "Credentials"**
2. Click en **"+ CREATE CREDENTIALS"** (arriba)
3. Selecciona **"OAuth client ID"**

**Configurar el cliente:**
- **Application type:** `Web application`
- **Name:** `Santa Brisa ERP Web Client`

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/gmail/callback
```

4. Click **"CREATE"**

---

### 6️⃣ Copiar las Credenciales

Después de crear, aparecerá un popup con:

```
Your Client ID
xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

Your Client Secret
[REDACTED_GOOGLE_OAUTH_CLIENT_SECRET]
```

**📋 Copia estos valores**

---

### 7️⃣ Añadir a tu Proyecto

1. Crea un archivo `.env.local` en la raíz de tu proyecto
2. Copia el contenido de `.env.local.example`
3. Pega tus credenciales:

```env
GMAIL_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=[REDACTED_GOOGLE_OAUTH_CLIENT_SECRET]
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

4. Guarda el archivo

---

### 8️⃣ Reiniciar el Servidor

```bash
# Detener el servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

---

## ✅ Verificar que Funciona

### Prueba 1: Ver si las credenciales están cargadas

Abre en el navegador:
```
http://localhost:3000/api/gmail/auth?userId=test_user
```

**✅ Si funciona:** Te redirige a Google para autorizar
**❌ Si no funciona:** Aparece error "Gmail OAuth not configured"

### Prueba 2: Conectar tu cuenta

1. Abre: `http://localhost:3000/api/gmail/auth?userId=test_user`
2. Selecciona tu cuenta de Gmail
3. Click "Allow" para autorizar
4. Deberías ver página de confirmación ✅

### Prueba 3: Enviar email de prueba

Después de conectar tu cuenta, prueba:

```bash
curl -X POST http://localhost:3000/api/gmail/send-test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "to": "tu-email@gmail.com",
    "subject": "Test desde Santa Brisa",
    "body": "¡Funciona!"
  }'
```

---

## 🔧 Troubleshooting

### Error: "redirect_uri_mismatch"

**Solución:**
1. Ve a Google Cloud Console > Credentials
2. Edit tu OAuth Client ID
3. Verifica que en "Authorized redirect URIs" esté exactamente:
   ```
   http://localhost:3000/api/gmail/callback
   ```
4. Guarda y espera 5 minutos

### Error: "invalid_client"

**Solución:**
- Verifica que copiaste bien el Client ID y Client Secret
- No debe haber espacios al inicio o final
- Reinicia el servidor después de cambiar `.env.local`

### Error: "Access blocked: This app's request is invalid"

**Solución:**
1. Ve a OAuth consent screen
2. Asegúrate de haber añadido los scopes necesarios
3. Publica la app o añade tu email en "Test users"

---

## 🎯 Siguiente Paso

Una vez tengas las credenciales configuradas:

1. ✅ Abre: `http://localhost:3000/api/gmail/auth?userId=tu_user_id`
2. ✅ Autoriza el acceso
3. ✅ Usa la integración:

```typescript
import { createGmailClient } from '@/server/integrations/gmail/client';

const gmail = await createGmailClient('tu_user_id');
await gmail.sendEmail({
  to: ['destinatario@example.com'],
  subject: 'Hola',
  body: 'Mi primer email desde el ERP'
});
```

---

## 📚 Más Información

- **Guía completa:** Lee `GMAIL_OAUTH_SETUP_GUIDE.md`
- **Propuesta técnica:** Lee `GMAIL_INTEGRATION_PROPOSAL.md`
- **Resumen sprint:** Lee `GMAIL_INTEGRATION_SPRINT_1.1_COMPLETE.md`

---

## ❓ FAQs

**P: ¿Necesito pagar por usar Gmail API?**
R: No, es gratuita hasta 1 billón de emails/día (más que suficiente)

**P: ¿Puedo usar mi cuenta personal de Gmail?**
R: Sí, funciona con cualquier cuenta de Gmail

**P: ¿Tengo que hacer esto para cada usuario?**
R: No, las credenciales (Client ID/Secret) son las mismas para todos. Cada usuario conecta su cuenta individualmente.

**P: ¿Es seguro?**
R: Sí, usamos OAuth2 que es el estándar de seguridad de Google. Los tokens se guardan encriptados en Firestore.

---

**¿Necesitas ayuda?** Abre un issue en el repositorio.
