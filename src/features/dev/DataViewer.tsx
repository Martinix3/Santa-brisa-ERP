"use client";

import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Database } from 'lucide-react';
import { SANTA_DATA_COLLECTIONS } from '@/domain/ssot';
import type { SantaData } from '@/domain/ssot';
import { useSearchParams, useRouter } from 'next/navigation';

function CollectionSelector({ collections, active, onSelect, santaData }: { 
    collections: string[], 
    active: string, 
    onSelect: (name: string) => void,
    santaData: SantaData | null 
}) {
    return (
        <div className="border-b">
            <nav className="flex space-x-4 px-4 overflow-x-auto" aria-label="Tabs">
                {collections.map((name) => (
                    <button
                        key={name}
                        onClick={() => onSelect(name)}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${ active === name
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`
            }
                    >
                        {name} ({(santaData as any)?.[name]?.length || 0})
                    </button>
                ))}
            </nav>
        </div>
    )
}

export default function DataViewer() {
    const { data: santaData } = useData();
    const searchParams = useSearchParams();
    const router = useRouter();

    const collections = SANTA_DATA_COLLECTIONS.filter(c => c !== 'activations');
    
    const activeCollection: keyof SantaData = (searchParams.get('collection') as keyof SantaData) || collections[0] as keyof SantaData;
    
    const handleSelectCollection = (collectionName: string) => {
        router.push(`/dev/data-viewer?collection=${collectionName}`);
    };

    const activeData = useMemo(() => {
        if (!santaData || !activeCollection || !collections.includes(activeCollection)) return [];
        return (santaData[activeCollection] as any[]) || [];
    }, [santaData, activeCollection, collections]);

    if (!santaData) {
        return <p className="p-8 text-center text-zinc-500">Cargando datos...</p>;
    }

    return (
        <div className="h-full flex flex-col">
            <ModuleHeader title="Data Viewer" icon={Database} />
            <div className="flex-grow p-4 md:p-6 min-h-0">
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden h-full flex flex-col">
                    <CollectionSelector 
                        collections={collections} 
                        active={activeCollection} 
                        onSelect={handleSelectCollection}
                        santaData={santaData}
                    />
                    <div className="p-4 flex-grow min-h-0">
                        <textarea
                            readOnly
                            value={JSON.stringify(activeData, null, 2)}
                            className="w-full h-full p-4 font-mono text-xs bg-zinc-50 border rounded-lg whitespace-pre"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
