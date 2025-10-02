// src/lib/firebaseAdmin.ts
// Este archivo fue reemplazado por src/server/firebase.ts que usa ADC.
// Se mantiene vacío para evitar referencias rotas, pero debería ser eliminado.
// En un futuro refactor, elimina este archivo y actualiza todas las importaciones
// para que apunten a '@/server/firebase'.

// Por ahora, para que el build no falle, exportamos lo mínimo indispensable.
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';

const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
export const adminDb = getFirestore(app);
