
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

// This is now a redirect page. The main dashboard is at /dashboard-ventas
export default function Page(){
    const router = useRouter();
    React.useEffect(() => {
        router.replace('/dashboard-ventas');
    }, [router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
            <div className="text-zinc-600">Redirigiendo al dashboard...</div>
        </div>
    );
}
