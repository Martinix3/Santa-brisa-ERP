
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgendaRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/agenda/calendar');
  }, [router]);
  return null; // O un componente de carga
}
