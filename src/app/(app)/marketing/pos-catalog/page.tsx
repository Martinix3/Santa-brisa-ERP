// src/app/(app)/marketing/pos-catalog/page.tsx
"use client";
import React from 'react';
import { SBCard } from '@/components/ui/ui-primitives';
import { BookCopy } from 'lucide-react';

export default function PosCatalogPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-zinc-900 mb-4">Catálogo de Tácticas POS</h1>
            <SBCard>
                <div className="p-12 text-center">
                    <BookCopy className="mx-auto h-12 w-12 text-zinc-400" />
                    <h3 className="mt-4 text-lg font-medium text-zinc-900">En Construcción</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                        Esta sección permitirá definir y gestionar el catálogo de tácticas de marketing estandarizadas para el punto de venta (PLV, degustaciones, etc.).
                    </p>
                </div>
            </SBCard>
        </div>
    )
}
