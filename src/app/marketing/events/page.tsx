import React from 'react';
import { MarketingEventsMVP } from '@/features/marketing/components/EventsMVP';

// This page is now a placeholder, as event creation is handled by Santa Brain.
// The EventsMVP component is kept for potential future use as a detailed list view.
export default function Page(){
  return (
    <div className="p-6 text-center border-2 border-dashed rounded-xl">
        <h1 className="text-xl font-semibold">Gestión de Eventos</h1>
        <p className="text-zinc-600 mt-2">
            La creación de eventos ahora se gestiona a través del asistente de IA "Santa Brain".
            Usa el botón flotante `+` para iniciar el chat y pídele que programe un nuevo evento.
        </p>
    </div>
  );
}
