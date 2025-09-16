
"use client";
import React from 'react';
import { SB_COLORS } from '@/components/ui/ui-primitives';
// Este layout es un wrapper simple, el layout principal de marketing ya gestiona la navegación.
// Podríamos usarlo para añadir una cabecera específica de influencers si fuera necesario.

export default function InfluencersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
        {children}
    </div>
  );
}
