
"use client";

import React from 'react';
import Link from 'next/link';
import { SBCard, SB_COLORS } from '@/components/ui/ui-primitives';
import type { SantaData } from '@/domain/ssot';
import { Map, Link as LinkIcon } from 'lucide-react';
import { ModuleHeader } from '@/components/ui/ModuleHeader';

type PageCollectionMap = {
    module: string;
    color: string;
    pages: {
        path: string;
        name: string;
        collections: (keyof SantaData)[];
    }[];
}

const PAGE_DATA_MAP: PageCollectionMap[] = [
    {
        module: 'Ventas',
        color: SB_COLORS.sales,
        pages: [
            { path: '/dashboard-ventas', name: 'Dashboard de Ventas', collections: ['users', 'ordersSellOut', 'interactions', 'accounts'] },
            { path: '/accounts', name: 'Listado de Cuentas', collections: ['accounts', 'users', 'distributors', 'interactions', 'ordersSellOut'] },
            { path: '/accounts/[accountId]', name: 'Detalle de Cuenta', collections: ['accounts', 'users', 'distributors', 'interactions', 'ordersSellOut', 'products'] },
            { path: '/orders', name: 'Gestor de Pedidos', collections: ['ordersSellOut', 'accounts', 'products', 'users'] },
        ]
    },
    {
        module: 'Producción',
        color: SB_COLORS.production,
        pages: [
            { path: '/production/dashboard', name: 'Dashboard de Producción', collections: ['productionOrders', 'lots'] },
            { path: '/production/bom', name: 'Gestor de Recetas (BOM)', collections: ['billOfMaterials', 'materials'] },
            { path: '/production/execution', name: 'Ejecución de Producción', collections: ['productionOrders', 'billOfMaterials', 'inventory', 'materials', 'lots', 'products', 'stockMoves'] },
            { path: '/production/traceability', name: 'Trazabilidad', collections: ['lots', 'ordersSellOut', 'accounts', 'traceEvents', 'productionOrders', 'qaChecks', 'users'] },
        ]
    },
    {
        module: 'Almacén',
        color: SB_COLORS.warehouse,
        pages: [
            { path: '/warehouse/dashboard', name: 'Dashboard de Almacén', collections: ['inventory', 'shipments'] },
            { path: '/warehouse/inventory', name: 'Vista de Inventario', collections: ['inventory', 'lots', 'materials'] },
            { path: '/warehouse/logistics', name: 'Logística de Salidas', collections: ['shipments', 'ordersSellOut', 'accounts'] },
        ]
    },
     {
        module: 'Admin y Dev',
        color: SB_COLORS.admin,
        pages: [
            { path: '/users', name: 'Gestión de Usuarios', collections: ['users'] },
            { path: '/admin/kpi-settings', name: 'Ajustes de KPIs', collections: ['users'] },
            { path: '/admin/sku-management', name: 'Gestión de SKUs', collections: ['materials', 'lots'] },
            { path: '/dev/data-viewer', name: 'Visor de Datos', collections: [] }, // Usa todas, así que lo dejamos vacío
            { path: '/dev/ssot-tests', name: 'Tests de Integridad', collections: [] }, // No usa el DataProvider
        ]
    },
];

function CollectionPill({ name }: { name: keyof SantaData }) {
    return <span className="inline-block bg-zinc-100 text-zinc-700 text-xs font-mono px-2 py-1 rounded-md border border-zinc-200">{name}</span>;
}


function DataMapPageContent() {
    return (
        <div className="max-w-6xl mx-auto space-y-6">
             <p className="text-zinc-600 mt-1">
                Este mapa muestra qué colecciones de datos del `DataProvider` son consumidas por cada página principal de la aplicación. Es útil para entender las dependencias y el flujo de datos.
            </p>
            {PAGE_DATA_MAP.map(module => (
                <SBCard key={module.module} title={module.module} accent={module.color}>
                    <div className="divide-y divide-zinc-100">
                        {module.pages.map(page => (
                            <div key={page.path} className="p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-zinc-800">{page.name}</h3>
                                    <Link href={page.path.includes('[') ? '#' : page.path} className="flex items-center gap-1 text-sm text-sb-verde-mar hover:underline">
                                        Ir a la página <LinkIcon size={14} />
                                    </Link>
                                </div>
                                <p className="text-sm font-mono text-zinc-500 mb-3">{page.path}</p>
                                <div className="flex flex-wrap gap-2">
                                    {page.collections.length > 0 ? (
                                        page.collections.map(collection => <CollectionPill key={collection} name={collection} />)
                                    ) : (
                                        <p className="text-xs text-zinc-400 italic">Esta página no consume datos directamente o consume todas las colecciones (como el visor).</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </SBCard>
            ))}
        </div>
    )
}


export default function DataMapPage() {
    return (
         <>
            <ModuleHeader title="Mapa de Datos de la Aplicación" icon={Map}/>
            <div className="p-6">
                <DataMapPageContent />
            </div>
        </>
    )
}
