"use client";

import React from 'react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { DatabaseZap } from 'lucide-react';
import { SBCard } from '@/components/ui/ui-primitives';

export default function DbConsolePage() {
    return (
        <div>
            <ModuleHeader title="Consola de Base de Datos" icon={DatabaseZap} />
            <div className="p-6">
                <SBCard title="Ejecutar Comandos">
                    <div className="p-8 text-center">
                        <DatabaseZap className="mx-auto h-12 w-12 text-zinc-400" />
                        <h3 className="mt-4 text-lg font-medium text-zinc-900">Consola de Base de Datos</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                            Esta sección permitirá ejecutar consultas y comandos directamente sobre la base de datos.
                        </p>
                    </div>
                </SBCard>
            </div>
        </div>
    );
}
