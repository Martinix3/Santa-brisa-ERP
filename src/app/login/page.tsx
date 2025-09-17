
"use client";

import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/dataprovider';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui/ui-primitives';
import Image from 'next/image';

export default function LoginPage() {
    const { login, currentUser, isLoading } = useData();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && currentUser) {
            router.push('/');
        }
    }, [currentUser, isLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const success = await login(email, password);
            if (!success) {
                setError('Credenciales incorrectas. Inténtalo de nuevo.');
            }
        } catch (err) {
            setError('Ha ocurrido un error inesperado.');
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
                />
                <h1 className="text-xl font-semibold text-sb-neutral-800">Acceso al CRM</h1>
                <p className="text-sb-neutral-600 mt-2 text-sm">
                    Introduce tus credenciales para continuar.
                </p>
                
                {error && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
                    <div>
                        <label className="text-sm font-medium text-sb-neutral-700">Email</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-sb-neutral-700">Contraseña</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full justify-center !py-2.5 !bg-sb-sun !text-sb-neutral-900"
                    >
                        Acceder
                    </Button>
                </form>
            </div>
        </div>
    );
}
