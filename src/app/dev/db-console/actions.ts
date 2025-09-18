'use server';

import { adminDb } from '@/server/firebaseAdmin';

// Server Action to write data to Firestore
export async function writeTestData() {
  try {
    const docRef = adminDb.collection('test_console').doc('test_doc');
    const testData = {
      message: '¡Hola desde la consola de DB!',
      timestamp: new Date().toISOString(),
      randomNumber: Math.random(),
    };
    await docRef.set(testData);
    console.log(`Datos escritos en 'test_console/test_doc': ${JSON.stringify(testData)}`);
    return { success: true, message: `Datos escritos en 'test_console/test_doc'.` };
  } catch (error: any) {
    console.error("Error writing to Firestore:", error);
    return { success: false, message: `Error al escribir: ${error.message}` };
  }
}

// Server Action to read data from Firestore
export async function readTestData() {
  try {
    const docRef = adminDb.collection('test_console').doc('test_doc');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        console.log(`Datos leídos de 'test_console/test_doc': ${JSON.stringify(data)}`);
      return { success: true, message: `Datos leídos: ${JSON.stringify(data)}` };
    } else {
      return { success: true, message: "El documento 'test_console/test_doc' no existe. Escribe datos primero." };
    }
  } catch (error: any) {
    console.error("Error reading from Firestore:", error);
    return { success: false, message: `Error al leer: ${error.message}` };
  }
}
