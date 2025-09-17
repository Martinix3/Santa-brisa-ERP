
"use client";

import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/dataprovider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/ui-primitives';
import Image from 'next/image';
import { auth } from '@/lib/firebase-config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function LoginPage() {
    const { currentUser, isLoading, data } = useData();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && currentUser) {
            router.push('/');
        }
    }, [currentUser, isLoading, router]);

    const handleGoogleLogin = () => {
        setError(null);
        const provider = new GoogleAuthProvider();
        
        signInWithPopup(auth, provider)
            .then((result) => {
                const firebaseUser = result.user;
                // After successful sign-in, onAuthStateChanged in DataProvider will handle setting the user.
                // We can optionally check if the user exists in our DB here.
                if (data && !data.users.find(u => u.email === firebaseUser.email)) {
                     setError('El usuario no está registrado en el sistema. Contacta a un administrador.');
                     auth.signOut();
                } else {
                     // The onAuthStateChanged listener in DataProvider will handle the redirect.
                }
            })
            .catch((err) => {
                console.error("Error during Google sign-in:", err);
                if (err.code === 'auth/popup-blocked') {
                    setError('El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio e inténtalo de nuevo.');
                } else {
                    setError(err.message || 'Ha ocurrido un error durante el inicio de sesión.');
                }
            });
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
                />
                <h1 className="text-xl font-semibold text-sb-neutral-800">Acceso al CRM</h1>
                <p className="text-sb-neutral-600 mt-2 text-sm">
                    Inicia sesión para continuar.
                </p>
                
                {error && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="mt-8">
                    <Button
                        onClick={handleGoogleLogin}
                        className="w-full justify-center !py-2.5 !bg-sb-sun !text-sb-neutral-900"
                    >
                         <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                        Acceder con Google
                    </Button>
                </div>
            </div>
        </div>
    );
}
