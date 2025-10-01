
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
  const { currentUser, authReady, firebaseUser, data } = useData();
  const router = useRouter();

  React.useEffect(() => {
    if (authReady && !firebaseUser) {
      console.log('[AppLayout] Auth ready but no Firebase user, redirecting to /login');
      router.push('/login');
    }
  }, [authReady, firebaseUser, router]);

  // Muestra el loader mientras se verifica el auth o se cargan los datos iniciales tras el login
  if (!authReady || (firebaseUser && !data)) {
    return <Loading />;
  }
  
  // Si auth está listo, pero no hay usuario de Firebase, la redirección está en curso.
  // Si hay usuario de Firebase pero no currentUser del CRM, es un estado intermedio de carga.
  if (!firebaseUser || !currentUser) {
    // Si la redirección ya está en marcha, Loading previene un parpadeo.
    // Si aún no se ha encontrado el usuario de la app, también se muestra el loader.
    return <Loading />;
  }

  return (
      <AuthenticatedLayout>
          {children}
      </AuthenticatedLayout>
  );
}
