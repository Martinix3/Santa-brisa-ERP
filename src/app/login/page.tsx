
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import { SBButton, Input } from '@/components/ui/ui-primitives';
import { SB_COLORS } from '@/domain/ssot';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isLoading } = useData();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            router.push('/dashboard-ventas');
        } catch (err: any) {
            setError(err.message || 'No se pudo iniciar sesión.');
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50 p-4">
            <div className="w-full max-w-sm">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg border border-sb-neutral-200 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-sb-neutral-900">Santa Brisa</h1>
                        <p className="text-sm text-sb-neutral-600">Accede a tu cuenta</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-sb-neutral-700 block mb-1.5" htmlFor="email">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-sb-neutral-700 block mb-1.5" htmlFor="password">
                                Contraseña
                            </label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div>
                        <SBButton type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </SBButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
