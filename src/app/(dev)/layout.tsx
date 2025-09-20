
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

// Layout para las rutas de desarrollo, protegidas por el layout autenticado.
export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AuthenticatedLayout>
          {children}
      </AuthenticatedLayout>
  );
}
