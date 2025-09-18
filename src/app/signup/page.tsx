
"use client";

import React, { useState } from 'react';
import { useRouter, Link } from 'next/navigation';
import { useData } from '@/lib/dataprovider';

export default function SignupPage() {
    const { signupWithEmail, currentUser } = useData();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (currentUser) {
            router.replace('/dashboard-personal');
        }
    }, [currentUser, router]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = await signupWithEmail(email, password);
        setLoading(false);
        if (user) {
             // The onAuthStateChanged listener in DataProvider will handle redirection.
             console.log("Signup successful, waiting for redirection...");
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 p-4">
            <div className="w-full max-w-sm text-center p-8 bg-white shadow-xl rounded-2xl border">
                <h1 className="text-2xl font-bold text-zinc-800">Crear Cuenta</h1>
                <p className="text-zinc-600 mt-2 mb-6">Regístrate para acceder al CRM de Santa Brisa.</p>
                
                <form onSubmit={handleSignup} className="space-y-4 text-left">
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
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors disabled:bg-zinc-400"
                    >
                        {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                </form>

                <p className="mt-6 text-sm text-zinc-600">
                    ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-yellow-600 hover:underline">Inicia sesión</Link>
                </p>
            </div>
        </div>
    );
}
