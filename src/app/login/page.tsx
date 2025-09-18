
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useData } from '@/lib/dataprovider';

export default function LoginPage() {
    const { login, loginWithEmail, currentUser } = useData();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (currentUser) {
            router.replace('/dashboard-personal');
        }
    }, [currentUser, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await loginWithEmail(email, password);
        setLoading(false);
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 p-4">
            <div className="w-full max-w-sm text-center p-8 bg-white shadow-xl rounded-2xl border">
                <h1 className="text-2xl font-bold text-zinc-800">Santa Brisa CRM</h1>
                <p className="text-zinc-600 mt-2 mb-6">Por favor, inicia sesión para continuar.</p>
                
                <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
                    <div>
                        <label className="text-sm font-medium text-zinc-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-zinc-700">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors disabled:bg-zinc-400"
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="my-4 flex items-center">
                    <div className="flex-grow border-t border-zinc-200"></div>
                    <span className="flex-shrink mx-4 text-zinc-400 text-sm">o</span>
                    <div className="flex-grow border-t border-zinc-200"></div>
                </div>
                
                <button
                    onClick={login}
                    className="w-full px-6 py-3 bg-yellow-400 text-zinc-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h13.04c-.58 2.77-2.26 5.14-4.8 6.7l7.65 5.94c4.51-4.18 7.14-10.34 7.14-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.65-5.94c-2.13 1.42-4.84 2.27-7.98 2.27-6.28 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                    Iniciar Sesión con Google
                </button>
                <p className="mt-6 text-sm text-zinc-600">
                    ¿No tienes cuenta? <Link href="/signup" className="font-medium text-yellow-600 hover:underline">Regístrate</Link>
                </p>
            </div>
        </div>
    );
}
