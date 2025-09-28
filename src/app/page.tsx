// src/app/page.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from './loading';

// La página raíz ahora redirige al dashboard por defecto.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard-personal');
  }, [router]);

  return <Loading />;
}
