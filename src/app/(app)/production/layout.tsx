
"use client";
import React from 'react';

// Se ha simplificado este layout para evitar importaciones circulares y problemas de renderizado.
// La lógica de presentación ahora reside en las páginas específicas del módulo.
export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
