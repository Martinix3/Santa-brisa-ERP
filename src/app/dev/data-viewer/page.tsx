
"use client";

import React, { useState } from 'react';
import { useData } from '@/lib/dataprovider';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database } from 'lucide-react';
import { SBCard, SB_COLORS } from '@/components/ui/ui-primitives';
import type { SantaData } from '@/domain/ssot';

function DataViewerPageContent() {
    const { data, mode } = useData();
    const [selectedKey, setSelectedKey] = useState<keyof SantaData | null>('accounts');

    if (!data) {
        return (
            <div className="p-6 text-center">
                <p className="text-lg font-semibold">Cargando datos...</p>
                <p className="text-sm text-zinc-500">Esperando que el DataProvider se inicialice.</p>
            </div>
        );
    }

    const dataSummary = Object.keys(data).map(key => {
        const value = (data as any)[key];
        const count = Array.isArray(value) ? value.length : (typeof value === 'object' && value !== null) ? Object.keys(value).length : '-';
        return { key: key as keyof SantaData, count };
    }).sort((a,b) => a.key.localeCompare(b.key));

    const selectedData = selectedKey ? (data as any)[selectedKey] : null;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <p className="text-zinc-600 mt-1">
                Inspecciona el contenido del proveedor de datos (`santaData`) en tiempo real. El modo actual es: <strong className="font-semibold text-zinc-800">{mode}</strong>.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <SBCard title="Colecciones de Datos">
                        <div className="divide-y divide-zinc-100">
                            {dataSummary.map(({ key, count }) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedKey(key)}
                                    className={`w-full flex justify-between items-center px-4 py-3 text-sm text-left transition-colors ${selectedKey === key ? 'bg-yellow-50 font-semibold' : 'hover:bg-zinc-50'}`}
                                >
                                    <span>{key}</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700">{count}</span>
                                </button>
                            ))}
                        </div>
                    </SBCard>
                </div>

                <div className="lg:col-span-2">
                    <SBCard title={`Visor JSON: ${selectedKey || 'Selecciona una colección'}`}>
                        <div className="p-1 bg-zinc-800 text-white rounded-b-2xl max-h-[70vh] overflow-auto">
                            <pre className="text-xs p-4 whitespace-pre-wrap break-all">
                                {selectedData ? JSON.stringify(selectedData, null, 2) : 'Selecciona una colección para ver su contenido.'}
                            </pre>
                        </div>
                    </SBCard>
                </div>
            </div>
        </div>
    );
}


export default function DataViewerPage() {
    return (
        <AuthGuard>
            <AuthenticatedLayout>
                 <ModuleHeader title="Visor de Datos del SSOT" icon={Database}/>
                <div className="p-6">
                    <DataViewerPageContent />
                </div>
            </AuthenticatedLayout>
        </AuthGuard>
    );
}
