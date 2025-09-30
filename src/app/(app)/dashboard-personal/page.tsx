// app/(app)/dashboard-personal/page.tsx
"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Carga dinámica de los componentes para escritorio y móvil
const Desktop = dynamic(()=>import('./desktop/page').then(m=>m.default),{ ssr:false, loading: () => <PageLoader /> });

function PageLoader() {
    return <div className="flex h-screen w-full items-center justify-center bg-white"><p>Cargando dashboard...</p></div>
}

export default function PersonalPage() {
  return <Desktop />;
}
