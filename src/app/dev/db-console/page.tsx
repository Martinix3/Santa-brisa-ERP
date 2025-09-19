
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database, Zap, CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';


function DataProviderStatusCard() {
    const { data, currentUser, isLoading } = useData();

    return (
        <SBCard title="Prueba del DataProvider">
            <div className="p-4 space-y-3">
                <p className="text-sm text-zinc-600">Comprueba si el `DataProvider` ha cargado los datos en la memoria de la aplicación.</p>
                
                {isLoading ? (
                    <div className="text-sm text-zinc-500 animate-pulse">Cargando DataProvider...</div>
                ) : data ? (
                    <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle size={16} /> DataProvider cargado con éxito.
                        </div>
                        <ul className="list-disc list-inside pl-2">
                            <li>{data.users?.length || 0} usuarios encontrados.</li>
                            <li>{data.accounts?.length || 0} cuentas encontradas.</li>
                            <li>Usuario actual: <strong>{currentUser?.name || 'Ninguno'}</strong></li>
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
    const [readStatus, setReadStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });
    const [writeStatus, setWriteStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

    const testRead = async () => {
        setReadStatus({ status: 'loading', message: 'Leyendo la colección "users"...' });
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            setReadStatus({ status: 'success', message: `Lectura directa exitosa. Se encontraron ${querySnapshot.size} documentos en la colección "users" de Firestore.` });
        } catch (error: any) {
            console.error("Firestore read error:", error);
            setReadStatus({ status: 'error', message: `Error de lectura directa: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.` });
        }
    };

    const testWrite = async () => {
        setWriteStatus({ status: 'loading', message: 'Escribiendo en la colección "test_writes"...' });
        try {
            const docRef = await addDoc(collection(db, "test_writes"), {
                message: "Hello from Santa Brisa App!",
                timestamp: serverTimestamp()
            });
            setWriteStatus({ status: 'success', message: `Escritura directa exitosa. Documento creado con ID: ${docRef.id}` });
        } catch (error: any)
{
            console.error("Firestore write error:", error);
            setWriteStatus({ status: 'error', message: `Error de escritura directa: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.` });
        }
    };

    useEffect(() => {
        testRead();
    }, []);

    const StatusIndicator = ({ status, message }: { status: 'idle' | 'loading' | 'success' | 'error', message: string }) => {
        if (status === 'idle') return null;
        if (status === 'loading') return <div className="text-sm text-zinc-500 animate-pulse">{message}</div>
        const isSuccess = status === 'success';
        const Icon = isSuccess ? CheckCircle : AlertTriangle;
        return (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p>{message}</p>
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
                    <p className="text-sm text-zinc-600">Intenta leer la colección `users` directamente de Firestore para comprobar los permisos de lectura.</p>
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
