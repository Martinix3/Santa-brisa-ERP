
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';

export default function LoginPage() {
    const { login, currentUser } = useData();
    const router = useRouter();

    React.useEffect(() => {
        if (currentUser) {
            router.replace('/dashboard-personal');
        }
    }, [currentUser, router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
            <div className="text-center p-8 bg-white shadow-xl rounded-2xl border">
                <h1 className="text-2xl font-bold text-zinc-800">Santa Brisa CRM</h1>
                <p className="text-zinc-600 mt-2">Por favor, inicia sesión para continuar.</p>
                <button
                    onClick={login}
                    className="mt-6 w-full px-6 py-3 bg-yellow-400 text-zinc-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
                >
                    Iniciar Sesión con Google
                </button>
            </div>
        </div>
    );
}
