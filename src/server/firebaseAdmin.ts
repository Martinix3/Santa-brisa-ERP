// src/server/firebase-admin.ts
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app =
  getApps().length === 0
    ? initializeApp({ credential: applicationDefault() })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
