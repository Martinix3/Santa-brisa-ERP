
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

if (!getApps().length) {
  if (!firebaseWebConfig.apiKey) {
    throw new Error("Firebase config is not available. Please check your environment variables.");
  }
  app = initializeApp(firebaseWebConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

  const useEmu = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

  if (useEmu) {
    console.log('[Firebase] Connecting to emulators...');
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    const protocol = typeof window !== 'undefined' ? window.location.protocol.slice(0, -1) : 'http';
    
    // Usar el protocolo de la página para evitar errores de contenido mixto
    connectAuthEmulator(auth, `${protocol}://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    console.info('[Firebase] Connected to emulators');
  }

} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export const firebaseApp = app;
export const firebaseAuth = auth;
export const firestoreDb = db;
