// app/(app)/dashboard-personal/page.tsx
"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Carga dinámica de los componentes para escritorio y móvil
const Desktop = dynamic(()=>import('./desktop/page').then(m=>m.default),{ ssr:false });
const Mobile  = dynamic(()=>import('./mobile/page').then(m=>m.default), { ssr:false });

export default function PersonalPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(()=>{
    // Media query para detectar si el ancho de la pantalla es menor o igual a 1023px
    const mq = window.matchMedia('(max-width: 1023px)');
    
    // Función para actualizar el estado basado en la media query
    const set = ()=> setIsMobile(mq.matches);
    
    // Establecer el estado inicial
    set();
    
    // Escuchar cambios en la media query
    mq.addEventListener('change', set);
    
    // Limpiar el listener al desmontar el componente
    return ()=> mq.removeEventListener('change', set);
  },[]);

  // Renderiza el componente apropiado basado en el estado isMobile
  return isMobile ? <Mobile/> : <Desktop/>;
}
