
import React from 'react';

// Este componente ya no es necesario, ya que la lógica se centraliza en el asistente de IA.
// Mantenemos la página con un mensaje informativo.
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
