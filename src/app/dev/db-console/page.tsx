"use client";

import React, { useState } from 'react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { Database, DownloadCloud, UploadCloud, Server, Terminal } from 'lucide-react';
import { writeTestData, readTestData } from './actions';

// The page component is now a Client Component
export default function DbConsolePage() {
  const [result, setResult] = useState<{ type: 'write' | 'read'; message: string; success: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleWrite = async () => {
    setIsLoading(true);
    setResult(null);
    const response = await writeTestData();
    setResult({ type: 'write', ...response });
    setIsLoading(false);
  };

  const handleRead = async () => {
    setIsLoading(true);
    setResult(null);
    const response = await readTestData();
    setResult({ type: 'read', ...response });
    setIsLoading(false);
  };

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
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Write Action */}
          <div className="flex flex-col items-center justify-center p-4 border rounded-lg h-full">
              <h3 className="font-semibold text-zinc-800">Escribir Datos</h3>
              <p className="text-sm text-zinc-600 text-center mt-1 mb-4">Crea o sobrescribe un documento de prueba en `test_console/test_doc`.</p>
              <SBButton onClick={handleWrite} disabled={isLoading}>
                  <UploadCloud size={16} /> Escribir en DB
              </SBButton>
          </div>
          
          {/* Read Action */}
           <div className="flex flex-col items-center justify-center p-4 border rounded-lg h-full">
              <h3 className="font-semibold text-zinc-800">Leer Datos</h3>
              <p className="text-sm text-zinc-600 text-center mt-1 mb-4">Intenta leer el documento de prueba `test_console/test_doc`.</p>
              <SBButton onClick={handleRead} variant="secondary" disabled={isLoading}>
                  <DownloadCloud size={16} /> Leer de DB
              </SBButton>
          </div>
        </div>
      </SBCard>
      
      {isLoading && (
        <div className="text-center text-zinc-500">
            <p>Ejecutando acción...</p>
        </div>
      )}

      {result && (
        <SBCard title="Resultado de la Operación">
            <div className={`p-4 rounded-b-2xl text-sm font-mono ${result.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                <div className="flex items-start gap-3">
                    <div className="bg-white/50 p-2 rounded-md">
                        {result.type === 'write' ? <UploadCloud size={16}/> : <DownloadCloud size={16}/>}
                    </div>
                    <div>
                        <p className="font-semibold">{result.success ? 'ÉXITO' : 'ERROR'}</p>
                        <p>{result.message}</p>
                    </div>
                </div>
            </div>
        </SBCard>
      )}

       <p className="text-xs text-center text-zinc-500 pt-4">
          Nota: Los resultados de las operaciones también se muestran en la consola del servidor (no del navegador).
        </p>
    </div>
  );
}
