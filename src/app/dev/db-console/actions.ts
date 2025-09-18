
'use server';

import { adminDb, adminAuth } from '@/server/firebaseAdmin';

// Server Action to write data to Firestore, verifying user token first.
export async function writeTestData(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken) {
      return { success: false, message: 'Token de autenticación inválido.' };
    }

    const docRef = adminDb.collection('test_console').doc('test_doc');
    const testData = {
      message: '¡Hola desde la consola de DB!',
      timestamp: new Date().toISOString(),
      randomNumber: Math.random(),
      writtenBy: decodedToken.email,
    };
    await docRef.set(testData);
    console.log(`Datos escritos en 'test_console/test_doc' por ${decodedToken.email}: ${JSON.stringify(testData)}`);
    return { success: true, message: `Datos escritos por ${decodedToken.email}.` };
  } catch (error: any) {
    console.error("Error writing to Firestore:", error);
    return { success: false, message: `Error al escribir: ${error.message}` };
  }
}

// Server Action to read data from Firestore, verifying user token first.
export async function readTestData(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken) {
        return { success: false, message: 'Token de autenticación inválido.' };
    }

    const docRef = adminDb.collection('test_console').doc('test_doc');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        console.log(`Datos leídos de 'test_console/test_doc' por ${decodedToken.email}: ${JSON.stringify(data)}`);
      return { success: true, message: `Datos leídos: ${JSON.stringify(data)}` };
    } else {
      return { success: true, message: "El documento 'test_console/test_doc' no existe. Escribe datos primero." };
    }
  } catch (error: any) {
    console.error("Error reading from Firestore:", error);
    return { success: false, message: `Error al leer: ${error.message}` };
  }
}

// Server Action to check the current client authentication status by verifying its token.
export async function checkAuthStatus(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userEmail = decodedToken.email || 'No email found in token.';
    return { success: true, message: `Token verificado correctamente. La acción se ejecuta en nombre de:\n${userEmail}` };
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return { success: false, message: `Fallo en la verificación del token: ${error.message}` };
  }
}
