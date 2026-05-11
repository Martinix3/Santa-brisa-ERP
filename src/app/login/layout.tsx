/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


"use client";

import React from 'react';

// Este layout se asegura de que la página de login no muestre la barra lateral de navegación.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
