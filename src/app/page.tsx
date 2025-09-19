
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';

// This page now handles redirection logic based on auth state.
export default function Page(){
    const router = useRouter();
    const { currentUser, authReady } = useData();

    React.useEffect(() => {
        if (authReady) {
            if (currentUser) {
                router.replace('/dashboard-personal');
            } else {
                router.replace('/login');
            }
        }
    }, [authReady, currentUser, router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
            <div className="text-zinc-600">Cargando...</div>
        </div>
    );
}
