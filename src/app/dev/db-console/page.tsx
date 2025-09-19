
"use client";

import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function DbConsolePage() {
  return (
    <AuthenticatedLayout>
      <ModuleHeader title="Consola de Base de Datos" icon={Database} />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="p-6 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-bold text-amber-900 mt-4">Página Deshabilitada</h2>
            <p className="mt-2 text-amber-800">
                Esta consola de desarrollo ha sido deshabilitada para asegurar una conexión estable
                a la base de datos a través del cliente.
            </p>
            <p className="mt-2 text-sm text-amber-700">
                Toda la lógica de interacción con Firebase se gestiona a través del `DataProvider`
                y el SDK de cliente, utilizando la sesión de usuario autenticada.
            </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
