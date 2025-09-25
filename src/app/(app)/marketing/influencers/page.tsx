// src/app/(app)/marketing/influencers/page.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Esta página actúa como un punto de entrada para el módulo de influencers
// y redirige inmediatamente al dashboard, que es la vista principal.
export default function InfluencersRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/marketing/influencers/dashboard');
  }, [router]);

  // Devuelve un loader o null mientras se produce la redirección.
  return null;
}
