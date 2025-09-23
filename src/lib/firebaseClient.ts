
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { firebaseWebConfig } from "@/config/firebaseWebApp";

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

if (!getApps().length) {
  app = initializeApp(firebaseWebConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export const firebaseApp = app;
export const firebaseAuth = auth;
export const firestoreDb = db;
