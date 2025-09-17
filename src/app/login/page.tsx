
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirigir siempre al dashboard ya que la autenticación está desactivada.
        router.replace('/dashboard-ventas');
    }, [router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50">
            <div className="w-full max-w-sm mx-auto p-8 text-center">
                <h1 className="text-xl font-semibold text-sb-neutral-800">Redirigiendo...</h1>
                <p className="text-sb-neutral-600 mt-2 text-sm">
                    La autenticación está desactivada. Accediendo a la aplicación.
                </p>
            </div>
        </div>
    );
}
