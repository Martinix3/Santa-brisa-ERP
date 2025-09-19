
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';

function DataProviderStatusCard() {
    const { data, currentUser, isLoading } = useData();
    
    if (isLoading) {
        return (
             <SBCard title="Estado del DataProvider">
                <div className="p-4 text-sm text-zinc-500 animate-pulse">Cargando DataProvider...</div>
            </SBCard>
        );
    }
    
    if (!data) {
         return (
             <SBCard title="Estado del DataProvider">
                <div className="p-4 text-sm text-red-600">El DataProvider no pudo cargar los datos.</div>
            </SBCard>
        );
    }

    const collectionCounts = SANTA_DATA_COLLECTIONS.map(key => ({
        name: key,
        count: (data as any)[key]?.length ?? 0,
    }));

    return (
        <SBCard title="Estado del DataProvider (en Memoria)">
             <div className="p-4 space-y-3">
                <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm flex items-center gap-2 font-semibold">
                    <CheckCircle size={16} /> DataProvider cargado. Usuario actual: <strong>{currentUser?.name || 'Ninguno'}</strong>
                </div>
                <div>
                    <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-2">Recuento de Registros en Memoria</h4>
                    <ul className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                        {collectionCounts.map(({ name, count }) => (
                           <li key={name} className="flex justify-between">
                               <span>{name}:</span>
                               <span className="font-bold">{count}</span>
                           </li>
                        ))}
                    </ul>
                </div>
            </div>
        </SBCard>
    )
}


function DbConsolePageContent() {
    const [readStatus, setReadStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string, counts: Record<string, number> }>({ status: 'idle', message: '', counts: {} });
    const [writeStatus, setWriteStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

    const testRead = useCallback(async () => {
        setReadStatus({ status: 'loading', message: 'Leyendo todas las colecciones de Firestore...', counts: {} });
        try {
            const counts: Record<string, number> = {};
            let totalDocs = 0;
            // La lista de colecciones a probar se define aquí explícitamente para la prueba.
            const collectionsToTest = SANTA_DATA_COLLECTIONS;

            for (const collectionName of collectionsToTest) {
                const querySnapshot = await getDocs(collection(db, collectionName));
                counts[collectionName] = querySnapshot.size;
                totalDocs += querySnapshot.size;
            }
            setReadStatus({ status: 'success', message: `Lectura directa completada. Se encontraron ${totalDocs} documentos en total.`, counts });
        } catch (error: any) {
            console.error("Firestore read error:", error);
            setReadStatus({ status: 'error', message: `Error de lectura directa: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.`, counts: {} });
        }
    }, []);

    const testWrite = async () => {
        setWriteStatus({ status: 'loading', message: 'Escribiendo en la colección "test_writes"...' });
        try {
            const docRef = await addDoc(collection(db, "test_writes"), {
                message: "Hello from Santa Brisa App!",
                timestamp: serverTimestamp()
            });
            setWriteStatus({ status: 'success', message: `Escritura directa exitosa. Documento creado con ID: ${docRef.id}` });
        } catch (error: any) {
            console.error("Firestore write error:", error);
            setWriteStatus({ status: 'error', message: `Error de escritura directa: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.` });
        }
    };
    
    useEffect(() => {
        testRead();
    }, [testRead]);


    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <p className="text-zinc-600 mt-1">
                Compara los datos cargados en la aplicación (`DataProvider`) con una lectura directa de Firestore para detectar inconsistencias.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <DataProviderStatusCard />
                
                <SBCard title="Prueba de Lectura Directa de Firestore">
                    <div className="p-4 space-y-3">
                         {readStatus.status === 'loading' && <div className="text-sm text-zinc-500 animate-pulse">{readStatus.message}</div>}
                         {readStatus.status === 'error' && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm flex items-center gap-2 font-semibold">
                               <AlertTriangle size={16} /> {readStatus.message}
                            </div>
                         )}
                         {readStatus.status === 'success' && (
                            <>
                                <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm flex items-center gap-2 font-semibold">
                                    <CheckCircle size={16} /> {readStatus.message}
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-zinc-500 mb-2">Recuento de Documentos en DB</h4>
                                    <ul className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                                        {Object.entries(readStatus.counts).map(([name, count]) => (
                                           <li key={name} className="flex justify-between">
                                               <span>{name}:</span>
                                               <span className="font-bold">{count}</span>
                                           </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                         )}
                        <SBButton variant="secondary" onClick={testRead} disabled={readStatus.status === 'loading'}>
                            <Zap size={14} /> Volver a probar lectura
                        </SBButton>
                    </div>
                </SBCard>
            </div>
            
            <SBCard title="Prueba de Escritura Directa en Firestore">
                <div className="p-4 space-y-3">
                    <p className="text-sm text-zinc-600">Intenta crear un documento en la colección `test_writes` para verificar los permisos de escritura.</p>
                     {writeStatus.status !== 'idle' && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 font-semibold ${writeStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                           {writeStatus.status === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                           {writeStatus.message}
                        </div>
                     )}
                    <SBButton variant="secondary" onClick={testWrite} disabled={writeStatus.status === 'loading'}>
                        <Zap size={14} /> Realizar prueba de escritura
                    </SBButton>
                </div>
            </SBCard>
        </div>
    );
}

export default function DbConsolePage() {
    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Consola de Base de Datos" icon={Database} />
            <div className="p-6">
                <DbConsolePageContent />
            </div>
        </AuthenticatedLayout>
    );
}
