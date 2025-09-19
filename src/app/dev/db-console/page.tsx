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
                Esta consola de desarrollo para interactuar con la base de datos desde el servidor ha sido deshabilitada temporalmente
                para resolver problemas persistentes de autenticación (`invalid_grant`) en el entorno de desarrollo.
            </p>
            <p className="mt-2 text-sm text-amber-700">
                Toda la lógica de la aplicación que interactúa con Firebase se gestionará a través del SDK del cliente, que se autentica correctamente al iniciar sesión.
            </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
