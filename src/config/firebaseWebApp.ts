// src/config/firebaseWebApp.ts
// Capa única de lectura de variables públicas.
// Falla en caliente con mensaje claro si falta algo.

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    // Mensaje útil en consola del navegador y en server logs
    // (Next inyecta NEXT_PUBLIC_* en el bundle del cliente)
    const msg = `Missing ${name}. Did you set it in .env.local?`;
    if (typeof window !== "undefined") console.error(msg);
    throw new Error(msg);
  }
  return v;
}

export const firebaseWebConfig = {
  apiKey: req("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: req("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: req("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: req("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: req("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: req("NEXT_PUBLIC_FIREBASE_APP_ID"),
} as const;
