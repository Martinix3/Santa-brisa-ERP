// src/app/(app)/layout.tsx
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import Loading from '../loading';
import { useRouter } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, authReady } = useData();
  const router = useRouter();

  React.useEffect(() => {
    if (authReady && !currentUser) {
      console.log('[AppLayout] No currentUser, redirecting to /login');
      router.push('/login');
    }
  }, [authReady, currentUser, router]);

  if (!authReady || !currentUser) {
    // Muestra un loader mientras se verifica el estado de autenticación
    // o mientras se redirige a login.
    return <Loading />;
  }

  return (
      <AuthenticatedLayout>
          {children}
      </AuthenticatedLayout>
  );
}
