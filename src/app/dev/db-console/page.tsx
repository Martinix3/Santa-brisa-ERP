
"use server";

import React from 'react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Database, DownloadCloud, UploadCloud } from 'lucide-react';
import { adminDb } from '@/server/firebaseAdmin';

// Server Action to write data to Firestore
async function writeTestData() {
  try {
    const docRef = adminDb.collection('test_console').doc('test_doc');
    const testData = {
      message: '¡Hola desde la consola de DB!',
      timestamp: new Date().toISOString(),
      randomNumber: Math.random(),
    };
    await docRef.set(testData);
    return { success: true, message: `Datos escritos en 'test_console/test_doc': ${JSON.stringify(testData)}` };
  } catch (error: any) {
    console.error("Error writing to Firestore:", error);
    return { success: false, message: `Error al escribir: ${error.message}` };
  }
}

// Server Action to read data from Firestore
async function readTestData() {
  try {
    const docRef = adminDb.collection('test_console').doc('test_doc');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { success: true, message: `Datos leídos de 'test_console/test_doc': ${JSON.stringify(docSnap.data())}` };
    } else {
      return { success: true, message: "El documento 'test_console/test_doc' no existe. Escribe datos primero." };
    }
  } catch (error: any) {
    console.error("Error reading from Firestore:", error);
    return { success: false, message: `Error al leer: ${error.message}` };
  }
}

// The page component
export default async function DbConsolePage() {
  
  // This component now runs on the server, but it will be interactive via Server Actions.
  // We'll use a form to trigger the actions.

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <Database className="mx-auto h-12 w-12 text-zinc-400" />
        <h1 className="mt-4 text-2xl font-semibold text-zinc-800">Consola de Base de Datos</h1>
        <p className="mt-2 text-zinc-600">
          Usa estos botones para interactuar directamente con tu base de datos Firestore y verificar la conexión.
        </p>
      </div>

      <SBCard title="Operaciones de Base de Datos">
        <div className="p-6 space-y-4">
          
          {/* Write Action Form */}
          <form action={async (formData) => {
            const result = await writeTestData();
            // In a real app, you might revalidate a path here.
            // For this console, we'll rely on the user to manually read after writing.
            // A more advanced version could use useFormState to display results.
            console.log(result.message);
          }}>
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <h3 className="font-semibold text-zinc-800">Escribir Datos</h3>
                    <p className="text-sm text-zinc-600">Crea o sobrescribe un documento de prueba en `test_console/test_doc`.</p>
                </div>
                <SBButton type="submit">
                    <UploadCloud size={16} /> Escribir en DB
                </SBButton>
            </div>
          </form>
          
          {/* Read Action Form */}
          <form action={async (formData) => {
             const result = await readTestData();
             // This is a simple example. A more complex UI would use useFormState to show this message.
             // For now, we're just logging it to the server console.
             console.log(result.message);
             // You can alert the message to see it on the client
             if (typeof window !== 'undefined') {
                alert(result.message);
             }
          }}>
             <div className="flex items-center justify-between p-4 border rounded-lg">
                 <div>
                    <h3 className="font-semibold text-zinc-800">Leer Datos</h3>
                    <p className="text-sm text-zinc-600">Intenta leer el documento de prueba `test_console/test_doc`.</p>
                </div>
                <SBButton type="submit" variant="secondary">
                    <DownloadCloud size={16} /> Leer de DB
                </SBButton>
            </div>
          </form>
            <p className="text-xs text-center text-zinc-500 pt-4">
                Nota: Los resultados de las operaciones se mostrarán como alertas en el navegador y en la consola del servidor. Esta es una herramienta de diagnóstico simple.
            </p>
        </div>
      </SBCard>
    </div>
  );
}
