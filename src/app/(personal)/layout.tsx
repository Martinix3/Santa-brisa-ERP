
"use-client";

import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

// Layout para las rutas personales, protegidas por el layout autenticado.
export default function PersonalLayout({
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
