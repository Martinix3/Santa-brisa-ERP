
// src/app/(app)/layout.tsx
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import Loading from '../loading';
import { useRouter, usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authReady, firebaseUser, data, loadingData } = useData(); // ⬅ añade loadingData
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!authReady) return;
    if (!firebaseUser) {
      if (!pathname.startsWith('/login')) {
        router.replace('/login'); // idempotente
      }
    }
  }, [authReady, firebaseUser, pathname, router]);

  // Bloqueo coherente con el provider
  const isBlocking = !authReady || (!!firebaseUser && loadingData);

  if (isBlocking) return <Loading />;

  // Si no hay user de Firebase, estamos redirigiendo a /login
  if (!firebaseUser) return <Loading />;

  // Si hay Firebase user pero aún no hay currentUser (signup en curso o datos aún montando)
  if (!currentUser) return <Loading />;

  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
}
