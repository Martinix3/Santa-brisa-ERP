// src/lib/firebaseClient.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

let initializationPromise: Promise<void> | null = null;

function initializeFirebaseSync() {
  if (getApps().length === 0) {
    if (!firebaseWebConfig.apiKey) {
      throw new Error("Firebase config is not available. Check your NEXT_PUBLIC_ environment variables.");
    }
    const initializedApp = initializeApp(firebaseWebConfig);
    app = initializedApp;
    auth = getAuth(initializedApp);
    db = initializeFirestore(initializedApp, { experimentalAutoDetectLongPolling: true });
  } else {
    const existingApp = getApp();
    app = existingApp;
    auth = getAuth(existingApp);
    db = getFirestore(existingApp);
  }
}

export function getFirebaseSync() {
  if (!app) {
    initializeFirebaseSync();
  }
  if (!app || !auth || !db) {
    throw new Error("Firebase services could not be initialized synchronously.");
  }
  return { firebaseApp: app, firebaseAuth: auth, firestoreDb: db };
}


// The async version remains for compatibility but now wraps the sync version.
export async function getFirebase() {
  if (!initializationPromise) {
    initializationPromise = Promise.resolve().then(() => {
        if (!app) {
            initializeFirebaseSync();
        }
    });
  }
  await initializationPromise;
  
  if (!app || !auth || !db) {
    throw new Error("Firebase services could not be initialized.");
  }
  
  return { firebaseApp: app, firebaseAuth: auth, firestoreDb: db };
}

// For compatibility with existing imports
export { app as firebaseApp, auth as firebaseAuth, db as firestoreDb };
