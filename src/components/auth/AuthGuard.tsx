
"use client";

import React, { useEffect } from 'react';
import { useData } from '@/lib/dataprovider';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
            <div className="text-zinc-600">Cargando...</div>
        </div>
    );
  }

  return <>{children}</>;
}
