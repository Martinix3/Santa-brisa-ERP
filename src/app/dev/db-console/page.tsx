
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database, Zap, CheckCircle, AlertTriangle, Layers, FileText } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';


function DataProviderStatusCard() {
    const { data, currentUser, isLoading } = useData();
    const [testWrites, setTestWrites] = useState<any[] | null>(null);
    const [readError, setReadError] = useState<string | null>(null);

    const handleReadTestWrites = async () => {
        setTestWrites(null);
        setReadError(null);
        try {
            const querySnapshot = await getDocs(collection(db, "test_writes"));
            const writes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTestWrites(writes);
        } catch (error: any) {
            setReadError(`Error de lectura: ${error.message}`);
        }
    };
    
    const collectionCounts = SANTA_DATA_COLLECTIONS.map(key => ({
        name: key,
        count: data && (data as any)[key] ? (data as any)[key].length : 0,
    }));

    return (
        <SBCard title="Prueba del DataProvider y Lectura">
            <div className="p-4 space-y-3">
                <p className="text-sm text-zinc-600">Comprueba si el `DataProvider` ha cargado los datos en memoria y si puede leer colecciones de Firestore.</p>
                
                {isLoading ? (
                    <div className="text-sm text-zinc-500 animate-pulse">Cargando DataProvider...</div>
                ) : data ? (
                    <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle size={16} /> DataProvider cargado. Usuario actual: <strong>{currentUser?.name || 'Ninguno'}</strong>
                        </div>
                        <ul className="grid grid-cols-3 gap-x-4 gap-y-1 list-disc list-inside pl-2 text-xs">
                           {collectionCounts.map(({ name, count }) => (
                               <li key={name}><strong>{name}:</strong> {count}</li>
                           ))}
                        </ul>
                    </div>
                ) : (
                    <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm flex items-center gap-2 font-semibold">
                       <AlertTriangle size={16} /> El DataProvider no pudo cargar los datos.
                    </div>
                )}
            </div>
        </SBCard>
    )
}


function DbConsolePageContent() {
    const [readStatus, setReadStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string, counts: Record<string, number> }>({ status: 'idle', message: '', counts: {} });
    const [writeStatus, setWriteStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });
    const [testWrites, setTestWrites] = useState<any[]>([]);

    const fetchTestWrites = useCallback(async () => {
        try {
            const writesQuery = query(collection(db, "test_writes"), orderBy("timestamp", "desc"), limit(10));
            const querySnapshot = await getDocs(writesQuery);
            const writes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTestWrites(writes);
        } catch (error) {
            console.error("Error fetching test_writes:", error);
        }
    }, []);

    const testRead = useCallback(async () => {
        setReadStatus({ status: 'loading', message: 'Leyendo todas las colecciones de Firestore...', counts: {} });
        try {
            const counts: Record<string, number> = {};
            let totalDocs = 0;
            for (const collectionName of SANTA_DATA_COLLECTIONS) {
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
            await fetchTestWrites();
        } catch (error: any) {
            console.error("Firestore write error:", error);
            setWriteStatus({ status: 'error', message: `Error de escritura directa: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.` });
        }
    };

    useEffect(() => {
        testRead();
        fetchTestWrites();
    }, [testRead, fetchTestWrites]);

    const StatusIndicator = ({ status, message, counts }: { status: 'idle' | 'loading' | 'success' | 'error', message: string, counts?: Record<string, number> }) => {
        if (status === 'idle') return null;
        if (status === 'loading') return <div className="text-sm text-zinc-500 animate-pulse">{message}</div>
        const isSuccess = status === 'success';
        const Icon = isSuccess ? CheckCircle : AlertTriangle;
        return (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                    <p>{message}</p>
                    {counts && Object.keys(counts).length > 0 && (
                         <ul className="grid grid-cols-3 gap-x-4 gap-y-1 list-disc list-inside pl-2 text-xs mt-2">
                           {Object.entries(counts).map(([name, count]) => (
                               <li key={name}><strong>{name}:</strong> {count}</li>
                           ))}
                        </ul>
                    )}
                </div>
            </div>
        )
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <p className="text-zinc-600 mt-1">
                Esta página realiza pruebas para verificar la conexión con tu base de datos y el estado del proveedor de datos de la aplicación.
            </p>

            <DataProviderStatusCard />

            <SBCard title="Prueba de Lectura Directa de Firestore">
                <div className="p-4 space-y-3">
                    <p className="text-sm text-zinc-600">Intenta leer todas las colecciones directamente de Firestore para comprobar los permisos y comparar los recuentos.</p>
                    <StatusIndicator {...readStatus} />
                    <SBButton variant="secondary" onClick={testRead} disabled={readStatus.status === 'loading'}>
                        <Zap size={14} /> Volver a probar lectura
                    </SBButton>
                </div>
            </SBCard>
            
            <SBCard title="Prueba de Escritura Directa en Firestore">
                <div className="p-4 space-y-3">
                    <p className="text-sm text-zinc-600">Intenta crear un documento en la colección `test_writes` para verificar los permisos de escritura.</p>
                     <StatusIndicator {...writeStatus} />
                    <SBButton variant="secondary" onClick={testWrite} disabled={writeStatus.status === 'loading'}>
                        <Zap size={14} /> Realizar prueba de escritura
                    </SBButton>
                </div>
            </SBCard>

            <SBCard title="Contenido de 'test_writes'">
                <div className="p-4 space-y-3">
                    <p className="text-sm text-zinc-600">Aquí se muestran los últimos 10 documentos creados en la colección de prueba.</p>
                    {testWrites.length > 0 ? (
                        <div className="divide-y divide-zinc-100 border rounded-lg">
                            {testWrites.map(doc => (
                                <div key={doc.id} className="p-3 flex items-start gap-3 text-sm">
                                    <FileText className="h-4 w-4 text-zinc-500 mt-0.5" />
                                    <div>
                                        <p className="font-mono text-xs text-zinc-500">{doc.id}</p>
                                        <p className="text-zinc-800">{doc.message}</p>
                                        <p className="text-xs text-zinc-400">{doc.timestamp?.toDate().toLocaleString('es-ES') || 'Sin fecha'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-zinc-500 py-6">La colección 'test_writes' está vacía o no se ha podido leer.</p>
                    )}
                     <SBButton variant="secondary" onClick={fetchTestWrites}>
                        <Zap size={14} /> Refrescar
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
