
# Informe Técnico — Configuración Firebase Admin SDK (Santa Brisa CRM)

## 1. Problema inicial

*   El servidor daba errores `invalid_grant` (`invalid_rapt`) al escribir en Firestore.
*   Las lecturas funcionaban porque iban con token de usuario de Firebase Auth (cliente).
*   La causa: el backend usaba ADC de usuario humano (ej. `mj@santabrisa.co`) → los tokens de corta duración caducaban o pedían reautenticación, provocando un fallo al escribir.

## 2. Objetivo

*   Que el backend funcione de forma autónoma sin depender de una sesión de `gcloud` de un usuario específico.
*   Que el CRM sea estable en producción sin necesidad de intervención humana.
*   Que en desarrollo se pueda levantar el entorno local de forma clara y reproducible.

## 3. Cambios realizados

### 🔐 Cuentas de Servicio (Service Accounts)
*   Identificamos las cuentas de servicio (SA) clave del proyecto:
    *   `firebase-adminsdk-fbsvc@...` (SA interna del SDK de Firebase).
    *   `firebase-app-hosting-compute@...` (SA del runtime de Firebase App Hosting).
*   Se concedió a ambas SA el rol:
    *   `roles/datastore.user` → permisos de lectura/escritura en Firestore.

### ⚙️ Entorno de Producción
*   Se modificó la inicialización en `src/server/firebaseAdmin.ts` para usar credenciales por defecto del entorno:
    ```typescript
    import * as admin from "firebase-admin";

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    
    export const adminDb = admin.firestore();
    export const adminAuth = admin.auth();
    ```
*   Con esto, en producción (App Hosting), la aplicación usa la SA del propio servicio (`firebase-app-hosting-compute@...`). Google gestiona la rotación de tokens automáticamente, y el sistema es robusto.

### 👩‍💻 Entorno de Desarrollo (Workstations)
*   Dado que no se pueden crear claves JSON para las SA de Firebase, se utiliza **impersonation**.
*   Pasos realizados:
    1.  Se añadió el rol `roles/iam.serviceAccountTokenCreator` a tu usuario sobre la SA `firebase-adminsdk-fbsvc@...`.
    2.  Se creó un script en `package.json` para activar la `impersonation` fácilmente:
        ```json
        "scripts": {
          "dev:sa": "cross-env GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=firebase-adminsdk-fbsvc@... next dev"
        }
        ```
    3.  Al ejecutar `npm run dev:sa`, el SDK de Admin, aunque inicializado con `applicationDefault()`, detecta la variable de entorno y firma las peticiones como si fuera la Service Account, no el usuario.

## 4. Resumen de Comportamiento

*   **Producción (App Hosting)**:
    *   Totalmente autónomo.
    *   Los tokens se renuevan solos.
    *   El CRM funcionará indefinidamente sin depender de tu cuenta personal.
*   **Desarrollo (Workstations)**:
    *   Requiere una sesión de `gcloud` activa (`gcloud auth login`).
    *   Si el entorno se resetea, solo hay que volver a hacer login.
    *   Se debe usar `npm run dev:sa` para que el backend se autentique correctamente.

## 5. Recomendaciones Futuras

1.  **No usar ADC de usuario en producción**. La solución actual es la correcta.
2.  **No guardar claves JSON** en el repositorio. Usar `impersonation` o la SA del runtime.
3.  **Para nuevos desarrolladores**:
    *   Añadir su email de Google al rol `roles/iam.serviceAccountTokenCreator` sobre la SA `firebase-adminsdk-fbsvc@...`.
    *   Con esto, podrán usar `npm run dev:sa` igual que tú.
4.  **Mantener este documento** como referencia para el equipo.

---

✅ **Conclusión**: Si el error `invalid_grant` vuelve a aparecer:
*   En **PROD**: No debería pasar. La configuración es autónoma.
*   En **DEV**: Asegúrate de que tienes una sesión de `gcloud` activa y estás usando `npm run dev:sa`.
