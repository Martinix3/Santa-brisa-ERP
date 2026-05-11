/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


"use client";

import { Loader } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sb-neutral-700">Iniciando aplicación...</p>
      </div>
    </div>
  );
}
