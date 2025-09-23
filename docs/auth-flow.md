# Arquitectura y Flujo de Autenticación

Este documento describe cómo funciona el sistema de login de la aplicación, desde la configuración hasta el renderizado de las páginas protegidas.

---

## 1. Principios Clave

*   **Firebase como Proveedor de Identidad**: Se utiliza Firebase Authentication para gestionar usuarios (email/contraseña y Google).
*   **Login Forzado**: Ninguna página de la aplicación (excepto `/login`) es accesible sin haber iniciado sesión.
*   **Carga de Datos Post-Autenticación**: Los datos de Firestore solo se cargan en el cliente *después* de que un usuario se haya autenticado correctamente. Esto previene errores de permisos y mejora el rendimiento inicial.
*   **Separación Cliente/Servidor**: La configuración del SDK de cliente (pública) se gestiona a través de variables de entorno `NEXT_PUBLIC_...`, mientras que el SDK de Admin (privado) usa credenciales de servicio en el backend.

---

## 2. Componentes del Flujo

### A. Variables de Entorno (`.env`)

Toda la configuración del SDK de Firebase para el cliente se centraliza aquí.

```bash
# Desactiva la conexión a emuladores locales
NEXT_PUBLIC_USE_EMULATORS=0

# Configuración real del proyecto de Firebase (desde la consola de Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
```

### B. Configuración de Firebase (`src/config/firebaseWebApp.ts`)

Este archivo lee las variables de entorno y las empaqueta en un objeto que la aplicación puede usar.

```typescript
export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  // ... y el resto de claves
};
```

### C. Cliente de Firebase (`src/lib/firebaseClient.ts`)

Aquí se inicializa la aplicación de Firebase usando la configuración anterior. **Importante**: Este archivo ya **no contiene lógica de emuladores**; se conecta directamente a los servicios de producción de Firebase.

```typescript
// src/lib/firebaseClient.ts
"use client";
// ... imports
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app: FirebaseApp;
// ... lógica para inicializar solo una vez

if (!getApps().length) {
  app = initializeApp(firebaseWebConfig);
  // ... inicializa auth y db
}

export const firebaseApp = app;
export const firebaseAuth = auth;
export const firestoreDb = db;
```

### D. Proveedor de Datos (`src/lib/dataprovider.tsx`)

Este es el componente central que orquesta el estado de la autenticación y los datos.

1.  **Escucha cambios de Auth**: Usa `onAuthStateChanged` de Firebase para saber en tiempo real si hay un usuario conectado (`firebaseUser`).
2.  **Sincroniza Usuario**: Cuando `firebaseUser` cambia, busca el perfil de usuario correspondiente en la colección `users` de la base de datos y lo establece como `currentUser`.
3.  **Carga de Datos Condicional**: El `useEffect` que carga todas las colecciones de Firestore **solo se ejecuta si `firebaseUser` existe**. Si no hay usuario, no se intenta cargar nada, evitando errores de permisos.
4.  **Renderizado Condicional**: El `DataProvider` muestra una pantalla de carga únicamente mientras se verifica el estado de autenticación inicial o si, habiendo un usuario, los datos aún se están cargando. Si no hay usuario, renderiza `children` (la página de login) sin bloquear.

### E. Layout Protegido (`src/components/layouts/AuthenticatedLayout.tsx`)

Este componente envuelve todas las páginas principales de la aplicación (ventas, marketing, etc.).

*   Utiliza el hook `useData()` para acceder a `currentUser`.
*   Si `currentUser` es `null` (es decir, nadie ha iniciado sesión), redirige automáticamente al usuario a la página `/login`.

### F. Página de Login (`/app/(auth)/login/page.tsx`)

Esta es la única página accesible sin autenticación. Muestra el formulario de `AuthForm` y utiliza las funciones `loginWithEmail` o `login` (con Google) del `DataProvider` para iniciar el proceso de autenticación.

---

## 3. Flujo Resumido

1.  El usuario llega a la aplicación.
2.  `DataProvider` se inicializa y `AuthenticatedLayout` (si se intenta acceder a una ruta protegida) detecta que no hay `currentUser`.
3.  El usuario es redirigido a `/login`.
4.  El usuario inicia sesión con sus credenciales.
5.  `onAuthStateChanged` en `DataProvider` detecta el nuevo `firebaseUser`.
6.  `DataProvider` busca el perfil en la colección `users` y establece `currentUser`.
7.  Como `currentUser` ya no es `null`, `AuthenticatedLayout` permite el acceso.
8.  Al mismo tiempo, el `useEffect` de carga de datos en `DataProvider` se activa y empieza a traer las colecciones de Firestore.
9.  El usuario es redirigido a `/dashboard-personal` y ve la aplicación con sus datos.
