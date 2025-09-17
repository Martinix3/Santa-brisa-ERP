
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, currentUser, isLoading } = useData();
    const [email, setEmail] = useState('admin@santabrisa.com');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (!isLoading && currentUser) {
            router.replace('/dashboard-ventas');
        }
    }, [currentUser, isLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoggingIn(true);
        try {
            await login(email, password);
            // El onAuthStateChanged en DataProvider se encargará del resto
        } catch (err: any) {
            console.error("Error signing in:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError("El correo electrónico o la contraseña son incorrectos.");
            } else {
                setError("Ha ocurrido un error inesperado. Inténtalo de nuevo.");
            }
        } finally {
            setIsLoggingIn(false);
        }
    };
    
    if (isLoading || currentUser) {
        return (
             <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50">
                <div className="text-center">
                    <p className="text-lg font-semibold text-sb-neutral-800">Cargando sesión...</p>
                    <p className="text-sm text-sb-neutral-600">Verificando credenciales y preparando la aplicación.</p>
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
                    <h1 className="text-xl font-semibold text-center text-sb-neutral-800 mb-1">Bienvenido de vuelta</h1>
                    <p className="text-center text-sm text-sb-neutral-600 mb-6">Inicia sesión para acceder al CRM.</p>
                    
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                           <AlertTriangle size={16} /> {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-sb-neutral-700" htmlFor="email">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="mt-1 w-full h-10 px-3 py-2 rounded-md border border-sb-neutral-300 focus:outline-none focus:ring-2 focus:ring-sb-sun"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-sb-neutral-700" htmlFor="password">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full h-10 px-3 py-2 rounded-md border border-sb-neutral-300 focus:outline-none focus:ring-2 focus:ring-sb-sun"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full h-11 bg-sb-sun text-sb-neutral-900 font-semibold rounded-md transition-transform hover:scale-105 disabled:bg-sb-neutral-200 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
