
"use client";
import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Este layout ahora redirige a /dashboard si se accede a la raíz de /influencers
export default function InfluencersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/marketing/influencers') {
      router.replace('/marketing/influencers/dashboard');
    }
  }, [pathname, router]);

  if (pathname === '/marketing/influencers') {
    return null; // Muestra un loader o nada mientras redirige
  }

  return (
    <div>
        {children}
    </div>
  );
}
