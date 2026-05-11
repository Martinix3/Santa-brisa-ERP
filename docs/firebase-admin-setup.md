# Informe Técnico — Configuración Firebase Admin SDK (Santa Brisa CRM)
## 1. Problema inicial
* El servidor daba errores invalid_grant (invalid_rapt) al escribir en Firestore.
* Las lecturas funcionaban porque iban con token de usuario de Firebase Auth (cliente).
* La causa: el backend usaba ADC de usuario humano (mj@santabrisa.co) → tokens caducaban o pedían reautenticación → fallo al escribir.

## 2. Objetivo
* Que el backend funcione sin depender de tu sesión personal de gcloud.
* Que el CRM sea estable en producción (sin intervención humana).
* Que en desarrollo puedas seguir levantando el entorno local, pero de forma clara.

## 3. Cambios realizados
### 🔐 Service Accounts
* Identificamos las cuentas de servicio del proyecto:
    * firebase-adminsdk-fbsvc@… (SDK interno de Firebase).
    * firebase-app-hosting-compute@… (la SA del runtime de Hosting/App Hosting).
* Dimos a ambas el rol:
    * roles/datastore.user → permisos de lectura/escritura en Firestore.
### ⚙️ Producción
* Modificamos inicialización en firebaseAdmin.ts para usar:
```ts
import * as admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
```
* Con esto, en PROD:
    * La app usa la SA del servicio (firebase-app-hosting-compute@…).
    * Google renueva los tokens automáticamente.
    * El sistema sobrevive a resets y no depende de tu cuenta personal.
### 👩‍💻 Desarrollo (Workstations)
* Como no podemos crear claves JSON (prohibido en SA de Firebase), usamos impersonation.
* Pasos que hicimos:
    1. Añadimos rol roles/iam.serviceAccountTokenCreator a tu usuario sobre la SA.
    2. Activamos impersonation con:
`export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT="firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com"`
    3. npm run dev
    4. 
    5. Añadimos un script en package.json:
`"scripts": {
  "dev:sa": "cross-env GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=firebase-adminsdk-fbsvc@santa-brisa-erp.iam.gserviceaccount.com next dev"
}`
    6. 
    7. En dev, el SDK sigue inicializando con applicationDefault().
        * Si hay impersonation activo → usa la SA.
        * Si no, cae en tu usuario (puede dar error).

## 4. Qué pasa en cada caso
* Producción (App Hosting)
    * Tokens renovados automáticamente.
    * El CRM seguirá funcionando aunque tú estés desconectado 3, 6 o 12 meses.
    * Tu equipo podrá trabajar sin problema.
* Desarrollo (Workstations)
    * Necesita que haya una sesión gcloud activa (gcloud auth login).
    * Si el entorno se resetea o se borra, basta con volver a hacer login.
    * Con impersonation, el código firma como la SA (no como usuario).

## 5. Recomendaciones futuras
1. No usar nunca ADC de usuario en producción.
2. No guardar claves JSON en repositorios. Todo vía impersonation o SA del runtime.
3. Si más gente necesita levantar el entorno en local:
    * Añadir su usuario al rol roles/iam.serviceAccountTokenCreator sobre la SA firebase-adminsdk-fbsvc@….
    * Con eso podrán usar npm run dev:sa igual que tú.
4. Mantener este documento en el repo (ej. docs/firebase-admin-setup.md) para referencia.

✅ Con esto, si vuelve a pasar, ya sabes:
* En PROD → nada depende de tu cuenta.
* En DEV → usa impersonation con la SA.
