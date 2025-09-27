
"use client";
import React from 'react';
import { SBCard } from '@/components/ui/ui-primitives';
import { ClipboardList } from 'lucide-react';

export default function AutocontrolPage() {
    return (
        <SBCard title="Registros de Autocontrol">
            <div className="p-8 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900">En Construcción</h3>
                <p className="mt-1 text-sm text-zinc-500">
                    Aquí se gestionarán los checklists diarios y semanales de higiene y procesos.
                </p>
            </div>
        </SBCard>
    )
}
