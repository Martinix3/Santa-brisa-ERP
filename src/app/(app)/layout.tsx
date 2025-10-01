
// src/app/(app)/layout.tsx
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import Loading from '../loading';
import { useRouter, usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authReady, firebaseUser, data, loadingData } = useData();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!authReady) return;
    if (!firebaseUser) {
      if (!pathname.startsWith('/login')) {
        router.replace('/login');
      }
    }
  }, [authReady, firebaseUser, pathname, router]);

  // Se bloquea si la autenticación no está lista O si hay un usuario de Firebase pero los datos del CRM aún se están cargando.
  const isBlocking = !authReady || (!!firebaseUser && loadingData);

  if (isBlocking) {
    return <Loading />;
  }
  
  if (!currentUser) {
      // Si la autenticación está lista, hay usuario de Firebase pero no currentUser del CRM,
      // significa que o bien los datos están cargando, o el usuario no existe en la BD.
      // El 'isBlocking' ya cubre la carga, así que si llegamos aquí sin currentUser, es un estado inválido.
      // Podríamos mostrar un error o, para ser seguros, la pantalla de carga mientras se resuelve.
      return <Loading />;
  }

  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
}
