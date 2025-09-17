
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, currentUser, isLoading } = useData();
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (!isLoading && currentUser) {
            router.replace('/dashboard-ventas');
        }
    }, [currentUser, isLoading, router]);

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoggingIn(true);
        try {
            await login();
            // onAuthStateChanged in DataProvider will handle the redirect
        } catch (err: any) {
            console.error("Error signing in with Google:", err);
            setError("No se pudo iniciar sesión con Google. Revisa la consola.");
            setIsLoggingIn(false);
        }
    };
    
    // While loading or if user is already logged in, show a loading state.
    // This also helps manage the flicker during the redirect flow.
    if (isLoading || currentUser) {
        return (
             <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50">
                <div className="text-center">
                    <p className="text-lg font-semibold text-sb-neutral-800">Verificando sesión...</p>
                    <p className="text-sm text-sb-neutral-600">Esto puede tardar un momento.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50 p-4">
            <div className="w-full max-w-sm mx-auto">
                <Image
                    src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726"
                    alt="Santa Brisa"
                    width={120}
                    height={40}
                    className="mx-auto mb-8"
                    priority
                />
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-sb-neutral-200">
                    <h1 className="text-xl font-semibold text-center text-sb-neutral-800 mb-1">Bienvenido</h1>
                    <p className="text-center text-sm text-sb-neutral-600 mb-6">Inicia sesión para acceder al CRM de Santa Brisa.</p>
                    
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                           <AlertTriangle size={16} /> {error}
                        </div>
                    )}
                    
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full h-11 bg-sb-sun text-sb-neutral-900 font-semibold rounded-md transition-transform hover:scale-105 disabled:bg-sb-neutral-200 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                         <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.59l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1V1z" fill="none"></path></svg>
                        {isLoggingIn ? 'Redirigiendo...' : 'Iniciar sesión con Google'}
                    </button>
                </div>
            </div>
        </div>
    );
}
