
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';

function DbConsolePageContent() {
    const [readStatus, setReadStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });
    const [writeStatus, setWriteStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

    const testRead = async () => {
        setReadStatus({ status: 'loading', message: 'Leyendo la colección "users"...' });
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            setReadStatus({ status: 'success', message: `Lectura exitosa. Se encontraron ${querySnapshot.size} documentos en la colección "users".` });
        } catch (error: any) {
            console.error("Firestore read error:", error);
            setReadStatus({ status: 'error', message: `Error de lectura: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.` });
        }
    };

    const testWrite = async () => {
        setWriteStatus({ status: 'loading', message: 'Escribiendo en la colección "test_writes"...' });
        try {
            const docRef = await addDoc(collection(db, "test_writes"), {
                message: "Hello from Santa Brisa App!",
                timestamp: serverTimestamp()
            });
            setWriteStatus({ status: 'success', message: `Escritura exitosa. Documento creado con ID: ${docRef.id}` });
        } catch (error: any)
{
            console.error("Firestore write error:", error);
            setWriteStatus({ status: 'error', message: `Error de escritura: ${error.message}. Revisa la consola y las reglas de seguridad de Firestore.` });
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
                Esta página realiza pruebas básicas de lectura y escritura para verificar la conexión con tu base de datos de Firestore.
            </p>

            <SBCard title="Prueba de Lectura">
                <div className="p-4 space-y-3">
                    <p className="text-sm text-zinc-600">Se intentará leer la colección `users` para comprobar los permisos de lectura.</p>
                    <StatusIndicator {...readStatus} />
                    <SBButton variant="secondary" onClick={testRead} disabled={readStatus.status === 'loading'}>
                        <Zap size={14} /> Volver a probar lectura
                    </SBButton>
                </div>
            </SBCard>
            
            <SBCard title="Prueba de Escritura">
                <div className="p-4 space-y-3">
                    <p className="text-sm text-zinc-600">Se intentará crear un nuevo documento en una colección llamada `test_writes`.</p>
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
        <>
            <ModuleHeader title="Consola de Base de Datos" icon={Database} />
            <div className="p-6">
                <DbConsolePageContent />
            </div>
        </>
    );
}
