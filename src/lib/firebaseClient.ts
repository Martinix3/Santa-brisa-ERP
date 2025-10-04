// src/lib/firebaseClient.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: Firestore | null = null;

let initializationPromise: Promise<void> | null = null;

function initializeFirebaseSync() {
  // Evita doble init con HMR
  const initializedApp = getApps().length === 0 ? initializeApp(firebaseWebConfig) : getApp();
  app = initializedApp;

  // Auth al vuelo
  auth = getAuth(initializedApp);

  // Firestore con long polling (redes/VPN estrictas)
  // Si ya existe instancia previa, getFirestore reaprovecha.
  try {
    db = initializeFirestore(initializedApp, {
      experimentalAutoDetectLongPolling: true,
      // opcional: reduce “Missing or insufficient permissions” por undefineds
      ignoreUndefinedProperties: true,
    });
  } catch {
    // Si ya estaba inicializado en este runtime, caemos a getFirestore
    db = getFirestore(initializedApp);
  }
}

export function getFirebaseSync() {
  if (!app || !auth || !db) initializeFirebaseSync();
  if (!app || !auth || !db) {
    throw new Error("Firebase services could not be initialized synchronously.");
  }
  return { firebaseApp: app, firebaseAuth: auth, firestoreDb: db };
}

export async function getFirebase() {
  if (!initializationPromise) {
    initializationPromise = Promise.resolve().then(() => {
      if (!app || !auth || !db) initializeFirebaseSync();
    });
  }
  await initializationPromise;
  if (!app || !auth || !db) throw new Error("Firebase services could not be initialized.");
  return { firebaseApp: app, firebaseAuth: auth, firestoreDb: db };
}

// Exports legacy
export { app as firebaseApp, auth as firebaseAuth, db as firestoreDb };
