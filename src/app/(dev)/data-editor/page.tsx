
"use client";

import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Sheet } from 'lucide-react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function DataEditorPage() {
    return (
        <AuthenticatedLayout>
            <ModuleHeader title="Editor de Datos de la Aplicación" icon={Sheet} />
            <div className="p-6 h-[calc(100vh_-_150px)]">
               <p>Esta página está en construcción.</p>
            </div>
        </AuthenticatedLayout>
    )
}
