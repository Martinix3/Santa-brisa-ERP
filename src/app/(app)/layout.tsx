// src/app/(app)/layout.tsx
"use client";

import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { useData } from '@/lib/dataprovider';
import Loading from '../loading';
import { useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authReady, firebaseUser } = useData();
  const router = useRouter();

  useEffect(() => {
    // Si la autenticación está lista y no hay usuario, redirige al login.
    // Esta es la guarda principal para todas las rutas protegidas.
    if (authReady && !firebaseUser) {
      router.replace('/login');
    }
  }, [authReady, firebaseUser, router]);

  // Muestra una pantalla de carga solo durante la comprobación inicial de autenticación.
  if (!authReady) {
    return <Loading />;
  }

  // Si después de la carga inicial no hay usuario de Firebase (está redirigiendo),
  // o si hay usuario de Firebase pero aún no se ha cargado el perfil de la app,
  // muestra la pantalla de carga para evitar renderizados a medias.
  if (!firebaseUser || !currentUser) {
    return <Loading />;
  }
  
  // Si todo está listo, renderiza el layout autenticado.
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
