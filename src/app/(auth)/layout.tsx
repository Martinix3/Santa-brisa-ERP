
import React from 'react';

// Este es el layout para las rutas de autenticación.
// No necesita el layout autenticado, solo renderiza a sus hijos.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
