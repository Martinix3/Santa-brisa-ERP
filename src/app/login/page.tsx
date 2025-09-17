
"use client";

import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/dataprovider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/ui-primitives';
import Image from 'next/image';
import { signInWithEmailAndPassword, GoogleAuthProvider, getAuth, signInWithRedirect } from "firebase/auth";
import { auth } from '@/lib/firebase-config';


export default function LoginPage() {
    const { currentUser, isLoading } = useData();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (!isLoading && currentUser) {
            router.push('/');
        }
    }, [currentUser, isLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoggingIn(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // El onAuthStateChanged en DataProvider se encargará del resto
        } catch (err: any) {
            console.error("Error signing in:", err);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('El correo electrónico o la contraseña son incorrectos.');
            } else {
                setError(err.message || 'Ha ocurrido un error durante el inicio de sesión.');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };
    
    if (isLoading || currentUser) {
        return (
             <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-sb-neutral-600">Verificando sesión...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50">
            <div className="w-full max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-xl border border-sb-neutral-200 text-center">
                <Image 
                    src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" 
                    alt="Santa Brisa Logo" 
                    width={100}
                    height={64}
                    className="h-16 mx-auto mb-4"
                    priority
                />
                <h1 className="text-xl font-semibold text-sb-neutral-800">Acceso al CRM</h1>
                <p className="text-sb-neutral-600 mt-2 text-sm">
                    Inicia sesión para continuar.
                </p>

                 <form onSubmit={handleLogin} className="mt-8 text-left space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full justify-center !py-2.5 !bg-sb-sun !text-sb-neutral-900"
                    >
                        {isLoggingIn ? 'Iniciando sesión...' : 'Acceder'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
