/**
 * Firebase Emulator Setup for Vitest
 * 
 * Conecta los tests a Firebase Emulator para pruebas de integración reales
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configurar para usar emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

// Inicializar Firebase Admin si no está inicializado
if (getApps().length === 0) {
  initializeApp({
    projectId: 'santa-brisa-test',
  });
}

// Obtener instancia de Firestore
const db = getFirestore();

// Limpiar DB antes de cada test suite
export async function clearFirestoreData() {
  const collections = await db.listCollections();
  
  const deletePromises = collections.map(async (collection) => {
    const docs = await collection.listDocuments();
    const batchSize = 500;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc));
      await batch.commit();
    }
  });
  
  await Promise.all(deletePromises);
}

// Helper para verificar que el emulator está corriendo
export function checkEmulatorRunning() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      '❌ Firebase Emulator not detected. Run: npm run test:emulator'
    );
  }
}

// Log info útil
console.log('🔥 Firebase Emulator configured:');
console.log(`  Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
console.log(`  Storage: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`);
console.log(`  Project: santa-brisa-test`);

// Verificar emulator al inicio (comentado para permitir tests unitarios con mocks)
// Descomentar esta línea cuando uses npm run test:emulator
// checkEmulatorRunning();
