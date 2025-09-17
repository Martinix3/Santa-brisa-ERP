
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();

    // Immediately redirect to the main dashboard since authentication is disabled.
    useEffect(() => {
        router.replace('/dashboard-ventas');
    }, [router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-sb-neutral-50 p-4">
            <div className="text-center">
                <p className="text-lg font-semibold text-sb-neutral-800">Redirigiendo...</p>
                <p className="text-sm text-sb-neutral-600">La autenticación está desactivada.</p>
            </div>
        </div>
    );
}
