
'use server';

import { adminDb, adminAuth } from '@/server/firebaseAdmin';

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

// Server Action to check the current server authentication status
export async function checkAuthStatus() {
  try {
    // We create a custom token for a dummy user. The identity used for signing is the server's identity.
    // This is a reliable way to get the service account email.
    const token = await adminAuth.createCustomToken('dummy-check');
    
    // We don't need the token itself, but if the call succeeds, it means we are authenticated.
    // To get the email, we can try to get the access token from the credential.
    const accessToken = await adminDb.app.options.credential?.getAccessToken();
    const clientEmail = accessToken?.client_email;

    if (clientEmail) {
        return { success: true, message: `Servidor autenticado correctamente con la cuenta de servicio:\n${clientEmail}` };
    } else {
        return { success: true, message: `Servidor autenticado, pero no se pudo determinar el email de la cuenta de servicio. Es probable que se esté usando Application Default Credentials.` };
    }
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return { success: false, message: `Fallo en la autenticación del servidor: ${error.message}` };
  }
}
