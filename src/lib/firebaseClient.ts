// src/lib/firebaseClient.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

let initializationPromise: Promise<void> | null = null;

async function initializeFirebase() {
  if (getApps().length === 0) {
    try {
      const response = await fetch('/api/firebase-config');
      if (!response.ok) {
        throw new Error('Failed to load Firebase config from API.');
      }
      const firebaseWebConfig = await response.json();

      if (!firebaseWebConfig.apiKey) {
        throw new Error("Firebase config loaded from API is invalid.");
      }

      const initializedApp = initializeApp(firebaseWebConfig);
      app = initializedApp;
      auth = getAuth(initializedApp);
      db = initializeFirestore(initializedApp, { experimentalAutoDetectLongPolling: true });
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      // Prevent further attempts if it fails
      initializationPromise = Promise.reject(error);
      throw error;
    }
  } else {
    const existingApp = getApp();
    app = existingApp;
    auth = getAuth(existingApp);
    db = getFirestore(existingApp);
  }
}

export async function getFirebase() {
  if (!initializationPromise) {
    initializationPromise = initializeFirebase();
  }
  await initializationPromise;
  
  if (!app || !auth || !db) {
    throw new Error("Firebase services could not be initialized.");
  }
  
  return { firebaseApp: app, firebaseAuth: auth, firestoreDb: db };
}

// Para compatibilidad con importaciones existentes, pero se recomienda usar getFirebase
export { app as firebaseApp, auth as firebaseAuth, db as firestoreDb };
